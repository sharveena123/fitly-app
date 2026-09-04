const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const workoutRoutes = require('./routes/workout');
const nutritionRoutes = require('./routes/nutrition');
const goalRoutes = require('./routes/goals');
const profileRoutes = require('./routes/profile');
const aiRoutes = require('./routes/ai');
const dashboardRoutes = require('./routes/dashboard');
const requireAuth = require('./middleware/auth');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/workouts', requireAuth, workoutRoutes);
app.use('/api/nutrition', requireAuth, nutritionRoutes);
app.use('/api/goals', requireAuth, goalRoutes);
app.use('/api/profile', requireAuth, profileRoutes);
app.use('/api/ai', requireAuth, aiRoutes);
app.use('/api/dashboard', requireAuth, dashboardRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Fitly API is running ✅' });
});

module.exports = app;