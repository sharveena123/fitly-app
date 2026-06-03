const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');

// profile core management paths
router.get('/me/:email', profileController.getUserProfile);
router.put('/update', profileController.updateUserProfile);

module.exports = router;