const express = require('express');
const { protect, admin } = require('../middleware');
const { User, Worker, Booking } = require('../models');

const router = express.Router();

/**
 * @desc    Get all users (customers)
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
const getUsers = async (req, res) => {
    try {
        const users = await User.find({ role: 'user' }).select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get all workers
 * @route   GET /api/admin/workers
 * @access  Private/Admin
 */
const getWorkers = async (req, res) => {
    try {
        const workers = await Worker.find({}).select('-password');
        res.json(workers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get all bookings
 * @route   GET /api/admin/bookings
 * @access  Private/Admin
 */
const getBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({})
            .populate('userId', 'name email phone')
            .populate('workerId', 'name phone')
            .populate('serviceId', 'serviceName category')
            .sort({ createdAt: -1 });
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Toggle Approve/Verify a worker
 * @route   PUT /api/admin/verify-worker/:id
 * @access  Private/Admin
 */
const verifyWorker = async (req, res) => {
    try {
        // First get current state, then toggle
        const current = await Worker.findById(req.params.id).select('isVerified name');
        if (!current) {
            return res.status(404).json({ message: 'Worker not found' });
        }
        const updatedWorker = await Worker.findByIdAndUpdate(
            req.params.id,
            { $set: { isVerified: !current.isVerified } },
            { new: true, select: '-password' }
        );

        if (req.io) {
            req.io.to(updatedWorker._id.toString()).emit('verificationUpdated', updatedWorker.isVerified);
        }

        res.json(updatedWorker);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Delete a worker
 * @route   DELETE /api/admin/workers/:id
 * @access  Private/Admin
 */
const deleteWorker = async (req, res) => {
    try {
        const worker = await Worker.findByIdAndDelete(req.params.id);
        if (worker) {
            res.json({ message: 'Worker removed' });
        } else {
            res.status(404).json({ message: 'Worker not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Delete a user
 * @route   DELETE /api/admin/users/:id
 * @access  Private/Admin
 */
const deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (user) {
            res.json({ message: 'User removed' });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get platform-wide dashboard stats
 * @route   GET /api/admin/stats
 * @access  Private/Admin
 */
const getStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ role: 'user' });
        const totalWorkers = await Worker.countDocuments({});
        const totalBookings = await Booking.countDocuments({});
        const statsAggregation = await Booking.aggregate([
            { $match: { status: 'Finished' } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$finalPrice' },
                    platformRevenue: { $sum: { $ifNull: ['$platformFee', 0] } },
                    partsRevenue: { $sum: { $ifNull: ['$partsCost', 0] } },
                    workerEarnings: { $sum: { $ifNull: ['$workerEarnings', 0] } }
                }
            },
        ]);

        const paymentMethodStats = await Booking.aggregate([
            { $match: { status: 'Finished' } },
            {
                $group: {
                    _id: '$paymentMethod',
                    count: { $sum: 1 },
                    total: { $sum: '$finalPrice' }
                }
            }
        ]);

        // Advanced Financial Spread
        const totalGross = statsAggregation.length > 0 ? statsAggregation[0].totalRevenue : 0;
        const totalProfit = statsAggregation.length > 0 ? statsAggregation[0].platformRevenue : 0;
        const totalMaterials = statsAggregation.length > 0 ? statsAggregation[0].partsRevenue : 0;
        const totalWorkerPayouts = statsAggregation.length > 0 ? statsAggregation[0].workerEarnings : 0;

        // Cancellation Diagnostics
        const totalCancelled = await Booking.countDocuments({ status: 'Cancelled' });
        const cancellationRate = totalBookings > 0 ? (totalCancelled / totalBookings) * 100 : 0;

        res.json({
            totalUsers,
            totalWorkers,
            totalBookings,
            totalRevenue: totalGross,
            platformProfit: totalProfit,
            materialsTotal: totalMaterials,
            totalPlatformEarnings: totalWorkerPayouts,
            paymentMethodStats,
            totalCancelled,
            cancellationRate
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Assign worker to a booking
 * @route   PUT /api/admin/bookings/:id/assign
 * @access  Private/Admin
 */
const assignWorkerToBooking = async (req, res) => {
    try {
        const { workerId } = req.body;
        const booking = await Booking.findById(req.params.id);

        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        const worker = await Worker.findById(workerId);
        if (!worker) return res.status(404).json({ message: 'Worker not found' });

        booking.workerId = workerId;
        booking.status = 'Worker On The Way'; // Or whichever status makes sense when assigned
        await booking.save();

        const populatedBooking = await Booking.findById(booking._id)
            .populate('userId', 'name email phone address')
            .populate('workerId', 'name phone rating')
            .populate('serviceId', 'serviceName category basePrice');

        if (req.io) {
            req.io.to(workerId.toString()).emit('newBooking', populatedBooking);
            if (populatedBooking.userId) {
                req.io.to(populatedBooking.userId._id.toString()).emit('bookingUpdated', populatedBooking);
            }
        }

        res.json(populatedBooking);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get advanced platform analytics (Monthly, Services, Workers)
 * @route   GET /api/admin/analytics
 * @access  Private/Admin
 */
const getAnalytics = async (req, res) => {
    try {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        // 1. Monthly Revenue & Booking Counts
        const monthlyStats = await Booking.aggregate([
            { $match: { status: 'Finished', createdAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: {
                        month: { $month: '$createdAt' },
                        year: { $year: '$createdAt' }
                    },
                    revenue: { $sum: '$finalPrice' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // 2. Service Distribution
        const serviceStats = await Booking.aggregate([
            { $match: { status: 'Finished' } },
            {
                $group: {
                    _id: '$serviceId',
                    count: { $sum: 1 },
                    revenue: { $sum: '$finalPrice' }
                }
            },
            {
                $lookup: {
                    from: 'services',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'service'
                }
            },
            { $unwind: '$service' },
            { $sort: { count: -1 } }
        ]);

        // 3. Top Workers with Efficiency Math
        const workerStats = await Booking.aggregate([
            { $match: { status: 'Finished' } },
            {
                $group: {
                    _id: '$workerId',
                    earnings: { $sum: '$workerEarnings' },
                    jobs: { $sum: 1 },
                    // Calculate avg time in hours (Finish - Accepted)
                    avgCompletionTime: { $avg: { $divide: [{ $subtract: ['$updatedAt', '$createdAt'] }, 3600000] } }
                }
            },
            {
                $lookup: {
                    from: 'workers',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'worker'
                }
            },
            { $unwind: '$worker' },
            { $sort: { earnings: -1 } },
            { $limit: 5 }
        ]);

        // 4. Cancellation by Service (Revenue Leakage)
        const leakageStats = await Booking.aggregate([
            { $match: { status: 'Cancelled' } },
            {
                $group: {
                    _id: '$serviceId',
                    cancelledCount: { $sum: 1 },
                    lostRevenue: { $sum: '$estimatedPrice' }
                }
            },
            {
                $lookup: {
                    from: 'services',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'service'
                }
            },
            { $unwind: '$service' }
        ]);

        // 5. Growth Math (MoM)
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const thisMonthRevenue = monthlyStats.find(s => s._id.month === new Date().getMonth() + 1)?.revenue || 0;
        const prevMonthRevenue = monthlyStats.find(s => s._id.month === new Date().getMonth())?.revenue || 0;
        const revenueGrowth = prevMonthRevenue > 0 ? ((thisMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 : 0;

        // 5. Daily Revenue Velocity (Last 30 Days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const dailyStats = await Booking.aggregate([
            { $match: { status: 'Finished', createdAt: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: {
                        day: { $dayOfMonth: '$createdAt' },
                        month: { $month: '$createdAt' },
                        year: { $year: '$createdAt' }
                    },
                    revenue: { $sum: '$finalPrice' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
        ]);

        // 6. Geographic Distribution (Top Locations)
        const locationStats = await Booking.aggregate([
            { $match: { status: 'Finished' } },
            {
                $group: {
                    _id: '$location.address',
                    count: { $sum: 1 },
                    revenue: { $sum: '$finalPrice' }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        res.json({
            monthlyStats,
            dailyStats,
            serviceStats,
            workerStats,
            leakageStats,
            revenueGrowth,
            locationStats
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get all platform reviews
 * @route   GET /api/admin/reviews
 * @access  Private/Admin
 */
const getReviews = async (req, res) => {
    try {
        const { Review } = require('../models');
        const reviews = await Review.find({})
            .populate('userId', 'name email')
            .populate('workerId', 'name email')
            .populate({ path: 'bookingId', populate: { path: 'serviceId', select: 'serviceName' } })
            .sort({ createdAt: -1 });
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Delete/Moderate a review
 * @route   DELETE /api/admin/reviews/:id
 * @access  Private/Admin
 */
const deleteReview = async (req, res) => {
    try {
        const { Review } = require('../models');
        const review = await Review.findByIdAndDelete(req.params.id);
        if (review) {
            res.json({ message: 'Review removed by admin moderation' });
        } else {
            res.status(404).json({ message: 'Review not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

router.get('/users', protect, admin, getUsers);
router.get('/workers', protect, admin, getWorkers);
router.get('/bookings', protect, admin, getBookings);
router.get('/stats', protect, admin, getStats);
router.get('/analytics', protect, admin, getAnalytics);
router.get('/reviews', protect, admin, getReviews);
router.put('/verify-worker/:id', protect, admin, verifyWorker);
router.put('/bookings/:id/assign', protect, admin, assignWorkerToBooking);
router.delete('/workers/:id', protect, admin, deleteWorker);
router.delete('/users/:id', protect, admin, deleteUser);
router.delete('/reviews/:id', protect, admin, deleteReview);

module.exports = router;
