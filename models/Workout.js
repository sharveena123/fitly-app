const mongoose = require('mongoose');

const WorkoutSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  exercise:  { type: String, required: true },
  type:      { type: String, required: true },
  duration:  { type: Number, required: true },
  intensity: { type: String, default: 'moderate' },
  calories:  { type: Number, default: 0 },
  date:      { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Workout', WorkoutSchema);