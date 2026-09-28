const mongoose = require('mongoose');

let connectionPromise;

function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('MONGODB_URI is not set. /api/mobile routes will fail until MongoDB is configured.');
    return Promise.resolve(null);
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(uri, {
      dbName: process.env.MONGODB_DB || undefined,
      serverSelectionTimeoutMS: 5000,
    });
  }

  return connectionPromise;
}

async function requireMongo(req, res, next) {
  try {
    await connectMongo();
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'MongoDB is not connected. Start the MongoDB service or set MONGODB_URI.' });
    }
    return next();
  } catch (error) {
    return res.status(503).json({ error: `MongoDB connection failed: ${error.message}` });
  }
}

module.exports = { connectMongo, requireMongo };
