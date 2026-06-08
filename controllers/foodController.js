const Meal = require('../models/Meal');

// Enter a new meal 
exports.logMeal = async (req, res) => {
  try {
    const { userId, food, type, calories, carbs, protein, fat, date } = req.body;

    if (!userId || !food || !type || !calories || !date) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    const meal = await Meal.create({ userId, food, type, calories, carbs: carbs || 0, protein: protein || 0, fat: fat || 0, date });
    res.status(201).json({ success: true, meal });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Getting today's meals summary
exports.getSummary = async (req, res) => {
  try {
    const { userId } = req.query;
    const today = new Date().toISOString().split('T')[0];

    const meals = await Meal.find({ userId, date: today });

    const summary = meals.reduce(
      (acc, m) => {
        acc.calories += m.calories || 0;
        acc.protein  += m.protein  || 0;
        acc.carbs    += m.carbs    || 0;
        acc.fat      += m.fat      || 0;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    res.json({ success: true, summary, meals });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Deleting a meal 
exports.deleteMeal = async (req, res) => {
  try {
    const meal = await Meal.findByIdAndDelete(req.params.id);
    if (!meal) return res.status(404).json({ success: false, message: 'Meal not found.' });
    res.json({ success: true, message: 'Meal deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};