const Workout = require('../models/Workout');
const Meal = require('../models/Meal');
const Goal = require('../models/Goal');

exports.getDashboard = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ success: false, message: 'userId is required.' });

    // These independent API/database reads run at the same time.
    const [workouts, meals, goals] = await Promise.all([
      Workout.find({ userId }),
      Meal.find({ userId }),
      Goal.find({ userId }),
    ]);

    res.json({ success: true, data: { workouts, meals, goals }, fetchedAt: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};