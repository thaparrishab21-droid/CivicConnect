const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// --- 1. USER REGISTRATION (POST /register) ---
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // A. Validation: Make sure all fields are sent
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please fill in all fields (name, email, password).' });
    }

    // B. Check if user already exists in the database
    // We run a SELECT query to see if this email is already registered
    const [existingUser] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'User already exists with this email.' });
    }

    // C. Hash the Password: Secure it before saving to the database
    // "Salt" is random data added to make the hashing stronger. 10 is the number of hash rounds.
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // D. Save the new user to the database
    // The role defaults to 'citizen' unless specified otherwise (e.g. 'admin')
    const userRole = role || 'citizen';
    await db.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, userRole]
    );

    res.status(201).json({ message: 'User registered successfully!' });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
};

// --- 2. USER LOGIN (POST /login) ---
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // A. Validation: Make sure credentials are sent
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password.' });
    }

    // B. Find the user in the database
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials.' }); // We don't say "Email not found" for security reasons
    }

    const user = users[0];

    // C. Compare passwords using bcrypt
    // bcrypt hashes the input password and compares it to the hashed password in the DB
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // D. Generate JSON Web Token (JWT)
    // We put user id and role inside the token so the server can identify them later.
    // The token expires in 24 hours.
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // E. Return success response with user details and token
    res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
};
