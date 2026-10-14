const { pool, withTransaction } = require('../config/database');

class AgentAvailabilityService {
  /**
   * Check whether a specific agent is free for the entire [departureDate, returnDate] window
   * and has sufficient group capacity.
   * @param {number} agentProfileId
   * @param {string} departureDate - YYYY-MM-DD
   * @param {string} returnDate - YYYY-MM-DD
   * @param {number} travelersCount
   * @param {Object} [externalConnection] - Optional transaction connection
   */
  static async verifyAgentAvailability(
    agentProfileId,
    departureDate,
    returnDate,
    travelersCount = 1,
    externalConnection = null
  ) {
    const db = externalConnection || pool;

    // 1. Check agent profile active status & group capacity
    const [agentRows] = await db.execute(
      `SELECT ap.*, u.full_name, u.status AS user_status
       FROM agent_profiles ap
       JOIN users u ON ap.user_id = u.id
       WHERE ap.id = ?
       LIMIT 1`,
      [agentProfileId]
    );

    const agent = agentRows[0];
    if (!agent || agent.user_status !== 'active') {
      return {
        available: false,
        reason: 'Tour agent account is not active.'
      };
    }

    if (Number(travelersCount) > Number(agent.max_group_capacity)) {
      return {
        available: false,
        reason: `Group size (${travelersCount}) exceeds agent maximum capacity (${agent.max_group_capacity}).`
      };
    }

    // 2. Check for any overlapping 'confirmed' bookings
    // Overlap condition: existing.departure_date <= requested.return_date AND existing.return_date >= requested.departure_date
    const [conflictingBookings] = await db.execute(
      `SELECT id, booking_reference, departure_date, return_date
       FROM bookings
       WHERE agent_profile_id = ?
         AND status = 'confirmed'
         AND departure_date <= ?
         AND return_date >= ?
       LIMIT 1`,
      [agentProfileId, returnDate, departureDate]
    );

    if (conflictingBookings.length > 0) {
      const conflict = conflictingBookings[0];
      return {
        available: false,
        reason: `Agent already has a confirmed booking (${conflict.booking_reference}) overlapping those dates.`
      };
    }

    // 3. Check for any explicit 'unavailable' or 'booked' blocks in agent_availabilities
    const [blockedWindows] = await db.execute(
      `SELECT id, start_date, end_date, status, notes
       FROM agent_availabilities
       WHERE agent_profile_id = ?
         AND status IN ('unavailable', 'booked')
         AND start_date <= ?
         AND end_date >= ?
       LIMIT 1`,
      [agentProfileId, returnDate, departureDate]
    );

    if (blockedWindows.length > 0) {
      return {
        available: false,
        reason: 'Agent has marked these dates as unavailable on their schedule.'
      };
    }

    // 4. If the agent maintains explicit 'available' date ranges, verify that if any future available
    // windows exist, at least one covers the full [departureDate, returnDate] span (or allow if no windows are set yet)
    const [allAvailWindows] = await db.execute(
      `SELECT COUNT(*) AS total_windows
       FROM agent_availabilities
       WHERE agent_profile_id = ? AND status = 'available'`,
      [agentProfileId]
    );

    if (Number(allAvailWindows[0].total_windows) > 0) {
      const [coveringWindows] = await db.execute(
        `SELECT id
         FROM agent_availabilities
         WHERE agent_profile_id = ?
           AND status = 'available'
           AND start_date <= ?
           AND end_date >= ?
         LIMIT 1`,
        [agentProfileId, departureDate, returnDate]
      );

      if (coveringWindows.length === 0) {
        return {
          available: false,
          reason: 'Requested travel dates fall outside the agent’s published available date windows.'
        };
      }
    }

    return {
      available: true,
      agent
    };
  }

  /**
   * Filter available tour agents by Destination, Date Range, Group Capacity, Max Fee,
   * Tour Type, Services Offered, Language, and Minimum Rating.
   */
  static async searchAvailableAgents(filters = {}) {
    const {
      destination_id = '',
      departure_date = '',
      return_date = '',
      travelers_count = '',
      max_service_fee_bdt = '',
      tour_type = '',
      service_keyword = '',
      language = '',
      min_rating = ''
    } = filters;

    let sql = `
      SELECT DISTINCT
        ap.id AS agent_profile_id,
        ap.user_id,
        u.full_name AS agent_name,
        u.phone,
        u.email,
        ap.agency_name,
        ap.bio,
        ap.profile_image,
        ap.base_service_fee_bdt,
        COALESCE(ad.custom_service_fee_bdt, ap.base_service_fee_bdt) AS effective_service_fee_bdt,
        ap.max_group_capacity,
        ap.tour_types,
        ap.services_offered,
        ap.languages_spoken,
        ap.is_verified,
        ap.rating_avg,
        ap.review_count
      FROM agent_profiles ap
      JOIN users u ON ap.user_id = u.id
      LEFT JOIN agent_destinations ad ON ap.id = ad.agent_profile_id
        ${destination_id ? 'AND ad.destination_id = ?' : ''}
      WHERE u.status = 'active'
    `;

    const params = [];
    if (destination_id) {
      params.push(Number(destination_id));
      sql += ` AND ad.destination_id = ?`;
      params.push(Number(destination_id));
    }

    if (travelers_count && Number(travelers_count) > 0) {
      sql += ` AND ap.max_group_capacity >= ?`;
      params.push(Number(travelers_count));
    }

    if (max_service_fee_bdt && Number(max_service_fee_bdt) > 0) {
      sql += ` AND COALESCE(ad.custom_service_fee_bdt, ap.base_service_fee_bdt) <= ?`;
      params.push(Number(max_service_fee_bdt));
    }

    if (tour_type && tour_type.trim()) {
      sql += ` AND ap.tour_types LIKE ?`;
      params.push(`%${tour_type.trim()}%`);
    }

    if (service_keyword && service_keyword.trim()) {
      sql += ` AND ap.services_offered LIKE ?`;
      params.push(`%${service_keyword.trim()}%`);
    }

    if (language && language.trim()) {
      sql += ` AND ap.languages_spoken LIKE ?`;
      params.push(`%${language.trim()}%`);
    }

    if (min_rating && Number(min_rating) > 0) {
      sql += ` AND ap.rating_avg >= ?`;
      params.push(Number(min_rating));
    }

    // Date-overlap exclusion directly in SQL when both dates are provided
    if (departure_date && return_date) {
      // Exclude agents with overlapping confirmed bookings
      sql += `
        AND NOT EXISTS (
          SELECT 1 FROM bookings b
          WHERE b.agent_profile_id = ap.id
            AND b.status = 'confirmed'
            AND b.departure_date <= ?
            AND b.return_date >= ?
        )
      `;
      params.push(return_date, departure_date);

      // Exclude agents with overlapping unavailable/booked schedule entries
      sql += `
        AND NOT EXISTS (
          SELECT 1 FROM agent_availabilities aa
          WHERE aa.agent_profile_id = ap.id
            AND aa.status IN ('unavailable', 'booked')
            AND aa.start_date <= ?
            AND aa.end_date >= ?
        )
      `;
      params.push(return_date, departure_date);

      // Require covering 'available' window if the agent has defined any 'available' windows
      sql += `
        AND (
          NOT EXISTS (
            SELECT 1 FROM agent_availabilities aa_any
            WHERE aa_any.agent_profile_id = ap.id AND aa_any.status = 'available'
          )
          OR EXISTS (
            SELECT 1 FROM agent_availabilities aa_cov
            WHERE aa_cov.agent_profile_id = ap.id
              AND aa_cov.status = 'available'
              AND aa_cov.start_date <= ?
              AND aa_cov.end_date >= ?
          )
        )
      `;
      params.push(departure_date, return_date);
    }

    sql += ` ORDER BY ap.is_verified DESC, ap.rating_avg DESC, effective_service_fee_bdt ASC`;

    const [agents] = await pool.execute(sql, params);

    if (agents.length === 0) return [];

    // Enrich each agent card with destinations served & upcoming available windows
    const agentIds = agents.map((a) => a.agent_profile_id);
    const placeholders = agentIds.map(() => '?').join(',');

    const [destMappings] = await pool.execute(
      `SELECT ad.agent_profile_id, d.id AS destination_id, d.name AS destination_name, ad.custom_service_fee_bdt
       FROM agent_destinations ad
       JOIN destinations d ON ad.destination_id = d.id
       WHERE ad.agent_profile_id IN (${placeholders})
       ORDER BY d.name ASC`,
      agentIds
    );

    const [availRows] = await pool.execute(
      `SELECT agent_profile_id, start_date, end_date, status
       FROM agent_availabilities
       WHERE agent_profile_id IN (${placeholders})
         AND status = 'available'
         AND end_date >= CURDATE()
       ORDER BY start_date ASC`,
      agentIds
    );

    return agents.map((agent) => ({
      ...agent,
      destinations_served: destMappings.filter((m) => m.agent_profile_id === agent.agent_profile_id),
      available_windows: availRows.filter((w) => w.agent_profile_id === agent.agent_profile_id)
    }));
  }

  /**
   * Atomically confirm or reject a booking request inside a transaction with row locking
   * Prevents race conditions and overlapping confirmed bookings.
   */
  static async transitionBookingStatus({
    bookingId,
    newStatus,
    actorUserId,
    actorRole,
    actorAgentProfileId,
    note = ''
  }) {
    return withTransaction(async (conn) => {
      // 1. Lock the booking row AND the agent_profiles row to serialize concurrent confirmations
      const [bookingRows] = await conn.execute(
        `SELECT b.*, ap.id AS locked_agent_id
         FROM bookings b
         JOIN agent_profiles ap ON b.agent_profile_id = ap.id
         WHERE b.id = ?
         FOR UPDATE`,
        [bookingId]
      );

      const booking = bookingRows[0];
      if (!booking) {
        throw new Error('Booking request not found.');
      }

      // Authorization check: only the assigned agent or an admin can confirm/reject
      if (actorRole === 'agent' && Number(booking.agent_profile_id) !== Number(actorAgentProfileId)) {
        const err = new Error('Unauthorized: You can only manage bookings assigned to your agency.');
        err.statusCode = 403;
        throw err;
      }

      const oldStatus = booking.status;
      if (oldStatus === newStatus) {
        return booking;
      }

      // 2. If transitioning to 'confirmed', re-verify no overlapping confirmed booking exists
      if (newStatus === 'confirmed') {
        const depDateStr = new Date(booking.departure_date).toISOString().split('T')[0];
        const retDateStr = new Date(booking.return_date).toISOString().split('T')[0];

        const [conflicts] = await conn.execute(
          `SELECT id, booking_reference, departure_date, return_date
           FROM bookings
           WHERE agent_profile_id = ?
             AND id != ?
             AND status = 'confirmed'
             AND departure_date <= ?
             AND return_date >= ?
           FOR UPDATE`,
          [booking.agent_profile_id, booking.id, retDateStr, depDateStr]
        );

        if (conflicts.length > 0) {
          throw new Error(
            `Cannot confirm booking: Overlapping confirmed tour (${conflicts[0].booking_reference}) already exists for these dates.`
          );
        }

        // Update booking status to confirmed
        await conn.execute(
          `UPDATE bookings
           SET status = 'confirmed', confirmed_at = NOW()
           WHERE id = ?`,
          [booking.id]
        );

        // Record an explicit 'booked' block in agent_availabilities for calendar clarity
        await conn.execute(
          `INSERT INTO agent_availabilities (agent_profile_id, start_date, end_date, status, notes)
           VALUES (?, ?, ?, 'booked', ?)`,
          [
            booking.agent_profile_id,
            depDateStr,
            retDateStr,
            `Confirmed Booking ${booking.booking_reference}`
          ]
        );
      } else {
        await conn.execute(`UPDATE bookings SET status = ? WHERE id = ?`, [
          newStatus,
          booking.id
        ]);
      }

      // 3. Append audit trail to booking_status_histories
      await conn.execute(
        `INSERT INTO booking_status_histories
          (booking_id, old_status, new_status, changed_by_user_id, note)
         VALUES (?, ?, ?, ?, ?)`,
        [
          booking.id,
          oldStatus,
          newStatus,
          actorUserId,
          note || `Status changed from ${oldStatus} to ${newStatus}`
        ]
      );

      return { ...booking, status: newStatus };
    });
  }
}

module.exports = AgentAvailabilityService;