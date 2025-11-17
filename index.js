const express = require('express');
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 } // 24 hours
}));

// MySQL connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Invaders_24',
  port: 3308,
  database: 'apiuser',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Helper function to generate API key
function generateApiKey() {
  return crypto.randomBytes(32).toString('hex');
}

// Helper function to calculate expiry date (30 days from now)
function getExpiryDate() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date;
}

// Middleware untuk check login
async function checkAuth(req, res, next) {
  if (!req.session.adminId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
}

// Routes

// 1. REGISTER ADMIN
app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const connection = await pool.getConnection();
    
    await connection.query(
      'INSERT INTO admin (email, password) VALUES (?, ?)',
      [email, hashedPassword]
    );
    
    connection.release();
    res.json({ message: 'Register successful' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ message: 'Email already exists' });
    } else {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
});

// 2. LOGIN ADMIN
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT id, password FROM admin WHERE email = ?',
      [email]
    );
    connection.release();

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, rows[0].password);
    
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    req.session.adminId = rows[0].id;
    req.session.email = email;
    
    res.json({ message: 'Login successful' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// 3. LOGOUT
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logout successful' });
});

// 4. CHECK AUTH STATUS
app.get('/api/check-auth', (req, res) => {
  if (req.session.adminId) {
    res.json({ authenticated: true, email: req.session.email });
  } else {
    res.json({ authenticated: false });
  }
});

// 5. GENERATE API KEY (PUBLIC - No auth required)
app.post('/api/generate-apikey', async (req, res) => {
  try {
    const keyValue = generateApiKey();
    const expiryDate = getExpiryDate();
    
    const connection = await pool.getConnection();
    const [result] = await connection.query(
      'INSERT INTO apikey (key_value, expires_at, status) VALUES (?, ?, ?)',
      [keyValue, expiryDate, 'active']
    );
    connection.release();

    res.json({ 
      id: result.insertId,
      key: keyValue,
      expires_at: expiryDate,
      status: 'active'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// 6. CREATE USER (PUBLIC - No auth required)
app.post('/api/create-user', async (req, res) => {
  try {
    const { first_name, last_name, email, apikey_id } = req.body;
    
    if (!first_name || !last_name || !email || !apikey_id) {
      return res.status(400).json({ message: 'All fields required' });
    }

    const connection = await pool.getConnection();
    
    // Verify that apikey exists and belongs to the current session
    const [apikeyRows] = await connection.query(
      'SELECT id FROM apikey WHERE id = ?',
      [apikey_id]
    );

    if (apikeyRows.length === 0) {
      connection.release();
      return res.status(400).json({ message: 'Invalid API key' });
    }

    await connection.query(
      'INSERT INTO user (first_name, last_name, email, apikey_id) VALUES (?, ?, ?, ?)',
      [first_name, last_name, email, apikey_id]
    );
    
    connection.release();
    res.json({ message: 'User created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// 7. GET ALL USERS
app.get('/api/users', checkAuth, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, 
              a.id as apikey_id, a.key_value, a.created_at, a.expires_at, a.status
       FROM user u 
       JOIN apikey a ON u.apikey_id = a.id
       ORDER BY a.created_at DESC`
    );
    connection.release();

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// 8. GET ALL API KEYS
app.get('/api/apikeys', checkAuth, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    // Update expired keys status
    await connection.query(
      `UPDATE apikey SET status = 'inactive' 
       WHERE expires_at < NOW() AND status = 'active'`
    );

    const [rows] = await connection.query(
      `SELECT id, key_value, created_at, expires_at, status 
       FROM apikey 
       ORDER BY created_at DESC`
    );
    connection.release();

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Serve HTML files
app.get('/', (req, res) => {
  if (req.session.adminId) {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
  } else {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
  }
});

app.get('/dashboard', (req, res) => {
  if (req.session.adminId) {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
  } else {
    res.redirect('/');
  }
});

app.get('/create-user', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'create-user.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
