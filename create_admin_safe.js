const mongoose = require('mongoose');
const dotenv = require('dotenv');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

dotenv.config({ path: __dirname + '/.env' });
const { User } = require('./models.js');

const createAdmin = async () => {
    try {
        console.log('Connecting to Mongo...');
        await mongoose.connect(process.env.MONGO_URI);
        const adminEmail = 'admin@fixmate.com';
        const exists = await User.findOne({ email: adminEmail });
        
        if (exists) {
            console.log('Admin already exists. Resetting password to Admin@1234 ...');
            exists.password = 'Admin@1234';
            await exists.save();
            console.log('Password reset successfully.');
        } else {
            console.log('Creating Admin account...');
            await User.create({
                name: 'FixMate Admin',
                email: adminEmail,
                phone: '9000000000',
                password: 'Admin@1234',
                address: 'FixMate HQ',
                role: 'admin',
            });
            console.log('Admin created successfully.');
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

createAdmin();
