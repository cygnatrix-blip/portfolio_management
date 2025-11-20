const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * @desc    Helper function to generate a new JWT
 */
const generateToken = (user) => {
  // Create a payload with only the necessary, non-sensitive user info
  const userPayload = { ...user };
  delete userPayload.password; // Never include password in token

  return jwt.sign(
    { user: userPayload }, // <-- The new payload
    process.env.JWT_SECRET, 
    { expiresIn: '30d' } // Longer expiry for production
  );
};

/**
 * @desc    Authenticate user (Admin or Investor) & get token
 * @route   POST /api/auth/login
 */
const loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        // 1. Find user by email
        const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (rows.length === 0) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }
        const user = rows[0];

        // 2. Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // 3. Generate the token
        const token = generateToken(user);

        // 4. Send response
        delete user.password;
        res.json({ token, user });

    } catch (err) {
        console.error('Server Error in loginUser:', err.message);
        res.status(500).send('Server Error');
    }
};

/**
 * @desc    Register a new investor (e.g., public sign-up)
 * @route   POST /api/auth/register
 */
const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const userExists = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ msg: 'User with that email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user with default 'investor' role
    const sql = 'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role';
    const { rows } = await db.query(sql, [name, email, hashedPassword, 'investor']);
    
    const user = rows[0];

    // Log them in immediately by issuing a token
    const token = generateToken(user);
    
    res.status(201).json({ token, user });

  } catch (err) {
    console.error('DB Error in registerUser:', err.message);
    res.status(500).send('Server Error');
  }
};


module.exports = {
  registerUser,
  loginUser,
};