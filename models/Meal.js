const mongoose = require('mongoose');

const MealSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  food:     { type: String, required: true },
  type:     { type: String, required: true },
  calories: { type: Number, required: true },
  carbs:    { type: Number, default: 0 },
  protein:  { type: Number, default: 0 },
  fat:      { type: Number, default: 0 },
  date:     { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Meal', MealSchema);