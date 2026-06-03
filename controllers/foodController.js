const mockMeals = [];

exports.logMeal = (req, res) => {
  const meal = {
    id: Date.now().toString(),
    ...req.body,
    date: new Date().toISOString().split("T")[0]
  };

  mockMeals.push(meal);

  res.status(201).json(meal);
};

exports.getSummary = (req, res) => {
  const { userId } = req.query;
  const today = new Date().toISOString().split("T")[0];

  const meals = mockMeals.filter(
    m => m.userId === userId && m.date === today
  );

  const summary = meals.reduce(
    (acc, m) => {
      acc.calories += m.calories || 0;
      acc.proteins += m.proteins || 0;
      acc.carbs += m.carbs || 0;
      acc.fats += m.fats || 0;
      return acc;
    },
    { calories: 0, proteins: 0, carbs: 0, fats: 0 }
  );

  res.json(summary);
};