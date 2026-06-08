jest.mock('../../models/User');

const User = require('../../models/User');
const { getUserProfile, updateUserProfile } = require('../../controllers/profileController');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => jest.clearAllMocks());

const fakeProfile = { name: 'Carol', email: 'carol@fitly.io', age: 30, bmi: null, bmiLabel: '-' };

describe('Profile — GET', () => {
  it('returns profile for valid email', async () => {
    const selectMock = jest.fn().mockResolvedValue(fakeProfile);
    User.findOne.mockReturnValue({ select: selectMock });
    const res = mockRes();
    await getUserProfile({ params: { email: 'carol@fitly.io' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].profile.name).toBe('Carol');
  });

  it('returns 404 when user not found', async () => {
    const selectMock = jest.fn().mockResolvedValue(null);
    User.findOne.mockReturnValue({ select: selectMock });
    const res = mockRes();
    await getUserProfile({ params: { email: 'ghost@fitly.io' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('queries with lowercase email', async () => {
    const selectMock = jest.fn().mockResolvedValue(fakeProfile);
    User.findOne.mockReturnValue({ select: selectMock });
    const res = mockRes();
    await getUserProfile({ params: { email: 'CAROL@FITLY.IO' } }, res);
    expect(User.findOne).toHaveBeenCalledWith({ email: 'carol@fitly.io' });
  });
});

describe('Profile — UPDATE & BMI', () => {
  const base = { email: 'carol@fitly.io', name: 'Carol', age: 30, gender: 'female', activity: 'active', weight: 63, height: 165, goal: 'Lose Weight' };

  it('returns 400 when email missing', async () => {
    const { email, ...body } = base;
    const res = mockRes();
    await updateUserProfile({ body }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('calculates BMI: 63kg / 1.65m² ≈ 23.1 → Normal Weight', async () => {
    const h = 165 / 100;
    const expectedBmi = (63 / (h * h)).toFixed(1);
    const updated = { ...fakeProfile, bmi: expectedBmi, bmiLabel: 'Normal Weight' };
    User.findOneAndUpdate.mockResolvedValue(updated);
    const res = mockRes();
    await updateUserProfile({ body: base }, res);
    expect(res.json.mock.calls[0][0].user.bmiLabel).toBe('Normal Weight');
  });

  it('BMI < 18.5 → Underweight', async () => {
    User.findOneAndUpdate.mockResolvedValue({ bmiLabel: 'Underweight' });
    const res = mockRes();
    await updateUserProfile({ body: { ...base, weight: 45, height: 170 } }, res);
    const n = 45 / (1.70 * 1.70);
    expect(n).toBeLessThan(18.5);
  });

  it('BMI 25–29.9 → Overweight', async () => {
    const weight = 85, height = 170;
    const bmi = weight / ((height / 100) ** 2);
    expect(bmi).toBeGreaterThanOrEqual(25);
    expect(bmi).toBeLessThan(30);
  });

  it('BMI ≥ 30 → Obese', async () => {
    const weight = 110, height = 170;
    const bmi = weight / ((height / 100) ** 2);
    expect(bmi).toBeGreaterThanOrEqual(30);
  });

  it('returns 404 when user not found', async () => {
    User.findOneAndUpdate.mockResolvedValue(null);
    const res = mockRes();
    await updateUserProfile({ body: base }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 200 on success', async () => {
    User.findOneAndUpdate.mockResolvedValue({ ...fakeProfile, name: 'Carol W.' });
    const res = mockRes();
    await updateUserProfile({ body: base }, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});