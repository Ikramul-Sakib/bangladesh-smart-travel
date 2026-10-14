const crypto = require('crypto');

/**
 * Ensures a CSRF token exists in the user session and exposes it to all EJS views
 */
function csrfTokenGenerator(req, res, next) {
    if (!req.session) {
        return next(new Error('Session middleware must be loaded before CSRF middleware'));
    }
    if (!req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    }
    res.locals.csrfToken = req.session.csrfToken;
    next();
}

/**
 * Validates CSRF token on all state-changing HTTP methods
 */
function csrfProtection(req, res, next) {
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method)) {
        return next();
    }

    const submittedToken =
        (req.body && req.body._csrf) ||
        req.headers['x-csrf-token'] ||
        req.query._csrf;

    const sessionToken = req.session && req.session.csrfToken;

    if (!submittedToken || !sessionToken || submittedToken !== sessionToken) {
        res.status(403);
        return res.render('errors/500', {
            pageTitle: 'Security Token Mismatch (403)',
            errorMessage: 'Invalid or expired security token (CSRF). Please go back, refresh the page, and try again.'
        });
    }

    next();
}

module.exports = {
    csrfTokenGenerator,
    csrfProtection
};