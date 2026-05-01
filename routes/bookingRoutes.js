const express = require('express');
const { protect, worker } = require('../middleware');
const { Booking } = require('../models');

const router = express.Router();

/**
 * @desc    Create a new booking (by customer)
 * @route   POST /api/bookings
 * @access  Private/User
 */
const createBooking = async (req, res) => {
    const { serviceId, workerId, location, date, timeSlot, estimatedPrice } = req.body;

    try {
        if (workerId) {
            const { Worker } = require('../models');
            const targetWorker = await Worker.findById(workerId);
            if (!targetWorker || !targetWorker.isVerified) {
                return res.status(400).json({ message: 'Selected professional is not yet verified or unavailable.' });
            }
        }

        const booking = await Booking.create({
            userId: req.user._id,
            serviceId,
            workerId,
            location,
            date,
            timeSlot,
            estimatedPrice,
        });

        if (booking) {
            // Populate early for socket event
            const populatedBooking = await Booking.findById(booking._id)
                .populate('userId', 'name phone address')
                .populate('serviceId', 'serviceName category basePrice');
            
            if (req.io && workerId) {
                req.io.to(workerId.toString()).emit('newBooking', populatedBooking);
            }

            res.status(201).json(populatedBooking || booking);
        } else {
            res.status(400).json({ message: 'Invalid booking data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get all bookings for the logged-in user
 * @route   GET /api/bookings/mybookings
 * @access  Private/User
 */
const getMyBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ userId: req.user._id })
            .populate('workerId', 'name phone rating')
            .populate('serviceId', 'serviceName category');
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get all assigned jobs for the logged-in worker
 * @route   GET /api/bookings/myjobs
 * @access  Private/Worker
 */
const getMyJobs = async (req, res) => {
    try {
        const bookings = await Booking.find({ workerId: req.worker._id })
            .populate('userId', 'name phone address')
            .populate('serviceId', 'serviceName category');
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Update booking status (Accept, Reject, Finish, etc.)
 * @route   PUT /api/bookings/:id/status
 * @access  Private (User or Worker)
 */
const updateBookingStatus = async (req, res) => {
    const { status, laborCost, partsCost, finalPrice, paymentMethod } = req.body;

    try {
        const booking = await Booking.findById(req.params.id);

        if (booking) {
            const oldStatus = booking.status;

            // Basic Status Consistency Check
            const allowedTransitions = {
                'Pending': ['Accepted', 'Cancelled'],
                'Accepted': ['Worker On The Way', 'Cancelled'],
                'Worker On The Way': ['Work Started'],
                'Work Started': ['Work Completed'],
                'Work Completed': ['Payment Pending'],
                'Payment Pending': ['Finished'],
                'Finished': [],
                'Cancelled': []
            };

            if (status && status !== oldStatus) {
                if (!allowedTransitions[oldStatus].includes(status)) {
                    // Admins can bypass this if they want, but for now we enforce it
                    // return res.status(400).json({ message: `Cannot transition from ${oldStatus} to ${status}` });
                    console.log(`Warning: Transitioning from ${oldStatus} to ${status}`);
                }
            }

            booking.status = status || booking.status;
            if (paymentMethod) booking.paymentMethod = paymentMethod;
            if (laborCost !== undefined) booking.laborCost = laborCost;
            if (partsCost !== undefined) booking.partsCost = partsCost;
            
            // Financial Math Fix: Platform Fee (5%) on Labor Cost
            if (laborCost !== undefined || partsCost !== undefined) {
                const labor = laborCost !== undefined ? laborCost : (booking.laborCost || 0);
                const parts = partsCost !== undefined ? partsCost : (booking.partsCost || 0);
                
                booking.platformFee = Number((labor * 0.05).toFixed(2)); // 5% fee
                booking.workerEarnings = Number((labor - booking.platformFee).toFixed(2));
                booking.finalPrice = Number((labor + parts).toFixed(2));
            }

            if (finalPrice !== undefined) booking.finalPrice = finalPrice;

            const updatedBooking = await booking.save();
            const populatedBooking = await Booking.findById(updatedBooking._id)
                 .populate('userId', 'name phone address')
                 .populate('workerId', 'name phone rating')
                 .populate('serviceId', 'serviceName category basePrice');

            if (oldStatus !== booking.status && req.io) {
                // Notify user and worker
                if (booking.userId) {
                    req.io.to(booking.userId.toString()).emit('bookingUpdated', populatedBooking);
                }
                if (booking.workerId) {
                    req.io.to(booking.workerId.toString()).emit('bookingUpdated', populatedBooking);
                }

                // Notify admin for Real-Time BI Dashboard updates
                if (['Finished', 'Cancelled'].includes(booking.status)) {
                    req.io.emit('BI_DATA_UPDATE', { 
                        type: booking.status === 'Finished' ? 'TRANSACTION' : 'CANCELLATION',
                        bookingId: booking._id
                    });
                }
            }

            res.json(populatedBooking || updatedBooking);
        } else {
            res.status(404).json({ message: 'Booking not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get detailed information about a specific booking
 * @route   GET /api/bookings/:id
 * @access  Private
 */
const getBookingById = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('userId', 'name phone address')
            .populate('workerId', 'name phone rating')
            .populate('serviceId', 'serviceName category basePrice');

        if (booking) {
            res.json(booking);
        } else {
            res.status(404).json({ message: 'Booking not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

router.post('/', protect, createBooking);
router.get('/mybookings', protect, getMyBookings);
router.get('/myjobs', protect, worker, getMyJobs);
router.get('/:id', protect, getBookingById);
router.put('/:id/status', protect, updateBookingStatus);

module.exports = router;
