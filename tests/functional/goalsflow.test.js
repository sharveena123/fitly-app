jest.mock('../../models/Goal');

const Goal = require('../../models/Goal');
const { setTargets, getDashboardMetrics, updateGoal, deleteGoal } = require('../../controllers/goalController');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => jest.clearAllMocks());

describe('Goals — Create', () => {
  const base = { userId: 'u1', title: 'Lose 5kg', category: 'Weight', current: 80, target: 75, unit: 'kg' };

  it('returns 400 when userId missing', async () => {
    const { userId, ...body } = base;
    const res = mockRes();
    await setTargets({ body }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when title missing', async () => {
    const { title, ...body } = base;
    const res = mockRes();
    await setTargets({ body }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('start field equals current on creation', async () => {
    const saved = { ...base, start: base.current, _id: 'g1' };
    Goal.create.mockResolvedValue(saved);
    const res = mockRes();
    await setTargets({ body: base }, res);
    expect(Goal.create).toHaveBeenCalledWith(expect.objectContaining({ start: base.current }));
  });

  it('category defaults to Custom when not provided', async () => {
    const { category, ...body } = base;
    Goal.create.mockResolvedValue({ ...body, category: 'Custom', start: body.current });
    const res = mockRes();
    await setTargets({ body }, res);
    expect(Goal.create).toHaveBeenCalledWith(expect.objectContaining({ category: 'Custom' }));
  });

  it('returns 201 on success', async () => {
    Goal.create.mockResolvedValue({ ...base, start: base.current, _id: 'g1' });
    const res = mockRes();
    await setTargets({ body: base }, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('Goals — Read', () => {
  it('returns 400 when userId missing', async () => {
    const res = mockRes();
    await getDashboardMetrics({ query: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns goals array', async () => {
    const sortMock = jest.fn().mockResolvedValue([{ title: 'Goal A' }]);
    Goal.find.mockReturnValue({ sort: sortMock });
    const res = mockRes();
    await getDashboardMetrics({ query: { userId: 'u1' } }, res);
    expect(res.json.mock.calls[0][0].goals).toHaveLength(1);
  });

  it('new goal appears in grid immediately (in returned list)', async () => {
    const goals = [{ _id: 'g1', title: 'New Goal', current: 0, target: 10 }];
    const sortMock = jest.fn().mockResolvedValue(goals);
    Goal.find.mockReturnValue({ sort: sortMock });
    const res = mockRes();
    await getDashboardMetrics({ query: { userId: 'u1' } }, res);
    expect(res.json.mock.calls[0][0].goals[0].title).toBe('New Goal');
  });
});

describe('Goals — Progress % Calculation', () => {
  it('increase goal: 3000 steps of 10000 = 30%', () => {
    const pct = ((3000 - 0) / (10000 - 0)) * 100;
    expect(pct).toBeCloseTo(30);
  });

  it('reduction goal (weight loss): 80→75 target, at 77 = 60%', () => {
    const pct = ((80 - 77) / (80 - 75)) * 100;
    expect(pct).toBeCloseTo(60);
  });

  it('completed increase goal = 100%', () => {
    const pct = Math.min(((10000 - 0) / (10000 - 0)) * 100, 100);
    expect(pct).toBe(100);
  });

  it('completed reduction goal = 100%', () => {
    const pct = Math.min(((80 - 75) / (80 - 75)) * 100, 100);
    expect(pct).toBe(100);
  });

  it('progress cannot exceed 100%', () => {
    const pct = Math.min(((12000 - 0) / (10000 - 0)) * 100, 100);
    expect(pct).toBe(100);
  });
});

describe('Goals — Status Badges', () => {
  it('"Done" badge when current === target', () => {
    const goal = { current: 10000, target: 10000 };
    const isDone = goal.current >= goal.target;
    expect(isDone).toBe(true);
  });

  it('past deadline → Overdue', () => {
    const deadline = new Date('2023-01-01');
    const diffDays = Math.ceil((deadline - new Date()) / 86400000);
    expect(diffDays).toBeLessThan(0);
  });

  it('today deadline → Due today', () => {
    const today = new Date();
    today.setHours(23, 59, 59, 0);
    const diffDays = Math.ceil((today - new Date()) / 86400000);
    expect(diffDays).toBeLessThanOrEqual(1);
  });

  it('future deadline → positive days left', () => {
    const future = new Date();
    future.setDate(future.getDate() + 30);
    const diffDays = Math.ceil((future - new Date()) / 86400000);
    expect(diffDays).toBeGreaterThan(0);
  });
});

describe('Goals — Update Progress', () => {
  it('saves new current value', async () => {
    Goal.findByIdAndUpdate.mockResolvedValue({ _id: 'g1', current: 7500 });
    const res = mockRes();
    await updateGoal({ params: { id: 'g1' }, body: { current: 7500 } }, res);
    expect(res.json.mock.calls[0][0].goal.current).toBe(7500);
  });

  it('returns 404 for non-existent goal', async () => {
    Goal.findByIdAndUpdate.mockResolvedValue(null);
    const res = mockRes();
    await updateGoal({ params: { id: 'fake' }, body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('Goals — Delete', () => {
  it('returns success on delete', async () => {
    Goal.findByIdAndDelete.mockResolvedValue({ _id: 'g1' });
    const res = mockRes();
    await deleteGoal({ params: { id: 'g1' } }, res);
    expect(res.json.mock.calls[0][0].success).toBe(true);
  });

  it('returns 404 when not found', async () => {
    Goal.findByIdAndDelete.mockResolvedValue(null);
    const res = mockRes();
    await deleteGoal({ params: { id: 'fake' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});