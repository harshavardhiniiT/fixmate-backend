const express = require('express');
const { User, Worker } = require('../models');
const { generateToken } = require('../utils');
const { protect } = require('../middleware');

const router = express.Router();

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = async (req, res) => {
    const { name, email, phone, password, address, role } = req.body;

    if (!name || !email || !phone || !password) {
        return res.status(400).json({ message: 'Please provide all required fields' });
    }

    try {
        const userExists = await User.findOne({ 
            $or: [
                { email: email.toLowerCase() }, 
                { phone }
            ] 
        });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists with this email or phone' });
        }

        const user = await User.create({
            name,
            email,
            phone,
            password,
            address: address || 'Not Provided',
            role: role || 'user',
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Auth user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res) => {
    const { email, password } = req.body; // email field can now be email or phone

    try {
        const user = await User.findOne({ 
            $or: [
                { email: email.toLowerCase() }, 
                { phone: email }
            ] 
        });

        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                address: user.address,
                role: user.role,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Register a new worker
 * @route   POST /api/auth/worker/register
 * @access  Public
 */
const registerWorker = async (req, res) => {
    const { name, email, phone, password, address, skills, experience, location } = req.body;

    if (!name || !email || !phone || !password || !skills || !experience) {
        return res.status(400).json({ message: 'Please provide all required fields' });
    }

    try {
        const workerExists = await Worker.findOne({ $or: [{ email }, { phone }] });

        if (workerExists) {
            return res.status(400).json({ message: 'Worker already exists with this email or phone' });
        }

        const experienceNum = Number(experience);
        if (isNaN(experienceNum) || experienceNum < 0) {
            return res.status(400).json({ message: 'Experience must be a valid number' });
        }

        const skillsArr = Array.isArray(skills) ? skills : [skills].filter(Boolean);
        if (skillsArr.length === 0) {
            return res.status(400).json({ message: 'At least one skill is required' });
        }

        let workerLocation = location || { type: 'Point', coordinates: [77.5946, 12.9716] };
        if (location && location.lat && location.lng) {
            workerLocation = { type: 'Point', coordinates: [parseFloat(location.lng), parseFloat(location.lat)] };
        } else if (location && location.coordinates) {
             workerLocation = location;
        }

        const worker = await Worker.create({
            name,
            email,
            phone,
            password,
            address: address || 'Not Provided',
            skills: skillsArr,
            experience: experienceNum,
            location: workerLocation,
        });

        if (worker) {
            res.status(201).json({
                _id: worker._id,
                name: worker.name,
                email: worker.email,
                phone: worker.phone,
                address: worker.address,
                skills: worker.skills,
                isVerified: worker.isVerified,
                role: 'worker',
                token: generateToken(worker._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid worker data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Auth worker & get token
 * @route   POST /api/auth/worker/login
 * @access  Public
 */
const loginWorker = async (req, res) => {
    const { email, password } = req.body; // email field can now be email or phone

    try {
        const worker = await Worker.findOne({ 
            $or: [
                { email: email.toLowerCase() }, 
                { phone: email }
            ] 
        });

        if (worker && (await worker.matchPassword(password))) {
            res.json({
                _id: worker._id,
                name: worker.name,
                email: worker.email,
                phone: worker.phone,
                address: worker.address,
                skills: worker.skills,
                isVerified: worker.isVerified,
                role: 'worker',
                token: generateToken(worker._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private/User
 */
const updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            user.name = req.body.name || user.name;
            user.phone = req.body.phone || user.phone;
            user.address = req.body.address || user.address;
            
            if (req.body.password) {
                user.password = req.body.password;
            }

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                phone: updatedUser.phone,
                role: updatedUser.role,
                address: updatedUser.address,
                token: generateToken(updatedUser._id),
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Update worker profile
 * @route   PUT /api/auth/worker/profile
 * @access  Private/Worker
 */
const updateWorkerProfile = async (req, res) => {
    try {
        const worker = await Worker.findById(req.user._id); // We use req.user because 'protect' sets it
        if (worker) {
            worker.name = req.body.name || worker.name;
            worker.phone = req.body.phone || worker.phone;
            worker.address = req.body.address || worker.address;
            
            if (req.body.password) {
                worker.password = req.body.password;
            }

            const updatedWorker = await worker.save();

            res.json({
                _id: updatedWorker._id,
                name: updatedWorker.name,
                email: updatedWorker.email,
                phone: updatedWorker.phone,
                address: updatedWorker.address,
                skills: updatedWorker.skills,
                isVerified: updatedWorker.isVerified,
                role: 'worker',
                token: generateToken(updatedWorker._id),
            });
        } else {
            res.status(404).json({ message: 'Worker not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (user) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                address: user.address,
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

router.post('/worker/register', registerWorker);
router.post('/worker/login', loginWorker);
router.put('/worker/profile', protect, updateWorkerProfile);

module.exports = router;
