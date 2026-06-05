const express = require('express');
const router  = express.Router();
const {
  setTargets,
  getDashboardMetrics,
  updateGoal,
  deleteGoal
} = require('../controllers/goalController');

// POST /api/goals/set-targets
router.post('/set-targets', setTargets);

// GET  /api/goals?userId=xxx
router.get('/', getDashboardMetrics);

// PUT  /api/goals/:id
router.put('/:id', updateGoal);

// DELETE /api/goals/:id
router.delete('/:id', deleteGoal);

module.exports = router;