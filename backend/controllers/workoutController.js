const mockWorkouts = [];

function calculateBurnedCalories(duration, intensity) {
  let factor = intensity === "high" ? 10 : 5;
  return duration * factor;
}

exports.getWorkouts = (req, res) => {
  const { userId } = req.query;

  let filtered = mockWorkouts;

  if (userId) {
    filtered = filtered.filter(w => w.userId === userId);
  }

  res.json(filtered);
};

exports.createWorkout = (req, res) => {
  const { userId, activityType, duration, intensity, calories } = req.body;

  const newWorkout = {
    id: Date.now().toString(),
    userId,
    activityType,
    duration,
    intensity,
    calories: calories || calculateBurnedCalories(duration, intensity),
    date: new Date().toISOString().split("T")[0]
  };

  mockWorkouts.push(newWorkout);

  res.status(201).json(newWorkout);
};

exports.updateWorkout = (req, res) => {
  const workout = mockWorkouts.find(w => w.id === req.params.id);

  if (!workout) return res.status(404).json({ message: "Not found" });

  Object.assign(workout, req.body);

  res.json(workout);
};

exports.deleteWorkout = (req, res) => {
  const index = mockWorkouts.findIndex(w => w.id === req.params.id);

  if (index === -1)
    return res.status(404).json({ message: "Not found" });

  mockWorkouts.splice(index, 1);

  res.json({ message: "Deleted" });
};