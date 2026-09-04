const express = require('express');
const router = express.Router();

const {
  registerUser,
  loginUser,
  loginDemoUser,
  verifyEmail,
  resetPassword
} = require('../controllers/authController');

// POST /api/auth/register
router.post('/register', registerUser);

// POST /api/auth/login
router.post('/login', loginUser);

// POST /api/auth/demo
router.post('/demo', loginDemoUser);

// POST /api/auth/verify-email
router.post('/verify-email', verifyEmail);

// PUT /api/auth/reset-password
router.put('/reset-password', resetPassword);

module.exports = router;