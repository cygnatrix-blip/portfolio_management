// server/controllers/adminController.js
const db = require('../config/db');
const bcrypt = require('bcryptjs');

/**
 * @desc    Get admin dashboard data (new stats, tables)
 * @route   GET /api/admin/dashboard
 */
const getAdminDashboard = async (req, res) => {
    try {
        // 1. Get user counts
        const totalUsersPromise = db.query("SELECT COUNT(*) FROM users");
        const adminCountPromise = db.query("SELECT COUNT(*) FROM users WHERE role = 'admin'");
        const investorCountPromise = db.query("SELECT COUNT(*) FROM users WHERE role = 'investor'");

        // 2. Get recent investors
        const recentInvestorsPromise = db.query(`
            SELECT u.id, u.name, u.email, u.created_at, COUNT(p.id) AS "portfolioCount"
            FROM users u
            LEFT JOIN portfolios p ON u.id = p.user_id
            WHERE u.role = 'investor'
            GROUP BY u.id
            ORDER BY u.created_at DESC
            LIMIT 5
        `);
        
        // 3. Get all admins
        const allAdminsPromise = db.query("SELECT id, name, email, role, created_at FROM users WHERE role = 'admin' ORDER BY name");

        // Wait for all queries
        const [
            totalUsersRes,
            adminCountRes,
            investorCountRes,
            recentInvestorsRes,
            allAdminsRes
        ] = await Promise.all([
            totalUsersPromise,
            adminCountPromise,
            investorCountPromise,
            recentInvestorsPromise,
            allAdminsPromise // <-- THIS IS THE FIX
        ]);

        const totalUsers = parseInt(totalUsersRes.rows[0].count, 10);
        const adminCount = parseInt(adminCountRes.rows[0].count, 10);
        const investorCount = parseInt(investorCountRes.rows[0].count, 10);
        const otherCount = totalUsers - adminCount - investorCount; // Calculate "Others"

        res.json({
            stats: {
                totalUsers,
                adminCount,
                investorCount,
            },
            pieData: [
                { name: 'Admins', value: adminCount },
                { name: 'Investors', value: investorCount },
                { name: 'Others', value: otherCount },
            ],
            tables: {
                recentInvestors: recentInvestorsRes.rows,
                allAdmins: allAdminsRes.rows,
            }
        });
    } catch (err) {
        console.error('DB Error in getAdminDashboard:', err.message);
        res.status(500).send('Server Error');
    }
};

/**
 * @desc    Get all investors (for Manage Investors page)
 * @route   GET /api/admin/users
 */
const getAllInvestors = async (req, res) => {
    try {
        // Query now includes portfolio count
        const { rows } = await db.query(`
            SELECT u.id, u.name, u.email, u.created_at, COUNT(p.id) AS "portfolioCount"
            FROM users u
            LEFT JOIN portfolios p ON u.id = p.user_id
            WHERE u.role = 'investor'
            GROUP BY u.id
            ORDER BY u.name
        `);
        res.json(rows);
    } catch (err) {
        console.error('DB Error in getAllInvestors:', err.message);
        res.status(500).send('Server Error');
    }
};

/**
 * @desc    Admin creates a new investor
 * @route   POST /api/admin/users
 */
const createInvestor = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ msg: 'Please provide name, email, and password' });
  }
  try {
    const userExists = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ msg: 'User with that email already exists' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const sql = `
      INSERT INTO users (name, email, password, role) 
      VALUES ($1, $2, $3, 'investor') 
      RETURNING id, name, email, role
    `;
    const { rows } = await db.query(sql, [name, email, hashedPassword]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('DB Error in createInvestor:', err.message);
    res.status(500).send('Server Error');
  }
};

/**
 * @desc    Admin resets an investor's password
 * @route   PUT /api/admin/users/reset-password
 */
const resetInvestorPassword = async (req, res) => {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword) {
      return res.status(400).json({ msg: 'User ID and new password are required.' });
    }
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        const sql = `
          UPDATE users SET password = $1 
          WHERE id = $2 AND role = 'investor'
          RETURNING id, name, email
        `;
        const { rows } = await db.query(sql, [hashedPassword, userId]);

        if (rows.length === 0) {
            return res.status(404).json({ msg: 'Investor not found' });
        }
        res.json({ msg: 'Password updated successfully for ' + rows[0].name });
    } catch (err) {
        console.error('DB Error in resetInvestorPassword:', err.message);
        res.status(500).send('Server Error');
    }
};

/**
 * @desc    Admin deletes an investor
 * @route   DELETE /api/admin/users/:id
 */
const deleteInvestor = async (req, res) => {
    const { id } = req.params;
    try {
        const deleteResult = await db.query(
            "DELETE FROM users WHERE id = $1 AND role = 'investor' RETURNING *", 
            [id]
        );
        if (deleteResult.rowCount === 0) {
            return res.status(404).json({ msg: 'Investor not found' });
        }
        res.json({ msg: 'Investor and all their portfolios deleted.' });
    } catch (err) {
        console.error('DB Error in deleteInvestor:', err.message);
        res.status(500).send('Server Error');
    }
};

module.exports = {
  getAdminDashboard,
  getAllInvestors,
  createInvestor,
  resetInvestorPassword,
  deleteInvestor
};