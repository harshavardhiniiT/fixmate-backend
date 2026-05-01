const express = require('express');
const { protect, admin } = require('../middleware');
const { generateSummaryReport, generateBookingReport } = require('../reportGenerator');

const router = express.Router();

/**
 * @desc    Get summary report data
 * @route   GET /api/admin/reports/summary
 * @access  Private/Admin
 */
router.get('/summary', protect, admin, async (req, res) => {
    try {
        const report = await generateSummaryReport();
        res.json(report);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/**
 * @desc    Get detailed booking report data
 * @route   GET /api/admin/reports/bookings
 * @access  Private/Admin
 */
router.get('/bookings', protect, admin, async (req, res) => {
    try {
        const bookings = await generateBookingReport();
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
