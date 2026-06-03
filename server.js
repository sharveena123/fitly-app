const express = require("express");
const cors = require("cors");

const workoutRoutes = require("./backend/routes/workouts");
const nutritionRoutes = require("./backend/routes/nutrition");
const goalRoutes = require("./backend/routes/goals");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/workouts", workoutRoutes);
app.use("/api/nutrition", nutritionRoutes);
app.use("/api/goals", goalRoutes);

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});