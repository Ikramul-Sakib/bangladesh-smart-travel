const AdminModel = require('../models/adminModel');
const { toCSV, parseCSV } = require('../utils/csvHelper');

// 1. Dashboard Overview
exports.renderDashboard = async (req, res, next) => {
    try {
        const stats = await AdminModel.getDashboardStats();
        res.render('admin/dashboard', {
            pageTitle: 'Admin Dashboard & Reports',
            activeTab: 'dashboard',
            stats
        });
    } catch (error) {
        next(error);
    }
};

// 2. Destinations & Attractions
exports.renderDestinations = async (req, res, next) => {
    try {
        const search = req.query.search || '';
        const destinations = await AdminModel.getAllDestinations(search);
        const attractions = await AdminModel.getAllAttractions(req.query.destination_id || '');

        res.render('admin/destinations', {
            pageTitle: 'Manage Destinations & Attractions',
            activeTab: 'destinations',
            destinations,
            attractions,
            search
        });
    } catch (error) {
        next(error);
    }
};

exports.createDestination = async (req, res, next) => {
    try {
        if (!req.body.name || !req.body.division || !req.body.short_description) {
            req.session.flashError = 'Destination name, division, and short description are required.';
            return res.redirect('/admin/destinations');
        }
        await AdminModel.createDestination(req.body);
        req.session.flashSuccess = `Destination "${req.body.name}" added successfully.`;
        res.redirect('/admin/destinations');
    } catch (error) {
        next(error);
    }
};

exports.updateDestination = async (req, res, next) => {
    try {
        await AdminModel.updateDestination(req.params.id, req.body);
        req.session.flashSuccess = 'Destination updated successfully.';
        res.redirect('/admin/destinations');
    } catch (error) {
        next(error);
    }
};

exports.deleteDestination = async (req, res, next) => {
    try {
        await AdminModel.deleteDestination(req.params.id);
        req.session.flashSuccess = 'Destination deleted.';
        res.redirect('/admin/destinations');
    } catch (error) {
        next(error);
    }
};

exports.createAttraction = async (req, res, next) => {
    try {
        await AdminModel.createAttraction(req.body);
        req.session.flashSuccess = 'Tourist attraction added.';
        res.redirect('/admin/destinations');
    } catch (error) {
        next(error);
    }
};

exports.deleteAttraction = async (req, res, next) => {
    try {
        await AdminModel.deleteAttraction(req.params.id);
        req.session.flashSuccess = 'Tourist attraction deleted.';
        res.redirect('/admin/destinations');
    } catch (error) {
        next(error);
    }
};

// 3. Transportation Fares
exports.renderTransport = async (req, res, next) => {
    try {
        const filters = {
            destination_id: req.query.destination_id || '',
            transport_type: req.query.transport_type || '',
            search: req.query.search || ''
        };
        const [destinations, transportOptions] = await Promise.all([
            AdminModel.getAllDestinations(),
            AdminModel.getTransportOptions(filters)
        ]);

        res.render('admin/transport', {
            pageTitle: 'Manage Transportation Fares',
            activeTab: 'transport',
            destinations,
            transportOptions,
            filters
        });
    } catch (error) {
        next(error);
    }
};

exports.createTransport = async (req, res, next) => {
    try {
        if (!req.body.operator_name || !req.body.one_way_fare_bdt || Number(req.body.one_way_fare_bdt) <= 0) {
            req.session.flashError = 'Operator name and a positive one-way fare (BDT) are required.';
            return res.redirect('/admin/transport');
        }
        await AdminModel.createTransportOption(req.body);
        req.session.flashSuccess = 'Transport fare record added.';
        res.redirect('/admin/transport');
    } catch (error) {
        next(error);
    }
};

exports.updateTransport = async (req, res, next) => {
    try {
        await AdminModel.updateTransportOption(req.params.id, req.body);
        req.session.flashSuccess = 'Transport fare updated.';
        res.redirect('/admin/transport');
    } catch (error) {
        next(error);
    }
};

exports.deleteTransport = async (req, res, next) => {
    try {
        await AdminModel.deleteTransportOption(req.params.id);
        req.session.flashSuccess = 'Transport option removed.';
        res.redirect('/admin/transport');
    } catch (error) {
        next(error);
    }
};

// 4. Hotels & Room Types
exports.renderHotels = async (req, res, next) => {
    try {
        const filters = {
            destination_id: req.query.destination_id || '',
            category: req.query.category || '',
            search: req.query.search || ''
        };
        const [destinations, { hotels, roomTypes }] = await Promise.all([
            AdminModel.getAllDestinations(),
            AdminModel.getHotelsWithRooms(filters)
        ]);

        res.render('admin/hotels', {
            pageTitle: 'Manage Hotels & Room Rates',
            activeTab: 'hotels',
            destinations,
            hotels,
            roomTypes,
            filters
        });
    } catch (error) {
        next(error);
    }
};

exports.createHotel = async (req, res, next) => {
    try {
        if (!req.body.name || !req.body.destination_id) {
            req.session.flashError = 'Hotel name and destination are required.';
            return res.redirect('/admin/hotels');
        }
        await AdminModel.createHotelWithRoom(req.body);
        req.session.flashSuccess = 'Hotel and room rate created.';
        res.redirect('/admin/hotels');
    } catch (error) {
        next(error);
    }
};

exports.createRoomType = async (req, res, next) => {
    try {
        await AdminModel.createRoomType(req.body);
        req.session.flashSuccess = 'Room type added to hotel.';
        res.redirect('/admin/hotels');
    } catch (error) {
        next(error);
    }
};

exports.updateRoomType = async (req, res, next) => {
    try {
        await AdminModel.updateRoomType(req.params.id, req.body);
        req.session.flashSuccess = 'Room rate updated.';
        res.redirect('/admin/hotels');
    } catch (error) {
        next(error);
    }
};

exports.deleteHotel = async (req, res, next) => {
    try {
        await AdminModel.deleteHotel(req.params.id);
        req.session.flashSuccess = 'Hotel deleted.';
        res.redirect('/admin/hotels');
    } catch (error) {
        next(error);
    }
};

exports.deleteRoomType = async (req, res, next) => {
    try {
        await AdminModel.deleteRoomType(req.params.id);
        req.session.flashSuccess = 'Room type deleted.';
        res.redirect('/admin/hotels');
    } catch (error) {
        next(error);
    }
};

// 5. Food, Additional Expenses & Tour Packages
exports.renderExpenses = async (req, res, next) => {
    try {
        const destinationId = req.query.destination_id || '';
        const [destinations, { foodCosts, additionalExpenses }, tourPackages] = await Promise.all([
            AdminModel.getAllDestinations(),
            AdminModel.getFoodAndAdditionalExpenses(destinationId),
            AdminModel.getAllTourPackages()
        ]);

        res.render('admin/expenses', {
            pageTitle: 'Manage Food, Local Expenses & Packages',
            activeTab: 'expenses',
            destinations,
            foodCosts,
            additionalExpenses,
            tourPackages,
            selectedDestinationId: destinationId
        });
    } catch (error) {
        next(error);
    }
};

exports.upsertFoodCost = async (req, res, next) => {
    try {
        await AdminModel.upsertFoodCost(req.body);
        req.session.flashSuccess = 'Food cost tier saved.';
        res.redirect('/admin/expenses');
    } catch (error) {
        next(error);
    }
};

exports.deleteFoodCost = async (req, res, next) => {
    try {
        await AdminModel.deleteFoodCost(req.params.id);
        req.session.flashSuccess = 'Food cost tier deleted.';
        res.redirect('/admin/expenses');
    } catch (error) {
        next(error);
    }
};

exports.createAdditionalExpense = async (req, res, next) => {
    try {
        await AdminModel.createAdditionalExpense(req.body);
        req.session.flashSuccess = 'Additional expense item saved.';
        res.redirect('/admin/expenses');
    } catch (error) {
        next(error);
    }
};

exports.deleteAdditionalExpense = async (req, res, next) => {
    try {
        await AdminModel.deleteAdditionalExpense(req.params.id);
        req.session.flashSuccess = 'Additional expense deleted.';
        res.redirect('/admin/expenses');
    } catch (error) {
        next(error);
    }
};

exports.createTourPackage = async (req, res, next) => {
    try {
        await AdminModel.createTourPackage(req.body);
        req.session.flashSuccess = 'Tour package created.';
        res.redirect('/admin/expenses');
    } catch (error) {
        next(error);
    }
};

exports.deleteTourPackage = async (req, res, next) => {
    try {
        await AdminModel.deleteTourPackage(req.params.id);
        req.session.flashSuccess = 'Tour package deleted.';
        res.redirect('/admin/expenses');
    } catch (error) {
        next(error);
    }
};

// 6. Users & Tour Agents Management
exports.renderUsers = async (req, res, next) => {
    try {
        const filters = {
            role: req.query.role || '',
            status: req.query.status || ''
        };
        const users = await AdminModel.getUsersAndAgents(filters);
        res.render('admin/users', {
            pageTitle: 'Manage Users & Tour Agents',
            activeTab: 'users',
            users,
            filters
        });
    } catch (error) {
        next(error);
    }
};

exports.updateUserStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        if (!['active', 'pending', 'suspended'].includes(status)) {
            req.session.flashError = 'Invalid status.';
            return res.redirect('/admin/users');
        }
        await AdminModel.updateUserStatus(req.params.id, status);
        req.session.flashSuccess = `User account status updated to ${status.toUpperCase()}.`;
        res.redirect('/admin/users');
    } catch (error) {
        next(error);
    }
};

exports.verifyAgent = async (req, res, next) => {
    try {
        const isVerified = req.body.is_verified === '1';
        await AdminModel.verifyAgentProfile(req.params.agentProfileId, isVerified);
        req.session.flashSuccess = isVerified
            ? 'Tour Agent verified and approved.'
            : 'Tour Agent verification revoked.';
        res.redirect('/admin/users');
    } catch (error) {
        next(error);
    }
};

// 7. Bookings & Travel Plans Reports
exports.renderBookings = async (req, res, next) => {
    try {
        const { bookings, travelPlans } = await AdminModel.getAllBookingsAndPlans();
        res.render('admin/bookings', {
            pageTitle: 'Bookings & Saved Itineraries Report',
            activeTab: 'bookings',
            bookings,
            travelPlans
        });
    } catch (error) {
        next(error);
    }
};

// 8. CSV Export & Import for Cost Records
exports.exportCostCSV = async (req, res, next) => {
    try {
        const type = req.params.type;

        if (type === 'transport') {
            const rows = await AdminModel.getTransportOptions();
            const cols = [
                'transport_type',
                'departure_location',
                'destination_id',
                'operator_name',
                'comfort_tier',
                'pricing_model',
                'vehicle_capacity',
                'one_way_fare_bdt',
                'return_fare_bdt',
                'duration_hours',
                'schedule_info',
                'additional_fees_bdt',
                'is_verified'
            ];
            const csv = toCSV(rows, cols);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="transport_costs.csv"');
            return res.send(csv);
        }

        if (type === 'food') {
            const { foodCosts } = await AdminModel.getFoodAndAdditionalExpenses();
            const cols = [
                'destination_id',
                'tier',
                'package_name',
                'breakfast_cost_bdt',
                'lunch_cost_bdt',
                'dinner_cost_bdt',
                'snacks_water_cost_bdt',
                'is_verified'
            ];
            const csv = toCSV(foodCosts, cols);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="food_costs.csv"');
            return res.send(csv);
        }

        if (type === 'additional') {
            const { additionalExpenses } = await AdminModel.getFoodAndAdditionalExpenses();
            const cols = [
                'destination_id',
                'expense_category',
                'title',
                'pricing_basis',
                'cost_bdt',
                'is_mandatory',
                'is_verified'
            ];
            const csv = toCSV(additionalExpenses, cols);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="additional_expenses.csv"');
            return res.send(csv);
        }

        req.session.flashError = 'Unsupported CSV export type.';
        res.redirect('/admin/dashboard');
    } catch (error) {
        next(error);
    }
};

exports.importCostCSV = async (req, res, next) => {
    try {
        const type = req.params.type;
        if (!req.file || !req.file.buffer) {
            req.session.flashError = 'Please select a valid CSV file to upload.';
            return res.redirect('back');
        }

        const csvText = req.file.buffer.toString('utf-8');
        const records = parseCSV(csvText);

        if (records.length === 0) {
            req.session.flashError = 'The uploaded CSV file contained no data rows.';
            return res.redirect('back');
        }

        let importedCount = 0;

        if (type === 'transport') {
            for (const row of records) {
                if (row.destination_id && row.operator_name && row.one_way_fare_bdt) {
                    await AdminModel.createTransportOption({
                        ...row,
                        is_verified: row.is_verified === '1' || row.is_verified === 'true'
                    });
                    importedCount++;
                }
            }
            req.session.flashSuccess = `Imported ${importedCount} transport cost records from CSV.`;
            return res.redirect('/admin/transport');
        }

        if (type === 'food') {
            for (const row of records) {
                if (row.destination_id && row.tier) {
                    await AdminModel.upsertFoodCost({
                        ...row,
                        is_verified: row.is_verified === '1' || row.is_verified === 'true'
                    });
                    importedCount++;
                }
            }
            req.session.flashSuccess = `Imported/updated ${importedCount} food cost records from CSV.`;
            return res.redirect('/admin/expenses');
        }

        if (type === 'additional') {
            for (const row of records) {
                if (row.destination_id && row.expense_category && row.title) {
                    await AdminModel.createAdditionalExpense({
                        ...row,
                        is_mandatory: row.is_mandatory === '1' || row.is_mandatory === 'true',
                        is_verified: row.is_verified === '1' || row.is_verified === 'true'
                    });
                    importedCount++;
                }
            }
            req.session.flashSuccess = `Imported ${importedCount} additional expense records from CSV.`;
            return res.redirect('/admin/expenses');
        }

        req.session.flashError = 'Unsupported CSV import category.';
        res.redirect('/admin/dashboard');
    } catch (error) {
        next(error);
    }
};