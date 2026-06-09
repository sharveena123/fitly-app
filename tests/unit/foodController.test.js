jest.mock('../../models/Meal');

const Meal = require('../../models/Meal');

const {
  logMeal,
  getSummary,
  deleteMeal
} = require('../../controllers/foodController');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('foodController — logMeal (Unit)', () => {

  beforeEach(() => jest.clearAllMocks());

  test('returns 400 when userId is missing', async () => {
    const req = {
      body: {
        food: 'Rice',
        type: 'Lunch',
        calories: 400,
        date: '2026-06-07'
      }
    };

    const res = mockRes();

    await logMeal(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });

  test('returns 400 when food name is missing', async () => {
    const req = {
      body: {
        userId: 'u1',
        type: 'Lunch',
        calories: 400,
        date: '2026-06-07'
      }
    };

    const res = mockRes();

    await logMeal(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 when type is missing', async () => {
    const req = {
      body: {
        userId: 'u1',
        food: 'Rice',
        calories: 400,
        date: '2026-06-07'
      }
    };

    const res = mockRes();

    await logMeal(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 when calories is missing', async () => {
    const req = {
      body: {
        userId: 'u1',
        food: 'Rice',
        type: 'Lunch',
        date: '2026-06-07'
      }
    };

    const res = mockRes();

    await logMeal(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 when date is missing', async () => {
    const req = {
      body: {
        userId: 'u1',
        food: 'Rice',
        type: 'Lunch',
        calories: 400
      }
    };

    const res = mockRes();

    await logMeal(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('carbs, protein, fat default to 0 when not provided', async () => {
    const fakeMeal = {
      _id: 'm1',
      food: 'Rice',
      carbs: 0,
      protein: 0,
      fat: 0
    };

    Meal.create.mockResolvedValue(fakeMeal);

    const req = {
      body: {
        userId: 'u1',
        food: 'Rice',
        type: 'Lunch',
        calories: 400,
        date: '2026-06-07'
      }
    };

    const res = mockRes();

    await logMeal(req, res);

    expect(Meal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        carbs: 0,
        protein: 0,
        fat: 0
      })
    );
  });

  test('returns 201 with created meal on success', async () => {
    const fakeMeal = {
      _id: 'm1',
      food: 'Nasi Lemak',
      calories: 650
    };

    Meal.create.mockResolvedValue(fakeMeal);

    const req = {
      body: {
        userId: 'u1',
        food: 'Nasi Lemak',
        type: 'Lunch',
        calories: 650,
        date: '2026-06-07'
      }
    };

    const res = mockRes();

    await logMeal(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        meal: fakeMeal
      })
    );
  });

  test('returns 500 on DB error', async () => {
    Meal.create.mockRejectedValue(new Error('fail'));

    const req = {
      body: {
        userId: 'u1',
        food: 'Rice',
        type: 'Lunch',
        calories: 400,
        date: '2026-06-07'
      }
    };

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
      { calories: 300, protein: 15, carbs: 30, fat: 5, date: today }
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

    expect(body.summary).toEqual({
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0
    });
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
      expect.objectContaining({
        success: true,
        message: 'Meal deleted.'
      })
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