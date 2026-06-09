jest.mock('../../models/Goal');

const Goal = require('../../models/Goal');

const {
  setTargets,
  getDashboardMetrics,
  updateGoal,
  deleteGoal
} = require('../../controllers/goalController');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('goalController — setTargets (Unit)', () => {

  beforeEach(() => jest.clearAllMocks());

  test('returns 400 when userId is missing', async () => {
    const req = {
      body: {
        title: 'Lose 5kg',
        current: 75,
        target: 70
      }
    };

    const res = mockRes();

    await setTargets(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 when title is missing', async () => {
    const req = {
      body: {
        userId: 'u1',
        current: 75,
        target: 70
      }
    };

    const res = mockRes();

    await setTargets(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 when target is undefined', async () => {
    const req = {
      body: {
        userId: 'u1',
        title: 'Run 5km',
        current: 0
      }
    };

    const res = mockRes();

    await setTargets(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 when current is undefined', async () => {
    const req = {
      body: {
        userId: 'u1',
        title: 'Run 5km',
        target: 5
      }
    };

    const res = mockRes();

    await setTargets(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('start field equals current value on creation', async () => {
    const fakeGoal = {
      _id: 'g1',
      start: 75,
      current: 75,
      target: 70
    };

    Goal.create.mockResolvedValue(fakeGoal);

    const req = {
      body: {
        userId: 'u1',
        title: 'Lose 5kg',
        current: 75,
        target: 70
      }
    };

    const res = mockRes();

    await setTargets(req, res);

    expect(Goal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        start: 75,
        current: 75
      })
    );
  });

  test('category defaults to "Custom" when not provided', async () => {
    Goal.create.mockResolvedValue({ _id: 'g1' });

    const req = {
      body: {
        userId: 'u1',
        title: 'Run 5km',
        current: 0,
        target: 5
      }
    };

    const res = mockRes();

    await setTargets(req, res);

    expect(Goal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'Custom'
      })
    );
  });

  test('returns 201 with created goal on success', async () => {
    const fakeGoal = {
      _id: 'g1',
      title: 'Lose 5kg',
      target: 70
    };

    Goal.create.mockResolvedValue(fakeGoal);

    const req = {
      body: {
        userId: 'u1',
        title: 'Lose 5kg',
        current: 75,
        target: 70,
        category: 'Weight'
      }
    };

    const res = mockRes();

    await setTargets(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        goal: fakeGoal
      })
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
      expect.objectContaining({
        message: 'userId is required.'
      })
    );
  });

  test('returns all goals for the given userId', async () => {
    const fakeGoals = [
      { title: 'Lose 5kg' },
      { title: 'Run 5km' }
    ];

    Goal.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue(fakeGoals)
    });

    const req = { query: { userId: 'u1' } };
    const res = mockRes();

    await getDashboardMetrics(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        goals: fakeGoals
      })
    );
  });
});

describe('goalController — updateGoal (Unit)', () => {

  beforeEach(() => jest.clearAllMocks());

  test('returns updated goal on success', async () => {
    const updated = {
      _id: 'g1',
      current: 72,
      title: 'Lose 5kg'
    };

    Goal.findByIdAndUpdate.mockResolvedValue(updated);

    const req = {
      params: { id: 'g1' },
      body: { current: 72 }
    };

    const res = mockRes();

    await updateGoal(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        goal: updated
      })
    );
  });

  test('returns 404 when goal not found', async () => {
    Goal.findByIdAndUpdate.mockResolvedValue(null);

    const req = {
      params: { id: 'ghost' },
      body: { current: 72 }
    };

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
      expect.objectContaining({
        success: true,
        message: 'Goal deleted.'
      })
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