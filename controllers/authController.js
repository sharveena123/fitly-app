const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');

// Register a new user
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, age, weight, height, goal } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please fill in all required fields.' });
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const salt           = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await User.create({
      name,
      email:    email.toLowerCase(),
      password: hashedPassword,
      age:      parseInt(age)      || 0,
      weight:   parseFloat(weight) || 0,
      height:   parseFloat(height) || 0,
      goal:     goal || 'Not specified',
    });

    return res.status(201).json({ success: true, message: 'User registered successfully! You can now log in.' });

  } catch (error) {
    return res.status(500).json({ success: false, message: 'Registration error: ' + error.message });
  }
};

// Login an existing user
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both email and password.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user._id || user.id, email: user.email },
      process.env.JWT_SECRET || 'SuperSecretKey123',
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        id:     user._id || user.id,
        name:   user.name,
        email:  user.email,
        age:    user.age,
        weight: user.weight,
        height: user.height,
        goal:   user.goal,
      },
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: 'Login error: ' + error.message });
  }
};

// Verify email exists
exports.verifyEmail = async (req, res) => {
  try {
    const { email } = req.body || {};

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const user = await User.findOne({
      email: email.toLowerCase()
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Email verified.'
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const updated = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { password: hashedPassword },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully.'
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Issue a real JWT for the local demo account without creating a database user.
exports.loginDemoUser = (req, res) => {
  const user = {
    id: 'demo',
    name: 'Demo User',
    email: 'demo@fitly.com',
    age: 28,
    weight: 75,
    height: 175,
    goal: 'Build muscle',
    isDemo: true,
  };

  const token = jwt.sign(
    { id: user.id, email: user.email, isDemo: true },
    process.env.JWT_SECRET || 'SuperSecretKey123',
    { expiresIn: '24h' }
  );

  return res.status(200).json({ success: true, token, user });
};