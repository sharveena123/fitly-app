const User = require('../models/User');

// ── GET PROFILE ──────────────────────────────────────────────────
exports.getUserProfile = async (req, res) => {
  try {
    const { email } = req.params;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email parameter is required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.status(200).json({ success: true, profile: user });

  } catch (error) {
    return res.status(500).json({ success: false, message: 'Profile retrieval error: ' + error.message });
  }
};

// ── UPDATE PROFILE ───────────────────────────────────────────────
exports.updateUserProfile = async (req, res) => {
  try {
    const { email, name, age, gender, activity, weight, height, goal } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    // calculate BMI
    let bmi = null;
    let bmiLabel = '-';
    if (weight > 0 && height > 0) {
      const h = height / 100;
      bmi = (weight / (h * h)).toFixed(1);
      const n = parseFloat(bmi);
      if (n < 18.5)      bmiLabel = 'Underweight';
      else if (n < 25)   bmiLabel = 'Normal Weight';
      else if (n < 30)   bmiLabel = 'Overweight';
      else               bmiLabel = 'Obese';
    }

    const updated = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      {
        name:     name,
        age:      parseInt(age)      || 0,
        gender:   gender   || '',
        activity: activity || 'moderate',
        weight:   parseFloat(weight) || 0,
        height:   parseFloat(height) || 0,
        goal:     goal || 'Not specified',
        bmi,
        bmiLabel,
      },
      { new: true, select: '-password' }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.status(200).json({ success: true, message: 'Profile updated successfully!', user: updated });

  } catch (error) {
    return res.status(500).json({ success: false, message: 'Profile update error: ' + error.message });
  }
};