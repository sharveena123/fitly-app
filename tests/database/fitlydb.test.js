/**
 * DB TESTS — MongoDB Schema & Integrity (REFACTORED)
 *
 * Uses mongodb-memory-server for isolated in-memory MongoDB testing.
 * Ensures full schema validation without mocking.
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const User = require('../../models/User');
const Workout = require('../../models/Workout');
const Meal = require('../../models/Meal');
const Goal = require('../../models/Goal');

let mongod;

// ─────────────────────────────────────────────
// DB LIFECYCLE (FIXED: no duplicate connections)
// ─────────────────────────────────────────────

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();

  const uri = mongod.getUri();

  // ensure clean connection state
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  await mongoose.connect(uri);
  await User.init(); // ensures indexes (VERY IMPORTANT for unique tests)
});

afterEach(async () => {
  // clean all collections safely
  await Promise.all(
    Object.values(mongoose.connection.collections).map((c) =>
      c.deleteMany({})
    )
  );
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

async function createUser(overrides = {}) {
  return User.create({
    name: 'Test User',
    email: 'test@fitly.io',
    password: 'hashed',
    ...overrides,
  });
}

const today = new Date().toISOString().split('T')[0];

// ─────────────────────────────────────────────
// USER EMAIL UNIQUENESS
// ─────────────────────────────────────────────

describe('DB — User email uniqueness', () => {
  it('throws duplicate-key error on same email', async () => {
    await createUser({ email: 'dave@fitly.io' });

    await expect(
      createUser({ email: 'dave@fitly.io' })
    ).rejects.toThrow(/duplicate key|E11000/i);
  });

  it('case-insensitive duplicate email is rejected', async () => {
    await createUser({ email: 'carol@fitly.io' });

    await expect(
      createUser({ email: 'CAROL@FITLY.IO' })
    ).rejects.toThrow(/duplicate key|E11000/i);
  });

  it('allows different emails', async () => {
    await createUser({ email: 'alice@fitly.io' });

    const bob = await createUser({ email: 'bob@fitly.io' });
    expect(bob.email).toBe('bob@fitly.io');
  });
});

// ─────────────────────────────────────────────
// EMAIL LOWERCASE
// ─────────────────────────────────────────────

describe('DB — User email stored lowercase', () => {
  it('normalizes email to lowercase', async () => {
    const user = await createUser({ email: 'UPPER@FITLY.IO' });

    const fetched = await User.findById(user._id);
    expect(fetched.email).toBe('upper@fitly.io');
  });

  it('handles mixed-case email', async () => {
    const user = await createUser({ email: 'Mixed.Case@Fitly.IO' });

    const fetched = await User.findById(user._id);
    expect(fetched.email).toBe('mixed.case@fitly.io');
  });
});

// ─────────────────────────────────────────────
// WORKOUT RELATIONSHIP
// ─────────────────────────────────────────────

describe('DB — Workout userId references valid User', () => {
  it('stores valid ObjectId reference', async () => {
    const user = await createUser();

    const workout = await Workout.create({
      userId: user._id,
      exercise: 'Running',
      type: 'Cardio',
      duration: 30,
      date: today,
    });

    expect(workout.userId.toString()).toBe(user._id.toString());
  });

  it('userId is ObjectId type', async () => {
    const user = await createUser();

    const workout = await Workout.create({
      userId: user._id,
      exercise: 'Cycling',
      type: 'Cardio',
      duration: 45,
      date: today,
    });

    const fetched = await Workout.findById(workout._id);
    expect(fetched.userId instanceof mongoose.Types.ObjectId).toBe(true);
  });

  it('can query workouts by userId', async () => {
    const user = await createUser();

    await Workout.create({
      userId: user._id,
      exercise: 'Yoga',
      type: 'Flexibility',
      duration: 60,
      date: today,
    });

    const results = await Workout.find({ userId: user._id });
    expect(results.length).toBe(1);
  });
});

// ─────────────────────────────────────────────
// MEAL RELATIONSHIP
// ─────────────────────────────────────────────

describe('DB — Meal userId references valid User', () => {
  it('stores valid ObjectId reference', async () => {
    const user = await createUser();

    const meal = await Meal.create({
      userId: user._id,
      food: 'Nasi Lemak',
      type: 'Lunch',
      calories: 650,
      date: today,
    });

    expect(meal.userId.toString()).toBe(user._id.toString());
  });

  it('userId stored as ObjectId', async () => {
    const user = await createUser();

    const meal = await Meal.create({
      userId: user._id,
      food: 'Roti Canai',
      type: 'Breakfast',
      calories: 300,
      date: today,
    });

    const fetched = await Meal.findById(meal._id);
    expect(fetched.userId instanceof mongoose.Types.ObjectId).toBe(true);
  });
});

// ─────────────────────────────────────────────
// GOAL LOGIC
// ─────────────────────────────────────────────

describe('DB — Goal start equals current on creation', () => {
  it('start is preserved', async () => {
    const user = await createUser();

    const goal = await Goal.create({
      userId: user._id,
      title: 'Run 5K',
      current: 2,
      start: 2,
      target: 5,
    });

    const fetched = await Goal.findById(goal._id);
    expect(fetched.start).toBe(2);
  });

  it('start does not change on update', async () => {
    const user = await createUser();

    const goal = await Goal.create({
      userId: user._id,
      title: 'Lose weight',
      current: 80,
      start: 80,
      target: 75,
    });

    await Goal.findByIdAndUpdate(goal._id, { current: 77 });

    const updated = await Goal.findById(goal._id);
    expect(updated.start).toBe(80);
    expect(updated.current).toBe(77);
  });
});

// ─────────────────────────────────────────────
// DELETE SAFETY
// ─────────────────────────────────────────────

describe('DB — Deleted documents removed', () => {
  it('workout deletion', async () => {
    const user = await createUser();

    const w = await Workout.create({
      userId: user._id,
      exercise: 'Squats',
      type: 'Strength',
      duration: 40,
      date: today,
    });

    await Workout.findByIdAndDelete(w._id);

    const results = await Workout.find({ userId: user._id });
    expect(results.length).toBe(0);
  });
});

// ─────────────────────────────────────────────
// INVALID ID SAFETY
// ─────────────────────────────────────────────

describe('DB — Invalid ObjectId handling', () => {
  it('rejects invalid ObjectId', async () => {
    await expect(
      Workout.findById('invalid-id')
    ).rejects.toThrow();
  });
});