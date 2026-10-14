const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const UserModel = require('../models/userModel');
const { validateRegistrationInput, validateLoginInput } = require('../validators/authValidator');

const SALT_ROUNDS = 12;

exports.renderLogin = (req, res) => {
    res.render('auth/login', {
        pageTitle: 'Login',
        formData: {},
        validationErrors: []
    });
};

exports.login = async (req, res, next) => {
    try {
        const { isValid, errors } = validateLoginInput(req.body);
        if (!isValid) {
            return res.status(400).render('auth/login', {
                pageTitle: 'Login',
                formData: { email: req.body.email },
                validationErrors: errors
            });
        }

        const user = await UserModel.findByEmail(req.body.email);
        if (!user) {
            return res.status(401).render('auth/login', {
                pageTitle: 'Login',
                formData: { email: req.body.email },
                validationErrors: ['Invalid email or password.']
            });
        }

        const passwordMatched = await bcrypt.compare(req.body.password, user.password_hash);
        if (!passwordMatched) {
            return res.status(401).render('auth/login', {
                pageTitle: 'Login',
                formData: { email: req.body.email },
                validationErrors: ['Invalid email or password.']
            });
        }

        if (user.status === 'suspended') {
            return res.status(403).render('auth/login', {
                pageTitle: 'Login',
                formData: { email: req.body.email },
                validationErrors: ['Your account has been suspended by an administrator.']
            });
        }

        req.session.user = {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            status: user.status,
            agent_profile_id: user.agent_profile_id || null,
            agency_name: user.agency_name || null,
            agent_is_verified: user.agent_is_verified || 0
        };

        req.session.flashSuccess = `Welcome back, ${user.full_name}!`;

        req.session.save(() => {
            if (user.role === 'admin') return res.redirect('/admin/dashboard');
            if (user.role === 'agent') return res.redirect('/agent/dashboard');
            return res.redirect('/dashboard');
        });
    } catch (error) {
        next(error);
    }
};

exports.renderRegister = (req, res) => {
    res.render('auth/register', {
        pageTitle: 'Create Account',
        formData: { role: req.query.role === 'agent' ? 'agent' : 'tourist' },
        validationErrors: []
    });
};

exports.register = async (req, res, next) => {
    try {
        const { isValid, errors, sanitizedRole } = validateRegistrationInput(req.body);
        if (!isValid) {
            return res.status(400).render('auth/register', {
                pageTitle: 'Create Account',
                formData: { ...req.body, role: sanitizedRole },
                validationErrors: errors
            });
        }

        const existingUser = await UserModel.findByEmail(req.body.email);
        if (existingUser) {
            return res.status(409).render('auth/register', {
                pageTitle: 'Create Account',
                formData: { ...req.body, role: sanitizedRole },
                validationErrors: ['An account with this email address already exists.']
            });
        }

        const password_hash = await bcrypt.hash(req.body.password, SALT_ROUNDS);
        const normalizedPhone = req.body.phone.trim().replace(/[\s-]/g, '');

        let newUserId;
        if (sanitizedRole === 'agent') {
            newUserId = await UserModel.createAgent({
                full_name: req.body.full_name,
                email: req.body.email,
                phone: normalizedPhone,
                password_hash,
                agency_name: req.body.agency_name,
                license_number: req.body.license_number,
                base_service_fee_bdt: req.body.base_service_fee_bdt,
                max_group_capacity: req.body.max_group_capacity,
                tour_types: req.body.tour_types,
                services_offered: req.body.services_offered,
                languages_spoken: req.body.languages_spoken,
                bio: req.body.bio
            });
        } else {
            newUserId = await UserModel.createTourist({
                full_name: req.body.full_name,
                email: req.body.email,
                phone: normalizedPhone,
                password_hash
            });
        }

        const createdUser = await UserModel.findById(newUserId);

        req.session.user = {
            id: createdUser.id,
            full_name: createdUser.full_name,
            email: createdUser.email,
            phone: createdUser.phone,
            role: createdUser.role,
            status: createdUser.status,
            agent_profile_id: createdUser.agent_profile_id || null,
            agency_name: createdUser.agency_name || null,
            agent_is_verified: createdUser.agent_is_verified || 0
        };

        req.session.flashSuccess =
            sanitizedRole === 'agent'
                ? 'Tour Agent account created! You can now configure your destinations and availability.'
                : 'Tourist account registered! Start planning your Bangladesh trip.';

        req.session.save(() => {
            if (sanitizedRole === 'agent') return res.redirect('/agent/dashboard');
            return res.redirect('/dashboard');
        });
    } catch (error) {
        next(error);
    }
};

exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('bd_travel.sid');
        res.redirect('/auth/login');
    });
};

exports.renderTouristDashboard = async (req, res, next) => {
    try {
        const userId = req.session.user.id;

        // Fetch saved travel plans for this tourist
        const [savedPlans] = await pool.execute(
            `SELECT tp.*, d.name AS destination_name
       FROM travel_plans tp
       JOIN destinations d ON tp.destination_id = d.id
       WHERE tp.user_id = ?
       ORDER BY tp.created_at DESC
       LIMIT 10`,
            [userId]
        );

        // Fetch booking requests for this tourist
        const [bookings] = await pool.execute(
            `SELECT b.*, d.name AS destination_name, ap.agency_name, u.full_name AS agent_name
       FROM bookings b
       JOIN destinations d ON b.destination_id = d.id
       JOIN agent_profiles ap ON b.agent_profile_id = ap.id
       JOIN users u ON ap.user_id = u.id
       WHERE b.tourist_user_id = ?
       ORDER BY b.created_at DESC
       LIMIT 10`,
            [userId]
        );

        res.render('auth/dashboard', {
            pageTitle: 'My Tourist Dashboard',
            savedPlans,
            bookings
        });
    } catch (error) {
        next(error);
    }
};

exports.updateProfile = async (req, res, next) => {
    try {
        const { full_name, phone } = req.body;
        if (!full_name || full_name.trim().length < 3) {
            req.session.flashError = 'Full name must be at least 3 characters.';
            return res.redirect('/dashboard');
        }

        await UserModel.updateProfile(req.session.user.id, { full_name, phone });
        req.session.user.full_name = full_name.trim();
        req.session.user.phone = phone.trim();
        req.session.flashSuccess = 'Profile updated successfully.';
        res.redirect('/dashboard');
    } catch (error) {
        next(error);
    }
};