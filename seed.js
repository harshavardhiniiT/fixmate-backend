/**
 * FixMate — Full DB Reset + Seed Script
 * Clears ALL data and creates fresh services + admin account
 * Run: node seed.js
 */

const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const dotenv = require('dotenv');
const { User, Worker, Service, Booking, Review } = require('./models');

dotenv.config();

const ADMIN_EMAIL    = 'admin@fixmate.com';
const ADMIN_PASSWORD = 'Admin@1234';

const services = [
    { serviceName: 'Deep House Cleaning',    category: 'Cleaning',            basePrice: 1500, description: 'Comprehensive cleaning for your entire home including kitchen, bathrooms, and living areas.',   image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6958?auto=format&fit=crop&q=80&w=800' },
    { serviceName: 'Bathroom Plumbing',      category: 'Plumbing',            basePrice: 400,  description: 'Fix leaks, replace faucets, unclog drains, and repair pipelines professionally.',             image: 'https://images.unsplash.com/photo-1552242718-c5360894aecd?auto=format&fit=crop&q=80&w=800' },
    { serviceName: 'Water Heater Repair',    category: 'Plumbing',            basePrice: 500,  description: 'Expert repair of gas and electric water heaters by certified technicians.',                   image: 'https://images.unsplash.com/photo-1615906659444-10645638c41f?auto=format&fit=crop&q=80&w=800' },
    { serviceName: 'Electric Board Repair',  category: 'Electrician',         basePrice: 300,  description: 'Safe and quick repair of electrical boards, sockets, and wiring.',                          image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&q=80&w=800' },
    { serviceName: 'Fan Installation',       category: 'Electrician',         basePrice: 200,  description: 'Safe installation and wiring of ceiling fans, exhaust fans, and more.',                     image: 'https://images.unsplash.com/photo-1601648764658-cf37e8c89b70?auto=format&fit=crop&q=80&w=800' },
    { serviceName: 'AC Servicing',           category: 'Appliance Repair',    basePrice: 800,  description: 'Thorough cleaning and inspection of your AC unit for peak performance.',                    image: 'https://images.unsplash.com/photo-1545259740-24683587551d?auto=format&fit=crop&q=80&w=800' },
    { serviceName: 'Washing Machine Repair', category: 'Appliance Repair',    basePrice: 600,  description: 'Diagnose and fix all major washing machine brands quickly.',                                 image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&q=80&w=800' },
    { serviceName: 'Refrigerator Repair',    category: 'Appliance Repair',    basePrice: 550,  description: 'Fix cooling issues, compressor problems, and electrical faults in refrigerators.',          image: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&q=80&w=800' },
    { serviceName: 'Full Home Painting',     category: 'Painting',            basePrice: 5000, description: 'Professional painting services with premium finish and color consultation.',                  image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&q=80&w=800' },
    { serviceName: 'General Carpentry',      category: 'General Maintenance', basePrice: 350,  description: 'Furniture assembly, door repair, wood finishing, and more.',                                 image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&q=80&w=800' },
];

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('\n🔌 Connected to MongoDB...\n');

        // ── FULL RESET (sequential for reliability) ──────────────
        console.log('🗑️  Clearing all collections...');
        await Review.deleteMany({});
        await Booking.deleteMany({});
        await Service.deleteMany({});
        await Worker.deleteMany({});
        await User.deleteMany({});
        console.log('✅ All data cleared.\n');

        // Ensure 2dsphere index is built for geospatial queries
        await Worker.createIndexes();

        // ── SERVICES ────────────────────────────────────────────
        const inserted = await Service.insertMany(services);
        console.log(`✅ ${inserted.length} services seeded.\n`);

        // ── ADMIN ───────────────────────────────────────────────
        await User.create({
            name:     'FixMate Admin',
            email:    ADMIN_EMAIL,
            phone:    '9000000000',
            password: ADMIN_PASSWORD,
            address:  'FixMate HQ, Central City',
            role:     'admin',
        });

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎉 Seed complete! Fresh database ready.\n');
        console.log('📋 ADMIN CREDENTIALS');
        console.log(`   Email    : ${ADMIN_EMAIL}`);
        console.log(`   Password : ${ADMIN_PASSWORD}`);
        console.log('\n👤 Workers & customers must self-register via the app.');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
};

seedDB();
