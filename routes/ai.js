const express = require('express');
const router  = express.Router();
const { getWorkoutRecommendation } = require('../controllers/aiController');

// POST /api/ai/recommend
router.post('/recommend', getWorkoutRecommendation);

module.exports = router;