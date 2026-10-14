const { pool, withTransaction } = require('../config/database');

class TripModel {
    static async getActiveDestinations(landscapeType = '', search = '') {
        let sql = `SELECT * FROM destinations WHERE is_active = 1`;
        const params = [];

        if (landscapeType) {
            sql += ` AND landscape_type = ?`;
            params.push(landscapeType);
        }
        if (search.trim()) {
            sql += ` AND (name LIKE ? OR division LIKE ? OR short_description LIKE ?)`;
            const term = `%${search.trim()}%`;
            params.push(term, term, term);
        }

        sql += ` ORDER BY is_featured DESC, name ASC`;
        const [rows] = await pool.execute(sql, params);
        return rows;
    }

    static async getDestinationBySlugOrId(identifier) {
        const isId = /^\d+$/.test(String(identifier));
        const [rows] = await pool.execute(
            `SELECT * FROM destinations WHERE ${isId ? 'id = ?' : 'slug = ?'} AND is_active = 1 LIMIT 1`,
            [identifier]
        );
        const destination = rows[0] || null;
        if (!destination) return null;

        const [attractions] = await pool.execute(
            `SELECT * FROM tourist_attractions WHERE destination_id = ? AND is_active = 1 ORDER BY entrance_fee_bdt ASC`,
            [destination.id]
        );

        const [transports] = await pool.execute(
            `SELECT * FROM transport_options WHERE destination_id = ? AND is_active = 1 ORDER BY one_way_fare_bdt ASC`,
            [destination.id]
        );

        const [hotels] = await pool.execute(
            `SELECT h.*, MIN(rt.price_per_night_bdt) AS min_room_price_bdt
       FROM hotels h
       LEFT JOIN hotel_room_types rt ON h.id = rt.hotel_id
       WHERE h.destination_id = ? AND h.is_active = 1
       GROUP BY h.id
       ORDER BY min_room_price_bdt ASC`,
            [destination.id]
        );

        const [foodCosts] = await pool.execute(
            `SELECT * FROM food_costs WHERE destination_id = ? ORDER BY lunch_cost_bdt ASC`,
            [destination.id]
        );

        return {
            destination,
            attractions,
            transports,
            hotels,
            foodCosts
        };
    }

    static async getAllActiveAttractions() {
        const [rows] = await pool.execute(
            `SELECT id, destination_id, name, category, entrance_fee_bdt, is_verified
       FROM tourist_attractions
       WHERE is_active = 1
       ORDER BY name ASC`
        );
        return rows;
    }

    /**
     * Save a calculated travel plan and its line-by-line expense items atomically
     */
    static async saveTravelPlan(userId, planMeta, breakdown) {
        return withTransaction(async (conn) => {
            const [planRes] = await conn.execute(
                `INSERT INTO travel_plans
          (user_id, plan_title, starting_location, destination_id,
           departure_date, return_date, duration_days, hotel_nights,
           adults_count, children_count, total_travelers, total_budget_bdt,
           preferred_transport, accommodation_category, food_preference,
           group_type, requires_guide, additional_requirements,
           transportation_cost_bdt, accommodation_cost_bdt, food_cost_bdt,
           local_transport_cost_bdt, activity_cost_bdt, agent_fee_bdt,
           misc_cost_bdt, total_estimated_cost_bdt, cost_per_traveler_bdt,
           budget_difference_bdt, fits_budget, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'saved')`,
                [
                    userId || null,
                    planMeta.plan_title,
                    planMeta.starting_location,
                    planMeta.destination_id,
                    planMeta.departure_date,
                    planMeta.return_date,
                    breakdown.duration_days,
                    breakdown.hotel_nights,
                    planMeta.adults_count,
                    planMeta.children_count,
                    planMeta.total_travelers,
                    breakdown.total_budget_bdt,
                    planMeta.preferred_transport,
                    planMeta.accommodation_category,
                    planMeta.food_preference,
                    planMeta.group_type,
                    planMeta.requires_guide ? 1 : 0,
                    planMeta.additional_requirements || null,
                    breakdown.transportation_cost_bdt,
                    breakdown.accommodation_cost_bdt,
                    breakdown.food_cost_bdt,
                    breakdown.local_transport_cost_bdt,
                    breakdown.activity_cost_bdt,
                    breakdown.agent_fee_bdt,
                    breakdown.misc_cost_bdt,
                    breakdown.total_estimated_cost_bdt,
                    breakdown.cost_per_traveler_bdt,
                    breakdown.budget_difference_bdt,
                    breakdown.fits_budget ? 1 : 0
                ]
            );

            const travelPlanId = planRes.insertId;

            for (const item of breakdown.lineItems) {
                await conn.execute(
                    `INSERT INTO travel_plan_items
            (travel_plan_id, cost_component, item_title, unit_price_bdt,
             quantity, multiplier_days_or_nights, subtotal_bdt,
             calculation_formula, is_verified_price)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        travelPlanId,
                        item.cost_component,
                        item.item_title,
                        item.unit_price_bdt,
                        item.quantity,
                        item.multiplier_days_or_nights,
                        item.subtotal_bdt,
                        item.calculation_formula,
                        item.is_verified_price ? 1 : 0
                    ]
                );
            }

            return travelPlanId;
        });
    }

    static async getTravelPlanById(planId) {
        const [[plan]] = await pool.execute(
            `SELECT tp.*, d.name AS destination_name, d.slug AS destination_slug,
              d.division, d.landscape_type, d.travel_notes
       FROM travel_plans tp
       JOIN destinations d ON tp.destination_id = d.id
       WHERE tp.id = ?`,
            [planId]
        );
        if (!plan) return null;

        const [items] = await pool.execute(
            `SELECT * FROM travel_plan_items WHERE travel_plan_id = ? ORDER BY id ASC`,
            [planId]
        );

        return { plan, items };
    }
}

module.exports = TripModel;