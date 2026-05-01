const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const dotenv = require('dotenv');
const { Worker } = require('./models');

dotenv.config();

const workers = [
    {
        name: 'John Doe',
        email: 'john@cleaning.com',
        phone: '1112223333',
        password: 'password123',
        address: '123 Cleaning St',
        skills: ['Cleaning'],
        experience: 5,
        rating: 4.8,
        isVerified: true,
        isAvailable: true,
        location: { type: 'Point', coordinates: [77.5946, 12.9716] }
    },
    {
        name: 'Sarah Smith',
        email: 'sarah@plumbing.com',
        phone: '2223334444',
        password: 'password123',
        address: '456 Plumbing Ave',
        skills: ['Plumbing'],
        experience: 8,
        rating: 4.9,
        isVerified: true,
        isAvailable: true,
        location: { type: 'Point', coordinates: [77.6413, 12.9279] }
    },
    {
        name: 'Mike Ross',
        email: 'mike@electrician.com',
        phone: '3334445555',
        password: 'password123',
        address: '789 Electric St',
        skills: ['Electrician'],
        experience: 4,
        rating: 4.7,
        isVerified: true,
        isAvailable: true,
        location: { type: 'Point', coordinates: [77.6101, 12.9304] }
    },
    {
        name: 'David Brown',
        email: 'david@appliance.com',
        phone: '4445556666',
        password: 'password123',
        address: '321 Repair Road',
        skills: ['Appliance Repair'],
        experience: 10,
        rating: 4.6,
        isVerified: true,
        isAvailable: true,
        location: { type: 'Point', coordinates: [77.5806, 12.9724] }
    },
    {
        name: 'Emily Davis',
        email: 'emily@painting.com',
        phone: '5556667777',
        password: 'password123',
        address: '654 Color Lane',
        skills: ['Painting'],
        experience: 6,
        rating: 4.9,
        isVerified: true,
        isAvailable: true,
        location: { type: 'Point', coordinates: [77.6256, 12.9592] }
    }
];

const seedWorkers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB...');

        // Clear existing workers (optional but good for testing)
        // await Worker.deleteMany({ email: { $in: workers.map(w => w.email) } });

        for (const workerData of workers) {
            const exists = await Worker.findOne({ email: workerData.email });
            if (!exists) {
                await Worker.create(workerData);
                console.log(`Worker seeded: ${workerData.name}`);
            } else {
                console.log(`Worker already exists: ${workerData.name}`);
            }
        }

        console.log('Worker seeding complete!');
        process.exit(0);
    } catch (error) {
        console.error('Seeding error:', error.message);
        process.exit(1);
    }
};

seedWorkers();
