const Workout = require('../models/Workout');

// Getting all workouts 
exports.getWorkouts = async (req, res) => {
  try {
    const { userId } = req.query;
    const filter = userId ? { userId } : {};
    const workouts = await Workout.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, workouts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Creating a new workout
exports.createWorkout = async (req, res) => {
  try {
    const { userId, exercise, type, duration, intensity, calories, date } = req.body;

    if (!userId || !exercise || !type || !duration || !date) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    const calBurned = calories || Math.round(duration * (intensity === 'high' ? 10 : intensity === 'low' ? 4 : 7));

    const workout = await Workout.create({ userId, exercise, type, duration, intensity, calories: calBurned, date });
    res.status(201).json({ success: true, workout });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Updating the current workout
exports.updateWorkout = async (req, res) => {
  try {
    const workout = await Workout.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!workout) return res.status(404).json({ success: false, message: 'Workout not found.' });
    res.json({ success: true, workout });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Deleting a workout
exports.deleteWorkout = async (req, res) => {
  try {
    const workout = await Workout.findByIdAndDelete(req.params.id);
    if (!workout) return res.status(404).json({ success: false, message: 'Workout not found.' });
    res.json({ success: true, message: 'Workout deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};