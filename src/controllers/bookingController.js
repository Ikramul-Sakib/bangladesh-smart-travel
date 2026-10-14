const { pool } = require('../config/database');
const AgentModel = require('../models/agentModel');
const BookingModel = require('../models/bookingModel');
const TripModel = require('../models/tripModel');
const AgentAvailabilityService = require('../services/agentAvailabilityService');

// 1. Render Booking Request Form (/bookings/new)
exports.renderNewBookingForm = async (req, res, next) => {
  try {
    const agentProfileId = Number(req.query.agent_profile_id);
    if (!agentProfileId) {
      req.session.flashError = 'Please select a tour agent first.';
      return res.redirect('/agents');
    }

    const profileData = await AgentModel.getAgentProfileById(agentProfileId);
    if (!profileData) {
      req.session.flashError = 'Selected tour agent was not found.';
      return res.redirect('/agents');
    }

    let linkedPlan = null;
    if (req.query.travel_plan_id) {
      const planData = await TripModel.getTravelPlanById(req.query.travel_plan_id);
      if (planData) linkedPlan = planData.plan;
    }

    const [destinations] = await pool.execute(
      `SELECT id, name FROM destinations WHERE is_active = 1 ORDER BY name ASC`
    );

    const defaultDep = new Date();
    defaultDep.setDate(defaultDep.getDate() + 5);
    const defaultRet = new Date();
    defaultRet.setDate(defaultRet.getDate() + 7);

    const formData = {
      destination_id:
        req.query.destination_id ||
        (linkedPlan ? linkedPlan.destination_id : '') ||
        (profileData.destinations[0] ? profileData.destinations[0].destination_id : ''),
      departure_date:
        req.query.departure_date ||
        (linkedPlan ? new Date(linkedPlan.departure_date).toISOString().split('T')[0] : defaultDep.toISOString().split('T')[0]),
      return_date:
        req.query.return_date ||
        (linkedPlan ? new Date(linkedPlan.return_date).toISOString().split('T')[0] : defaultRet.toISOString().split('T')[0]),
      travelers_count:
        req.query.travelers_count || (linkedPlan ? linkedPlan.total_travelers : 2),
      travel_plan_id: linkedPlan ? linkedPlan.id : ''
    };

    res.render('bookings/new', {
      pageTitle: `Book Tour Agent - ${profileData.agent.agency_name}`,
      agent: profileData.agent,
      agentDestinations: profileData.destinations,
      allDestinations: destinations,
      linkedPlan,
      formData,
      validationErrors: []
    });
  } catch (error) {
    next(error);
  }
};

// 2. Submit Booking Request (Rechecks Availability & Calculates Fee on Server)
exports.submitBookingRequest = async (req, res, next) => {
  try {
    const {
      agent_profile_id,
      destination_id,
      travel_plan_id,
      departure_date,
      return_date,
      travelers_count,
      special_requests
    } = req.body;

    const errors = [];
    if (!departure_date || !return_date || return_date < departure_date) {
      errors.push('Return date must not precede departure date.');
    }
    if (!travelers_count || Number(travelers_count) < 1) {
      errors.push('Number of travelers must be at least 1.');
    }

    // Server-side date-overlap & capacity verification
    const availabilityCheck = await AgentAvailabilityService.verifyAgentAvailability(
      Number(agent_profile_id),
      departure_date,
      return_date,
      Number(travelers_count)
    );

    if (!availabilityCheck.available) {
      errors.push(availabilityCheck.reason);
    }

    if (errors.length > 0) {
      req.session.flashError = errors.join(' ');
      return res.redirect(
        `/bookings/new?agent_profile_id=${agent_profile_id}&destination_id=${destination_id}&departure_date=${departure_date}&return_date=${return_date}&travelers_count=${travelers_count}`
      );
    }

    // Determine exact server-side agent fee for the selected destination
    const [[feeRow]] = await pool.execute(
      `SELECT COALESCE(ad.custom_service_fee_bdt, ap.base_service_fee_bdt) AS effective_fee
       FROM agent_profiles ap
       LEFT JOIN agent_destinations ad ON ap.id = ad.agent_profile_id AND ad.destination_id = ?
       WHERE ap.id = ?`,
      [Number(destination_id), Number(agent_profile_id)]
    );

    const agreed_agent_fee_bdt = Number(feeRow?.effective_fee || availabilityCheck.agent.base_service_fee_bdt);

    // If linked to a saved travel plan, pull its server-calculated trip cost
    let estimated_trip_cost_bdt = agreed_agent_fee_bdt;
    if (travel_plan_id) {
      const planData = await TripModel.getTravelPlanById(Number(travel_plan_id));
      if (planData) {
        estimated_trip_cost_bdt =
          Number(planData.plan.total_estimated_cost_bdt) +
          (planData.plan.agent_fee_bdt > 0 ? 0 : agreed_agent_fee_bdt);
      }
    }

    const { booking_reference } = await BookingModel.createBookingRequest({
      tourist_user_id: req.session.user.id,
      agent_profile_id: Number(agent_profile_id),
      travel_plan_id: travel_plan_id ? Number(travel_plan_id) : null,
      destination_id: Number(destination_id),
      departure_date,
      return_date,
      travelers_count: Number(travelers_count),
      agreed_agent_fee_bdt,
      estimated_trip_cost_bdt,
      special_requests
    });

    req.session.flashSuccess = `Booking request ${booking_reference} submitted! The tour agent will review and confirm your dates.`;
    res.redirect('/bookings');
  } catch (error) {
    next(error);
  }
};

// 3. Tourist Booking History & Status Page (/bookings)
exports.renderTouristBookings = async (req, res, next) => {
  try {
    const { bookings, histories } = await BookingModel.getBookingsForTourist(req.session.user.id);
    res.render('bookings/index', {
      pageTitle: 'My Booking Requests & Tour Status',
      bookings,
      histories
    });
  } catch (error) {
    next(error);
  }
};

// 4. Agent or Admin Updates Booking Status (Accept / Reject / Complete) with Transaction Locking
exports.updateBookingStatus = async (req, res, next) => {
  try {
    const bookingId = Number(req.params.id);
    const { status, note } = req.body;

    if (!['confirmed', 'rejected', 'cancelled', 'completed'].includes(status)) {
      req.session.flashError = 'Invalid booking status transition.';
      return res.redirect('back');
    }

    await AgentAvailabilityService.transitionBookingStatus({
      bookingId,
      newStatus: status,
      actorUserId: req.session.user.id,
      actorRole: req.session.user.role,
      actorAgentProfileId: req.session.user.agent_profile_id,
      note
    });

    req.session.flashSuccess = `Booking #${bookingId} status updated to ${status.toUpperCase()}.`;
    if (req.session.user.role === 'agent') {
      return res.redirect('/agent/dashboard');
    }
    return res.redirect('/admin/bookings');
  } catch (error) {
    req.session.flashError = error.message;
    if (req.session.user && req.session.user.role === 'agent') {
      return res.redirect('/agent/dashboard');
    }
    return res.redirect('/bookings');
  }
};

// 5. Tourist Submits Rating & Review for a Confirmed/Completed Booking
exports.submitReview = async (req, res, next) => {
  try {
    await BookingModel.createReview({
      booking_id: Number(req.params.id),
      tourist_user_id: req.session.user.id,
      rating: Number(req.body.rating),
      comment: req.body.comment
    });
    req.session.flashSuccess = 'Thank you! Your tour agent review has been published.';
    res.redirect('/bookings');
  } catch (error) {
    req.session.flashError = error.message;
    res.redirect('/bookings');
  }
};