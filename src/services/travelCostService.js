/**
 * Calculate trip duration (days) and hotel nights from departure and return dates
 * Example: 2026-11-10 to 2026-11-12 => 2 hotel nights, 3 travel days
 * Same-day return: 0 hotel nights, 1 travel day
 */
function calculateTripDuration(departureDateStr, returnDateStr) {
  const dep = new Date(departureDateStr);
  const ret = new Date(returnDateStr);
  const diffMs = ret.getTime() - dep.getTime();
  const diffDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));

  const hotel_nights = diffDays;
  const duration_days = diffDays + 1;

  return { duration_days, hotel_nights };
}

/**
 * Compute exact expense breakdown for a single itinerary configuration
 * @param {Object} params - Validated user trip parameters
 * @param {Object} components - Selected DB records for transport, hotelRoom, foodPlan, attractions, additionalExpenses, agentFee
 */
function computeItineraryBreakdown(params, components) {
  const { duration_days, hotel_nights } = calculateTripDuration(
    params.departure_date,
    params.return_date
  );
  const totalTravelers = Number(params.total_travelers);
  const budgetBdt = Number(params.total_budget_bdt);

  const lineItems = [];

  // --------------------------------------------------------------------------
  // 1. TRANSPORTATION COST
  // --------------------------------------------------------------------------
  let transportation_cost_bdt = 0;
  const transport = components.transportOption;

  if (transport) {
    const oneWay = Number(transport.one_way_fare_bdt);
    const roundTripUnit =
      transport.return_fare_bdt && Number(transport.return_fare_bdt) > 0
        ? Number(transport.return_fare_bdt)
        : oneWay * 2;
    const extraFee = Number(transport.additional_fees_bdt || 0);

    if (transport.pricing_model === 'per_vehicle') {
      const cap = Math.max(1, Number(transport.vehicle_capacity || 4));
      const vehiclesNeeded = Math.ceil(totalTravelers / cap);
      const unitVehicleCost = roundTripUnit + extraFee;
      transportation_cost_bdt = vehiclesNeeded * unitVehicleCost;

      lineItems.push({
        cost_component: 'transportation',
        item_title: `${transport.operator_name} (${transport.transport_type.toUpperCase()} - Shared Vehicle)`,
        unit_price_bdt: unitVehicleCost,
        quantity: vehiclesNeeded,
        multiplier_days_or_nights: 1,
        subtotal_bdt: transportation_cost_bdt,
        calculation_formula: `${vehiclesNeeded} vehicle(s) × ৳${unitVehicleCost.toLocaleString()} round-trip`,
        is_verified_price: transport.is_verified ? 1 : 0
      });
    } else {
      const perPersonRoundTrip = roundTripUnit + extraFee;
      transportation_cost_bdt = perPersonRoundTrip * totalTravelers;

      lineItems.push({
        cost_component: 'transportation',
        item_title: `${transport.operator_name} (${transport.transport_type.toUpperCase()} - ${transport.comfort_tier})`,
        unit_price_bdt: perPersonRoundTrip,
        quantity: totalTravelers,
        multiplier_days_or_nights: 1,
        subtotal_bdt: transportation_cost_bdt,
        calculation_formula: `${totalTravelers} travelers × ৳${perPersonRoundTrip.toLocaleString()} round-trip fare`,
        is_verified_price: transport.is_verified ? 1 : 0
      });
    }
  }

  // --------------------------------------------------------------------------
  // 2. ACCOMMODATION COST (rooms × price_per_night × hotel_nights)
  // --------------------------------------------------------------------------
  let accommodation_cost_bdt = 0;
  let rooms_required = 0;
  const hotelRoom = components.hotelRoom;

  if (hotel_nights > 0 && hotelRoom) {
    const maxGuests = Math.max(1, Number(hotelRoom.max_guests_per_room || 2));
    rooms_required = Math.ceil(totalTravelers / maxGuests);
    const nightlyRate = Number(hotelRoom.price_per_night_bdt);
    accommodation_cost_bdt = rooms_required * nightlyRate * hotel_nights;

    lineItems.push({
      cost_component: 'accommodation',
      item_title: `${hotelRoom.hotel_name} - ${hotelRoom.room_type_name} (${hotelRoom.category})`,
      unit_price_bdt: nightlyRate,
      quantity: rooms_required,
      multiplier_days_or_nights: hotel_nights,
      subtotal_bdt: accommodation_cost_bdt,
      calculation_formula: `${rooms_required} room(s) × ৳${nightlyRate.toLocaleString()}/night × ${hotel_nights} night(s)`,
      is_verified_price: hotelRoom.is_verified ? 1 : 0
    });
  }

  // --------------------------------------------------------------------------
  // 3. FOOD COST (daily_meal_cost × total_travelers × duration_days)
  // --------------------------------------------------------------------------
  let food_cost_bdt = 0;
  const foodPlan = components.foodPlan;

  if (foodPlan) {
    const dailyPerPerson =
      Number(foodPlan.breakfast_cost_bdt) +
      Number(foodPlan.lunch_cost_bdt) +
      Number(foodPlan.dinner_cost_bdt) +
      Number(foodPlan.snacks_water_cost_bdt);

    food_cost_bdt = dailyPerPerson * totalTravelers * duration_days;

    lineItems.push({
      cost_component: 'food',
      item_title: `${foodPlan.package_name} (${foodPlan.tier.toUpperCase()} Tier: Breakfast, Lunch, Dinner & Water)`,
      unit_price_bdt: dailyPerPerson,
      quantity: totalTravelers,
      multiplier_days_or_nights: duration_days,
      subtotal_bdt: food_cost_bdt,
      calculation_formula: `৳${dailyPerPerson.toLocaleString()}/person/day × ${totalTravelers} travelers × ${duration_days} day(s)`,
      is_verified_price: foodPlan.is_verified ? 1 : 0
    });
  }

  // --------------------------------------------------------------------------
  // 4. LOCAL TRANSPORTATION COST
  // --------------------------------------------------------------------------
  let local_transport_cost_bdt = 0;
  const localTransports = components.localTransportExpenses || [];

  for (const item of localTransports) {
    const sub = calculateAdditionalExpenseItem(item, totalTravelers, duration_days);
    local_transport_cost_bdt += sub.subtotal_bdt;
    lineItems.push({
      cost_component: 'local_transport',
      item_title: item.title,
      unit_price_bdt: Number(item.cost_bdt),
      quantity: sub.quantity,
      multiplier_days_or_nights: sub.multiplier,
      subtotal_bdt: sub.subtotal_bdt,
      calculation_formula: sub.formula,
      is_verified_price: item.is_verified ? 1 : 0
    });
  }

  // --------------------------------------------------------------------------
  // 5. ACTIVITIES & ATTRACTION ENTRANCE FEES
  // --------------------------------------------------------------------------
  let activity_cost_bdt = 0;
  const selectedAttractions = components.attractions || [];

  for (const attr of selectedAttractions) {
    const fee = Number(attr.entrance_fee_bdt || 0);
    const sub = fee * totalTravelers;
    activity_cost_bdt += sub;

    lineItems.push({
      cost_component: 'activity',
      item_title: `Attraction Entry: ${attr.name}`,
      unit_price_bdt: fee,
      quantity: totalTravelers,
      multiplier_days_or_nights: 1,
      subtotal_bdt: sub,
      calculation_formula: `${totalTravelers} travelers × ৳${fee.toLocaleString()} entry fee`,
      is_verified_price: attr.is_verified ? 1 : 0
    });
  }

  const activityExpenses = components.activityExpenses || [];
  for (const act of activityExpenses) {
    const sub = calculateAdditionalExpenseItem(act, totalTravelers, duration_days);
    activity_cost_bdt += sub.subtotal_bdt;
    lineItems.push({
      cost_component: 'activity',
      item_title: act.title,
      unit_price_bdt: Number(act.cost_bdt),
      quantity: sub.quantity,
      multiplier_days_or_nights: sub.multiplier,
      subtotal_bdt: sub.subtotal_bdt,
      calculation_formula: sub.formula,
      is_verified_price: act.is_verified ? 1 : 0
    });
  }

  // --------------------------------------------------------------------------
  // 6. TOUR AGENT / GUIDE FEES (Included only when requested)
  // --------------------------------------------------------------------------
  let agent_fee_bdt = 0;
  if (params.requires_guide && components.agentOrGuideFee) {
    const feeObj = components.agentOrGuideFee;
    agent_fee_bdt = Number(feeObj.amount_bdt);

    lineItems.push({
      cost_component: 'agent_fee',
      item_title: feeObj.title || 'Tour Agent / Local Guide Service Fee',
      unit_price_bdt: Number(feeObj.unit_bdt || feeObj.amount_bdt),
      quantity: 1,
      multiplier_days_or_nights: feeObj.days || 1,
      subtotal_bdt: agent_fee_bdt,
      calculation_formula: feeObj.formula || `Flat Tour Agent Service Charge: ৳${agent_fee_bdt.toLocaleString()}`,
      is_verified_price: feeObj.is_verified ? 1 : 0
    });
  }

  // --------------------------------------------------------------------------
  // 7. ADDITIONAL / MISCELLANEOUS EXPENSES (Avoid duplicates)
  // --------------------------------------------------------------------------
  let misc_cost_bdt = 0;
  const miscExpenses = components.miscExpenses || [];

  for (const misc of miscExpenses) {
    const sub = calculateAdditionalExpenseItem(misc, totalTravelers, duration_days);
    misc_cost_bdt += sub.subtotal_bdt;
    lineItems.push({
      cost_component: 'additional',
      item_title: misc.title,
      unit_price_bdt: Number(misc.cost_bdt),
      quantity: sub.quantity,
      multiplier_days_or_nights: sub.multiplier,
      subtotal_bdt: sub.subtotal_bdt,
      calculation_formula: sub.formula,
      is_verified_price: misc.is_verified ? 1 : 0
    });
  }

  // --------------------------------------------------------------------------
  // TOTAL TRIP COST FORMULA
  // --------------------------------------------------------------------------
  const total_estimated_cost_bdt = Number(
    (
      transportation_cost_bdt +
      accommodation_cost_bdt +
      food_cost_bdt +
      local_transport_cost_bdt +
      activity_cost_bdt +
      agent_fee_bdt +
      misc_cost_bdt
    ).toFixed(2)
  );

  const cost_per_traveler_bdt = Number((total_estimated_cost_bdt / totalTravelers).toFixed(2));
  const budget_difference_bdt = Number((budgetBdt - total_estimated_cost_bdt).toFixed(2));
  const fits_budget = total_estimated_cost_bdt <= budgetBdt;

  return {
    duration_days,
    hotel_nights,
    rooms_required,
    transportation_cost_bdt,
    accommodation_cost_bdt,
    food_cost_bdt,
    local_transport_cost_bdt,
    activity_cost_bdt,
    agent_fee_bdt,
    misc_cost_bdt,
    total_estimated_cost_bdt,
    cost_per_traveler_bdt,
    total_budget_bdt: budgetBdt,
    budget_difference_bdt,
    remaining_budget_bdt: fits_budget ? budget_difference_bdt : 0,
    budget_deficit_bdt: fits_budget ? 0 : Math.abs(budget_difference_bdt),
    fits_budget,
    lineItems
  };
}

/**
 * Helper to compute an additional_expenses row according to its pricing_basis
 */
function calculateAdditionalExpenseItem(item, totalTravelers, durationDays) {
  const unit = Number(item.cost_bdt || 0);
  const basis = item.pricing_basis;

  if (basis === 'per_person_per_day') {
    return {
      quantity: totalTravelers,
      multiplier: durationDays,
      subtotal_bdt: unit * totalTravelers * durationDays,
      formula: `৳${unit.toLocaleString()}/person/day × ${totalTravelers} travelers × ${durationDays} day(s)`
    };
  }
  if (basis === 'per_person_flat') {
    return {
      quantity: totalTravelers,
      multiplier: 1,
      subtotal_bdt: unit * totalTravelers,
      formula: `৳${unit.toLocaleString()}/person × ${totalTravelers} travelers`
    };
  }
  if (basis === 'per_group_per_day') {
    return {
      quantity: 1,
      multiplier: durationDays,
      subtotal_bdt: unit * durationDays,
      formula: `৳${unit.toLocaleString()}/group/day × ${durationDays} day(s)`
    };
  }
  // default: per_group_flat
  return {
    quantity: 1,
    multiplier: 1,
    subtotal_bdt: unit,
    formula: `Flat group charge: ৳${unit.toLocaleString()}`
  };
}

module.exports = {
  calculateTripDuration,
  computeItineraryBreakdown,
  calculateAdditionalExpenseItem
};