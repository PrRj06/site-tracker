require('dotenv').config();

const { createApp } = require('../app');
const { connectToMongo } = require('../src/config/database');

const app = createApp({ isVercel: true });
connectToMongo();

module.exports = app;
