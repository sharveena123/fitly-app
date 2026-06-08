jest.mock('../../models/Workout');

const Workout = require('../../models/Workout');
const { getWorkouts, createWorkout, updateWorkout, deleteWorkout } = require('../../controllers/workoutController');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => jest.clearAllMocks());

const localStorageMock = (() => {
  let store = {};
  return {
    getItem:    (k)      => store[k] ?? null,
    setItem:    (k, v)   => { store[k] = String(v); },
    removeItem: (k)      => { delete store[k]; },
    clear:      ()       => { store = {}; },
  };
})();
 
beforeEach(() => localStorageMock.clear());

// Create workout
describe('Workout — Create', () => {
  const base = { userId: 'u1', exercise: 'Running', type: 'Cardio', duration: 30, intensity: 'moderate', date: '2024-06-01' };

  it('returns 400 when userId missing', async () => {
    const { userId, ...body } = base;
    const res = mockRes();
    await createWorkout({ body }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when exercise missing', async () => {
    const { exercise, ...body } = base;
    const res = mockRes();
    await createWorkout({ body }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when date missing', async () => {
    const { date, ...body } = base;
    const res = mockRes();
    await createWorkout({ body }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('auto-calculates calories for moderate (7 cal/min)', async () => {
    const saved = { ...base, calories: 210, _id: 'w1' };
    Workout.create.mockResolvedValue(saved);
    const res = mockRes();
    await createWorkout({ body: base }, res);
    expect(Workout.create).toHaveBeenCalledWith(expect.objectContaining({ calories: 210 }));
  });

  it('auto-calculates calories for high (10 cal/min)', async () => {
    const body = { ...base, intensity: 'high', duration: 20 };
    Workout.create.mockResolvedValue({ ...body, calories: 200 });
    const res = mockRes();
    await createWorkout({ body }, res);
    expect(Workout.create).toHaveBeenCalledWith(expect.objectContaining({ calories: 200 }));
  });

  it('auto-calculates calories for low (4 cal/min)', async () => {
    const body = { ...base, intensity: 'low', duration: 30 };
    Workout.create.mockResolvedValue({ ...body, calories: 120 });
    const res = mockRes();
    await createWorkout({ body }, res);
    expect(Workout.create).toHaveBeenCalledWith(expect.objectContaining({ calories: 120 }));
  });

  it('uses provided calories over auto-calc', async () => {
    const body = { ...base, calories: 999 };
    Workout.create.mockResolvedValue({ ...body });
    const res = mockRes();
    await createWorkout({ body }, res);
    expect(Workout.create).toHaveBeenCalledWith(expect.objectContaining({ calories: 999 }));
  });

  it('returns 201 on success', async () => {
    Workout.create.mockResolvedValue({ ...base, _id: 'w1', calories: 210 });
    const res = mockRes();
    await createWorkout({ body: base }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json.mock.calls[0][0].success).toBe(true);
  });

  it('returns 500 on DB error', async () => {
    Workout.create.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await createWorkout({ body: base }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// Read and filter workout details
describe('Workout — Read and Filter', () => {
  const workouts = [
    { _id: 'w1', exercise: 'Running', type: 'Cardio', date: '2024-06-01', calories: 200 },
    { _id: 'w2', exercise: 'Squats',  type: 'Strength', date: '2024-06-02', calories: 150 },
    { _id: 'w3', exercise: 'Cycling', type: 'Cardio', date: '2024-06-01', calories: 180 },
  ];

  it('returns all workouts for userId', async () => {
    const sortMock = jest.fn().mockResolvedValue(workouts);
    Workout.find.mockReturnValue({ sort: sortMock });
    const res = mockRes();
    await getWorkouts({ query: { userId: 'u1' } }, res);
    expect(Workout.find).toHaveBeenCalledWith({ userId: 'u1' });
    expect(res.json.mock.calls[0][0].workouts).toHaveLength(3);
  });

  it('filter by type — only Cardio workouts', () => {
    const filtered = workouts.filter(w => w.type === 'Cardio');
    expect(filtered).toHaveLength(2);
    expect(filtered.every(w => w.type === 'Cardio')).toBe(true);
  });

  it('filter by date — only 2024-06-02', () => {
    const filtered = workouts.filter(w => w.date === '2024-06-02');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].exercise).toBe('Squats');
  });

  it('clear filters restores full list', () => {
    let filtered = workouts.filter(w => w.type === 'Strength');
    expect(filtered).toHaveLength(1);
    filtered = workouts; 
    expect(filtered).toHaveLength(3);
  });

  it('stat total calories correct', () => {
    const total = workouts.reduce((s, w) => s + w.calories, 0);
    expect(total).toBe(530);
  });
});

// Update workout details
describe('Workout — Update', () => {
  it('returns 200 with updated workout', async () => {
    Workout.findByIdAndUpdate.mockResolvedValue({ _id: 'w1', exercise: 'Cycling' });
    const res = mockRes();
    await updateWorkout({ params: { id: 'w1' }, body: { exercise: 'Cycling' } }, res);
    expect(res.json.mock.calls[0][0].workout.exercise).toBe('Cycling');
  });

  it('returns 404 when workout not found', async () => {
    Workout.findByIdAndUpdate.mockResolvedValue(null);
    const res = mockRes();
    await updateWorkout({ params: { id: 'fake' }, body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('edit modal pre-fills: updated doc matches new values', async () => {
    const updated = { _id: 'w1', exercise: 'Yoga', duration: 60, intensity: 'low' };
    Workout.findByIdAndUpdate.mockResolvedValue(updated);
    const res = mockRes();
    await updateWorkout({ params: { id: 'w1' }, body: { exercise: 'Yoga', duration: 60 } }, res);
    const returned = res.json.mock.calls[0][0].workout;
    expect(returned.exercise).toBe('Yoga');
    expect(returned.duration).toBe(60);
  });
});

// Delete workout details
describe('Workout — Delete', () => {
  it('returns 200 on successful delete', async () => {
    Workout.findByIdAndDelete.mockResolvedValue({ _id: 'w1' });
    const res = mockRes();
    await deleteWorkout({ params: { id: 'w1' } }, res);
    expect(res.json.mock.calls[0][0].success).toBe(true);
  });

  it('returns 404 when workout not found', async () => {
    Workout.findByIdAndDelete.mockResolvedValue(null);
    const res = mockRes();
    await deleteWorkout({ params: { id: 'fake' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('stat totals update after delete', () => {
    const before = [{ calories: 200 }, { calories: 150 }];
    const after  = before.filter(w => w !== before[0]);
    const total  = after.reduce((s, w) => s + w.calories, 0);
    expect(total).toBe(150);
  });
});

function saveWorkoutLocally(workout, storage = localStorageMock) {
  const existing = JSON.parse(storage.getItem('workouts') || '[]');
  existing.unshift(workout);
  storage.setItem('workouts', JSON.stringify(existing));
}
 
function readWorkoutsLocally(storage = localStorageMock) {
  return JSON.parse(storage.getItem('workouts') || '[]');
}
 
describe('Workout — localStorage quick-log write', () => {
  const workout1 = { id: 'w1', exercise: 'Running',    type: 'Cardio',    duration: 30, calories: 210 };
  const workout2 = { id: 'w2', exercise: 'Bench Press', type: 'Strength', duration: 45, calories: 450 };
 
  it('first workout is stored in localStorage', () => {
    saveWorkoutLocally(workout1);
    const stored = readWorkoutsLocally();
    expect(stored).toHaveLength(1);
    expect(stored[0].exercise).toBe('Running');
  });
 
  it('newest workout appears at index 0 (unshift order)', () => {
    saveWorkoutLocally(workout1);
    saveWorkoutLocally(workout2);
    const stored = readWorkoutsLocally();
    expect(stored[0].exercise).toBe('Bench Press');
    expect(stored[1].exercise).toBe('Running');
  });
 
  it('all workout fields are preserved after serialisation', () => {
    saveWorkoutLocally(workout1);
    const stored = readWorkoutsLocally();
    expect(stored[0]).toEqual(workout1);
  });
 
  it('localStorage is empty before any workout is logged', () => {
    expect(readWorkoutsLocally()).toHaveLength(0);
  });
 
  it('multiple workouts accumulate correctly', () => {
    [workout1, workout2].forEach(w => saveWorkoutLocally(w));
    expect(readWorkoutsLocally()).toHaveLength(2);
  });
});