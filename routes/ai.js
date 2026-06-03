const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// Map GET/POST to your smart calculation logic
router.post('/recommend', aiController.getWorkoutRecommendation);

module.exports = router;