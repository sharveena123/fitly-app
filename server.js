require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const connectDB = require('./db');
const app = require('./app');

// Route imports 
const authRoutes    = require('./routes/auth');
const workoutRoutes = require('./routes/workout');
const nutritionRoutes = require('./routes/nutrition');
const goalRoutes    = require('./routes/goals');
const profileRoutes = require('./routes/profile');
const aiRoutes      = require('./routes/ai');

const app = express();

// Middleware 
app.use(cors());
app.use(express.json());

// Connect to MongoDB 
connectDB();

// Mount routes 
app.use('/api/auth',      authRoutes);
app.use('/api/workouts',  workoutRoutes);
app.use('/api/nutrition', nutritionRoutes);
app.use('/api/goals',     goalRoutes);
app.use('/api/profile',   profileRoutes);
app.use('/api/ai',        aiRoutes);

// Health check 
app.get('/', (req, res) => {
  res.json({ message: 'Fitly API is running ✅' });
});

// Start server 
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});