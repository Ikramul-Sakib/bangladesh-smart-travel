const VALID_TRANSPORTS = ['bus', 'train', 'private_car', 'launch', 'flight', 'other'];
const VALID_TIERS = ['budget', 'standard', 'premium'];
const VALID_GROUPS = ['solo', 'family', 'friends', 'group'];

/**
 * Validate travel planning input from query or body
 * @param {Object} input
 */
function validateTravelPlanInput(input) {
  const errors = [];

  const starting_location = (input.starting_location || '').trim();
  const destination_id = Number(input.destination_id);
  const departure_date = (input.departure_date || '').trim();
  const return_date = (input.return_date || '').trim();
  const adults_count = Number(input.adults_count ?? 1);
  const children_count = Number(input.children_count ?? 0);
  const total_budget_bdt = Number(input.total_budget_bdt);

  const preferred_transport = VALID_TRANSPORTS.includes(input.preferred_transport)
    ? input.preferred_transport
    : 'bus';
  const accommodation_category = VALID_TIERS.includes(input.accommodation_category)
    ? input.accommodation_category
    : 'standard';
  const food_preference = VALID_TIERS.includes(input.food_preference)
    ? input.food_preference
    : 'standard';
  const group_type = VALID_GROUPS.includes(input.group_type)
    ? input.group_type
    : 'friends';

  const requires_guide =
    input.requires_guide === '1' ||
    input.requires_guide === 'true' ||
    input.requires_guide === true ||
    input.requires_guide === 'on';

  // Parse selected attraction IDs
  let attraction_ids = [];
  if (Array.isArray(input.attraction_ids)) {
    attraction_ids = input.attraction_ids.map((id) => Number(id)).filter((id) => id > 0);
  } else if (input.attraction_ids) {
    attraction_ids = String(input.attraction_ids)
      .split(',')
      .map((id) => Number(id.trim()))
      .filter((id) => id > 0);
  }

  if (!starting_location || starting_location.length < 2) {
    errors.push('Starting city or location is required.');
  }

  if (!Number.isInteger(destination_id) || destination_id <= 0) {
    errors.push('Please select a valid destination in Bangladesh.');
  }

  const depTime = Date.parse(departure_date);
  const retTime = Date.parse(return_date);

  if (Number.isNaN(depTime)) {
    errors.push('Please provide a valid departure date.');
  }
  if (Number.isNaN(retTime)) {
    errors.push('Please provide a valid return date.');
  }
  if (!Number.isNaN(depTime) && !Number.isNaN(retTime)) {
    if (retTime < depTime) {
      errors.push('Return date cannot be earlier than the departure date.');
    }
    const diffDays = Math.round((retTime - depTime) / (1000 * 60 * 60 * 24));
    if (diffDays > 30) {
      errors.push('Trip duration cannot exceed 30 days in a single calculation.');
    }
  }

  if (!Number.isInteger(adults_count) || adults_count < 1 || adults_count > 100) {
    errors.push('Number of adult travelers must be at least 1.');
  }

  if (!Number.isInteger(children_count) || children_count < 0 || children_count > 50) {
    errors.push('Number of children cannot be negative.');
  }

  const total_travelers = adults_count + children_count;
  if (total_travelers < 1) {
    errors.push('Total traveler count must be at least 1.');
  }

  if (Number.isNaN(total_budget_bdt) || total_budget_bdt <= 0) {
    errors.push('Total travel budget (BDT) must be a positive number.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: {
      starting_location,
      destination_id,
      departure_date,
      return_date,
      adults_count,
      children_count,
      total_travelers,
      total_budget_bdt,
      preferred_transport,
      accommodation_category,
      food_preference,
      group_type,
      requires_guide,
      attraction_ids,
      additional_requirements: (input.additional_requirements || '').trim()
    }
  };
}

module.exports = {
  validateTravelPlanInput
};