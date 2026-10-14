const crypto = require('crypto');
const { pool, withTransaction } = require('../config/database');

class BookingModel {
  static generateBookingReference() {
    const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
    const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    return `BDT-${datePart}-${rand}`;
  }

  static async createBookingRequest({
    tourist_user_id,
    agent_profile_id,
    travel_plan_id,
    destination_id,
    departure_date,
    return_date,
    travelers_count,
    agreed_agent_fee_bdt,
    estimated_trip_cost_bdt,
    special_requests
  }) {
    return withTransaction(async (conn) => {
      const booking_reference = this.generateBookingReference();

      const [res] = await conn.execute(
        `INSERT INTO bookings
          (booking_reference, tourist_user_id, agent_profile_id, travel_plan_id,
           destination_id, departure_date, return_date, travelers_count,
           agreed_agent_fee_bdt, estimated_trip_cost_bdt, special_requests, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          booking_reference,
          tourist_user_id,
          agent_profile_id,
          travel_plan_id || null,
          destination_id,
          departure_date,
          return_date,
          travelers_count,
          agreed_agent_fee_bdt,
          estimated_trip_cost_bdt,
          special_requests || null
        ]
      );

      const bookingId = res.insertId;

      await conn.execute(
        `INSERT INTO booking_status_histories
          (booking_id, old_status, new_status, changed_by_user_id, note)
         VALUES (?, NULL, 'pending', ?, 'Tourist submitted booking request')`,
        [bookingId, tourist_user_id]
      );

      if (travel_plan_id) {
        await conn.execute(
          `UPDATE travel_plans SET status = 'booked' WHERE id = ? AND user_id = ?`,
          [travel_plan_id, tourist_user_id]
        );
      }

      return { bookingId, booking_reference };
    });
  }

  static async getBookingsForTourist(touristUserId) {
    const [bookings] = await pool.execute(
      `SELECT b.*, d.name AS destination_name,
              ap.agency_name, u.full_name AS agent_name, u.phone AS agent_phone,
              r.id AS review_id, r.rating AS review_rating
       FROM bookings b
       JOIN destinations d ON b.destination_id = d.id
       JOIN agent_profiles ap ON b.agent_profile_id = ap.id
       JOIN users u ON ap.user_id = u.id
       LEFT JOIN reviews r ON b.id = r.booking_id
       WHERE b.tourist_user_id = ?
       ORDER BY b.created_at DESC`,
      [touristUserId]
    );

    const [histories] = await pool.execute(
      `SELECT bsh.*, u.full_name AS actor_name
       FROM booking_status_histories bsh
       JOIN bookings b ON bsh.booking_id = b.id
       JOIN users u ON bsh.changed_by_user_id = u.id
       WHERE b.tourist_user_id = ?
       ORDER BY bsh.created_at ASC`,
      [touristUserId]
    );

    return { bookings, histories };
  }

  static async getBookingsForAgent(agentProfileId) {
    const [bookings] = await pool.execute(
      `SELECT b.*, d.name AS destination_name,
              u.full_name AS tourist_name, u.phone AS tourist_phone, u.email AS tourist_email
       FROM bookings b
       JOIN destinations d ON b.destination_id = d.id
       JOIN users u ON b.tourist_user_id = u.id
       WHERE b.agent_profile_id = ?
       ORDER BY FIELD(b.status, 'pending', 'confirmed', 'completed', 'rejected', 'cancelled'),
                b.departure_date ASC`,
      [agentProfileId]
    );
    return bookings;
  }

  static async createReview({ booking_id, tourist_user_id, rating, comment }) {
    return withTransaction(async (conn) => {
      const [[booking]] = await conn.execute(
        `SELECT * FROM bookings WHERE id = ? AND tourist_user_id = ? LIMIT 1`,
        [booking_id, tourist_user_id]
      );

      if (!booking || !['confirmed', 'completed'].includes(booking.status)) {
        throw new Error('Only confirmed or completed bookings can be reviewed.');
      }

      await conn.execute(
        `INSERT INTO reviews (booking_id, tourist_user_id, agent_profile_id, destination_id, rating, comment)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          booking.id,
          tourist_user_id,
          booking.agent_profile_id,
          booking.destination_id,
          Number(rating),
          comment ? comment.trim() : null
        ]
      );

      // Update agent rating_avg and review_count
      await conn.execute(
        `UPDATE agent_profiles ap
         SET rating_avg = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE agent_profile_id = ap.id),
             review_count = (SELECT COUNT(*) FROM reviews WHERE agent_profile_id = ap.id)
         WHERE ap.id = ?`,
        [booking.agent_profile_id]
      );
    });
  }
}

module.exports = BookingModel;