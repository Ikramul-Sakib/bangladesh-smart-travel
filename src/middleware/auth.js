const UserModel = require('../models/userModel');

/**
 * Require the user to be logged in with an active account
 */
async function requireAuth(req, res, next) {
    try {
        if (!req.session || !req.session.user) {
            req.session.flashError = 'Please log in to access that page.';
            return res.redirect('/auth/login');
        }

        const freshUser = await UserModel.findById(req.session.user.id);
        if (!freshUser) {
            req.session.destroy(() => { });
            return res.redirect('/auth/login');
        }

        if (freshUser.status === 'suspended') {
            req.session.destroy(() => { });
            return res.status(403).render('errors/500', {
                pageTitle: 'Account Suspended',
                errorMessage: 'Your account has been suspended by an administrator. Please contact support.'
            });
        }

        // Keep session user synchronized with latest DB state
        req.session.user = {
            id: freshUser.id,
            full_name: freshUser.full_name,
            email: freshUser.email,
            phone: freshUser.phone,
            role: freshUser.role,
            status: freshUser.status,
            agent_profile_id: freshUser.agent_profile_id || null,
            agency_name: freshUser.agency_name || null,
            agent_is_verified: freshUser.agent_is_verified || 0
        };
        res.locals.currentUser = req.session.user;

        next();
    } catch (error) {
        next(error);
    }
}

/**
 * Redirect already logged-in users away from /auth/login and /auth/register
 */
function redirectIfAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        const role = req.session.user.role;
        if (role === 'admin') return res.redirect('/admin/dashboard');
        if (role === 'agent') return res.redirect('/agent/dashboard');
        return res.redirect('/dashboard');
    }
    next();
}

module.exports = {
    requireAuth,
    redirectIfAuthenticated
};