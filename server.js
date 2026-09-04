require('dotenv').config();

const connectDB = require('./db');
const app = require('./app');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error(`Backend startup failed: ${error.message}`);
    process.exitCode = 1;
  }
}

startServer();