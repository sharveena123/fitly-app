const mongoose = require('mongoose');

const GoalSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:    { type: String, required: true },
  category: { type: String, default: 'Custom' },
  current:  { type: Number, required: true },
  start:    { type: Number, required: true },
  target:   { type: Number, required: true },
  unit:     { type: String, default: '' },
  deadline: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Goal', GoalSchema);