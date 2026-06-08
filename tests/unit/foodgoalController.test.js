jest.mock('../../models/Meal');
jest.mock('../../models/Goal');
const Meal = require('../../models/Meal');
const Goal = require('../../models/Goal');

const { logMeal, getSummary, deleteMeal } = require('../../controllers/foodController');
const { setTargets, getDashboardMetrics, updateGoal, deleteGoal } = require('../../controllers/goalController');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
}


// Food controller
describe('foodController — logMeal (Unit)', () => {

  beforeEach(() => jest.clearAllMocks());

  // Validation
  test('returns 400 when userId is missing', async () => {
    const req = { body: { food: 'Rice', type: 'Lunch', calories: 400, date: '2026-06-07' } };
    const res = mockRes();
    await logMeal(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  test('returns 400 when food name is missing', async () => {
    const req = { body: { userId: 'u1', type: 'Lunch', calories: 400, date: '2026-06-07' } };
    const res = mockRes();
    await logMeal(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 when type is missing', async () => {
    const req = { body: { userId: 'u1', food: 'Rice', calories: 400, date: '2026-06-07' } };
    const res = mockRes();
    await logMeal(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 when calories is missing', async () => {
    const req = { body: { userId: 'u1', food: 'Rice', type: 'Lunch', date: '2026-06-07' } };
    const res = mockRes();
    await logMeal(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 when date is missing', async () => {
    const req = { body: { userId: 'u1', food: 'Rice', type: 'Lunch', calories: 400 } };
    const res = mockRes();
    await logMeal(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  // Default macro values 
  test('carbs, protein, fat default to 0 when not provided', async () => {
    const fakeMeal = { _id: 'm1', food: 'Rice', carbs: 0, protein: 0, fat: 0 };
    Meal.create.mockResolvedValue(fakeMeal);

    const req = { body: { userId: 'u1', food: 'Rice', type: 'Lunch', calories: 400, date: '2026-06-07' } };
    const res = mockRes();
    await logMeal(req, res);

    expect(Meal.create).toHaveBeenCalledWith(
      expect.objectContaining({ carbs: 0, protein: 0, fat: 0 })
    );
  });

  // Successful creation 
  test('returns 201 with created meal on success', async () => {
    const fakeMeal = { _id: 'm1', food: 'Nasi Lemak', calories: 650 };
    Meal.create.mockResolvedValue(fakeMeal);

    const req = { body: { userId: 'u1', food: 'Nasi Lemak', type: 'Lunch', calories: 650, date: '2026-06-07' } };
    const res = mockRes();
    await logMeal(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, meal: fakeMeal })
    );
  });

  // DB error 
  test('returns 500 on DB error', async () => {
    Meal.create.mockRejectedValue(new Error('fail'));
    const req = { body: { userId: 'u1', food: 'Rice', type: 'Lunch', calories: 400, date: '2026-06-07' } };
    const res = mockRes();
    await logMeal(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});


describe('foodController — getSummary (Unit)', () => {

  beforeEach(() => jest.clearAllMocks());

  test('returns correct macro totals for today\'s meals', async () => {
    const today = new Date().toISOString().split('T')[0];
    Meal.find.mockResolvedValue([
      { calories: 400, protein: 20, carbs: 50, fat: 10, date: today },
      { calories: 300, protein: 15, carbs: 30, fat:  5, date: today },
    ]);

    const req = { query: { userId: 'u1' } };
    const res = mockRes();
    await getSummary(req, res);

    const body = res.json.mock.calls[0][0];
    expect(body.summary.calories).toBe(700);
    expect(body.summary.protein).toBe(35);
    expect(body.summary.carbs).toBe(80);
    expect(body.summary.fat).toBe(15);
  });

  test('returns zero totals when no meals exist today', async () => {
    Meal.find.mockResolvedValue([]);
    const req = { query: { userId: 'u1' } };
    const res = mockRes();
    await getSummary(req, res);
    const body = res.json.mock.calls[0][0];
    expect(body.summary).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  });

  test('returns 500 on DB error', async () => {
    Meal.find.mockRejectedValue(new Error('DB fail'));
    const req = { query: { userId: 'u1' } };
    const res = mockRes();
    await getSummary(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});


describe('foodController — deleteMeal (Unit)', () => {

  beforeEach(() => jest.clearAllMocks());

  test('returns success message when meal is deleted', async () => {
    Meal.findByIdAndDelete.mockResolvedValue({ _id: 'm1' });
    const req = { params: { id: 'm1' } };
    const res = mockRes();
    await deleteMeal(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: 'Meal deleted.' })
    );
  });

  test('returns 404 when meal not found', async () => {
    Meal.findByIdAndDelete.mockResolvedValue(null);
    const req = { params: { id: 'ghost' } };
    const res = mockRes();
    await deleteMeal(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('returns 500 on DB error', async () => {
    Meal.findByIdAndDelete.mockRejectedValue(new Error('fail'));
    const req = { params: { id: 'm1' } };
    const res = mockRes();
    await deleteMeal(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// Goal controller
describe('goalController — setTargets (Unit)', () => {

  beforeEach(() => jest.clearAllMocks());

  // Validation 
  test('returns 400 when userId is missing', async () => {
    const req = { body: { title: 'Lose 5kg', current: 75, target: 70 } };
    const res = mockRes();
    await setTargets(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 when title is missing', async () => {
    const req = { body: { userId: 'u1', current: 75, target: 70 } };
    const res = mockRes();
    await setTargets(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 when target is undefined', async () => {
    const req = { body: { userId: 'u1', title: 'Run 5km', current: 0 } };
    const res = mockRes();
    await setTargets(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 when current is undefined', async () => {
    const req = { body: { userId: 'u1', title: 'Run 5km', target: 5 } };
    const res = mockRes();
    await setTargets(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  // Start = current on creation 
  test('start field equals current value on creation', async () => {
    const fakeGoal = { _id: 'g1', start: 75, current: 75, target: 70 };
    Goal.create.mockResolvedValue(fakeGoal);

    const req = { body: { userId: 'u1', title: 'Lose 5kg', current: 75, target: 70 } };
    const res = mockRes();
    await setTargets(req, res);

    expect(Goal.create).toHaveBeenCalledWith(
      expect.objectContaining({ start: 75, current: 75 })
    );
  });

  // Category defaults 
  test('category defaults to "Custom" when not provided', async () => {
    Goal.create.mockResolvedValue({ _id: 'g1' });
    const req = { body: { userId: 'u1', title: 'Run 5km', current: 0, target: 5 } };
    const res = mockRes();
    await setTargets(req, res);
    expect(Goal.create).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'Custom' })
    );
  });

  // Successful goal creation 
  test('returns 201 with created goal on success', async () => {
    const fakeGoal = { _id: 'g1', title: 'Lose 5kg', target: 70 };
    Goal.create.mockResolvedValue(fakeGoal);

    const req = { body: { userId: 'u1', title: 'Lose 5kg', current: 75, target: 70, category: 'Weight' } };
    const res = mockRes();
    await setTargets(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, goal: fakeGoal })
    );
  });
});


describe('goalController — getDashboardMetrics (Unit)', () => {

  beforeEach(() => jest.clearAllMocks());

  test('returns 400 when userId is missing', async () => {
    const req = { query: {} };
    const res = mockRes();
    await getDashboardMetrics(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'userId is required.' })
    );
  });

  test('returns all goals for the given userId', async () => {
    const fakeGoals = [{ title: 'Lose 5kg' }, { title: 'Run 5km' }];
    Goal.find.mockReturnValue({ sort: jest.fn().mockResolvedValue(fakeGoals) });

    const req = { query: { userId: 'u1' } };
    const res = mockRes();
    await getDashboardMetrics(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, goals: fakeGoals })
    );
  });
});


describe('goalController — updateGoal (Unit)', () => {

  beforeEach(() => jest.clearAllMocks());

  test('returns updated goal on success', async () => {
    const updated = { _id: 'g1', current: 72, title: 'Lose 5kg' };
    Goal.findByIdAndUpdate.mockResolvedValue(updated);
    const req = { params: { id: 'g1' }, body: { current: 72 } };
    const res = mockRes();
    await updateGoal(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, goal: updated })
    );
  });

  test('returns 404 when goal not found', async () => {
    Goal.findByIdAndUpdate.mockResolvedValue(null);
    const req = { params: { id: 'ghost' }, body: { current: 72 } };
    const res = mockRes();
    await updateGoal(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});


describe('goalController — deleteGoal (Unit)', () => {

  beforeEach(() => jest.clearAllMocks());

  test('returns success message when goal is deleted', async () => {
    Goal.findByIdAndDelete.mockResolvedValue({ _id: 'g1' });
    const req = { params: { id: 'g1' } };
    const res = mockRes();
    await deleteGoal(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: 'Goal deleted.' })
    );
  });

  test('returns 404 when goal not found', async () => {
    Goal.findByIdAndDelete.mockResolvedValue(null);
    const req = { params: { id: 'ghost' } };
    const res = mockRes();
    await deleteGoal(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});