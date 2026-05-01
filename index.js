const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config');
const logger = require('./logger');
const authRoutes = require('./routes/authRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const workerRoutes = require('./routes/workerRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reportRoutes = require('./routes/reportRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

// Load environment variables
// Already loaded at the top

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);

// Setup Socket.io
const io = new Server(server, {
    cors: {
        origin: '*', // Allows frontend on any port to connect
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
});

io.on('connection', (socket) => {
    // Join a room based on the user's or worker's ID to receive specific notifications
    socket.on('join', (userId) => {
        socket.join(userId);
    });

    socket.on('disconnect', () => {
        // Handle disconnect if needed
    });
});

// Middleware
app.use(express.json());
app.use(cors({
    origin: true,   // allow all origins dynamically
    credentials: true
}));
app.options('*', cors());
app.use(morgan('dev'));

// Logger for requests
app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.url}`);
    // Inject io into request to use it in routes
    req.io = io;
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/reports', reportRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payment', paymentRoutes);

// Basic Route
app.get('/', (req, res) => {
    res.send('FixMate API is running with Socket.io...');
});

// Error handling middleware
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode);
    res.json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server };
