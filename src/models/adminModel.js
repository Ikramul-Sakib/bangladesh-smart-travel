const { pool, withTransaction } = require('../config/database');

class AdminModel {
    // ==========================================================================
    // 1. DASHBOARD STATISTICS & REPORTS
    // ==========================================================================
    static async getDashboardStats() {
        const [[userCounts]] = await pool.execute(`
      SELECT
        COUNT(*) AS total_users,
        SUM(CASE WHEN role = 'tourist' THEN 1 ELSE 0 END) AS total_tourists,
        SUM(CASE WHEN role = 'agent' THEN 1 ELSE 0 END) AS total_agents
      FROM users
    `);

        const [[agentVerifyCounts]] = await pool.execute(`
      SELECT
        SUM(CASE WHEN is_verified = 1 THEN 1 ELSE 0 END) AS verified_agents,
        SUM(CASE WHEN is_verified = 0 THEN 1 ELSE 0 END) AS unverified_agents
      FROM agent_profiles
    `);

        const [[catalogCounts]] = await pool.execute(`
      SELECT
        (SELECT COUNT(*) FROM destinations WHERE is_active = 1) AS active_destinations,
        (SELECT COUNT(*) FROM transport_options WHERE is_active = 1) AS active_transport_routes,
        (SELECT COUNT(*) FROM hotels WHERE is_active = 1) AS active_hotels,
        (SELECT COUNT(*) FROM travel_plans) AS total_travel_plans
    `);

        const [[bookingCounts]] = await pool.execute(`
      SELECT
        COUNT(*) AS total_bookings,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_bookings,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed_bookings,
        COALESCE(SUM(CASE WHEN status = 'confirmed' THEN agreed_agent_fee_bdt ELSE 0 END), 0) AS confirmed_agent_fees_bdt
      FROM bookings
    `);

        const [recentBookings] = await pool.execute(`
      SELECT b.*, d.name AS destination_name, u.full_name AS tourist_name, ap.agency_name
      FROM bookings b
      JOIN destinations d ON b.destination_id = d.id
      JOIN users u ON b.tourist_user_id = u.id
      JOIN agent_profiles ap ON b.agent_profile_id = ap.id
      ORDER BY b.created_at DESC
      LIMIT 8
    `);

        return {
            userCounts,
            agentVerifyCounts,
            catalogCounts,
            bookingCounts,
            recentBookings
        };
    }

    // ==========================================================================
    // 2. DESTINATIONS & TOURIST ATTRACTIONS
    // ==========================================================================
    static async getAllDestinations(search = '') {
        let sql = `SELECT * FROM destinations WHERE 1=1`;
        const params = [];
        if (search.trim()) {
            sql += ` AND (name LIKE ? OR division LIKE ? OR landscape_type LIKE ?)`;
            const term = `%${search.trim()}%`;
            params.push(term, term, term);
        }
        sql += ` ORDER BY name ASC`;
        const [rows] = await pool.execute(sql, params);
        return rows;
    }

    static async createDestination(data) {
        const slug = data.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

        const [res] = await pool.execute(
            `INSERT INTO destinations
        (name, slug, division, landscape_type, short_description, detailed_description,
         best_time_to_visit, travel_notes, image_url, is_featured, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.name.trim(),
                slug,
                data.division.trim(),
                data.landscape_type,
                data.short_description.trim(),
                data.detailed_description.trim(),
                data.best_time_to_visit || 'November to March',
                data.travel_notes || null,
                data.image_url || '/images/default-destination.jpg',
                data.is_featured ? 1 : 0,
                data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1
            ]
        );
        return res.insertId;
    }

    static async updateDestination(id, data) {
        await pool.execute(
            `UPDATE destinations
       SET name = ?, division = ?, landscape_type = ?, short_description = ?,
           detailed_description = ?, best_time_to_visit = ?, travel_notes = ?,
           image_url = ?, is_featured = ?, is_active = ?
       WHERE id = ?`,
            [
                data.name.trim(),
                data.division.trim(),
                data.landscape_type,
                data.short_description.trim(),
                data.detailed_description.trim(),
                data.best_time_to_visit || 'November to March',
                data.travel_notes || null,
                data.image_url || '/images/default-destination.jpg',
                data.is_featured ? 1 : 0,
                data.is_active ? 1 : 0,
                id
            ]
        );
    }

    static async deleteDestination(id) {
        await pool.execute(`DELETE FROM destinations WHERE id = ?`, [id]);
    }

    static async getAllAttractions(destinationId = '') {
        let sql = `
      SELECT ta.*, d.name AS destination_name
      FROM tourist_attractions ta
      JOIN destinations d ON ta.destination_id = d.id
      WHERE 1=1
    `;
        const params = [];
        if (destinationId) {
            sql += ` AND ta.destination_id = ?`;
            params.push(destinationId);
        }
        sql += ` ORDER BY d.name ASC, ta.name ASC`;
        const [rows] = await pool.execute(sql, params);
        return rows;
    }

    static async createAttraction(data) {
        await pool.execute(
            `INSERT INTO tourist_attractions
        (destination_id, name, category, description, entrance_fee_bdt,
         estimated_duration_hours, is_verified, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
            [
                Number(data.destination_id),
                data.name.trim(),
                data.category || 'Sightseeing',
                data.description || null,
                Number(data.entrance_fee_bdt) || 0,
                Number(data.estimated_duration_hours) || 2.0,
                data.is_verified ? 1 : 0
            ]
        );
    }

    static async deleteAttraction(id) {
        await pool.execute(`DELETE FROM tourist_attractions WHERE id = ?`, [id]);
    }

    // ==========================================================================
    // 3. TRANSPORTATION COST MANAGEMENT
    // ==========================================================================
    static async getTransportOptions({ destination_id = '', transport_type = '', search = '' } = {}) {
        let sql = `
      SELECT t.*, d.name AS destination_name
      FROM transport_options t
      JOIN destinations d ON t.destination_id = d.id
      WHERE 1=1
    `;
        const params = [];

        if (destination_id) {
            sql += ` AND t.destination_id = ?`;
            params.push(Number(destination_id));
        }
        if (transport_type) {
            sql += ` AND t.transport_type = ?`;
            params.push(transport_type);
        }
        if (search.trim()) {
            sql += ` AND (t.operator_name LIKE ? OR t.departure_location LIKE ? OR d.name LIKE ?)`;
            const term = `%${search.trim()}%`;
            params.push(term, term, term);
        }

        sql += ` ORDER BY d.name ASC, t.transport_type ASC, t.one_way_fare_bdt ASC`;
        const [rows] = await pool.execute(sql, params);
        return rows;
    }

    static async createTransportOption(data) {
        await pool.execute(
            `INSERT INTO transport_options
        (transport_type, departure_location, destination_id, operator_name,
         comfort_tier, pricing_model, vehicle_capacity, one_way_fare_bdt,
         return_fare_bdt, duration_hours, schedule_info, additional_fees_bdt,
         is_verified, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.transport_type,
                data.departure_location.trim(),
                Number(data.destination_id),
                data.operator_name.trim(),
                data.comfort_tier || 'standard',
                data.pricing_model || 'per_person',
                Number(data.vehicle_capacity) || 1,
                Number(data.one_way_fare_bdt),
                data.return_fare_bdt ? Number(data.return_fare_bdt) : null,
                data.duration_hours ? Number(data.duration_hours) : null,
                data.schedule_info || 'Multiple daily departures',
                Number(data.additional_fees_bdt) || 0,
                data.is_verified ? 1 : 0,
                data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1
            ]
        );
    }

    static async updateTransportOption(id, data) {
        await pool.execute(
            `UPDATE transport_options
       SET transport_type = ?, departure_location = ?, destination_id = ?,
           operator_name = ?, comfort_tier = ?, pricing_model = ?,
           vehicle_capacity = ?, one_way_fare_bdt = ?, return_fare_bdt = ?,
           duration_hours = ?, schedule_info = ?, additional_fees_bdt = ?,
           is_verified = ?, is_active = ?
       WHERE id = ?`,
            [
                data.transport_type,
                data.departure_location.trim(),
                Number(data.destination_id),
                data.operator_name.trim(),
                data.comfort_tier || 'standard',
                data.pricing_model || 'per_person',
                Number(data.vehicle_capacity) || 1,
                Number(data.one_way_fare_bdt),
                data.return_fare_bdt ? Number(data.return_fare_bdt) : null,
                data.duration_hours ? Number(data.duration_hours) : null,
                data.schedule_info || 'Multiple daily departures',
                Number(data.additional_fees_bdt) || 0,
                data.is_verified ? 1 : 0,
                data.is_active ? 1 : 0,
                id
            ]
        );
    }

    static async deleteTransportOption(id) {
        await pool.execute(`DELETE FROM transport_options WHERE id = ?`, [id]);
    }

    // ==========================================================================
    // 4. HOTEL & ROOM TYPE MANAGEMENT
    // ==========================================================================
    static async getHotelsWithRooms({ destination_id = '', category = '', search = '' } = {}) {
        let sql = `
      SELECT h.*, d.name AS destination_name
      FROM hotels h
      JOIN destinations d ON h.destination_id = d.id
      WHERE 1=1
    `;
        const params = [];

        if (destination_id) {
            sql += ` AND h.destination_id = ?`;
            params.push(Number(destination_id));
        }
        if (category) {
            sql += ` AND h.category = ?`;
            params.push(category);
        }
        if (search.trim()) {
            sql += ` AND (h.name LIKE ? OR h.address LIKE ? OR d.name LIKE ?)`;
            const term = `%${search.trim()}%`;
            params.push(term, term, term);
        }

        sql += ` ORDER BY d.name ASC, h.category ASC, h.name ASC`;
        const [hotels] = await pool.execute(sql, params);

        const [roomTypes] = await pool.execute(`
      SELECT rt.*, h.name AS hotel_name, d.name AS destination_name
      FROM hotel_room_types rt
      JOIN hotels h ON rt.hotel_id = h.id
      JOIN destinations d ON h.destination_id = d.id
      ORDER BY h.name ASC, rt.price_per_night_bdt ASC
    `);

        return { hotels, roomTypes };
    }

    static async createHotelWithRoom(data) {
        return withTransaction(async (conn) => {
            const [hotelRes] = await conn.execute(
                `INSERT INTO hotels
          (destination_id, name, category, address, facilities,
           check_in_time, check_out_time, is_verified, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
                [
                    Number(data.destination_id),
                    data.name.trim(),
                    data.category || 'standard',
                    data.address.trim(),
                    data.facilities || 'Wi-Fi, Attached Bath, Restaurant',
                    data.check_in_time || '12:00 PM',
                    data.check_out_time || '11:00 AM',
                    data.is_verified ? 1 : 0
                ]
            );

            const hotelId = hotelRes.insertId;

            if (data.room_type_name && data.price_per_night_bdt) {
                await conn.execute(
                    `INSERT INTO hotel_room_types
            (hotel_id, room_type_name, price_per_night_bdt, max_guests_per_room, available_rooms_count, is_active)
           VALUES (?, ?, ?, ?, ?, 1)`,
                    [
                        hotelId,
                        data.room_type_name.trim(),
                        Number(data.price_per_night_bdt),
                        Number(data.max_guests_per_room) || 2,
                        Number(data.available_rooms_count) || 10
                    ]
                );
            }

            return hotelId;
        });
    }

    static async createRoomType(data) {
        await pool.execute(
            `INSERT INTO hotel_room_types
        (hotel_id, room_type_name, price_per_night_bdt, max_guests_per_room, available_rooms_count, is_active)
       VALUES (?, ?, ?, ?, ?, 1)`,
            [
                Number(data.hotel_id),
                data.room_type_name.trim(),
                Number(data.price_per_night_bdt),
                Number(data.max_guests_per_room) || 2,
                Number(data.available_rooms_count) || 10
            ]
        );
    }

    static async updateRoomType(id, data) {
        await pool.execute(
            `UPDATE hotel_room_types
       SET room_type_name = ?, price_per_night_bdt = ?, max_guests_per_room = ?,
           available_rooms_count = ?, is_active = ?
       WHERE id = ?`,
            [
                data.room_type_name.trim(),
                Number(data.price_per_night_bdt),
                Number(data.max_guests_per_room) || 2,
                Number(data.available_rooms_count) || 10,
                data.is_active ? 1 : 0,
                id
            ]
        );
    }

    static async deleteHotel(id) {
        await pool.execute(`DELETE FROM hotels WHERE id = ?`, [id]);
    }

    static async deleteRoomType(id) {
        await pool.execute(`DELETE FROM hotel_room_types WHERE id = ?`, [id]);
    }

    // ==========================================================================
    // 5. FOOD & ADDITIONAL EXPENSES MANAGEMENT
    // ==========================================================================
    static async getFoodAndAdditionalExpenses(destinationId = '') {
        let foodSql = `
      SELECT fc.*, d.name AS destination_name
      FROM food_costs fc
      JOIN destinations d ON fc.destination_id = d.id
      WHERE 1=1
    `;
        let addSql = `
      SELECT ae.*, d.name AS destination_name
      FROM additional_expenses ae
      JOIN destinations d ON ae.destination_id = d.id
      WHERE 1=1
    `;
        const params = [];

        if (destinationId) {
            foodSql += ` AND fc.destination_id = ?`;
            addSql += ` AND ae.destination_id = ?`;
            params.push(Number(destinationId));
        }

        foodSql += ` ORDER BY d.name ASC, fc.tier ASC`;
        addSql += ` ORDER BY d.name ASC, ae.expense_category ASC`;

        const [foodCosts] = await pool.execute(foodSql, params);
        const [additionalExpenses] = await pool.execute(addSql, params);

        return { foodCosts, additionalExpenses };
    }

    static async upsertFoodCost(data) {
        await pool.execute(
            `INSERT INTO food_costs
        (destination_id, tier, package_name, breakfast_cost_bdt, lunch_cost_bdt,
         dinner_cost_bdt, snacks_water_cost_bdt, is_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         package_name = VALUES(package_name),
         breakfast_cost_bdt = VALUES(breakfast_cost_bdt),
         lunch_cost_bdt = VALUES(lunch_cost_bdt),
         dinner_cost_bdt = VALUES(dinner_cost_bdt),
         snacks_water_cost_bdt = VALUES(snacks_water_cost_bdt),
         is_verified = VALUES(is_verified)`,
            [
                Number(data.destination_id),
                data.tier || 'standard',
                data.package_name || 'Standard Meal Plan',
                Number(data.breakfast_cost_bdt) || 0,
                Number(data.lunch_cost_bdt) || 0,
                Number(data.dinner_cost_bdt) || 0,
                Number(data.snacks_water_cost_bdt) || 0,
                data.is_verified ? 1 : 0
            ]
        );
    }

    static async deleteFoodCost(id) {
        await pool.execute(`DELETE FROM food_costs WHERE id = ?`, [id]);
    }

    static async createAdditionalExpense(data) {
        await pool.execute(
            `INSERT INTO additional_expenses
        (destination_id, expense_category, title, pricing_basis, cost_bdt,
         is_mandatory, is_verified, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
            [
                Number(data.destination_id),
                data.expense_category,
                data.title.trim(),
                data.pricing_basis || 'per_person_per_day',
                Number(data.cost_bdt) || 0,
                data.is_mandatory ? 1 : 0,
                data.is_verified ? 1 : 0
            ]
        );
    }

    static async deleteAdditionalExpense(id) {
        await pool.execute(`DELETE FROM additional_expenses WHERE id = ?`, [id]);
    }

    // ==========================================================================
    // 6. TOUR PACKAGES MANAGEMENT
    // ==========================================================================
    static async getAllTourPackages() {
        const [rows] = await pool.execute(`
      SELECT tp.*, d.name AS destination_name, ap.agency_name
      FROM tour_packages tp
      JOIN destinations d ON tp.destination_id = d.id
      LEFT JOIN agent_profiles ap ON tp.agent_profile_id = ap.id
      ORDER BY tp.created_at DESC
    `);
        return rows;
    }

    static async createTourPackage(data) {
        await pool.execute(
            `INSERT INTO tour_packages
        (agent_profile_id, destination_id, title, duration_days, nights,
         base_price_per_person_bdt, max_travelers, accommodation_category,
         transport_type, description, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [
                data.agent_profile_id ? Number(data.agent_profile_id) : null,
                Number(data.destination_id),
                data.title.trim(),
                Number(data.duration_days) || 3,
                Number(data.nights) || 2,
                Number(data.base_price_per_person_bdt),
                Number(data.max_travelers) || 15,
                data.accommodation_category || 'standard',
                data.transport_type || 'bus',
                data.description || null
            ]
        );
    }

    static async deleteTourPackage(id) {
        await pool.execute(`DELETE FROM tour_packages WHERE id = ?`, [id]);
    }

    // ==========================================================================
    // 7. USER & TOUR AGENT MANAGEMENT
    // ==========================================================================
    static async getUsersAndAgents({ role = '', status = '' } = {}) {
        let sql = `
      SELECT u.id, u.full_name, u.email, u.phone, u.role, u.status, u.created_at,
             ap.id AS agent_profile_id, ap.agency_name, ap.license_number,
             ap.base_service_fee_bdt, ap.max_group_capacity, ap.is_verified
      FROM users u
      LEFT JOIN agent_profiles ap ON u.id = ap.user_id
      WHERE 1=1
    `;
        const params = [];
        if (role) {
            sql += ` AND u.role = ?`;
            params.push(role);
        }
        if (status) {
            sql += ` AND u.status = ?`;
            params.push(status);
        }
        sql += ` ORDER BY u.created_at DESC`;
        const [rows] = await pool.execute(sql, params);
        return rows;
    }

    static async updateUserStatus(userId, status) {
        await pool.execute(`UPDATE users SET status = ? WHERE id = ?`, [status, userId]);
    }

    static async verifyAgentProfile(agentProfileId, isVerified) {
        await pool.execute(
            `UPDATE agent_profiles SET is_verified = ? WHERE id = ?`,
            [isVerified ? 1 : 0, agentProfileId]
        );
    }

    // ==========================================================================
    // 8. BOOKINGS & TRAVEL PLANS REVIEW
    // ==========================================================================
    static async getAllBookingsAndPlans() {
        const [bookings] = await pool.execute(`
      SELECT b.*, d.name AS destination_name,
             u.full_name AS tourist_name, u.phone AS tourist_phone,
             ap.agency_name
      FROM bookings b
      JOIN destinations d ON b.destination_id = d.id
      JOIN users u ON b.tourist_user_id = u.id
      JOIN agent_profiles ap ON b.agent_profile_id = ap.id
      ORDER BY b.created_at DESC
    `);

        const [travelPlans] = await pool.execute(`
      SELECT tp.*, d.name AS destination_name, u.full_name AS user_name
      FROM travel_plans tp
      JOIN destinations d ON tp.destination_id = d.id
      LEFT JOIN users u ON tp.user_id = u.id
      ORDER BY tp.created_at DESC
      LIMIT 30
    `);

        return { bookings, travelPlans };
    }
}

module.exports = AdminModel;