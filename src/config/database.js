const mongoose = require('mongoose');

let mongoConnectPromise;

function connectToMongo() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error('Missing MONGODB_URI environment variable.');
    return Promise.resolve();
  }

  if (!mongoConnectPromise) {
    mongoConnectPromise = mongoose.connect(mongoUri)
      .then(() => console.log('MongoDB connected.'))
      .catch(err => {
        console.error('MongoDB error:', err.message);
        mongoConnectPromise = null;
      });
  }

  return mongoConnectPromise;
}

module.exports = {
  connectToMongo
};
