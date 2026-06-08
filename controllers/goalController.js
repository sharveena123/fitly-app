const Goal = require('../models/Goal');

// Setting a new goal
exports.setTargets = async (req, res) => {
  try {
    const { userId, title, category, current, target, unit, deadline } = req.body;

    if (!userId || !title || target === undefined || current === undefined) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    const goal = await Goal.create({
      userId,
      title,
      category: category || 'Custom',
      current,
      start: current,   
      target,
      unit:     unit     || '',
      deadline: deadline || '',
    });

    res.status(201).json({ success: true, goal });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Getting the goals details
exports.getDashboardMetrics = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ success: false, message: 'userId is required.' });

    const goals = await Goal.find({ userId }).sort({ createdAt: -1 });
    res.json({ success: true, goals });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Updating the goals
exports.updateGoal = async (req, res) => {
  try {
    const goal = await Goal.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found.' });
    res.json({ success: true, goal });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Deleting the goals
exports.deleteGoal = async (req, res) => {
  try {
    const goal = await Goal.findByIdAndDelete(req.params.id);
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found.' });
    res.json({ success: true, message: 'Goal deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};