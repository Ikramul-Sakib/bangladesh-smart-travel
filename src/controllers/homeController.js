const { pool, checkDatabaseConnection } = require('../config/database');

exports.renderHomePage = async (req, res, next) => {
    try {
        let destinations = [];
        let featuredDestinations = [];
        const dbStatus = await checkDatabaseConnection();

        if (dbStatus.connected) {
            const [rows] = await pool.execute(
                `SELECT id, name, slug, division, landscape_type, short_description,
                best_time_to_visit, image_url, is_featured
         FROM destinations
         WHERE is_active = 1
         ORDER BY is_featured DESC, name ASC`
            );
            destinations = rows;
            featuredDestinations = rows.filter((d) => d.is_featured === 1).slice(0, 6);
            if (featuredDestinations.length === 0) {
                featuredDestinations = rows.slice(0, 6);
            }
        }

        res.render('index', {
            pageTitle: 'Bangladesh Smart Travel Planner & Tour Agent Directory',
            destinations,
            featuredDestinations,
            dbConnected: dbStatus.connected
        });
    } catch (error) {
        // If table doesn't exist yet before running schema.sql, still render landing page cleanly
        res.render('index', {
            pageTitle: 'Bangladesh Smart Travel Planner & Tour Agent Directory',
            destinations: [],
            featuredDestinations: [],
            dbConnected: false
        });
    }
};