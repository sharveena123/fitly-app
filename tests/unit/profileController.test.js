jest.mock('../../models/User');
const User = require('../../models/User');

const { getUserProfile, updateUserProfile } = require('../../controllers/profileController');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
}

describe('profileController — getUserProfile (Unit)', () => {

  beforeEach(() => jest.clearAllMocks());

  test('returns 404 when user is not found', async () => {
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const req = { params: { email: 'nobody@test.com' } };
    const res = mockRes();
    await getUserProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'User not found.' })
    );
  });

  test('returns 200 with profile when user is found', async () => {
    const fakeUser = { name: 'Alice', email: 'alice@test.com', age: 25 };
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(fakeUser) });
    const req = { params: { email: 'alice@test.com' } };
    const res = mockRes();
    await getUserProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, profile: fakeUser })
    );
  });

  test('performs case-insensitive email lookup', async () => {
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue({ name: 'Alice' }) });
    const req = { params: { email: 'ALICE@TEST.COM' } };
    const res = mockRes();
    await getUserProfile(req, res);
    expect(User.findOne).toHaveBeenCalledWith({ email: 'alice@test.com' });
  });

  test('returns 500 on unexpected DB error', async () => {
    User.findOne.mockReturnValue({ select: jest.fn().mockRejectedValue(new Error('DB crash')) });
    const req = { params: { email: 'alice@test.com' } };
    const res = mockRes();
    await getUserProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('profileController — updateUserProfile (Unit)', () => {

  beforeEach(() => jest.clearAllMocks());

  // Validation 
  test('returns 400 when email is missing from body', async () => {
    const req = { body: { name: 'Alice', weight: 70, height: 175 } };
    const res = mockRes();
    await updateUserProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Email is required.' })
    );
  });

  test('returns 404 when user not found in DB', async () => {
    User.findOneAndUpdate.mockResolvedValue(null);
    const req = { body: { email: 'nobody@test.com', weight: 70, height: 175 } };
    const res = mockRes();
    await updateUserProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  // BMI calculation 
  test('BMI calculated correctly: weight=70, height=175 → 22.9 (Normal Weight)', async () => {
    User.findOneAndUpdate.mockResolvedValue({ name: 'Alice' });

    const req = { body: { email: 'alice@test.com', weight: 70, height: 175 } };
    const res = mockRes();
    await updateUserProfile(req, res);

    const updatePayload = User.findOneAndUpdate.mock.calls[0][1];
    expect(updatePayload.bmi).toBe('22.9');
    expect(updatePayload.bmiLabel).toBe('Normal Weight');
  });

  test('BMI < 18.5 labelled Underweight: weight=45, height=170 → 15.6', async () => {
    User.findOneAndUpdate.mockResolvedValue({ name: 'Alice' });
    const req = { body: { email: 'alice@test.com', weight: 45, height: 170 } };
    const res = mockRes();
    await updateUserProfile(req, res);
    const payload = User.findOneAndUpdate.mock.calls[0][1];
    expect(payload.bmiLabel).toBe('Underweight');
  });

  test('BMI 25-29.9 labelled Overweight: weight=90, height=175', async () => {
    User.findOneAndUpdate.mockResolvedValue({ name: 'Alice' });
    const req = { body: { email: 'alice@test.com', weight: 90, height: 175 } };
    const res = mockRes();
    await updateUserProfile(req, res);
    const payload = User.findOneAndUpdate.mock.calls[0][1];
    expect(payload.bmiLabel).toBe('Overweight');
  });

  test('BMI >= 30 labelled Obese: weight=120, height=170', async () => {
    User.findOneAndUpdate.mockResolvedValue({ name: 'Alice' });
    const req = { body: { email: 'alice@test.com', weight: 120, height: 170 } };
    const res = mockRes();
    await updateUserProfile(req, res);
    const payload = User.findOneAndUpdate.mock.calls[0][1];
    expect(payload.bmiLabel).toBe('Obese');
  });

  test('bmi is null when weight is 0', async () => {
    User.findOneAndUpdate.mockResolvedValue({ name: 'Alice' });
    const req = { body: { email: 'alice@test.com', weight: 0, height: 175 } };
    const res = mockRes();
    await updateUserProfile(req, res);
    const payload = User.findOneAndUpdate.mock.calls[0][1];
    expect(payload.bmi).toBeNull();
    expect(payload.bmiLabel).toBe('-');
  });

  test('bmi is null when height is 0', async () => {
    User.findOneAndUpdate.mockResolvedValue({ name: 'Alice' });
    const req = { body: { email: 'alice@test.com', weight: 70, height: 0 } };
    const res = mockRes();
    await updateUserProfile(req, res);
    const payload = User.findOneAndUpdate.mock.calls[0][1];
    expect(payload.bmi).toBeNull();
  });

  // Successful profile update 
  test('returns 200 with updated user on success', async () => {
    const updated = { name: 'Alice', email: 'alice@test.com', bmi: '22.9' };
    User.findOneAndUpdate.mockResolvedValue(updated);
    const req = { body: { email: 'alice@test.com', name: 'Alice', weight: 70, height: 175 } };
    const res = mockRes();
    await updateUserProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: 'Profile updated successfully!' })
    );
  });

  // Default values 
  test('activity defaults to "moderate" when not provided', async () => {
    User.findOneAndUpdate.mockResolvedValue({ name: 'Alice' });
    const req = { body: { email: 'alice@test.com', weight: 70, height: 175 } };
    const res = mockRes();
    await updateUserProfile(req, res);
    const payload = User.findOneAndUpdate.mock.calls[0][1];
    expect(payload.activity).toBe('moderate');
  });

  test('goal defaults to "Not specified" when not provided', async () => {
    User.findOneAndUpdate.mockResolvedValue({ name: 'Alice' });
    const req = { body: { email: 'alice@test.com', weight: 70, height: 175 } };
    const res = mockRes();
    await updateUserProfile(req, res);
    const payload = User.findOneAndUpdate.mock.calls[0][1];
    expect(payload.goal).toBe('Not specified');
  });
});