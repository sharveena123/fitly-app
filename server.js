require('dotenv').config();
console.log('Gemini Key:', process.env.GEMINI_API_KEY);

const connectDB = require('./db');
const app = require('./app');

connectDB();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});