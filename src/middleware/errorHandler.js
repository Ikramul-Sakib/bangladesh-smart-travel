/**
 * 404 Not Found Handler
 */
function notFoundHandler(req, res, next) {
    res.status(404).render('errors/404', {
        pageTitle: 'Page Not Found (404)',
        requestedUrl: req.originalUrl
    });
}

/**
 * Centralized Error Handler (prevents leaking stack traces in production)
 */
function globalErrorHandler(err, req, res, next) {
    console.error('[ERROR]', new Date().toISOString(), err.stack || err.message);

    const statusCode = err.statusCode || 500;
    const isProd = process.env.NODE_ENV === 'production';

    res.status(statusCode).render('errors/500', {
        pageTitle: 'Server Error',
        errorMessage: isProd
            ? 'An unexpected error occurred while processing your request.'
            : err.message
    });
}

module.exports = {
    notFoundHandler,
    globalErrorHandler
};