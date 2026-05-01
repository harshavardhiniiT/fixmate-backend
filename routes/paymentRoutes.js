const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { protect } = require('../middleware');
const { Booking } = require('../models');

const router = express.Router();

// Clean environment variable access
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
console.log("DEBUG KEY:", RAZORPAY_KEY_ID);

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    console.error('Razorpay keys missing');
}

const razorpayInstance = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
});

/**
 * @desc    Create Razorpay Order
 * @route   POST /api/payment/create-order
 * @access  Private
 */
router.post('/create-order', protect, async (req, res) => {
    try {
        const { amount, bookingId } = req.body;

        if (!amount || !bookingId) {
            return res.status(400).json({ message: 'Amount and bookingId are required' });
        }

        const options = {
            amount: Math.round(amount * 100), // amount in the smallest currency unit (paise)
            currency: 'INR',
            receipt: `receipt_order_${bookingId}`,
        };

        const order = await razorpayInstance.orders.create(options);

        if (!order) {
            return res.status(500).json({ message: 'Some error occurred generating order' });
        }

        res.json({
            ...order,
            keyId: RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error('RAZORPAY ERROR (Create Order):', error);
        res.status(500).json({ message: error.message || 'Error occurred while creating Razorpay order' });
    }
});

/**
 * @desc    Verify Razorpay Payment
 * @route   POST /api/payment/verify
 * @access  Private
 */
router.post('/verify', protect, async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            bookingId
        } = req.body;

        const sign = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac('sha256', RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest('hex');

        if (razorpay_signature === expectedSign) {
            // Update booking status to Finished
            const booking = await Booking.findById(bookingId);
            if (booking) {
                booking.status = 'Finished';
                booking.paymentMethod = 'Online';
                await booking.save();

                // Emitting update
                if (req.io) {
                    const populatedBooking = await Booking.findById(booking._id)
                        .populate('userId', 'name email phone address')
                        .populate('workerId', 'name phone rating')
                        .populate('serviceId', 'serviceName category basePrice');

                    if (booking.workerId) {
                        req.io.to(booking.workerId.toString()).emit('bookingUpdated', populatedBooking);
                    }
                    if (booking.userId) {
                        req.io.to(booking.userId.toString()).emit('bookingUpdated', populatedBooking);
                    }
                }

                return res.json({ message: 'Payment verified successfully and booking finished.' });
            } else {
                return res.status(404).json({ message: 'Booking not found' });
            }
        } else {
            return res.status(400).json({ message: 'Invalid signature sent!' });
        }
    } catch (error) {
        console.error('RAZORPAY ERROR (Verify Payment):', error);
        res.status(500).json({ message: error.message || 'Error occurred while verifying Razorpay payment' });
    }
});

module.exports = router;
