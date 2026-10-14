require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { csrfTokenGenerator, csrfProtection } = require('./src/middleware/csrf');
const { notFoundHandler, globalErrorHandler } = require('./src/middleware/errorHandler');

const indexRoutes = require('./src/routes/indexRoutes');
const authRoutes = require('./src/routes/authRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const tripRoutes = require('./src/routes/tripRoutes');
const agentRoutes = require('./src/routes/agentRoutes');
const bookingRoutes = require('./src/routes/bookingRoutes');

const app = express();
const PORT = Number(process.env.PORT) || 3000;


const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Required for Vercel / Render / Railway reverse proxies
app.set('trust proxy', 1);

// 1. Security Headers (allowing Bootstrap & Chart.js CDNs)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
        imgSrc: ["'self'", "data:", "https:"]
      }
    }
  })
);

// 2. Body Parsers & Static Assets
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 3. View Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));

// 4. Session Configuration
app.use(
  session({
    name: 'bd_travel.sid',
    secret: process.env.SESSION_SECRET || 'dev_fallback_secret_key_change_in_env',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 12 // 12 hours
    }
  })
);

// 5. Global Template Locals & Flash Message Helper
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.flashSuccess = req.session.flashSuccess || null;
  res.locals.flashError = req.session.flashError || null;
  delete req.session.flashSuccess;
  delete req.session.flashError;
  next();
});

// 6. CSRF Token Generation & Validation
app.use(csrfTokenGenerator);
app.use(csrfProtection);

// 7. Rate Limiting for Auth Routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/auth', authLimiter);

// 8. Application Routes
app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/', tripRoutes);
app.use('/', agentRoutes);
app.use('/', bookingRoutes);

// 9. 404 & Global Error Handling
app.use(notFoundHandler);
app.use(globalErrorHandler);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`========================================================`);
    console.log(`Bangladesh Smart Travel Planner running on port ${PORT}`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`========================================================`);
  });
}

module.exports = app;