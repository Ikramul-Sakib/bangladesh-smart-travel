const { pool } = require('../config/database');
const { computeItineraryBreakdown } = require('./travelCostService');

class RecommendationService {
  /**
   * Fetch all pricing catalog rows for a destination
   */
  static async loadDestinationCatalog(destinationId, startingLocation) {
    const [[destination]] = await pool.execute(
      `SELECT * FROM destinations WHERE id = ? AND is_active = 1`,
      [destinationId]
    );

    if (!destination) {
      throw new Error('Selected destination was not found or is currently inactive.');
    }

    // Fetch transport options matching origin (or fallback to any origin for that destination)
    let [transports] = await pool.execute(
      `SELECT * FROM transport_options
       WHERE destination_id = ? AND LOWER(departure_location) = LOWER(?) AND is_active = 1
       ORDER BY one_way_fare_bdt ASC`,
      [destinationId, startingLocation]
    );

    if (transports.length === 0) {
      const [fallbackTransports] = await pool.execute(
        `SELECT * FROM transport_options
         WHERE destination_id = ? AND is_active = 1
         ORDER BY one_way_fare_bdt ASC`,
        [destinationId]
      );
      transports = fallbackTransports;
    }

    // Fetch hotels + room types joined
    const [hotelRooms] = await pool.execute(
      `SELECT rt.*, h.name AS hotel_name, h.category, h.address, h.facilities, h.is_verified
       FROM hotel_room_types rt
       JOIN hotels h ON rt.hotel_id = h.id
       WHERE h.destination_id = ? AND h.is_active = 1 AND rt.is_active = 1
       ORDER BY rt.price_per_night_bdt ASC`,
      [destinationId]
    );

    // Fetch food cost tiers
    const [foodPlans] = await pool.execute(
      `SELECT * FROM food_costs WHERE destination_id = ? ORDER BY lunch_cost_bdt ASC`,
      [destinationId]
    );

    // Fetch attractions
    const [attractions] = await pool.execute(
      `SELECT * FROM tourist_attractions WHERE destination_id = ? AND is_active = 1 ORDER BY entrance_fee_bdt ASC`,
      [destinationId]
    );

    // Fetch additional expenses
    const [additionalExpenses] = await pool.execute(
      `SELECT * FROM additional_expenses WHERE destination_id = ? AND is_active = 1`,
      [destinationId]
    );

    // Fetch minimum available agent service fee for this destination
    const [[agentFeeRow]] = await pool.execute(
      `SELECT MIN(COALESCE(ad.custom_service_fee_bdt, ap.base_service_fee_bdt)) AS min_agent_fee
       FROM agent_profiles ap
       JOIN users u ON ap.user_id = u.id
       LEFT JOIN agent_destinations ad ON ap.id = ad.agent_profile_id AND ad.destination_id = ?
       WHERE u.status = 'active' AND (ad.destination_id = ? OR ap.is_verified = 1)`,
      [destinationId, destinationId]
    );

    return {
      destination,
      transports,
      hotelRooms,
      foodPlans,
      attractions,
      additionalExpenses,
      defaultAgentFeeBdt: Number(agentFeeRow?.min_agent_fee || 2000)
    };
  }

  /**
   * Generate and rank rule-based itinerary recommendations
   * @param {Object} validatedParams
   */
  static async generateRecommendations(validatedParams) {
    const catalog = await this.loadDestinationCatalog(
      validatedParams.destination_id,
      validatedParams.starting_location
    );

    // Filter attractions based on user selection, or include top 3 default attractions
    let chosenAttractions = catalog.attractions.filter((a) =>
      validatedParams.attraction_ids.includes(a.id)
    );
    if (chosenAttractions.length === 0) {
      chosenAttractions = catalog.attractions.slice(0, 3);
    }

    const localTransportExpenses = catalog.additionalExpenses.filter(
      (e) => e.expense_category === 'local_transport'
    );
    const activityExpenses = catalog.additionalExpenses.filter((e) =>
      ['activity', 'boat_trip'].includes(e.expense_category)
    );
    const miscExpenses = catalog.additionalExpenses.filter((e) =>
      ['parking', 'misc', 'contingency'].includes(e.expense_category)
    );
    const guideExpenseRow = catalog.additionalExpenses.find(
      (e) => e.expense_category === 'guide_fee'
    );

    const buildAgentFeeObj = () => {
      if (!validatedParams.requires_guide) return null;
      if (guideExpenseRow) {
        return {
          title: guideExpenseRow.title,
          amount_bdt: Number(guideExpenseRow.cost_bdt),
          unit_bdt: Number(guideExpenseRow.cost_bdt),
          days: 1,
          formula: `Selected Tour Guide Service: ৳${Number(guideExpenseRow.cost_bdt).toLocaleString()}`,
          is_verified: guideExpenseRow.is_verified
        };
      }
      return {
        title: 'Estimated Tour Agent / Guide Service Fee',
        amount_bdt: catalog.defaultAgentFeeBdt,
        unit_bdt: catalog.defaultAgentFeeBdt,
        days: 1,
        formula: `Standard Tour Agent Fee: ৳${catalog.defaultAgentFeeBdt.toLocaleString()}`,
        is_verified: 0
      };
    };

    const pickByTier = (list, tierField, desiredTier) => {
      if (!list || list.length === 0) return null;
      const exact = list.find((item) => item[tierField] === desiredTier);
      if (exact) return exact;
      if (desiredTier === 'budget') return list[0];
      if (desiredTier === 'premium') return list[list.length - 1];
      return list[Math.floor(list.length / 2)];
    };

    const pickTransport = (preferredType, desiredTier) => {
      const byType = catalog.transports.filter((t) => t.transport_type === preferredType);
      const poolList = byType.length > 0 ? byType : catalog.transports;
      return pickByTier(poolList, 'comfort_tier', desiredTier);
    };

    // Define 4 rule-based candidate profiles
    const candidateSpecs = [
      {
        key: 'user_match',
        badge: 'Your Exact Preferences',
        plan_title: `${catalog.destination.name} Custom Preference Plan`,
        transport: pickTransport(
          validatedParams.preferred_transport,
          validatedParams.accommodation_category
        ),
        hotelRoom: pickByTier(
          catalog.hotelRooms,
          'category',
          validatedParams.accommodation_category
        ),
        foodPlan: pickByTier(catalog.foodPlans, 'tier', validatedParams.food_preference),
        accommodation_category: validatedParams.accommodation_category,
        food_preference: validatedParams.food_preference,
        isUserPreference: true
      },
      {
        key: 'budget_saver',
        badge: 'Most Economical',
        plan_title: `${catalog.destination.name} Budget Saver Plan`,
        transport: catalog.transports[0] || null,
        hotelRoom: pickByTier(catalog.hotelRooms, 'category', 'budget'),
        foodPlan: pickByTier(catalog.foodPlans, 'tier', 'budget'),
        accommodation_category: 'budget',
        food_preference: 'budget',
        isUserPreference: false
      },
      {
        key: 'standard_balanced',
        badge: 'Best Value Balanced',
        plan_title: `${catalog.destination.name} Standard Comfort Plan`,
        transport: pickTransport(validatedParams.preferred_transport, 'standard'),
        hotelRoom: pickByTier(catalog.hotelRooms, 'category', 'standard'),
        foodPlan: pickByTier(catalog.foodPlans, 'tier', 'standard'),
        accommodation_category: 'standard',
        food_preference: 'standard',
        isUserPreference: false
      },
      {
        key: 'premium_comfort',
        badge: 'Premium Experience',
        plan_title: `${catalog.destination.name} Premium Resort & AC Plan`,
        transport: pickTransport(validatedParams.preferred_transport, 'premium'),
        hotelRoom: pickByTier(catalog.hotelRooms, 'category', 'premium'),
        foodPlan: pickByTier(catalog.foodPlans, 'tier', 'premium'),
        accommodation_category: 'premium',
        food_preference: 'premium',
        isUserPreference: false
      }
    ];

    const generatedPlans = [];
    const seenSignatures = new Set();

    for (const spec of candidateSpecs) {
      const breakdown = computeItineraryBreakdown(validatedParams, {
        transportOption: spec.transport,
        hotelRoom: spec.hotelRoom,
        foodPlan: spec.foodPlan,
        localTransportExpenses,
        attractions: chosenAttractions,
        activityExpenses,
        agentOrGuideFee: buildAgentFeeObj(),
        miscExpenses
      });

      // Deduplicate identical cost + component combinations unless it is the user's primary match
      const sig = `${spec.transport?.id}-${spec.hotelRoom?.id}-${spec.foodPlan?.id}-${breakdown.total_estimated_cost_bdt}`;
      if (seenSignatures.has(sig) && !spec.isUserPreference) {
        continue;
      }
      seenSignatures.add(sig);

      generatedPlans.push({
        key: spec.key,
        badge: spec.badge,
        plan_title: spec.plan_title,
        isUserPreference: spec.isUserPreference,
        preferred_transport: spec.transport ? spec.transport.transport_type : validatedParams.preferred_transport,
        accommodation_category: spec.accommodation_category,
        food_preference: spec.food_preference,
        transportOption: spec.transport,
        hotelRoom: spec.hotelRoom,
        foodPlan: spec.foodPlan,
        breakdown
      });
    }

    // Rule-Based Ranking:
    // 1. Plans that fit within the user's budget come FIRST.
    // 2. Among affordable plans, prioritize the user's exact preference match, then lowest cost.
    // 3. If no plan fits the budget, sort by smallest budget deficit (least expensive first).
    generatedPlans.sort((a, b) => {
      if (a.breakdown.fits_budget !== b.breakdown.fits_budget) {
        return a.breakdown.fits_budget ? -1 : 1;
      }
      if (a.breakdown.fits_budget && b.breakdown.fits_budget) {
        if (a.isUserPreference !== b.isUserPreference) {
          return a.isUserPreference ? -1 : 1;
        }
      }
      return a.breakdown.total_estimated_cost_bdt - b.breakdown.total_estimated_cost_bdt;
    });

    const anyFitsBudget = generatedPlans.some((p) => p.breakdown.fits_budget);

    return {
      destination: catalog.destination,
      recommendations: generatedPlans,
      anyFitsBudget,
      leastExpensivePlan: generatedPlans.reduce(
        (min, cur) =>
          cur.breakdown.total_estimated_cost_bdt < min.breakdown.total_estimated_cost_bdt
            ? cur
            : min,
        generatedPlans[0]
      )
    };
  }
}

module.exports = RecommendationService;