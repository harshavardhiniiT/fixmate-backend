const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Worker } = require('./models');

dotenv.config();

const runTest = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const skill = "Bathroom Plumbing";
        const regexes = skill.split(' ').map(s => new RegExp(s, 'i'));
        
        console.log("Using regexes:", regexes);
        
        const fallbackQuery = {
            isVerified: true,
            isAvailable: true,
            skills: { $in: regexes }
        };

        const workers = await Worker.find(fallbackQuery);
        console.log("Found workers:", workers.map(w => w.name));
        
    } catch (e) {
        console.error("Test failed", e);
    } finally {
        process.exit(0);
    }
};

runTest();
