const { pool, withTransaction } = require('../config/database');

class UserModel {
    /**
     * Find a user by email address (includes agent_profile_id if role is agent)
     */
    static async findByEmail(email) {
        const [rows] = await pool.execute(
            `SELECT u.*, ap.id AS agent_profile_id, ap.agency_name, ap.is_verified AS agent_is_verified
       FROM users u
       LEFT JOIN agent_profiles ap ON u.id = ap.user_id
       WHERE u.email = ?
       LIMIT 1`,
            [email.trim().toLowerCase()]
        );
        return rows[0] || null;
    }

    /**
     * Find a user by ID
     */
    static async findById(id) {
        const [rows] = await pool.execute(
            `SELECT u.id, u.full_name, u.email, u.phone, u.role, u.status, u.created_at,
              ap.id AS agent_profile_id, ap.agency_name, ap.is_verified AS agent_is_verified
       FROM users u
       LEFT JOIN agent_profiles ap ON u.id = ap.user_id
       WHERE u.id = ?
       LIMIT 1`,
            [id]
        );
        return rows[0] || null;
    }

    /**
     * Create a new Tourist account
     */
    static async createTourist({ full_name, email, phone, password_hash }) {
        const [result] = await pool.execute(
            `INSERT INTO users (full_name, email, phone, password_hash, role, status)
       VALUES (?, ?, ?, ?, 'tourist', 'active')`,
            [full_name.trim(), email.trim().toLowerCase(), phone.trim(), password_hash]
        );
        return result.insertId;
    }

    /**
     * Atomically create a Tour Agent user and their corresponding agent_profiles record
     */
    static async createAgent({
        full_name,
        email,
        phone,
        password_hash,
        agency_name,
        license_number,
        base_service_fee_bdt,
        max_group_capacity,
        tour_types,
        services_offered,
        languages_spoken,
        bio
    }) {
        return withTransaction(async (connection) => {
            const [userResult] = await connection.execute(
                `INSERT INTO users (full_name, email, phone, password_hash, role, status)
         VALUES (?, ?, ?, ?, 'agent', 'active')`,
                [full_name.trim(), email.trim().toLowerCase(), phone.trim(), password_hash]
            );

            const userId = userResult.insertId;

            await connection.execute(
                `INSERT INTO agent_profiles
          (user_id, agency_name, bio, license_number, base_service_fee_bdt,
           max_group_capacity, tour_types, services_offered, languages_spoken, is_verified)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
                [
                    userId,
                    agency_name.trim(),
                    bio ? bio.trim() : null,
                    license_number ? license_number.trim() : null,
                    Number(base_service_fee_bdt) || 1500.0,
                    Number(max_group_capacity) || 10,
                    tour_types || 'Family, Group, Adventure',
                    services_offered || 'Guide, Local Transport, Hotel Assistance',
                    languages_spoken || 'Bengali, English'
                ]
            );

            return userId;
        });
    }

    /**
     * Update Tourist or User basic profile information
     */
    static async updateProfile(userId, { full_name, phone }) {
        await pool.execute(
            `UPDATE users SET full_name = ?, phone = ? WHERE id = ?`,
            [full_name.trim(), phone.trim(), userId]
        );
    }
}

module.exports = UserModel;