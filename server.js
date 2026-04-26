require('dotenv').config();

const { createApp } = require('./app');
const { connectToMongo } = require('./src/config/database');

const PORT = process.env.PORT || 4001;
const app = createApp({ isVercel: false });

connectToMongo();

app.listen(PORT, () => {
  console.log(`Running at http://localhost:${PORT}`);
});
