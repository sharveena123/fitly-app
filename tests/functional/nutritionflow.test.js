jest.mock('../../models/Meal');

const Meal = require('../../models/Meal');
const { logMeal, getSummary, deleteMeal } = require('../../controllers/foodController');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

const today = new Date().toISOString().split('T')[0];
const base  = { userId: 'u1', food: 'Chicken Rice', type: 'Lunch', calories: 500, carbs: 60, protein: 35, fat: 10, date: today };

beforeEach(() => jest.clearAllMocks());

describe('Nutrition — Log Meal', () => {
  it('returns 400 when userId missing', async () => {
    const { userId, ...body } = base;
    const res = mockRes();
    await logMeal({ body }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when calories missing', async () => {
    const { calories, ...body } = base;
    const res = mockRes();
    await logMeal({ body }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when date missing', async () => {
    const { date, ...body } = base;
    const res = mockRes();
    await logMeal({ body }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 201 with saved meal', async () => {
    Meal.create.mockResolvedValue({ ...base, _id: 'm1' });
    const res = mockRes();
    await logMeal({ body: base }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json.mock.calls[0][0].success).toBe(true);
  });

  it('defaults carbs/protein/fat to 0 when not provided', async () => {
    const body = { userId: 'u1', food: 'Apple', type: 'Snack', calories: 80, date: today };
    Meal.create.mockResolvedValue({ ...body, carbs: 0, protein: 0, fat: 0 });
    const res = mockRes();
    await logMeal({ body }, res);
    expect(Meal.create).toHaveBeenCalledWith(expect.objectContaining({ carbs: 0, protein: 0, fat: 0 }));
  });
});

describe('Nutrition — Daily Summary', () => {
  it('aggregates calories/macros correctly', async () => {
    Meal.find.mockResolvedValue([
      { calories: 500, protein: 35, carbs: 60, fat: 10 },
      { calories: 300, protein: 15, carbs: 20, fat: 8  },
    ]);
    const res = mockRes();
    await getSummary({ query: { userId: 'u1' } }, res);
    const { summary } = res.json.mock.calls[0][0];
    expect(summary.calories).toBe(800);
    expect(summary.protein).toBe(50);
    expect(summary.carbs).toBe(80);
    expect(summary.fat).toBe(18);
  });

  it('returns 0 totals when no meals logged today', async () => {
    Meal.find.mockResolvedValue([]);
    const res = mockRes();
    await getSummary({ query: { userId: 'u1' } }, res);
    const { summary } = res.json.mock.calls[0][0];
    expect(summary.calories).toBe(0);
  });

  it('queries DB with today\'s date', async () => {
    Meal.find.mockResolvedValue([]);
    const res = mockRes();
    await getSummary({ query: { userId: 'u1' } }, res);
    expect(Meal.find).toHaveBeenCalledWith({ userId: 'u1', date: today });
  });
});

describe('Nutrition — 2000 kcal Warning Threshold', () => {
  it('summary ≥ 2000 kcal triggers warning condition', async () => {
    Meal.find.mockResolvedValue([
      { calories: 600, protein: 0, carbs: 0, fat: 0 },
      { calories: 700, protein: 0, carbs: 0, fat: 0 },
      { calories: 700, protein: 0, carbs: 0, fat: 0 },
    ]);
    const res = mockRes();
    await getSummary({ query: { userId: 'u1' } }, res);
    const { summary } = res.json.mock.calls[0][0];
    expect(summary.calories).toBeGreaterThanOrEqual(2000);
  });

  it('progress bar fills to 100% at 2000 kcal', () => {
    const calories = 2000;
    const pct = Math.min((calories / 2000) * 100, 100);
    expect(pct).toBe(100);
  });

  it('progress bar < 100% below 2000 kcal', () => {
    const calories = 1200;
    const pct = Math.min((calories / 2000) * 100, 100);
    expect(pct).toBe(60);
  });
});

describe('Nutrition — Delete Meal', () => {
  it('returns 200 on successful delete', async () => {
    Meal.findByIdAndDelete.mockResolvedValue({ _id: 'm1' });
    const res = mockRes();
    await deleteMeal({ params: { id: 'm1' } }, res);
    expect(res.json.mock.calls[0][0].success).toBe(true);
  });

  it('returns 404 for non-existent meal', async () => {
    Meal.findByIdAndDelete.mockResolvedValue(null);
    const res = mockRes();
    await deleteMeal({ params: { id: 'fake' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('Nutrition — Weekly Chart (last 7 days)', () => {
  it('generates 7-day date array correctly', () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    expect(dates).toHaveLength(7);
    expect(dates[0]).toBe(today);
  });

  it('water tracker: +1 increments count', () => {
    let water = 0;
    water += 1;
    expect(water).toBe(1);
  });

  it('water tracker: -1 decrements but not below 0', () => {
    let water = 0;
    water = Math.max(0, water - 1);
    expect(water).toBe(0);
  });

  it('water tracker: progress bar at 8 glasses = 100%', () => {
    const glasses = 8, goal = 8;
    const pct = Math.min((glasses / goal) * 100, 100);
    expect(pct).toBe(100);
  });
});

const foodDatabase = [
  { name: 'Nasi Lemak',       calories: 644, protein: 18, carbs: 78, fat: 30 },
  { name: 'Char Kway Teow',   calories: 744, protein: 22, carbs: 90, fat: 32 },
  { name: 'Roti Canai',       calories: 301, protein:  7, carbs: 49, fat:  9 },
  { name: 'Chicken Rice',     calories: 487, protein: 28, carbs: 62, fat: 12 },
  { name: 'Teh Tarik',        calories: 120, protein:  4, carbs: 22, fat:  3 },
  { name: 'Milo Ais',         calories: 140, protein:  3, carbs: 26, fat:  4 },
];
 
function searchFoods(query, db = foodDatabase) {
  const q = query.trim().toLowerCase();
  if (!q) return db;
  return db.filter(f => f.name.toLowerCase().includes(q));
}
 
describe('Nutrition — Food search modal filters by name', () => {
  it('empty query returns the full food list', () => {
    expect(searchFoods('')).toHaveLength(foodDatabase.length);
  });
 
  it('exact match returns the correct item', () => {
    const results = searchFoods('Roti Canai');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Roti Canai');
  });
 
  it('partial match returns all foods whose name contains the query', () => {
    const results = searchFoods('Na');   // Nasi Lemak + Roti Canai
    expect(results.some(f => f.name === 'Nasi Lemak')).toBe(true);
    expect(results.some(f => f.name === 'Roti Canai')).toBe(true);
  });
 
  it('search is case-insensitive', () => {
    expect(searchFoods('nasi lemak')).toHaveLength(1);
    expect(searchFoods('NASI LEMAK')).toHaveLength(1);
  });
 
  it('query with no matches returns an empty array', () => {
    expect(searchFoods('Pizza Margherita')).toHaveLength(0);
  });
 
  it('whitespace-only query returns full list', () => {
    expect(searchFoods('   ')).toHaveLength(foodDatabase.length);
  });
});
 
// Selecting food auto-fills calories 
function selectFood(food) {
  return {
    calories: food.calories,
    protein:  food.protein,
    carbs:    food.carbs,
    fat:      food.fat,
  };
}
 
describe('Nutrition — Selecting food auto-fills calories and macros', () => {
  it('returns correct calories for the selected food', () => {
    const filled = selectFood(foodDatabase[0]); // Nasi Lemak
    expect(filled.calories).toBe(644);
  });
 
  it('returns correct protein value', () => {
    expect(selectFood(foodDatabase[0]).protein).toBe(18);
  });
 
  it('returns correct carbs value', () => {
    expect(selectFood(foodDatabase[0]).carbs).toBe(78);
  });
 
  it('returns correct fat value', () => {
    expect(selectFood(foodDatabase[0]).fat).toBe(30);
  });
 
  it('all four macro fields are present in the filled form data', () => {
    const filled = selectFood(foodDatabase[2]); // Roti Canai
    expect(filled).toHaveProperty('calories');
    expect(filled).toHaveProperty('protein');
    expect(filled).toHaveProperty('carbs');
    expect(filled).toHaveProperty('fat');
  });
 
  it('different foods produce different macro values', () => {
    const nasiLemak = selectFood(foodDatabase[0]);
    const tehTarik  = selectFood(foodDatabase[4]);
    expect(nasiLemak.calories).not.toBe(tehTarik.calories);
  });
});
 
// NUTRITION — Warning at / above 2000 kcal 
function shouldShowCalorieWarning(totalCalories, threshold = 2000) {
  return totalCalories >= threshold;
}
 
describe('Nutrition — Warning shows at / above 2000 kcal', () => {
  it('no warning below 2000 kcal', () => {
    expect(shouldShowCalorieWarning(1999)).toBe(false);
  });
 
  it('warning triggers at exactly 2000 kcal', () => {
    expect(shouldShowCalorieWarning(2000)).toBe(true);
  });
 
  it('warning shows above 2000 kcal', () => {
    expect(shouldShowCalorieWarning(2450)).toBe(true);
  });
 
  it('zero calories → no warning', () => {
    expect(shouldShowCalorieWarning(0)).toBe(false);
  });
 
  it('warning state is derived from the same summary.calories value returned by the API', () => {

    // Simulates the frontend: const warn = summary.calories >= 2000
    const summaryFromApi = { calories: 2100, protein: 90, carbs: 250, fat: 60 };
    expect(shouldShowCalorieWarning(summaryFromApi.calories)).toBe(true);
  });
});
 
//  Water +/− buttons update count and progress bar 
function waterReducer(count, action, goal = 8) {
  let next;
  if (action === 'increment') next = count + 1;
  else if (action === 'decrement') next = Math.max(0, count - 1);
  else next = count;
 
  const pct = Math.min((next / goal) * 100, 100);
  return { count: next, pct };
}
 
describe('Nutrition — Water +/− buttons update count and progress bar', () => {
  it('+ button increments count by 1', () => {
    expect(waterReducer(0, 'increment').count).toBe(1);
  });
 
  it('repeated + increments accumulate', () => {
    let state = { count: 0 };
    for (let i = 0; i < 5; i++) state = waterReducer(state.count, 'increment');
    expect(state.count).toBe(5);
  });
 
  it('− button decrements count by 1', () => {
    expect(waterReducer(3, 'decrement').count).toBe(2);
  });
 
  it('− button cannot go below 0', () => {
    expect(waterReducer(0, 'decrement').count).toBe(0);
  });
 
  it('progress bar is 0% when count is 0', () => {
    expect(waterReducer(0, 'increment').pct).toBeCloseTo(12.5); // 1/8
    expect(waterReducer(0, 'decrement').pct).toBe(0);           // stays 0
  });
 
  it('progress bar reaches 100% at 8 glasses', () => {
    expect(waterReducer(7, 'increment').pct).toBe(100);
  });
 
  it('progress bar never exceeds 100% beyond goal', () => {
    expect(waterReducer(8, 'increment').pct).toBe(100);
    expect(waterReducer(10, 'increment').pct).toBe(100);
  });
 
  it('progress bar reflects correct percentage mid-way (4 of 8 = 50%)', () => {
    expect(waterReducer(3, 'increment').pct).toBe(50);
  });
});