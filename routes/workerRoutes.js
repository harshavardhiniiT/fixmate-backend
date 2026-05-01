const express = require('express');
const { protect, worker } = require('../middleware');
const { Worker } = require('../models');

const router = express.Router();

/**
 * @desc    Search for nearby workers based on GEO location and required skills
 * @route   GET /api/workers/nearby
 * @access  Public
 */
const getNearbyWorkers = async (req, res) => {
    const { lat, lng, skill, maxDistance, skipGeo } = req.query;

    try {
        let query = {
            isVerified: true,
            isAvailable: true,
        };

        if (skill) {
            // Split skill like "Bathroom Plumbing" into ["Bathroom", "Plumbing"] 
            // and match if array contains any of these words
            const regexes = skill.split(' ').map(s => new RegExp(s, 'i'));
            query.skills = { $in: regexes };
        }

        if (skipGeo !== 'true' && lat && lng) {
            query.location = {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(lng), parseFloat(lat)],
                    },
                    $maxDistance: parseInt(maxDistance) || 50000,
                },
            };
        }

        const workers = await Worker.find(query).select('-password');
        res.json(workers);
    } catch (error) {
        // If geo-index fails, gracefully fallback to non-geo query
        if (error.message.includes('geo') || error.message.includes('2dsphere') || error.message.includes('index')) {
            try {
                let fallbackQuery = {
                    isVerified: true,
                    isAvailable: true,
                };
                if (skill) { 
                    const regexes = skill.split(' ').map(s => new RegExp(s, 'i'));
                    fallbackQuery.skills = { $in: regexes }; 
                }
                
                const fallbackWorkers = await Worker.find(fallbackQuery).select('-password');
                return res.json(fallbackWorkers);
            } catch (fallbackError) {
                return res.status(500).json({ message: fallbackError.message });
            }
        }
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get the profile of the logged-in worker
 * @route   GET /api/worker/profile
 * @access  Private/Worker
 */
const getWorkerProfile = async (req, res) => {
    try {
        const workerProfile = await Worker.findById(req.worker._id).select('-password');
        if (workerProfile) {
            res.json(workerProfile);
        } else {
            res.status(404).json({ message: 'Worker not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Toggle worker availability (online/offline)
 * @route   PUT /api/worker/availability
 * @access  Private/Worker
 */
const updateWorkerAvailability = async (req, res) => {
    try {
        const workerProfile = await Worker.findById(req.worker._id);

        if (workerProfile) {
            workerProfile.isAvailable = req.body.isAvailable !== undefined ? req.body.isAvailable : workerProfile.isAvailable;
            const updatedWorker = await workerProfile.save();
            res.json({ isAvailable: updatedWorker.isAvailable });
        } else {
            res.status(404).json({ message: 'Worker not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Update worker profile details or location
 * @route   PUT /api/worker/profile
 * @access  Private/Worker
 */
const updateWorkerProfile = async (req, res) => {
    try {
        const workerProfile = await Worker.findById(req.worker._id);

        if (workerProfile) {
            workerProfile.name = req.body.name || workerProfile.name;
            workerProfile.address = req.body.address || workerProfile.address;
            workerProfile.skills = req.body.skills || workerProfile.skills;
            workerProfile.experience = req.body.experience || workerProfile.experience;
            if (req.body.location) {
                workerProfile.location = req.body.location;
            }

            const updatedWorker = await workerProfile.save();
            res.json(updatedWorker);
        } else {
            res.status(404).json({ message: 'Worker not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get top-rated workers for showcase
 * @route   GET /api/workers/top-rated
 * @access  Public
 */
const getTopWorkers = async (req, res) => {
    try {
        const workers = await Worker.find({ isVerified: true })
            .sort({ rating: -1, numReviews: -1 })
            .limit(10)
            .select('-password');
        res.json(workers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

router.get('/nearby', getNearbyWorkers);
router.get('/top-rated', getTopWorkers);
router.get('/profile', protect, worker, getWorkerProfile);
router.put('/profile', protect, worker, updateWorkerProfile);
router.put('/availability', protect, worker, updateWorkerAvailability);

module.exports = router;
