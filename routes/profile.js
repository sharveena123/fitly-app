const express = require('express');
const router  = express.Router();
const { getUserProfile, updateUserProfile } = require('../controllers/profileController');

// GET /api/profile/:email
router.get('/:email', getUserProfile);

// PUT /api/profile/update
router.put('/update', updateUserProfile);

module.exports = router;