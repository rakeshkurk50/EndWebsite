// utils/dbConnect.js
const mongoose = require('mongoose');
const dotenv=require('dotenv');
dotenv.config();

function dbConnect() {
  const mongoUri = process.env.MONGO_URI;

  return mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
    .then(() => {
      console.log('✅ MongoDB connected');
    })
    .catch((err) => {
      console.error('❌ MongoDB connection error:', err.message);
      process.exit(1); // stop app if DB fails
    });
}

module.exports = dbConnect;
