const { User, Worker, Booking } = require('./models');

/**
 * Generate a summary report of the platform
 * @returns {Promise<Object>}
 */
const generateSummaryReport = async () => {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalWorkers = await Worker.countDocuments({});
    const totalBookings = await Booking.countDocuments({});
    const totalRevenue = await Booking.aggregate([
        { $match: { status: 'Finished' } },
        { $group: { _id: null, total: { $sum: '$finalPrice' } } },
    ]);

    return {
        timestamp: new Date(),
        totalUsers,
        totalWorkers,
        totalBookings,
        totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
    };
};

/**
 * Generate a detailed list of bookings for reporting
 * @returns {Promise<Array>}
 */
const generateBookingReport = async () => {
    return await Booking.find({})
        .populate('userId', 'name email phone')
        .populate('workerId', 'name email phone')
        .populate('serviceId', 'serviceName');
};

module.exports = {
    generateSummaryReport,
    generateBookingReport,
};
