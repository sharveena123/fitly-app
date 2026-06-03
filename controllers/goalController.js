const userGoals = {};

exports.setTargets = (req, res) => {
  const { userId } = req.body;

  userGoals[userId] = req.body;

  res.json(userGoals[userId]);
};

exports.getDashboardMetrics = (req, res) => {
  const { userId } = req.query;

  const goals = userGoals[userId];

  if (!goals)
    return res.status(404).json({ message: "No goals found" });

  const activeMinutes = 45;
  const caloriesConsumed = 1800;

  const minuteProgress =
    (activeMinutes / goals.targetDailyMinutes) * 100;

  const calorieProgress =
    (caloriesConsumed / goals.targetCalories) * 100;

  res.json({
    activeMinutes,
    caloriesConsumed,
    minuteProgress: minuteProgress.toFixed(1) + "%",
    calorieProgress: calorieProgress.toFixed(1) + "%"
  });
};