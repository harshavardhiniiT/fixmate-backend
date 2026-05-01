const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Service } = require('./models');

dotenv.config();

const check = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const count = await Service.countDocuments();
  console.log(`Services count: ${count}`);
  process.exit(0);
};

check();
