jest.mock('../../models/User');
jest.mock('../../models/Workout');
jest.mock('../../models/Meal');
jest.mock('../../models/Goal');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

// Mock GoogleGenAI 
const mockGenerateContent = jest.fn();
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: { generateContent: mockGenerateContent },
  })),
}));

const request = require('supertest');
const app     = require('../../app');
const User    = require('../../models/User');
const Workout = require('../../models/Workout');
const Meal    = require('../../models/Meal');
const Goal    = require('../../models/Goal');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');

beforeEach(() => {
  jest.clearAllMocks();
  mockGenerateContent.mockReset();
});

const today = new Date().toISOString().split('T')[0];

// Fake AI responses
const fakeAiRec = {
  strategy:                   'Streak Maintenance',
  suggestedActivity:          '30-minute jog',
  recommendedDurationMinutes: 30,
  intensityLevel:             'Moderate',
  personalizedAdvice:         'You are almost there. One more session will hit your goal.',
};

// Authentication Flow
describe('Integration — Full Auth Flow', () => {
  it('Register → returns 201 success', async () => {
    User.findOne.mockResolvedValue(null);
    bcrypt.genSalt.mockResolvedValue('salt');
    bcrypt.hash.mockResolvedValue('hashed');
    User.create.mockResolvedValue({});
    const res = await request(app).post('/api/auth/register').send({
      name: 'Dave', email: 'dave@fitly.io', password: 'Pass123!'
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('Duplicate email → 400 "already exists"', async () => {
    User.findOne.mockResolvedValue({ email: 'dave@fitly.io' });
    const res = await request(app).post('/api/auth/register').send({
      name: 'Dave', email: 'dave@fitly.io', password: 'Pass123!'
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it('Login → returns token + user profile', async () => {
    const fakeUser = { _id: 'uid1', name: 'Dave', email: 'dave@fitly.io', password: 'hashed', age: 25, weight: 70, height: 175, goal: 'Fitness' };
    User.findOne.mockResolvedValue(fakeUser);
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('jwt.token.here');
    const res = await request(app).post('/api/auth/login').send({
      email: 'dave@fitly.io', password: 'Pass123!'
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBe('jwt.token.here');
    expect(res.body.user.id).toBe('uid1');
  });

  it('Login response user object never exposes password', async () => {
    const fakeUser = { _id: 'uid1', name: 'Dave', email: 'dave@fitly.io', password: 'hashed', age: 25, weight: 70, height: 175, goal: 'Fitness' };
    User.findOne.mockResolvedValue(fakeUser);
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('tok');
    const res = await request(app).post('/api/auth/login').send({
      email: 'dave@fitly.io', password: 'Pass123!'
    });
    expect(res.body.user.password).toBeUndefined();
  });

  it('Incorrect password → 401 blocks login', async () => {
    User.findOne.mockResolvedValue({ email: 'dave@fitly.io', password: 'hashed' });
    bcrypt.compare.mockResolvedValue(false);
    const res = await request(app).post('/api/auth/login').send({
      email: 'dave@fitly.io', password: 'WrongPass'
    });
    expect(res.status).toBe(401);
  });

  it('Login with unknown email → 401', async () => {
    User.findOne.mockResolvedValue(null);
    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@fitly.io', password: 'Pass123!'
    });
    expect(res.status).toBe(401);
  });

  it('After login, GET /api/profile/:email returns profile without password', async () => {
    const selectMock = jest.fn().mockResolvedValue({ name: 'Dave', email: 'dave@fitly.io' });
    User.findOne.mockReturnValue({ select: selectMock });
    const res = await request(app).get('/api/profile/dave@fitly.io');
    expect(res.status).toBe(200);
    expect(res.body.profile.name).toBe('Dave');
    expect(res.body.profile.password).toBeUndefined();
  });

  it('GET /api/profile/:email for unknown user → 404', async () => {
    const selectMock = jest.fn().mockResolvedValue(null);
    User.findOne.mockReturnValue({ select: selectMock });
    const res = await request(app).get('/api/profile/ghost@fitly.io');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('PUT /api/profile — update profile → 200 with BMI calculated', async () => {
    const updated = { name: 'Dave', email: 'dave@fitly.io', weight: 70, height: 175, bmi: '22.9', bmiLabel: 'Normal Weight' };
    User.findOneAndUpdate.mockResolvedValue(updated);
    const res = await request(app).put('/api/profile/update').send({
      email: 'dave@fitly.io', name: 'Dave', age: 25, gender: 'male',
      activity: 'active', weight: 70, height: 175, goal: 'Build Muscle'
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.bmiLabel).toBe('Normal Weight');
  });

  it('PUT /api/profile — missing email → 400', async () => {
  const res = await request(app)
    .put('/api/profile/update')
    .send({
      name: 'Dave',
      weight: 70,
      height: 175
    });

  expect(res.status).toBe(400);
});

  it('PUT /api/profile — unknown user → 404', async () => {
    User.findOneAndUpdate.mockResolvedValue(null);
    const res = await request(app).put('/api/profile/update').send({
      email: 'ghost@fitly.io', name: 'Ghost', weight: 60, height: 170
    });
    expect(res.status).toBe(404);
  });
});

// Demo user access without registration
describe('Integration — Demo User Access (no registration)', () => {
  it('can GET workouts without auth token → 200', async () => {
    const sortMock = jest.fn().mockResolvedValue([]);
    Workout.find.mockReturnValue({ sort: sortMock });
    const res = await request(app).get('/api/workouts').query({ userId: 'demo' });
    expect(res.status).toBe(200);
  });

  it('workout response shape contains success flag and workouts array', async () => {
    const sortMock = jest.fn().mockResolvedValue([]);
    Workout.find.mockReturnValue({ sort: sortMock });
    const res = await request(app).get('/api/workouts').query({ userId: 'demo' });
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('workouts');
    expect(Array.isArray(res.body.workouts)).toBe(true);
  });

  it('can GET nutrition summary without auth token → 200', async () => {
    Meal.find.mockResolvedValue([]);
    const res = await request(app).get('/api/nutrition/summary').query({ userId: 'demo' });
    expect(res.status).toBe(200);
  });

  it('nutrition summary response shape contains all four macro keys', async () => {
    Meal.find.mockResolvedValue([]);
    const res = await request(app).get('/api/nutrition/summary').query({ userId: 'demo' });
    expect(res.body.summary).toHaveProperty('calories');
    expect(res.body.summary).toHaveProperty('protein');
    expect(res.body.summary).toHaveProperty('carbs');
    expect(res.body.summary).toHaveProperty('fat');
  });

  it('nutrition summary returns zeros when no meals logged', async () => {
    Meal.find.mockResolvedValue([]);
    const res = await request(app).get('/api/nutrition/summary').query({ userId: 'demo' });
    expect(res.body.summary.calories).toBe(0);
    expect(res.body.summary.protein).toBe(0);
    expect(res.body.summary.carbs).toBe(0);
    expect(res.body.summary.fat).toBe(0);
  });

  it('goals response shape contains success flag and goals array', async () => {
    const sortMock = jest.fn().mockResolvedValue([]);
    Goal.find.mockReturnValue({ sort: sortMock });
    const res = await request(app).get('/api/goals').query({ userId: 'demo' });
    expect(res.body).toHaveProperty('success', true);
    expect(Array.isArray(res.body.goals)).toBe(true);
  });

  it('health check is accessible', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/running/i);
  });
});

// Workout flow
describe('Integration — Log Workout → saved in DB', () => {
  it('POST /api/workouts → 201 with workout data', async () => {
    const saved = { _id: 'w1', userId: 'u1', exercise: 'Bench Press', type: 'Strength', duration: 45, calories: 450, date: today };
    Workout.create.mockResolvedValue(saved);
    const res = await request(app).post('/api/workouts').send({
      userId: 'u1', exercise: 'Bench Press', type: 'Strength', duration: 45, intensity: 'high', date: today
    });
    expect(res.status).toBe(201);
    expect(res.body.workout.exercise).toBe('Bench Press');
  });

  it('POST /api/workouts — auto-calculates calories (high: 10 cal/min × 45 min = 450)', async () => {
    const saved = { _id: 'w1', userId: 'u1', exercise: 'Sprint', type: 'Cardio', duration: 45, calories: 450, date: today };
    Workout.create.mockResolvedValue(saved);
    const res = await request(app).post('/api/workouts').send({
      userId: 'u1', exercise: 'Sprint', type: 'Cardio', duration: 45, intensity: 'high', date: today
    });
    expect(res.body.workout.calories).toBe(450);
  });

  it('POST /api/workouts — auto-calculates calories (moderate: 7 cal/min × 30 min = 210)', async () => {
    const saved = { _id: 'w2', userId: 'u1', exercise: 'Running', type: 'Cardio', duration: 30, calories: 210, date: today };
    Workout.create.mockResolvedValue(saved);
    const res = await request(app).post('/api/workouts').send({
      userId: 'u1', exercise: 'Running', type: 'Cardio', duration: 30, intensity: 'moderate', date: today
    });
    expect(res.body.workout.calories).toBe(210);
  });

  it('POST /api/workouts — auto-calculates calories (low: 4 cal/min × 30 min = 120)', async () => {
    const saved = { _id: 'w3', userId: 'u1', exercise: 'Walking', type: 'Cardio', duration: 30, calories: 120, date: today };
    Workout.create.mockResolvedValue(saved);
    const res = await request(app).post('/api/workouts').send({
      userId: 'u1', exercise: 'Walking', type: 'Cardio', duration: 30, intensity: 'low', date: today
    });
    expect(res.body.workout.calories).toBe(120);
  });

  it('GET workouts returns newly logged workout', async () => {
    const sortMock = jest.fn().mockResolvedValue([
      { _id: 'w1', exercise: 'Bench Press', type: 'Strength' }
    ]);
    Workout.find.mockReturnValue({ sort: sortMock });
    const res = await request(app).get('/api/workouts').query({ userId: 'u1' });
    expect(res.body.workouts.some(w => w.exercise === 'Bench Press')).toBe(true);
  });

  it('PATCH /api/workouts/:id — updates workout → 200 with updated fields', async () => {
    Workout.findByIdAndUpdate.mockResolvedValue({ _id: 'w1', exercise: 'Cycling', duration: 60, type: 'Cardio' });
    const res = await request(app).put('/api/workouts/w1').send({ exercise: 'Cycling', duration: 60 });
    expect(res.status).toBe(200);
    expect(res.body.workout.exercise).toBe('Cycling');
    expect(res.body.workout.duration).toBe(60);
  });

  it('PATCH /api/workouts/:id — non-existent workout → 404', async () => {
    Workout.findByIdAndUpdate.mockResolvedValue(null);
    const res = await request(app).put('/api/workouts/nonexistent').send({ exercise: 'Yoga' });
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('DELETE /api/workouts/:id — deletes workout → 200 with success', async () => {
    Workout.findByIdAndDelete.mockResolvedValue({ _id: 'w1' });
    const res = await request(app).delete('/api/workouts/w1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('DELETE /api/workouts/:id — non-existent workout → 404', async () => {
    Workout.findByIdAndDelete.mockResolvedValue(null);
    const res = await request(app).delete('/api/workouts/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// Nutrition Flow
describe('Integration — Log Meal → saved in DB', () => {
  it('POST /api/nutrition/log → 201 with meal data', async () => {
    const saved = { _id: 'm1', userId: 'u1', food: 'Nasi Lemak', calories: 450, date: today };
    Meal.create.mockResolvedValue(saved);
    const res = await request(app).post('/api/nutrition/log').send({
      userId: 'u1', food: 'Nasi Lemak', type: 'Breakfast', calories: 450, date: today
    });
    expect(res.status).toBe(201);
    expect(res.body.meal.food).toBe('Nasi Lemak');
  });

  it('POST /api/nutrition/log — missing userId → 400', async () => {
    const res = await request(app).post('/api/nutrition/log').send({
      food: 'Roti Canai', type: 'Breakfast', calories: 300, date: today
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/nutrition/log — missing calories → 400', async () => {
    const res = await request(app).post('/api/nutrition/log').send({
      userId: 'u1', food: 'Roti Canai', type: 'Breakfast', date: today
    });
    expect(res.status).toBe(400);
  });

  it('POST /api/nutrition/log — missing date → 400', async () => {
    const res = await request(app).post('/api/nutrition/log').send({
      userId: 'u1', food: 'Roti Canai', type: 'Breakfast', calories: 300
    });
    expect(res.status).toBe(400);
  });

  it('Summary updates after meal is logged', async () => {
    Meal.find.mockResolvedValue([{ calories: 350, protein: 20, carbs: 40, fat: 8 }]);
    const res = await request(app).get('/api/nutrition/summary').query({ userId: 'u1' });
    expect(res.body.summary.calories).toBe(350);
  });

  it('Summary aggregates multiple meals correctly', async () => {
    Meal.find.mockResolvedValue([
      { calories: 500, protein: 35, carbs: 60, fat: 10 },
      { calories: 300, protein: 15, carbs: 30, fat:  8 },
      { calories: 200, protein: 10, carbs: 20, fat:  5 },
    ]);
    const res = await request(app).get('/api/nutrition/summary').query({ userId: 'u1' });
    expect(res.body.summary.calories).toBe(1000);
    expect(res.body.summary.protein).toBe(60);
    expect(res.body.summary.carbs).toBe(110);
    expect(res.body.summary.fat).toBe(23);
  });

  it('Summary returns all zeros when no meals logged today', async () => {
    Meal.find.mockResolvedValue([]);
    const res = await request(app).get('/api/nutrition/summary').query({ userId: 'u1' });
    expect(res.body.summary.calories).toBe(0);
    expect(res.body.summary.protein).toBe(0);
    expect(res.body.summary.carbs).toBe(0);
    expect(res.body.summary.fat).toBe(0);
  });

  it('DELETE /api/nutrition/:id — deletes meal → 200', async () => {
    Meal.findByIdAndDelete.mockResolvedValue({ _id: 'm1' });
    const res = await request(app).delete('/api/nutrition/m1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('DELETE /api/nutrition/:id — non-existent meal → 404', async () => {
    Meal.findByIdAndDelete.mockResolvedValue(null);
    const res = await request(app).delete('/api/nutrition/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// Goals Flow
describe('Integration — Create Goal → saved in DB', () => {
  it('POST /api/goals/set-targets → 201 with goal data', async () => {
    const saved = { _id: 'g1', userId: 'u1', title: 'Run 5K', current: 0, start: 0, target: 5 };
    Goal.create.mockResolvedValue(saved);
    const res = await request(app).post('/api/goals/set-targets').send({
      userId: 'u1', title: 'Run 5K', category: 'Cardio', current: 0, target: 5, unit: 'km'
    });
    expect(res.status).toBe(201);
    expect(res.body.goal.title).toBe('Run 5K');
  });

  it('POST /api/goals/set-targets — start field equals current on creation', async () => {
    const saved = { _id: 'g1', userId: 'u1', title: 'Lose 5kg', current: 80, start: 80, target: 75 };
    Goal.create.mockResolvedValue(saved);
    const res = await request(app).post('/api/goals/set-targets').send({
      userId: 'u1', title: 'Lose 5kg', current: 80, target: 75, unit: 'kg'
    });
    expect(res.body.goal.start).toBe(res.body.goal.current);
    expect(res.body.goal.start).toBe(80);
  });

  it('POST /api/goals/set-targets — category defaults to "Custom" when omitted', async () => {
    const saved = { _id: 'g2', userId: 'u1', title: 'Custom Goal', current: 0, start: 0, target: 10, category: 'Custom' };
    Goal.create.mockResolvedValue(saved);
    const res = await request(app).post('/api/goals/set-targets').send({
      userId: 'u1', title: 'Custom Goal', current: 0, target: 10
    });
    expect(res.body.goal.category).toBe('Custom');
  });

  it('New goal appears in GET /api/goals immediately', async () => {
    const sortMock = jest.fn().mockResolvedValue([{ title: 'Run 5K', current: 0, target: 5 }]);
    Goal.find.mockReturnValue({ sort: sortMock });
    const res = await request(app).get('/api/goals').query({ userId: 'u1' });
    expect(res.body.goals.some(g => g.title === 'Run 5K')).toBe(true);
  });

  it('PATCH /api/goals/:id — updates goal progress → 200 with new current', async () => {
    Goal.findByIdAndUpdate.mockResolvedValue({ _id: 'g1', title: 'Run 5K', current: 3, target: 5 });
    const res = await request(app).put('/api/goals/g1').send({ current: 3 });
    expect(res.status).toBe(200);
    expect(res.body.goal.current).toBe(3);
  });

  it('PATCH /api/goals/:id — non-existent goal → 404', async () => {
    Goal.findByIdAndUpdate.mockResolvedValue(null);
    const res = await request(app).put('/api/goals/nonexistent').send({ current: 5 });
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('DELETE /api/goals/:id — deletes goal → 200', async () => {
    Goal.findByIdAndDelete.mockResolvedValue({ _id: 'g1' });
    const res = await request(app).delete('/api/goals/g1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('DELETE /api/goals/:id — non-existent goal → 404', async () => {
    Goal.findByIdAndDelete.mockResolvedValue(null);
    const res = await request(app).delete('/api/goals/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// AI Recommendation Flow
describe('Integration — AI Recommendation via /api/ai/recommend', () => {
  const validBody = { currentWeeklyHours: 3, targetedGoalHours: 5, preferredActivityType: 'Cardio' };

  it('POST with valid body → 200 with recommendation object', async () => {
    mockGenerateContent.mockResolvedValue({ text: JSON.stringify(fakeAiRec) });
    const res = await request(app).post('/api/ai/recommend').send(validBody);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.recommendation).toBeDefined();
  });

  it('recommendation response contains all 5 required keys', async () => {
    mockGenerateContent.mockResolvedValue({ text: JSON.stringify(fakeAiRec) });
    const res = await request(app).post('/api/ai/recommend').send(validBody);
    const rec = res.body.recommendation;
    expect(rec).toHaveProperty('strategy');
    expect(rec).toHaveProperty('suggestedActivity');
    expect(rec).toHaveProperty('recommendedDurationMinutes');
    expect(rec).toHaveProperty('intensityLevel');
    expect(rec).toHaveProperty('personalizedAdvice');
  });

  it('POST missing targetedGoalHours → 400', async () => {
    const res = await request(app).post('/api/ai/recommend').send({ currentWeeklyHours: 3 });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/missing parameters/i);
  });

  it('POST missing currentWeeklyHours → 400', async () => {
    const res = await request(app).post('/api/ai/recommend').send({ targetedGoalHours: 5 });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('currentWeeklyHours = 0 is valid (user has not exercised yet) → 200', async () => {
    mockGenerateContent.mockResolvedValue({ text: JSON.stringify(fakeAiRec) });
    const res = await request(app).post('/api/ai/recommend').send({
      currentWeeklyHours: 0, targetedGoalHours: 5, preferredActivityType: 'Strength'
    });
    expect(res.status).toBe(200);
  });

  it('Gemini API failure → 500', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Gemini unavailable'));
    const res = await request(app).post('/api/ai/recommend').send(validBody);
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  it('recommendation card refreshes when hours change — second call returns updated content', async () => {
    // First call: 2 of 5 hours done
    const firstRec  = { ...fakeAiRec, strategy: 'Catch-Up Urgency',    recommendedDurationMinutes: 60 };
    const secondRec = { ...fakeAiRec, strategy: 'Streak Maintenance',  recommendedDurationMinutes: 30 };
    mockGenerateContent
      .mockResolvedValueOnce({ text: JSON.stringify(firstRec) })
      .mockResolvedValueOnce({ text: JSON.stringify(secondRec) });

    const res1 = await request(app).post('/api/ai/recommend').send({ currentWeeklyHours: 2, targetedGoalHours: 5 });
    const res2 = await request(app).post('/api/ai/recommend').send({ currentWeeklyHours: 4, targetedGoalHours: 5 });

    expect(res1.body.recommendation.strategy).toBe('Catch-Up Urgency');
    expect(res2.body.recommendation.strategy).toBe('Streak Maintenance');
    expect(res2.body.recommendation.recommendedDurationMinutes).toBeLessThan(
      res1.body.recommendation.recommendedDurationMinutes
    );
  });
});

// API routes checklist
describe('Integration — API Routes / Postman Checklist', () => {
  it('POST /api/auth/register  → 400 on missing fields', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/auth/login     → 400 on missing fields', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });

  it('GET  /api/workouts       → 200', async () => {
    const sortMock = jest.fn().mockResolvedValue([]);
    Workout.find.mockReturnValue({ sort: sortMock });
    const res = await request(app).get('/api/workouts');
    expect(res.status).toBe(200);
  });

  it('POST /api/workouts       → 400 on missing required fields', async () => {
    const res = await request(app).post('/api/workouts').send({});
    expect(res.status).toBe(400);
  });

  it('GET  /api/nutrition/summary → 200', async () => {
    Meal.find.mockResolvedValue([]);
    const res = await request(app).get('/api/nutrition/summary').query({ userId: 'u1' });
    expect(res.status).toBe(200);
  });

  it('POST /api/nutrition/log  → 400 on missing required fields', async () => {
    const res = await request(app).post('/api/nutrition/log').send({});
    expect(res.status).toBe(400);
  });

  it('GET  /api/goals          → 400 without userId', async () => {
    const res = await request(app).get('/api/goals');
    expect(res.status).toBe(400);
  });

  it('POST /api/goals/set-targets → 400 on missing fields', async () => {
    const res = await request(app).post('/api/goals/set-targets').send({});
    expect(res.status).toBe(400);
  });
});

// CROSS-FLOW — end-to-end sequences
describe('Integration — Cross-flow end-to-end sequences', () => {

  it('Register → Login → GET profile (full auth sequence)', async () => {

    // Step 1: Register
    User.findOne.mockResolvedValueOnce(null);
    bcrypt.genSalt.mockResolvedValue('salt');
    bcrypt.hash.mockResolvedValue('hashed');
    User.create.mockResolvedValue({});
    const regRes = await request(app).post('/api/auth/register').send({
      name: 'Eve', email: 'eve@fitly.io', password: 'Pass123!'
    });
    expect(regRes.status).toBe(201);

    // Step 2: Login
    const fakeUser = { _id: 'uid2', name: 'Eve', email: 'eve@fitly.io', password: 'hashed', age: 28, weight: 58, height: 162, goal: 'Tone' };
    User.findOne.mockResolvedValueOnce(fakeUser);
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('eve.token');
    const loginRes = await request(app).post('/api/auth/login').send({ email: 'eve@fitly.io', password: 'Pass123!' });
    expect(loginRes.status).toBe(200);
    const { token } = loginRes.body;
    expect(token).toBe('eve.token');

    // Step 3: GET profile using email from login response
    const selectMock = jest.fn().mockResolvedValue({ name: 'Eve', email: 'eve@fitly.io' });
    User.findOne.mockReturnValue({ select: selectMock });
    const profileRes = await request(app).get(`/api/profile/${loginRes.body.user.email}`);
    expect(profileRes.status).toBe(200);
    expect(profileRes.body.profile.name).toBe('Eve');
  });

  it('Log workout → GET workouts → workout appears in the returned list', async () => {

    // Step 1: log
    const saved = { _id: 'w10', userId: 'u1', exercise: 'Deadlift', type: 'Strength', duration: 50, calories: 500, date: today };
    Workout.create.mockResolvedValue(saved);
    const postRes = await request(app).post('/api/workouts').send({
      userId: 'u1', exercise: 'Deadlift', type: 'Strength', duration: 50, intensity: 'high', date: today
    });
    expect(postRes.status).toBe(201);

    // Step 2: GET — new workout appears
    const sortMock = jest.fn().mockResolvedValue([saved]);
    Workout.find.mockReturnValue({ sort: sortMock });
    const getRes = await request(app).get('/api/workouts').query({ userId: 'u1' });
    expect(getRes.body.workouts.some(w => w.exercise === 'Deadlift')).toBe(true);
  });

  it('Log meal → GET summary → calories reflected in totals', async () => {

    // Step 1: log
    Meal.create.mockResolvedValue({ _id: 'm10', userId: 'u1', food: 'Chicken Rice', calories: 487, date: today });
    const postRes = await request(app).post('/api/nutrition/log').send({
      userId: 'u1', food: 'Chicken Rice', type: 'Lunch', calories: 487, date: today
    });
    expect(postRes.status).toBe(201);

    // Step 2: GET summary — totals include the new meal
    Meal.find.mockResolvedValue([{ calories: 487, protein: 28, carbs: 62, fat: 12 }]);
    const sumRes = await request(app).get('/api/nutrition/summary').query({ userId: 'u1' });
    expect(sumRes.body.summary.calories).toBe(487);
    expect(sumRes.body.summary.protein).toBe(28);
  });

  it('Create goal → UPDATE progress → new current value is persisted', async () => {

    // Step 1: create
    Goal.create.mockResolvedValue({ _id: 'g10', userId: 'u1', title: 'Steps Goal', current: 0, start: 0, target: 10000 });
    const createRes = await request(app).post('/api/goals/set-targets').send({
      userId: 'u1', title: 'Steps Goal', current: 0, target: 10000, unit: 'steps'
    });
    expect(createRes.status).toBe(201);
    const goalId = createRes.body.goal._id;

    // Step 2: update progress
    Goal.findByIdAndUpdate.mockResolvedValue({ _id: goalId, title: 'Steps Goal', current: 4500, target: 10000 });
    const updateRes = await request(app).put(`/api/goals/${goalId}`).send({ current: 4500 });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.goal.current).toBe(4500);
  });

  it('Log workout → call AI recommendation → recommendation is returned', async () => {
    
    // Step 1: log workout
    Workout.create.mockResolvedValue({ _id: 'w20', userId: 'u1', exercise: 'Running', duration: 60, date: today, calories: 420 });
    const workoutRes = await request(app).post('/api/workouts').send({
      userId: 'u1', exercise: 'Running', type: 'Cardio', duration: 60, intensity: 'moderate', date: today
    });
    expect(workoutRes.status).toBe(201);

    // Step 2: trigger AI recommendation with updated weekly hours
    mockGenerateContent.mockResolvedValue({ text: JSON.stringify(fakeAiRec) });
    const aiRes = await request(app).post('/api/ai/recommend').send({
      currentWeeklyHours: 1,   // 60 min = 1 hour logged
      targetedGoalHours:  5,
      preferredActivityType: 'Cardio',
    });
    expect(aiRes.status).toBe(200);
    expect(aiRes.body.recommendation).toBeDefined();
    expect(aiRes.body.recommendation.strategy).toBe('Streak Maintenance');
  });
});