const mockGenerateContent = jest.fn();

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: mockGenerateContent,
    },
  })),
}));

const { getWorkoutRecommendation } = require('../../controllers/aiController');

// Helper function
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

// Gemini response payload 
const fakeRecommendation = {
  strategy:                   'Streak Maintenance',
  suggestedActivity:          '45-minute moderate-paced jog',
  recommendedDurationMinutes: 45,
  intensityLevel:             'Moderate',
  personalizedAdvice:         'You are right on track this week. Keep a consistent pace to hit your goal.',
};

const validGeminiResponse = () => ({
  text: JSON.stringify(fakeRecommendation),
});

beforeEach(() => {
  jest.clearAllMocks();
});

// AI input validation
describe('AI — Input Validation', () => {
  it('returns 400 when both currentWeeklyHours and targetedGoalHours are missing', async () => {
    const res = mockRes();
    await getWorkoutRecommendation({ body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].success).toBe(false);
    expect(res.json.mock.calls[0][0].message).toMatch(/missing parameters/i);
  });

  it('returns 400 when only targetedGoalHours is missing', async () => {
    const res = mockRes();
    await getWorkoutRecommendation({ body: { currentWeeklyHours: 3 } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when only currentWeeklyHours is missing (undefined)', async () => {
    const res = mockRes();
    await getWorkoutRecommendation({ body: { targetedGoalHours: 5 } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('currentWeeklyHours = 0 is valid (user has not exercised yet this week)', async () => {
    
    mockGenerateContent.mockResolvedValue(validGeminiResponse());
    const res = mockRes();
    await getWorkoutRecommendation({
      body: { currentWeeklyHours: 0, targetedGoalHours: 5, preferredActivityType: 'Cardio' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('does NOT call the Gemini API when validation fails', async () => {
    const res = mockRes();
    await getWorkoutRecommendation({ body: {} }, res);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });
});

//AI - Successful recommendation
describe('AI — Successful Recommendation', () => {
  const validBody = {
    currentWeeklyHours:   2,
    targetedGoalHours:    5,
    preferredActivityType: 'Strength Training',
  };

  beforeEach(() => {
    mockGenerateContent.mockResolvedValue(validGeminiResponse());
  });

  it('returns 200 with success: true', async () => {
    const res = mockRes();
    await getWorkoutRecommendation({ body: validBody }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].success).toBe(true);
  });

  it('response contains a recommendation object', async () => {
    const res = mockRes();
    await getWorkoutRecommendation({ body: validBody }, res);
    const { recommendation } = res.json.mock.calls[0][0];
    expect(recommendation).toBeDefined();
    expect(typeof recommendation).toBe('object');
  });

  it('recommendation has all 5 required keys', async () => {
    const res = mockRes();
    await getWorkoutRecommendation({ body: validBody }, res);
    const { recommendation } = res.json.mock.calls[0][0];
    expect(recommendation).toHaveProperty('strategy');
    expect(recommendation).toHaveProperty('suggestedActivity');
    expect(recommendation).toHaveProperty('recommendedDurationMinutes');
    expect(recommendation).toHaveProperty('intensityLevel');
    expect(recommendation).toHaveProperty('personalizedAdvice');
  });

  it('intensityLevel is one of Low / Moderate / High', async () => {
    const res = mockRes();
    await getWorkoutRecommendation({ body: validBody }, res);
    const { intensityLevel } = res.json.mock.calls[0][0].recommendation;
    expect(['Low', 'Moderate', 'High']).toContain(intensityLevel);
  });

  it('recommendedDurationMinutes is a positive number', async () => {
    const res = mockRes();
    await getWorkoutRecommendation({ body: validBody }, res);
    const { recommendedDurationMinutes } = res.json.mock.calls[0][0].recommendation;
    expect(typeof recommendedDurationMinutes).toBe('number');
    expect(recommendedDurationMinutes).toBeGreaterThan(0);
  });

  it('strategy is a non-empty string', async () => {
    const res = mockRes();
    await getWorkoutRecommendation({ body: validBody }, res);
    const { strategy } = res.json.mock.calls[0][0].recommendation;
    expect(typeof strategy).toBe('string');
    expect(strategy.trim().length).toBeGreaterThan(0);
  });

  it('personalizedAdvice is a non-empty string', async () => {
    const res = mockRes();
    await getWorkoutRecommendation({ body: validBody }, res);
    const { personalizedAdvice } = res.json.mock.calls[0][0].recommendation;
    expect(typeof personalizedAdvice).toBe('string');
    expect(personalizedAdvice.trim().length).toBeGreaterThan(0);
  });

  it('forwards preferredActivityType into the Gemini call', async () => {
    const res = mockRes();
    await getWorkoutRecommendation({ body: validBody }, res);
    const calledWith = mockGenerateContent.mock.calls[0][0];
    // The prompt is passed as the `contents` field
    expect(calledWith.contents).toContain('Strength Training');
  });

  it('calls Gemini with the gemini-2.5-flash model', async () => {
    const res = mockRes();
    await getWorkoutRecommendation({ body: validBody }, res);
    const calledWith = mockGenerateContent.mock.calls[0][0];
    expect(calledWith.model).toBe('gemini-2.5-flash');
  });

  it('requests JSON mime type from Gemini to enforce structured output', async () => {
    const res = mockRes();
    await getWorkoutRecommendation({ body: validBody }, res);
    const calledWith = mockGenerateContent.mock.calls[0][0];
    expect(calledWith.config.responseMimeType).toBe('application/json');
  });
});

//AI insights update after a new workout
describe('AI — Insight card updates after a new workout is logged', () => {
  it('calling getWorkoutRecommendation again returns a fresh recommendation', async () => {
    
    // First call — user has 2 hours logged
    const firstRec = {
      ...fakeRecommendation,
      strategy: 'Catch-Up Urgency',
      recommendedDurationMinutes: 60,
    };
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(firstRec) });

    const res1 = mockRes();
    await getWorkoutRecommendation({
      body: { currentWeeklyHours: 2, targetedGoalHours: 5, preferredActivityType: 'Cardio' },
    }, res1);

    // Second call — user just logged another session, now at 4 hours
    const secondRec = {
      ...fakeRecommendation,
      strategy: 'Streak Maintenance',
      recommendedDurationMinutes: 30,
    };
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(secondRec) });

    const res2 = mockRes();
    await getWorkoutRecommendation({
      body: { currentWeeklyHours: 4, targetedGoalHours: 5, preferredActivityType: 'Cardio' },
    }, res2);

    const rec1 = res1.json.mock.calls[0][0].recommendation;
    const rec2 = res2.json.mock.calls[0][0].recommendation;

    // The card content must update to respective hours
    expect(rec2.strategy).not.toBe(rec1.strategy);
    expect(rec2.recommendedDurationMinutes).toBeLessThan(rec1.recommendedDurationMinutes);
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it('Gemini is called with updated currentWeeklyHours on each trigger', async () => {
    mockGenerateContent.mockResolvedValue(validGeminiResponse());

    await getWorkoutRecommendation({
      body: { currentWeeklyHours: 1, targetedGoalHours: 5, preferredActivityType: 'Yoga' },
    }, mockRes());

    await getWorkoutRecommendation({
      body: { currentWeeklyHours: 3, targetedGoalHours: 5, preferredActivityType: 'Yoga' },
    }, mockRes());

    const firstCall  = mockGenerateContent.mock.calls[0][0].contents;
    const secondCall = mockGenerateContent.mock.calls[1][0].contents;

    expect(firstCall).toContain('1');   // first prompt contains 1 hour
    expect(secondCall).toContain('3');  // second prompt contains 3 hours
  });
});

//AI - Error handling
describe('AI — Error Handling', () => {
  const validBody = {
    currentWeeklyHours:   3,
    targetedGoalHours:    5,
    preferredActivityType: 'Cardio',
  };

  it('returns 500 when the Gemini API call throws', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Gemini API unreachable'));
    const res = mockRes();
    await getWorkoutRecommendation({ body: validBody }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.calls[0][0].success).toBe(false);
    expect(res.json.mock.calls[0][0].message).toMatch(/Gemini API unreachable/i);
  });

  it('returns 500 when the model returns malformed (non-JSON) text', async () => {
    mockGenerateContent.mockResolvedValue({ text: 'Sorry, I cannot help with that.' });
    const res = mockRes();
    await getWorkoutRecommendation({ body: validBody }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.calls[0][0].success).toBe(false);
  });

  it('returns 500 when the model returns an empty string', async () => {
    mockGenerateContent.mockResolvedValue({ text: '' });
    const res = mockRes();
    await getWorkoutRecommendation({ body: validBody }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('error response includes the error message for debugging', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Rate limit exceeded'));
    const res = mockRes();
    await getWorkoutRecommendation({ body: validBody }, res);
    expect(res.json.mock.calls[0][0].message).toMatch(/Rate limit exceeded/i);
  });

  it('process does not crash — error is caught and a clean JSON response is returned', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Network timeout'));
    const res = mockRes();
    
    // If the controller crashes instead of catching, this test will throw
    await expect(
      getWorkoutRecommendation({ body: validBody }, res)
    ).resolves.not.toThrow();
    expect(res.json).toHaveBeenCalled();
  });
});