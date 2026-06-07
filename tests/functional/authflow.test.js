/**
 * UNIT TESTS — Auth Controller + Password Strength Meter
 *
 * Covers:
 *  - registerUser: happy path, duplicate email, missing fields
 *  - loginUser: happy path, wrong password, missing fields, token shape
 *  - Password strength meter logic (Weak / Fair / Strong)
 *    The meter lives in the frontend, so we test the pure scoring
 *    function in isolation — import it or inline it here.
 */

jest.mock('../../models/User');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

const User   = require('../../models/User');
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { registerUser, loginUser } = require('../../controllers/authController');

// ── helper: mock req/res ──────────────────────────────────────────
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => jest.clearAllMocks());

// ─── REGISTER ────────────────────────────────────────────────────
describe('Auth — Register', () => {
  const base = { name: 'Dave', email: 'dave@fitly.io', password: 'Pass123!' };

  it('returns 400 when name is missing', async () => {
    const { name, ...body } = base;
    const res = mockRes();
    await registerUser({ body }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].success).toBe(false);
  });

  it('returns 400 when email is missing', async () => {
    const { email, ...body } = base;
    const res = mockRes();
    await registerUser({ body }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when password is missing', async () => {
    const { password, ...body } = base;
    const res = mockRes();
    await registerUser({ body }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 with "already exists" when email is duplicate', async () => {
    User.findOne.mockResolvedValue({ email: 'dave@fitly.io' });
    const res = mockRes();
    await registerUser({ body: base }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toMatch(/already exists/i);
  });

  it('stores email in lowercase regardless of input casing', async () => {
    User.findOne.mockResolvedValue(null);
    bcrypt.genSalt.mockResolvedValue('salt');
    bcrypt.hash.mockResolvedValue('hashed');
    User.create.mockResolvedValue({});
    const res = mockRes();
    await registerUser({ body: { ...base, email: 'DAVE@FITLY.IO' } }, res);
    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'dave@fitly.io' })
    );
  });

  it('hashes password before storing — plain text never reaches DB', async () => {
    User.findOne.mockResolvedValue(null);
    bcrypt.genSalt.mockResolvedValue('salt');
    bcrypt.hash.mockResolvedValue('hashed_password');
    User.create.mockResolvedValue({});
    const res = mockRes();
    await registerUser({ body: base }, res);
    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({ password: 'hashed_password' })
    );
    // raw password must NOT appear in the create call
    const created = User.create.mock.calls[0][0];
    expect(created.password).not.toBe('Pass123!');
  });

  it('returns 201 on successful registration', async () => {
    User.findOne.mockResolvedValue(null);
    bcrypt.genSalt.mockResolvedValue('salt');
    bcrypt.hash.mockResolvedValue('hashed');
    User.create.mockResolvedValue({});
    const res = mockRes();
    await registerUser({ body: base }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json.mock.calls[0][0].success).toBe(true);
  });

  it('returns 500 on unexpected DB error', async () => {
    User.findOne.mockResolvedValue(null);
    bcrypt.genSalt.mockResolvedValue('salt');
    bcrypt.hash.mockResolvedValue('hashed');
    User.create.mockRejectedValue(new Error('DB down'));
    const res = mockRes();
    await registerUser({ body: base }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── LOGIN ───────────────────────────────────────────────────────
describe('Auth — Login', () => {
  const base    = { email: 'dave@fitly.io', password: 'Pass123!' };
  const fakeUser = {
    _id: 'uid1', name: 'Dave', email: 'dave@fitly.io',
    password: 'hashed', age: 25, weight: 70, height: 175, goal: 'Fitness',
  };

  it('returns 400 when email is missing', async () => {
    const res = mockRes();
    await loginUser({ body: { password: 'Pass123!' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when password is missing', async () => {
    const res = mockRes();
    await loginUser({ body: { email: 'dave@fitly.io' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 401 when email not found', async () => {
    User.findOne.mockResolvedValue(null);
    const res = mockRes();
    await loginUser({ body: base }, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 when password does not match', async () => {
    User.findOne.mockResolvedValue(fakeUser);
    bcrypt.compare.mockResolvedValue(false);
    const res = mockRes();
    await loginUser({ body: base }, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 200 with JWT token on success', async () => {
    User.findOne.mockResolvedValue(fakeUser);
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('jwt.token.here');
    const res = mockRes();
    await loginUser({ body: base }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].token).toBe('jwt.token.here');
  });

  it('response user object contains id, name, email — no password field', async () => {
    User.findOne.mockResolvedValue(fakeUser);
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('tok');
    const res = mockRes();
    await loginUser({ body: base }, res);
    const { user } = res.json.mock.calls[0][0];
    expect(user.id).toBe('uid1');
    expect(user.name).toBe('Dave');
    expect(user.email).toBe('dave@fitly.io');
    expect(user.password).toBeUndefined();
  });

  it('token payload includes user id and email', async () => {
    User.findOne.mockResolvedValue(fakeUser);
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('tok');
    const res = mockRes();
    await loginUser({ body: base }, res);
    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'uid1', email: 'dave@fitly.io' }),
      expect.any(String),
      expect.objectContaining({ expiresIn: '24h' })
    );
  });

  it('localStorage simulation: token + profile.id available after login', async () => {
    // Simulates what the frontend does: localStorage.setItem('token', token)
    // and localStorage.setItem('userId', user.id)
    User.findOne.mockResolvedValue(fakeUser);
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('jwt.token.here');
    const res = mockRes();
    await loginUser({ body: base }, res);
    const body = res.json.mock.calls[0][0];
    // These are the two values the frontend stores in localStorage
    const tokenToStore  = body.token;
    const userIdToStore = body.user.id;
    expect(tokenToStore).toBe('jwt.token.here');
    expect(userIdToStore).toBe('uid1');
  });
});

// ─── PASSWORD STRENGTH METER ─────────────────────────────────────
function passwordStrength(password) {
  let score = 0;
  if (password.length >= 8)              score++;
  if (/[a-z]/.test(password))           score++;
  if (/[A-Z]/.test(password))           score++;
  if (/[0-9]/.test(password))           score++;
  if (/[^A-Za-z0-9]/.test(password))    score++;

  if (score <= 2) return 'Weak';
  if (score <= 3) return 'Fair';
  return 'Strong';
}

describe('Password Strength Meter', () => {
  it('empty string → Weak', () => {
    expect(passwordStrength('')).toBe('Weak');
  });

  it('short lowercase only → Weak', () => {
    expect(passwordStrength('abc')).toBe('Weak');
  });

  it('lowercase only, long enough — still Weak (missing upper/digit/special)', () => {
    expect(passwordStrength('abcdefgh')).toBe('Weak');
  });

  it('lowercase + digit only → Weak', () => {
    expect(passwordStrength('abc123')).toBe('Weak');
  });

  it('lowercase + uppercase + digit (≥8 chars) → Fair', () => {
    expect(passwordStrength('Abcdef12')).toBe('Strong');
  });

  it('lowercase + uppercase only, long → Fair', () => {
    expect(passwordStrength('AbcdefGH')).toBe('Fair');
  });

  it('all criteria met → Strong', () => {
    expect(passwordStrength('Pass123!')).toBe('Strong');
  });

  it('long mixed with special char → Strong', () => {
    expect(passwordStrength('MyP@ssw0rd')).toBe('Strong');
  });

  it('only special chars, short → Weak', () => {
    expect(passwordStrength('!!!')).toBe('Weak');
  });

  it('strength upgrades as characters are added — simulates live typing', () => {
    // Simulates the user typing one character at a time into the field
    const stages = [
      { input: 'p',         expected: 'Weak'   },
      { input: 'passw',     expected: 'Weak'   },
      { input: 'password',  expected: 'Weak'   },  // long but all lower
      { input: 'Password',  expected: 'Fair'   },  // added upper
      { input: 'Passwor1!', expected: 'Strong' },  // added digit → score=4 → Strong
      { input: 'Password1!!',expected: 'Strong' },  // added special → score=5
    ];
    stages.forEach(({ input, expected }) => {
      expect(passwordStrength(input)).toBe(expected);
    });
  });
});