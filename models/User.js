const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  age:      { type: Number, default: 0 },
  weight:   { type: Number, default: 0 },
  height:   { type: Number, default: 0 },
  goal:     { type: String, default: 'Not specified' },
  gender:   { type: String, default: '' },
  activity: { type: String, default: 'moderate' },
  bmi:      { type: Number, default: null },
  bmiLabel: { type: String, default: '-' },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);