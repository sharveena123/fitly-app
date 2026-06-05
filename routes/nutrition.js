const express = require('express');
const router  = express.Router();
const { logMeal, getSummary, deleteMeal } = require('../controllers/foodController');

// POST /api/nutrition/log
router.post('/log', logMeal);

// GET  /api/nutrition/summary?userId=xxx
router.get('/summary', getSummary);

// DELETE /api/nutrition/:id
router.delete('/:id', deleteMeal);

module.exports = router;