const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { validateRegistrationInput, validateLoginInput } = require('../src/validators/authValidator');
const { authorizeRoles } = require('../src/middleware/authorize');
const { validateTravelPlanInput } = require('../src/validators/travelValidator');
const {
  calculateTripDuration,
  computeItineraryBreakdown
} = require('../src/services/travelCostService');
const AgentAvailabilityService = require('../src/services/agentAvailabilityService');
const { toCSV, parseCSV } = require('../src/utils/csvHelper');

describe('Bangladesh Smart Travel Planner - Automated Test Suite', () => {
  // ==========================================================================
  // 1. REGISTRATION & LOGIN VALIDATION
  // ==========================================================================
  describe('1. Registration & Login Validation', () => {
    it('accepts valid tourist registration data', () => {
      const result = validateRegistrationInput({
        full_name: 'Tanvir Ahmed',
        email: 'tanvir@example.com',
        phone: '01712345678',
        password: 'SecurePassword123',
        confirm_password: 'SecurePassword123',
        role: 'tourist'
      });
      assert.equal(result.isValid, true);
      assert.equal(result.sanitizedRole, 'tourist');
    });

    it('rejects agent registration when agency_name is missing or capacity is invalid', () => {
      const result = validateRegistrationInput({
        full_name: 'Rafiq Islam',
        email: 'rafiq@agency.com',
        phone: '01812345678',
        password: 'SecurePassword123',
        confirm_password: 'SecurePassword123',
        role: 'agent',
        agency_name: '',
        base_service_fee_bdt: '2000',
        max_group_capacity: '0'
      });
      assert.equal(result.isValid, false);
      assert.ok(result.errors.some((e) => e.includes('Agency or Tour Operator name is required')));
      assert.ok(result.errors.some((e) => e.includes('Maximum group capacity')));
    });

    it('validates login credentials properly', () => {
      const badLogin = validateLoginInput({ email: 'not-an-email', password: '' });
      assert.equal(badLogin.isValid, false);
      assert.equal(badLogin.errors.length, 2);
    });
  });

  // ==========================================================================
  // 2. ROLE-BASED ACCESS CONTROL (RBAC)
  // ==========================================================================
  describe('2. Server-Side Role-Based Access Control (RBAC)', () => {
    it('allows access when session user role matches allowedRoles', () => {
      const middleware = authorizeRoles('admin');
      const req = { session: { user: { id: 1, role: 'admin' } } };
      const res = {};
      let nextCalled = false;

      middleware(req, res, () => {
        nextCalled = true;
      });
      assert.equal(nextCalled, true);
    });

    it('blocks access with HTTP 403 when a tourist attempts to access an admin route', () => {
      const middleware = authorizeRoles('admin');
      const req = { session: { user: { id: 5, role: 'tourist' } } };
      let statusSet = null;
      let renderedView = null;

      const res = {
        status(code) {
          statusSet = code;
          return this;
        },
        render(view) {
          renderedView = view;
        }
      };

      middleware(req, res, () => {});
      assert.equal(statusSet, 403);
      assert.equal(renderedView, 'errors/500');
    });
  });

  // ==========================================================================
  // 3. TRAVEL FORM VALIDATION & INVALID/MISSING TRAVEL DATA
  // ==========================================================================
  describe('3. Travel Form Validation & Invalid/Missing Data Handling', () => {
    it('accepts valid Dhaka to Coxs Bazar 4-traveler ৳20,000 request', () => {
      const res = validateTravelPlanInput({
        starting_location: 'Dhaka',
        destination_id: '1',
        departure_date: '2026-11-10',
        return_date: '2026-11-12',
        adults_count: '4',
        children_count: '0',
        total_budget_bdt: '20000',
        preferred_transport: 'bus',
        accommodation_category: 'standard',
        food_preference: 'standard',
        group_type: 'friends'
      });
      assert.equal(res.isValid, true);
      assert.equal(res.sanitized.total_travelers, 4);
      assert.equal(res.sanitized.total_budget_bdt, 20000);
    });

    it('rejects when return_date precedes departure_date or budget/travelers are non-positive', () => {
      const res = validateTravelPlanInput({
        starting_location: 'Dhaka',
        destination_id: '1',
        departure_date: '2026-11-15',
        return_date: '2026-11-12',
        adults_count: '0',
        children_count: '0',
        total_budget_bdt: '-5000'
      });
      assert.equal(res.isValid, false);
      assert.ok(res.errors.some((e) => e.includes('Return date cannot be earlier')));
      assert.ok(res.errors.some((e) => e.includes('adult travelers must be at least 1')));
      assert.ok(res.errors.some((e) => e.includes('budget (BDT) must be a positive number')));
    });
  });

  // ==========================================================================
  // 4. HOTEL ROOM & NIGHT CALCULATIONS
  // ==========================================================================
  describe('4. Hotel Room & Night Calculations', () => {
    it('calculates 3 travel days and 2 hotel nights for a 2-night stay', () => {
      const { duration_days, hotel_nights } = calculateTripDuration('2026-12-01', '2026-12-03');
      assert.equal(duration_days, 3);
      assert.equal(hotel_nights, 2);
    });

    it('calculates ceil(travelers / max_guests_per_room) rooms accurately', () => {
      const breakdown = computeItineraryBreakdown(
        {
          departure_date: '2026-12-01',
          return_date: '2026-12-03', // 2 nights, 3 days
          total_travelers: 5,
          total_budget_bdt: 30000,
          requires_guide: false
        },
        {
          hotelRoom: {
            hotel_name: 'Hotel Sea Crown',
            room_type_name: 'Deluxe Twin',
            category: 'standard',
            price_per_night_bdt: 3000,
            max_guests_per_room: 2, // 5 travelers => ceil(5/2) = 3 rooms
            is_verified: 1
          }
        }
      );

      assert.equal(breakdown.rooms_required, 3);
      // 3 rooms * 3000 BDT * 2 nights = 18,000 BDT
      assert.equal(breakdown.accommodation_cost_bdt, 18000);
    });
  });

  // ==========================================================================
  // 5. PER-PERSON TRANSPORTATION, SHARED VEHICLE & FOOD COSTS
  // ==========================================================================
  describe('5. Per-Person Transportation, Shared Vehicle & Food Costs', () => {
    it('calculates per-person round-trip bus fare and daily meal costs accurately', () => {
      const breakdown = computeItineraryBreakdown(
        {
          departure_date: '2026-11-10',
          return_date: '2026-11-12', // 3 days, 2 nights
          total_travelers: 4,
          total_budget_bdt: 25000,
          requires_guide: false
        },
        {
          transportOption: {
            operator_name: 'Hanif Non-AC',
            transport_type: 'bus',
            comfort_tier: 'budget',
            pricing_model: 'per_person',
            one_way_fare_bdt: 1100,
            return_fare_bdt: 2200,
            additional_fees_bdt: 0
          },
          foodPlan: {
            package_name: 'Economy Meal Plan',
            tier: 'budget',
            breakfast_cost_bdt: 100,
            lunch_cost_bdt: 200,
            dinner_cost_bdt: 250,
            snacks_water_cost_bdt: 50 // 600 BDT/person/day
          }
        }
      );

      // Transport: 4 travelers * 2200 BDT = 8,800 BDT
      assert.equal(breakdown.transportation_cost_bdt, 8800);
      // Food: 600 BDT/day * 4 travelers * 3 days = 7,200 BDT
      assert.equal(breakdown.food_cost_bdt, 7200);
    });

    it('calculates shared per_vehicle private car costs based on vehicle capacity', () => {
      const breakdown = computeItineraryBreakdown(
        {
          departure_date: '2026-11-10',
          return_date: '2026-11-11',
          total_travelers: 6,
          total_budget_bdt: 50000,
          requires_guide: false
        },
        {
          transportOption: {
            operator_name: 'Private Sedan Charter',
            transport_type: 'private_car',
            comfort_tier: 'standard',
            pricing_model: 'per_vehicle',
            vehicle_capacity: 4, // 6 travelers => 2 sedans required
            one_way_fare_bdt: 5000,
            return_fare_bdt: 9000,
            additional_fees_bdt: 500 // 9500 per vehicle
          }
        }
      );

      // 2 vehicles * 9500 BDT = 19,000 BDT
      assert.equal(breakdown.transportation_cost_bdt, 19000);
    });
  });

  // ==========================================================================
  // 6. COMPLETE 7-COMPONENT FORMULA, BUDGET FIT & DEFICIT CALCULATION
  // ==========================================================================
  describe('6. Complete 7-Component Formula & Budget Surplus/Deficit', () => {
    it('computes exact Total Trip Cost and reports budget deficit when over budget', () => {
      const breakdown = computeItineraryBreakdown(
        {
          departure_date: '2026-11-10',
          return_date: '2026-11-12', // 3 days, 2 nights
          total_travelers: 4,
          total_budget_bdt: 20000, // User budget: 20,000 BDT
          requires_guide: true
        },
        {
          transportOption: {
            operator_name: 'Bus',
            transport_type: 'bus',
            comfort_tier: 'budget',
            pricing_model: 'per_person',
            one_way_fare_bdt: 1000,
            return_fare_bdt: 2000,
            additional_fees_bdt: 0 // 4 * 2000 = 8,000
          },
          hotelRoom: {
            hotel_name: 'Budget Hotel',
            room_type_name: 'Double',
            category: 'budget',
            price_per_night_bdt: 1500,
            max_guests_per_room: 2 // 2 rooms * 1500 * 2 nights = 6,000
          },
          foodPlan: {
            package_name: 'Basic Food',
            tier: 'budget',
            breakfast_cost_bdt: 100,
            lunch_cost_bdt: 200,
            dinner_cost_bdt: 200,
            snacks_water_cost_bdt: 0 // 500 * 4 * 3 days = 6,000
          },
          localTransportExpenses: [
            { title: 'Auto Sightseeing', pricing_basis: 'per_group_flat', cost_bdt: 1000 } // 1,000
          ],
          attractions: [
            { name: 'Himchari Park', entrance_fee_bdt: 50 } // 4 * 50 = 200
          ],
          activityExpenses: [],
          agentOrGuideFee: { title: 'Tour Agent Fee', amount_bdt: 2000 }, // 2,000
          miscExpenses: [
            { title: 'Misc Contingency', pricing_basis: 'per_group_flat', cost_bdt: 300 } // 300
          ]
        }
      );

      // Total = 8000 + 6000 + 6000 + 1000 + 200 + 2000 + 300 = 23,500 BDT
      assert.equal(breakdown.total_estimated_cost_bdt, 23500);
      assert.equal(breakdown.cost_per_traveler_bdt, 5875);
      assert.equal(breakdown.fits_budget, false);
      assert.equal(breakdown.budget_deficit_bdt, 3500);
      assert.equal(breakdown.remaining_budget_bdt, 0);
    });
  });

  // ==========================================================================
  // 7. AGENT AVAILABILITY, CAPACITY & CONFLICTING BOOKING DETECTION
  // ==========================================================================
  describe('7. Agent Date-Overlap Validation & Conflicting Booking Prevention', () => {
    it('rejects agent booking when a conflicting confirmed booking overlaps the requested dates', async () => {
      // Mock connection simulating an active agent who already has a confirmed booking
      const mockConn = {
        async execute(sql) {
          if (sql.includes('FROM agent_profiles ap')) {
            return [[{ id: 1, user_status: 'active', max_group_capacity: 15 }]];
          }
          if (sql.includes('FROM bookings')) {
            return [[{ id: 99, booking_reference: 'BDT-261110-ABC', departure_date: '2026-11-11', return_date: '2026-11-14' }]];
          }
          return [[]];
        }
      };

      const check = await AgentAvailabilityService.verifyAgentAvailability(
        1,
        '2026-11-10',
        '2026-11-12',
        4,
        mockConn
      );

      assert.equal(check.available, false);
      assert.ok(check.reason.includes('confirmed booking (BDT-261110-ABC) overlapping'));
    });

    it('rejects agent when requested group size exceeds max_group_capacity', async () => {
      const mockConn = {
        async execute(sql) {
          if (sql.includes('FROM agent_profiles ap')) {
            return [[{ id: 2, user_status: 'active', max_group_capacity: 8 }]];
          }
          return [[]];
        }
      };

      const check = await AgentAvailabilityService.verifyAgentAvailability(
        2,
        '2026-12-01',
        '2026-12-03',
        12,
        mockConn
      );

      assert.equal(check.available, false);
      assert.ok(check.reason.includes('exceeds agent maximum capacity'));
    });

    it('approves agent when active, capacity is sufficient, and no date conflicts exist', async () => {
      const mockConn = {
        async execute(sql) {
          if (sql.includes('FROM agent_profiles ap')) {
            return [[{ id: 1, user_status: 'active', max_group_capacity: 16, base_service_fee_bdt: 2000 }]];
          }
          if (sql.includes('COUNT(*) AS total_windows')) {
            return [[{ total_windows: 1 }]];
          }
          if (sql.includes("status = 'available'")) {
            return [[{ id: 10 }]];
          }
          return [[]];
        }
      };

      const check = await AgentAvailabilityService.verifyAgentAvailability(
        1,
        '2026-12-05',
        '2026-12-08',
        6,
        mockConn
      );

      assert.equal(check.available, true);
    });
  });

  // ==========================================================================
  // 8. ADMIN CSV COST IMPORT / EXPORT UTILITY
  // ==========================================================================
  describe('8. Admin Price Management CSV Serialization & Parsing', () => {
    it('exports cost records to CSV and parses them back without data loss', () => {
      const sampleRows = [
        {
          transport_type: 'bus',
          departure_location: 'Dhaka',
          destination_id: '1',
          operator_name: 'Green Line, AC Sleeper',
          one_way_fare_bdt: '2200'
        }
      ];
      const cols = ['transport_type', 'departure_location', 'destination_id', 'operator_name', 'one_way_fare_bdt'];

      const csvText = toCSV(sampleRows, cols);
      const parsed = parseCSV(csvText);

      assert.equal(parsed.length, 1);
      assert.equal(parsed[0].operator_name, 'Green Line, AC Sleeper');
      assert.equal(parsed[0].one_way_fare_bdt, '2200');
    });
  });
});