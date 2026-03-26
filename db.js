require('dotenv').config();
const mongoose = require('mongoose');

const dns = require('dns');

// Force Node to use Google DNS for lookups to bypass broken local SRV resolvers
dns.setServers(['8.8.8.8', '8.8.4.4']);

let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  const uri = process.env.MONGODB_URI
    ? process.env.MONGODB_URI.replace(/\/[^/?]+(\?|$)/, '/marketing$1')
    : null;

  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables.');
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    console.log('✅ Connected to MongoDB → marketing database');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    throw err;
  }
}

async function getDb() {
  if (!isConnected) await connectDB();
  return mongoose.connection.db;
}

module.exports = { connectDB, getDb };
