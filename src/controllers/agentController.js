const { pool } = require('../config/database');
const AgentModel = require('../models/agentModel');
const BookingModel = require('../models/bookingModel');
const AgentAvailabilityService = require('../services/agentAvailabilityService');

// 1. Public Tour Agent Directory with Destination & Date Filtering
exports.renderAgentDirectory = async (req, res, next) => {
  try {
    const filters = {
      destination_id: req.query.destination_id || '',
      departure_date: req.query.departure_date || '',
      return_date: req.query.return_date || '',
      travelers_count: req.query.travelers_count || '',
      max_service_fee_bdt: req.query.max_service_fee_bdt || '',
      tour_type: req.query.tour_type || '',
      service_keyword: req.query.service_keyword || '',
      language: req.query.language || '',
      min_rating: req.query.min_rating || '',
      travel_plan_id: req.query.travel_plan_id || ''
    };

    const [destinations] = await pool.execute(
      `SELECT id, name, division FROM destinations WHERE is_active = 1 ORDER BY name ASC`
    );

    const agents = await AgentAvailabilityService.searchAvailableAgents(filters);

    res.render('agents/index', {
      pageTitle: 'Find Available Tour Agents by Destination & Date',
      destinations,
      agents,
      filters
    });
  } catch (error) {
    next(error);
  }
};

// 2. Public Agent Profile & Availability Schedule
exports.renderAgentProfile = async (req, res, next) => {
  try {
    const data = await AgentModel.getAgentProfileById(req.params.id);
    if (!data) {
      return res.status(404).render('errors/404', {
        pageTitle: 'Tour Agent Not Found',
        requestedUrl: req.originalUrl
      });
    }

    res.render('agents/profile', {
      pageTitle: `${data.agent.agency_name} - Tour Agent Profile & Availability`,
      ...data,
      queryContext: {
        destination_id: req.query.destination_id || '',
        departure_date: req.query.departure_date || '',
        return_date: req.query.return_date || '',
        travelers_count: req.query.travelers_count || 2,
        travel_plan_id: req.query.travel_plan_id || ''
      }
    });
  } catch (error) {
    next(error);
  }
};

// 3. Tour Agent Dashboard
exports.renderAgentDashboard = async (req, res, next) => {
  try {
    const agentProfileId = req.session.user.agent_profile_id;
    if (!agentProfileId) {
      req.session.flashError = 'Agent profile not found for this account.';
      return res.redirect('/');
    }

    const [profileData, bookings, [allDestinations]] = await Promise.all([
      AgentModel.getAgentProfileById(agentProfileId),
      BookingModel.getBookingsForAgent(agentProfileId),
      pool.execute(`SELECT id, name, division FROM destinations WHERE is_active = 1 ORDER BY name ASC`)
    ]);

    res.render('agents/dashboard', {
      pageTitle: 'Tour Agent Management Portal',
      ...profileData,
      bookings,
      allDestinations
    });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const agentProfileId = req.session.user.agent_profile_id;
    await AgentModel.updateAgentProfile(agentProfileId, req.body);
    req.session.flashSuccess = 'Agency profile updated successfully.';
    res.redirect('/agent/dashboard');
  } catch (error) {
    next(error);
  }
};

exports.addDestination = async (req, res, next) => {
  try {
    const agentProfileId = req.session.user.agent_profile_id;
    await AgentModel.addAgentDestination(
      agentProfileId,
      req.body.destination_id,
      req.body.custom_service_fee_bdt
    );
    req.session.flashSuccess = 'Destination added to your service coverage.';
    res.redirect('/agent/dashboard');
  } catch (error) {
    next(error);
  }
};

exports.removeDestination = async (req, res, next) => {
  try {
    const agentProfileId = req.session.user.agent_profile_id;
    await AgentModel.removeAgentDestination(agentProfileId, req.params.id);
    req.session.flashSuccess = 'Destination removed from your service list.';
    res.redirect('/agent/dashboard');
  } catch (error) {
    next(error);
  }
};

exports.addAvailability = async (req, res, next) => {
  try {
    const { start_date, end_date, status, notes } = req.body;
    if (!start_date || !end_date || end_date < start_date) {
      req.session.flashError = 'End date must not precede start date.';
      return res.redirect('/agent/dashboard');
    }
    await AgentModel.addAvailabilityWindow(req.session.user.agent_profile_id, {
      start_date,
      end_date,
      status,
      notes
    });
    req.session.flashSuccess = 'Availability schedule updated.';
    res.redirect('/agent/dashboard');
  } catch (error) {
    next(error);
  }
};

exports.deleteAvailability = async (req, res, next) => {
  try {
    await AgentModel.deleteAvailabilityWindow(req.session.user.agent_profile_id, req.params.id);
    req.session.flashSuccess = 'Schedule entry removed.';
    res.redirect('/agent/dashboard');
  } catch (error) {
    next(error);
  }
};

exports.createPackage = async (req, res, next) => {
  try {
    await AgentModel.createAgentPackage(req.session.user.agent_profile_id, req.body);
    req.session.flashSuccess = 'Tour package added to your profile.';
    res.redirect('/agent/dashboard');
  } catch (error) {
    next(error);
  }
};

exports.deletePackage = async (req, res, next) => {
  try {
    await AgentModel.deleteAgentPackage(req.session.user.agent_profile_id, req.params.id);
    req.session.flashSuccess = 'Tour package removed.';
    res.redirect('/agent/dashboard');
  } catch (error) {
    next(error);
  }
};