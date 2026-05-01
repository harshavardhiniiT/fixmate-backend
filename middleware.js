const jwt = require('jsonwebtoken');
const { User, Worker } = require('./models');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Try to find user first, then worker
            req.user = await User.findById(decoded.id).select('-password');
            if (!req.user) {
                req.worker = await Worker.findById(decoded.id).select('-password');
            }

            if (!req.user && !req.worker) {
                return res.status(401).json({ message: 'Not authorized, token failed' });
            }

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as an admin' });
    }
};

const worker = (req, res, next) => {
    if (req.worker) {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as a worker' });
    }
}

module.exports = { protect, admin, worker };
