require('dotenv').config();
const mongoose = require('mongoose');

const dns = require('dns');

// Force Node to use Google DNS for lookups to bypass broken local SRV resolvers
dns.setServers(['8.8.8.8', '8.8.4.4']);

let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  const mUri = process.env.MONGODB_URI
    ? process.env.MONGODB_URI.replace(/\/[^/?]+(\?|$)/, '/marketing$1')
    : null;

  if (!mUri) {
    throw new Error('MONGODB_URI is not defined in environment variables.');
  }

  try {
    await mongoose.connect(mUri, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    console.log('✅ Connected to MongoDB → Atlas Cluster');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    throw err;
  }
}

async function getDb() {
  if (!isConnected) await connectDB();
  return mongoose.connection.useDb('marketing');
}

async function getCrmDb() {
  if (!isConnected) await connectDB();
  return mongoose.connection.useDb('sales_crm');
}

module.exports = { connectDB, getDb, getCrmDb };
