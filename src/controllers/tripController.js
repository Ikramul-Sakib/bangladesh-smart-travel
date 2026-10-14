const TripModel = require('../models/tripModel');
const RecommendationService = require('../services/recommendationService');
const { validateTravelPlanInput } = require('../validators/travelValidator');

// 1. Public Destinations Directory (/destinations)
exports.renderDestinations = async (req, res, next) => {
    try {
        const landscape = req.query.landscape || '';
        const search = req.query.search || '';
        const destinations = await TripModel.getActiveDestinations(landscape, search);

        res.render('trips/destinations', {
            pageTitle: 'Explore Destinations in Bangladesh',
            destinations,
            filters: { landscape, search }
        });
    } catch (error) {
        next(error);
    }
};

// 2. Public Destination Details (/destinations/:slug)
exports.renderDestinationDetails = async (req, res, next) => {
    try {
        const data = await TripModel.getDestinationBySlugOrId(req.params.slug);
        if (!data) {
            return res.status(404).render('errors/404', {
                pageTitle: 'Destination Not Found',
                requestedUrl: req.originalUrl
            });
        }

        res.render('trips/destinationDetails', {
            pageTitle: `${data.destination.name} Travel Guide & Estimated Costs`,
            ...data
        });
    } catch (error) {
        next(error);
    }
};

// 3. Travel Planning Form (/trips/plan)
exports.renderPlanForm = async (req, res, next) => {
    try {
        const [destinations, attractions] = await Promise.all([
            TripModel.getActiveDestinations(),
            TripModel.getAllActiveAttractions()
        ]);

        const defaultDep = new Date();
        defaultDep.setDate(defaultDep.getDate() + 3);
        const defaultRet = new Date();
        defaultRet.setDate(defaultRet.getDate() + 5);

        const formData = {
            starting_location: req.query.starting_location || 'Dhaka',
            destination_id: req.query.destination_id || (destinations[0] ? destinations[0].id : ''),
            departure_date: req.query.departure_date || defaultDep.toISOString().split('T')[0],
            return_date: req.query.return_date || defaultRet.toISOString().split('T')[0],
            adults_count: req.query.adults_count || 4,
            children_count: req.query.children_count || 0,
            total_budget_bdt: req.query.total_budget_bdt || 20000,
            preferred_transport: req.query.preferred_transport || 'bus',
            accommodation_category: req.query.accommodation_category || 'standard',
            food_preference: req.query.food_preference || 'standard',
            group_type: req.query.group_type || 'friends',
            requires_guide: req.query.requires_guide === '1'
        };

        res.render('trips/plan', {
            pageTitle: 'Smart Travel Planner & Cost Calculator',
            destinations,
            attractions,
            formData,
            validationErrors: []
        });
    } catch (error) {
        next(error);
    }
};

// 4. Generate & Compare Recommendations (/trips/recommendations)
exports.generateRecommendations = async (req, res, next) => {
    try {
        const inputSource = req.method === 'POST' ? req.body : req.query;
        const { isValid, errors, sanitized } = validateTravelPlanInput(inputSource);

        if (!isValid) {
            const [destinations, attractions] = await Promise.all([
                TripModel.getActiveDestinations(),
                TripModel.getAllActiveAttractions()
            ]);
            return res.status(400).render('trips/plan', {
                pageTitle: 'Smart Travel Planner & Cost Calculator',
                destinations,
                attractions,
                formData: inputSource,
                validationErrors: errors
            });
        }

        const result = await RecommendationService.generateRecommendations(sanitized);

        res.render('trips/recommendations', {
            pageTitle: `Recommended Travel Plans for ${result.destination.name}`,
            searchParams: sanitized,
            destination: result.destination,
            recommendations: result.recommendations,
            anyFitsBudget: result.anyFitsBudget,
            leastExpensivePlan: result.leastExpensivePlan
        });
    } catch (error) {
        next(error);
    }
};

// 5. Save Selected Itinerary (Re-calculates on Backend First)
exports.savePlan = async (req, res, next) => {
    try {
        const { isValid, errors, sanitized } = validateTravelPlanInput(req.body);
        if (!isValid) {
            req.session.flashError = errors.join(' ');
            return res.redirect('/trips/plan');
        }

        const selectedKey = req.body.selected_plan_key || 'user_match';
        const result = await RecommendationService.generateRecommendations(sanitized);

        const chosenOption =
            result.recommendations.find((r) => r.key === selectedKey) ||
            result.recommendations[0];

        const userId = req.session.user ? req.session.user.id : null;
        const planId = await TripModel.saveTravelPlan(
            userId,
            {
                ...sanitized,
                plan_title: chosenOption.plan_title,
                preferred_transport: chosenOption.preferred_transport,
                accommodation_category: chosenOption.accommodation_category,
                food_preference: chosenOption.food_preference
            },
            chosenOption.breakdown
        );

        req.session.flashSuccess = 'Travel itinerary calculated and saved! Review your full expense report below.';
        res.redirect(`/trips/${planId}`);
    } catch (error) {
        next(error);
    }
};

// 6. View Saved Travel Plan & Full Expense Report (/trips/:id)
exports.renderPlanDetails = async (req, res, next) => {
    try {
        const data = await TripModel.getTravelPlanById(req.params.id);
        if (!data) {
            return res.status(404).render('errors/404', {
                pageTitle: 'Travel Plan Not Found',
                requestedUrl: req.originalUrl
            });
        }

        res.render('trips/details', {
            pageTitle: `${data.plan.plan_title} - Expense Breakdown`,
            plan: data.plan,
            items: data.items
        });
    } catch (error) {
        next(error);
    }
};