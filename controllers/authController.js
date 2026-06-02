const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Plaintext credentials for testing: test@fitly.com / password123
const MOCK_HASHED_PASSWORD = "$2a$10$7sKk8A8G78h2m8L.8n/Ue.bXm9gA176v6QpMhZtZ36w4B6gG7Kx6S";

// temp database
exports.usersCollection = [
  {
    id: 123456789,
    name: "Test",
    email: "test@fitly.com",
    password: MOCK_HASHED_PASSWORD, 
    age: 21,
    weight: 55.5,
    height: 162,
    goal: "Stay healthy",
    gender: "Female",
    activity: "moderate",
    createdAt: new Date("2026-01-01")
  }
];

// register logic
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, age, weight, height, goal } = req.body;

    // structural field verification guardrails
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Please fill in all required fields." });
    }

    // identify duplicate registration constraints
    const userExists = exports.usersCollection.find(u => u.email === email.toLowerCase());
    if (userExists) {
      return res.status(400).json({ success: false, message: "An account with this email already exists." });
    }

    // encrypt plain-text string password inputs
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // construct user profile record metadata block
    const newUser = {
      id: Date.now(),
      name,
      email: email.toLowerCase(),
      password: hashedPassword, // save only the secure salted hash
      age: parseInt(age) || 0,
      weight: parseFloat(weight) || 0,
      height: parseFloat(height) || 0,
      goal: goal || "Not specified",
      gender: "",
      activity: "moderate",
      createdAt: new Date()
    };

    // push into temporary server data registry block
    exports.usersCollection.push(newUser);

    return res.status(201).json({
      success: true,
      message: "User registered successfully! You can now log in."
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: "Registration engine fault: " + error.message });
  }
};

// login logic 
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Please provide both email and password." });
    }

    // search the temporary database array for the email match
    const user = exports.usersCollection.find(u => u.email === email.toLowerCase());
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password credentials." });
    }

    // cryptographic decryption verification check
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password credentials." });
    }

    // generate signed JSON Web Token string
    const secretKey = process.env.JWT_SECRET || 'SuperSecretKey123';
    const token = jwt.sign(
      { id: user.id, email: user.email }, 
      secretKey, 
      { expiresIn: '24h' }
    );

    // send valid user dataset package back down to frontend views
    return res.status(200).json({
      success: true,
      message: "Login successful!",
      token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        age: user.age,
        weight: user.weight,
        height: user.height,
        goal: user.goal
      }
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: "Login engine fault: " + error.message });
  }
};