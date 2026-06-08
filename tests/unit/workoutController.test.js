jest.mock('../../models/Workout');
const Workout = require('../../models/Workout');

const {
  getWorkouts,
  createWorkout,
  updateWorkout,
  deleteWorkout,
} = require('../../controllers/workoutController');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
}

describe('workoutController — createWorkout (Unit)', () => {

  beforeEach(() => jest.clearAllMocks());

  // Validation
  test('returns 400 when userId is missing', async () => {
    const req = { body: { exercise: 'Run', type: 'Cardio', duration: 30, date: '2026-06-07' } };
    const res = mockRes();
    await createWorkout(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Missing required fields.' })
    );
  });

  test('returns 400 when exercise is missing', async () => {
    const req = { body: { userId: 'u1', type: 'Cardio', duration: 30, date: '2026-06-07' } };
    const res = mockRes();
    await createWorkout(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 when type is missing', async () => {
    const req = { body: { userId: 'u1', exercise: 'Run', duration: 30, date: '2026-06-07' } };
    const res = mockRes();
    await createWorkout(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 when duration is missing', async () => {
    const req = { body: { userId: 'u1', exercise: 'Run', type: 'Cardio', date: '2026-06-07' } };
    const res = mockRes();
    await createWorkout(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 when date is missing', async () => {
    const req = { body: { userId: 'u1', exercise: 'Run', type: 'Cardio', duration: 30 } };
    const res = mockRes();
    await createWorkout(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  // Calorie auto-calculation 
  test('auto-calculates calories for moderate intensity: 30min × 7 = 210', async () => {
    Workout.create.mockResolvedValue({ calories: 210 });
    const req = { body: { userId: 'u1', exercise: 'Run', type: 'Cardio', duration: 30, intensity: 'moderate', date: '2026-06-07' } };
    const res = mockRes();
    await createWorkout(req, res);
    expect(Workout.create).toHaveBeenCalledWith(
      expect.objectContaining({ calories: 210 })
    );
  });

  test('auto-calculates calories for high intensity: 30min × 10 = 300', async () => {
    Workout.create.mockResolvedValue({ calories: 300 });
    const req = { body: { userId: 'u1', exercise: 'HIIT', type: 'HIIT', duration: 30, intensity: 'high', date: '2026-06-07' } };
    const res = mockRes();
    await createWorkout(req, res);
    expect(Workout.create).toHaveBeenCalledWith(
      expect.objectContaining({ calories: 300 })
    );
  });

  test('auto-calculates calories for low intensity: 30min × 4 = 120', async () => {
    Workout.create.mockResolvedValue({ calories: 120 });
    const req = { body: { userId: 'u1', exercise: 'Yoga', type: 'Yoga', duration: 30, intensity: 'low', date: '2026-06-07' } };
    const res = mockRes();
    await createWorkout(req, res);
    expect(Workout.create).toHaveBeenCalledWith(
      expect.objectContaining({ calories: 120 })
    );
  });

  test('uses provided calories and does not override them', async () => {
    Workout.create.mockResolvedValue({ calories: 999 });
    const req = { body: { userId: 'u1', exercise: 'Run', type: 'Cardio', duration: 30, intensity: 'moderate', calories: 999, date: '2026-06-07' } };
    const res = mockRes();
    await createWorkout(req, res);
    expect(Workout.create).toHaveBeenCalledWith(
      expect.objectContaining({ calories: 999 })
    );
  });

  // Successful workout creation 
  test('returns 201 with the created workout on success', async () => {
    const fakeWorkout = { _id: 'w1', exercise: 'Run', calories: 210 };
    Workout.create.mockResolvedValue(fakeWorkout);

    const req = { body: { userId: 'u1', exercise: 'Run', type: 'Cardio', duration: 30, intensity: 'moderate', date: '2026-06-07' } };
    const res = mockRes();
    await createWorkout(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, workout: fakeWorkout })
    );
  });

  // DB error 
  test('returns 500 when Workout.create throws', async () => {
    Workout.create.mockRejectedValue(new Error('DB error'));
    const req = { body: { userId: 'u1', exercise: 'Run', type: 'Cardio', duration: 30, date: '2026-06-07' } };
    const res = mockRes();
    await createWorkout(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('workoutController — getWorkouts (Unit)', () => {

  beforeEach(() => jest.clearAllMocks());

  test('returns all workouts for the given userId', async () => {
    const fakeWorkouts = [{ exercise: 'Run' }, { exercise: 'Yoga' }];
    Workout.find.mockReturnValue({ sort: jest.fn().mockResolvedValue(fakeWorkouts) });

    const req = { query: { userId: 'u1' } };
    const res = mockRes();
    await getWorkouts(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, workouts: fakeWorkouts })
    );
  });

  test('returns all workouts when userId is not provided', async () => {
    const fakeWorkouts = [{ exercise: 'Run' }];
    Workout.find.mockReturnValue({ sort: jest.fn().mockResolvedValue(fakeWorkouts) });

    const req = { query: {} };
    const res = mockRes();
    await getWorkouts(req, res);

    // filter should be empty object
    expect(Workout.find).toHaveBeenCalledWith({});
  });

  test('returns 500 on DB error', async () => {
    Workout.find.mockReturnValue({ sort: jest.fn().mockRejectedValue(new Error('fail')) });
    const req = { query: { userId: 'u1' } };
    const res = mockRes();
    await getWorkouts(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('workoutController — updateWorkout (Unit)', () => {

  beforeEach(() => jest.clearAllMocks());

  test('returns updated workout on success', async () => {
    const updated = { _id: 'w1', exercise: 'Cycling', duration: 45 };
    Workout.findByIdAndUpdate.mockResolvedValue(updated);

    const req = { params: { id: 'w1' }, body: { exercise: 'Cycling', duration: 45 } };
    const res = mockRes();
    await updateWorkout(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, workout: updated })
    );
  });

  test('returns 404 when workout id does not exist', async () => {
    Workout.findByIdAndUpdate.mockResolvedValue(null);
    const req = { params: { id: 'nonexistent' }, body: { exercise: 'Run' } };
    const res = mockRes();
    await updateWorkout(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Workout not found.' })
    );
  });

  test('returns 500 on DB error', async () => {
    Workout.findByIdAndUpdate.mockRejectedValue(new Error('fail'));
    const req = { params: { id: 'w1' }, body: {} };
    const res = mockRes();
    await updateWorkout(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('workoutController — deleteWorkout (Unit)', () => {

  beforeEach(() => jest.clearAllMocks());

  test('returns success message when workout is deleted', async () => {
    Workout.findByIdAndDelete.mockResolvedValue({ _id: 'w1' });
    const req = { params: { id: 'w1' } };
    const res = mockRes();
    await deleteWorkout(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: 'Workout deleted.' })
    );
  });

  test('returns 404 when workout does not exist', async () => {
    Workout.findByIdAndDelete.mockResolvedValue(null);
    const req = { params: { id: 'ghost' } };
    const res = mockRes();
    await deleteWorkout(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Workout not found.' })
    );
  });

  test('returns 500 on DB error', async () => {
    Workout.findByIdAndDelete.mockRejectedValue(new Error('fail'));
    const req = { params: { id: 'w1' } };
    const res = mockRes();
    await deleteWorkout(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});