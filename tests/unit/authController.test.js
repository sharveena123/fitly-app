/**
 * tests/unit/authController.test.js
 *
 * Unit tests for registerUser and loginUser.
 * All Mongoose calls are mocked — no real DB needed.
 *
 * Run: npx jest tests/unit/authController.test.js
 */

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');

// ── Mock Mongoose User model before requiring the controller ──────
jest.mock('../../models/User');
const User = require('../../models/User');

const { registerUser, loginUser } = require('../../controllers/authController');

// ── Helper: build a mock res object ──────────────────────────────
function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
}

// ─────────────────────────────────────────────────────────────────
describe('authController — registerUser (Unit)', () => {

  beforeEach(() => jest.clearAllMocks());

  // ── 1. Missing required fields ────────────────────────────────
  test('returns 400 when name is missing', async () => {
    const req = { body: { email: 'a@b.com', password: 'pass123' } };
    const res = mockRes();

    await registerUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Please fill in all required fields.' })
    );
  });

  test('returns 400 when email is missing', async () => {
    const req = { body: { name: 'Alice', password: 'pass123' } };
    const res = mockRes();

    await registerUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });

  test('returns 400 when password is missing', async () => {
    const req = { body: { name: 'Alice', email: 'alice@test.com' } };
    const res = mockRes();

    await registerUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  // ── 2. Duplicate email ────────────────────────────────────────
  test('returns 400 when email already exists', async () => {
    User.findOne.mockResolvedValue({ email: 'existing@test.com' }); // simulate existing user

    const req = { body: { name: 'Alice', email: 'existing@test.com', password: 'pass123' } };
    const res = mockRes();

    await registerUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'An account with this email already exists.' })
    );
  });

  // ── 3. Successful registration ────────────────────────────────
  test('returns 201 and success message on valid input', async () => {
    User.findOne.mockResolvedValue(null);   // no duplicate
    User.create.mockResolvedValue({});      // pretend creation succeeded

    const req = {
      body: { name: 'Alice', email: 'alice@test.com', password: 'pass123', age: 25, weight: 60, height: 165 }
    };
    const res = mockRes();

    await registerUser(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: 'User registered successfully! You can now log in.' })
    );
  });

  // ── 4. Email stored lowercase ─────────────────────────────────
  test('stores email in lowercase', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({});

    const req = {
      body: { name: 'Alice', email: 'ALICE@TEST.COM', password: 'pass123' }
    };
    const res = mockRes();

    await registerUser(req, res);

    // The first argument to User.create should have a lowercase email
    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'alice@test.com' })
    );
  });

  // ── 5. Password is hashed ─────────────────────────────────────
  test('stores a bcrypt hash, not the raw password', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({});

    const rawPassword = 'mySecret!';
    const req = {
      body: { name: 'Alice', email: 'alice@test.com', password: rawPassword }
    };
    const res = mockRes();

    await registerUser(req, res);

    const createdWith = User.create.mock.calls[0][0];
    expect(createdWith.password).not.toBe(rawPassword);
    const isHashed = await bcrypt.compare(rawPassword, createdWith.password);
    expect(isHashed).toBe(true);
  });

  // ── 6. Default values for optional fields ─────────────────────
  test('defaults goal to "Not specified" when omitted', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({});

    const req = { body: { name: 'Alice', email: 'alice@test.com', password: 'pass' } };
    const res = mockRes();

    await registerUser(req, res);

    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({ goal: 'Not specified' })
    );
  });

  // ── 7. DB error returns 500 ───────────────────────────────────
  test('returns 500 when User.create throws', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockRejectedValue(new Error('DB connection failed'));

    const req = { body: { name: 'Alice', email: 'alice@test.com', password: 'pass' } };
    const res = mockRes();

    await registerUser(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: expect.stringContaining('Registration error') })
    );
  });
});


// ─────────────────────────────────────────────────────────────────
describe('authController — loginUser (Unit)', () => {

  beforeEach(() => jest.clearAllMocks());

  // ── 1. Missing fields ─────────────────────────────────────────
  test('returns 400 when email is missing', async () => {
    const req = { body: { password: 'pass123' } };
    const res = mockRes();

    await loginUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Please provide both email and password.' })
    );
  });

  test('returns 400 when password is missing', async () => {
    const req = { body: { email: 'alice@test.com' } };
    const res = mockRes();

    await loginUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  // ── 2. Unknown email ──────────────────────────────────────────
  test('returns 401 when email not found in DB', async () => {
    User.findOne.mockResolvedValue(null);

    const req = { body: { email: 'nobody@test.com', password: 'pass' } };
    const res = mockRes();

    await loginUser(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid email or password.' })
    );
  });

  // ── 3. Wrong password ─────────────────────────────────────────
  test('returns 401 when password does not match', async () => {
    const hashed = await bcrypt.hash('correctPassword', 10);
    User.findOne.mockResolvedValue({ email: 'alice@test.com', password: hashed });

    const req = { body: { email: 'alice@test.com', password: 'wrongPassword' } };
    const res = mockRes();

    await loginUser(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid email or password.' })
    );
  });

  // ── 4. Successful login ───────────────────────────────────────
  test('returns 200 with JWT token on valid credentials', async () => {
    const hashed = await bcrypt.hash('password123', 10);
    User.findOne.mockResolvedValue({
      _id: 'user123', name: 'Alice', email: 'alice@test.com',
      password: hashed, age: 25, weight: 60, height: 165, goal: 'Lose weight',
    });

    const req = { body: { email: 'alice@test.com', password: 'password123' } };
    const res = mockRes();

    await loginUser(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.token).toBeDefined();
    expect(typeof body.token).toBe('string');
  });

  // ── 5. Returned user has no password field ────────────────────
  test('login response does not expose the password', async () => {
    const hashed = await bcrypt.hash('password123', 10);
    User.findOne.mockResolvedValue({
      _id: 'user123', name: 'Alice', email: 'alice@test.com',
      password: hashed, age: 25, weight: 60, height: 165, goal: 'Stay healthy',
    });

    const req = { body: { email: 'alice@test.com', password: 'password123' } };
    const res = mockRes();

    await loginUser(req, res);

    const body = res.json.mock.calls[0][0];
    expect(body.user).not.toHaveProperty('password');
  });

  // ── 6. JWT payload contains id and email ─────────────────────
  test('JWT token encodes user id and email', async () => {
    const hashed = await bcrypt.hash('password123', 10);
    User.findOne.mockResolvedValue({
      _id: 'user_abc', name: 'Alice', email: 'alice@test.com',
      password: hashed, age: 25, weight: 60, height: 165, goal: 'Stay healthy',
    });

    const req = { body: { email: 'alice@test.com', password: 'password123' } };
    const res = mockRes();

    await loginUser(req, res);

    const body  = res.json.mock.calls[0][0];
    const decoded = jwt.verify(body.token, process.env.JWT_SECRET || 'SuperSecretKey123');
    expect(decoded.email).toBe('alice@test.com');
    expect(decoded.id).toBe('user_abc');
  });

  // ── 7. DB error returns 500 ───────────────────────────────────
  test('returns 500 on unexpected DB error', async () => {
    User.findOne.mockRejectedValue(new Error('Timeout'));

    const req = { body: { email: 'alice@test.com', password: 'pass' } };
    const res = mockRes();

    await loginUser(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});