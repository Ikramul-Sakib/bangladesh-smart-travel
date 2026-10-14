/**
 * Restrict route access to specific user roles ('tourist', 'agent', 'admin')
 * @param  {...string} allowedRoles
 */
function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!req.session || !req.session.user) {
            req.session.flashError = 'Authentication required.';
            return res.redirect('/auth/login');
        }

        const userRole = req.session.user.role;
        if (!allowedRoles.includes(userRole)) {
            res.status(403);
            return res.render('errors/500', {
                pageTitle: 'Access Denied (403)',
                errorMessage: `Forbidden: Your account role (${userRole}) is not authorized to access this resource.`
            });
        }

        next();
    };
}

module.exports = {
    authorizeRoles
};