const { pool } = require('../config/database');

class AgentModel {
  static async getAgentProfileById(agentProfileId) {
    const [rows] = await pool.execute(
      `SELECT ap.*, u.full_name AS agent_name, u.email, u.phone, u.status AS user_status
       FROM agent_profiles ap
       JOIN users u ON ap.user_id = u.id
       WHERE ap.id = ?
       LIMIT 1`,
      [agentProfileId]
    );
    const agent = rows[0] || null;
    if (!agent) return null;

    const [destinations] = await pool.execute(
      `SELECT ad.*, d.name AS destination_name, d.slug, d.division, d.landscape_type
       FROM agent_destinations ad
       JOIN destinations d ON ad.destination_id = d.id
       WHERE ad.agent_profile_id = ?
       ORDER BY d.name ASC`,
      [agentProfileId]
    );

    const [availabilities] = await pool.execute(
      `SELECT * FROM agent_availabilities
       WHERE agent_profile_id = ?
       ORDER BY start_date ASC`,
      [agentProfileId]
    );

    const [packages] = await pool.execute(
      `SELECT tp.*, d.name AS destination_name
       FROM tour_packages tp
       JOIN destinations d ON tp.destination_id = d.id
       WHERE tp.agent_profile_id = ? AND tp.is_active = 1
       ORDER BY tp.base_price_per_person_bdt ASC`,
      [agentProfileId]
    );

    const [confirmedBookings] = await pool.execute(
      `SELECT departure_date, return_date, booking_reference
       FROM bookings
       WHERE agent_profile_id = ? AND status = 'confirmed' AND return_date >= CURDATE()
       ORDER BY departure_date ASC`,
      [agentProfileId]
    );

    const [reviews] = await pool.execute(
      `SELECT r.*, u.full_name AS tourist_name, d.name AS destination_name
       FROM reviews r
       JOIN users u ON r.tourist_user_id = u.id
       JOIN destinations d ON r.destination_id = d.id
       WHERE r.agent_profile_id = ?
       ORDER BY r.created_at DESC
       LIMIT 10`,
      [agentProfileId]
    );

    return {
      agent,
      destinations,
      availabilities,
      packages,
      confirmedBookings,
      reviews
    };
  }

  static async updateAgentProfile(agentProfileId, data) {
    await pool.execute(
      `UPDATE agent_profiles
       SET agency_name = ?, bio = ?, license_number = ?,
           base_service_fee_bdt = ?, max_group_capacity = ?,
           tour_types = ?, services_offered = ?, languages_spoken = ?
       WHERE id = ?`,
      [
        data.agency_name.trim(),
        data.bio ? data.bio.trim() : null,
        data.license_number ? data.license_number.trim() : null,
        Number(data.base_service_fee_bdt) || 1500,
        Number(data.max_group_capacity) || 10,
        data.tour_types.trim(),
        data.services_offered.trim(),
        data.languages_spoken.trim(),
        agentProfileId
      ]
    );
  }

  static async addAgentDestination(agentProfileId, destinationId, customFee) {
    await pool.execute(
      `INSERT INTO agent_destinations (agent_profile_id, destination_id, custom_service_fee_bdt)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE custom_service_fee_bdt = VALUES(custom_service_fee_bdt)`,
      [
        agentProfileId,
        Number(destinationId),
        customFee && Number(customFee) > 0 ? Number(customFee) : null
      ]
    );
  }

  static async removeAgentDestination(agentProfileId, mappingId) {
    await pool.execute(
      `DELETE FROM agent_destinations WHERE id = ? AND agent_profile_id = ?`,
      [mappingId, agentProfileId]
    );
  }

  static async addAvailabilityWindow(agentProfileId, { start_date, end_date, status, notes }) {
    await pool.execute(
      `INSERT INTO agent_availabilities (agent_profile_id, start_date, end_date, status, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [
        agentProfileId,
        start_date,
        end_date,
        ['available', 'unavailable'].includes(status) ? status : 'available',
        notes ? notes.trim() : null
      ]
    );
  }

  static async deleteAvailabilityWindow(agentProfileId, windowId) {
    await pool.execute(
      `DELETE FROM agent_availabilities WHERE id = ? AND agent_profile_id = ?`,
      [windowId, agentProfileId]
    );
  }

  static async createAgentPackage(agentProfileId, data) {
    await pool.execute(
      `INSERT INTO tour_packages
        (agent_profile_id, destination_id, title, duration_days, nights,
         base_price_per_person_bdt, max_travelers, accommodation_category,
         transport_type, description, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        agentProfileId,
        Number(data.destination_id),
        data.title.trim(),
        Number(data.duration_days) || 3,
        Number(data.nights) || 2,
        Number(data.base_price_per_person_bdt),
        Number(data.max_travelers) || 12,
        data.accommodation_category || 'standard',
        data.transport_type || 'bus',
        data.description ? data.description.trim() : null
      ]
    );
  }

  static async deleteAgentPackage(agentProfileId, packageId) {
    await pool.execute(
      `DELETE FROM tour_packages WHERE id = ? AND agent_profile_id = ?`,
      [packageId, agentProfileId]
    );
  }
}

module.exports = AgentModel;