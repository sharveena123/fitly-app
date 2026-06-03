const express = require("express");
const router = express.Router();

const {
  logMeal,
  getSummary
} = require("../controllers/foodController");

router.post("/log", logMeal);
router.get("/summary", getSummary);

module.exports = router;