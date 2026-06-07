/**
 * tests/unit/aiController.test.js
 *
 * Unit tests for getWorkoutRecommendation.
 * The @google/genai SDK is fully mocked — no real API calls made.
 *
 * Run: npx jest tests/unit/aiController.test.js
 */

// ── Mock the entire @google/genai module ──────────────────────────
const mockGenerateContent = jest.fn();

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: { generateContent: mockGenerateContent },
  })),
}));

const { getWorkoutRecommendation } = require('../../controllers/aiController');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
}

// A valid Gemini response payload
const validAIResponse = {
  strategy:                   'Catch-Up Urgency',
  suggestedActivity:          '5km steady-pace run',
  recommendedDurationMinutes: 45,
  intensityLevel:             'Moderate',
  personalizedAdvice:         'You are 2 hours behind your weekly target. A 45-minute run today will get you back on track.',
};

// ─────────────────────────────────────────────────────────────────
describe('aiController — getWorkoutRecommendation (Unit)', () => {

  beforeEach(() => jest.clearAllMocks());

  // ── 1. Validation ─────────────────────────────────────────────
  test('returns 400 when currentWeeklyHours is undefined', async () => {
    const req = { body: { targetedGoalHours: 3.5, preferredActivityType: 'Cardio' } };
    const res = mockRes();
    await getWorkoutRecommendation(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Missing parameters: currentWeeklyHours and targetedGoalHours are required.',
      })
    );
  });

  test('returns 400 when targetedGoalHours is missing', async () => {
    const req = { body: { currentWeeklyHours: 1, preferredActivityType: 'Cardio' } };
    const res = mockRes();
    await getWorkoutRecommendation(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 when targetedGoalHours is 0 (falsy)', async () => {
    const req = { body: { currentWeeklyHours: 1, targetedGoalHours: 0 } };
    const res = mockRes();
    await getWorkoutRecommendation(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  // ── 2. Successful AI response ─────────────────────────────────
  test('returns 200 with all required recommendation fields', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(validAIResponse),
    });

    const req = { body: { currentWeeklyHours: 1.5, targetedGoalHours: 3.5, preferredActivityType: 'Cardio' } };
    const res = mockRes();
    await getWorkoutRecommendation(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.recommendation).toHaveProperty('strategy');
    expect(body.recommendation).toHaveProperty('suggestedActivity');
    expect(body.recommendation).toHaveProperty('recommendedDurationMinutes');
    expect(body.recommendation).toHaveProperty('intensityLevel');
    expect(body.recommendation).toHaveProperty('personalizedAdvice');
  });

  test('recommendation data matches the parsed Gemini response', async () => {
    mockGenerateContent.mockResolvedValue({ text: JSON.stringify(validAIResponse) });

    const req = { body: { currentWeeklyHours: 1.5, targetedGoalHours: 3.5, preferredActivityType: 'Cardio' } };
    const res = mockRes();
    await getWorkoutRecommendation(req, res);

    const body = res.json.mock.calls[0][0];
    expect(body.recommendation.strategy).toBe('Catch-Up Urgency');
    expect(body.recommendation.intensityLevel).toBe('Moderate');
    expect(body.recommendation.recommendedDurationMinutes).toBe(45);
  });

  // ── 3. Gemini call parameters ─────────────────────────────────
  test('calls Gemini with gemini-2.5-flash model', async () => {
    mockGenerateContent.mockResolvedValue({ text: JSON.stringify(validAIResponse) });

    const req = { body: { currentWeeklyHours: 1, targetedGoalHours: 3.5, preferredActivityType: 'Cardio' } };
    const res = mockRes();
    await getWorkoutRecommendation(req, res);

    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gemini-2.5-flash' })
    );
  });

  test('calls Gemini with JSON response type constraint', async () => {
    mockGenerateContent.mockResolvedValue({ text: JSON.stringify(validAIResponse) });

    const req = { body: { currentWeeklyHours: 1, targetedGoalHours: 3.5, preferredActivityType: 'Yoga' } };
    const res = mockRes();
    await getWorkoutRecommendation(req, res);

    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({ responseMimeType: 'application/json' }),
      })
    );
  });

  // ── 4. Error handling ─────────────────────────────────────────
  test('returns 500 when Gemini API call fails', async () => {
    mockGenerateContent.mockRejectedValue(new Error('API quota exceeded'));

    const req = { body: { currentWeeklyHours: 1, targetedGoalHours: 3.5, preferredActivityType: 'Cardio' } };
    const res = mockRes();
    await getWorkoutRecommendation(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('AI Engine processing fault'),
      })
    );
  });

  test('returns 500 when Gemini returns invalid JSON', async () => {
    mockGenerateContent.mockResolvedValue({ text: 'not valid json }{' });

    const req = { body: { currentWeeklyHours: 1, targetedGoalHours: 3.5, preferredActivityType: 'Cardio' } };
    const res = mockRes();
    await getWorkoutRecommendation(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});