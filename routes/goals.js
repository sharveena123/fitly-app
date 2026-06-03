const express = require("express");
const router = express.Router();

const {
  setTargets,
  getDashboardMetrics
} = require("../controllers/goalController");

router.put("/set-targets", setTargets);
router.get("/dashboard-metrics", getDashboardMetrics);

module.exports = router;