const express = require('express');
const router  = express.Router();
const {
  getWorkouts,
  createWorkout,
  updateWorkout,
  deleteWorkout
} = require('../controllers/workoutController');

// GET  /api/workouts?userId=xxx
router.get('/',    getWorkouts);

// POST /api/workouts/
router.post('/',   createWorkout);

// PUT  /api/workouts/:id
router.put('/:id', updateWorkout);

// DELETE /api/workouts/:id
router.delete('/:id', deleteWorkout);

module.exports = router;