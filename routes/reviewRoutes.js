const express = require('express');
const { protect } = require('../middleware');
const { Review, Booking, Worker } = require('../models');

const router = express.Router();

/**
 * @desc    Submit a review for a completed service
 * @route   POST /api/reviews
 * @access  Private/User
 */
const createReview = async (req, res) => {
    const { bookingId, rating, comment } = req.body;

    try {
        const booking = await Booking.findById(bookingId);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Check if booking is finished
        if (booking.status !== 'Finished' && booking.status !== 'Work Completed') {
            return res.status(400).json({ message: 'Cannot review an incomplete service' });
        }

        // Check if user is the one who made the booking
        if (booking.userId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized to review this booking' });
        }

        // Check if review already exists
        const reviewExists = await Review.findOne({ bookingId });
        if (reviewExists) {
            return res.status(400).json({ message: 'Booking already reviewed' });
        }

        const review = await Review.create({
            bookingId,
            userId: req.user._id,
            workerId: booking.workerId,
            rating: Number(rating),
            comment,
        });

        // Update worker rating
        const worker = await Worker.findById(booking.workerId);
        const reviews = await Review.find({ workerId: booking.workerId });

        worker.numReviews = reviews.length;
        worker.rating =
            reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length;

        await worker.save();

        res.status(201).json(review);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get all reviews for a specific worker
 * @route   GET /api/reviews/worker/:workerId
 * @access  Public
 */
const getWorkerReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ workerId: req.params.workerId })
            .populate('userId', 'name')
            .sort({ createdAt: -1 });
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get all high-rated reviews globally (Top 10)
 * @route   GET /api/reviews
 * @access  Public
 */
const getAllReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ rating: { $gte: 4 } })
            .populate('userId', 'name')
            .populate({ path: 'bookingId', populate: { path: 'serviceId', select: 'serviceName' } })
            .sort({ createdAt: -1 })
            .limit(10);
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

router.post('/', protect, createReview);
router.get('/', getAllReviews);
router.get('/worker/:workerId', getWorkerReviews);

module.exports = router;
