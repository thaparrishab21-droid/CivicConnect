const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const db = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const issueRoutes = require('./routes/issueRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// --- MIDDLEWARE ---
// cors() allows our future frontend to talk to this backend even if they run on different ports (e.g., frontend on 3000, backend on 5000)
app.use(cors());

// express.json() converts the incoming JSON data in request body (req.body) into JavaScript objects automatically
app.use(express.json());

// express.urlencoded() allows us to read incoming form submissions
app.use(express.urlencoded({ extended: true }));

// Serve the uploaded images folder statically so they are accessible via URLs (e.g. http://localhost:5000/uploads/file.jpg)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/issues', issueRoutes);

// --- BASE ROUTE ---
// A simple test route to check if our API is alive
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to CivicConnect API!' });
});

// --- DATABASE TEST & SERVER START ---
// We run a simple "SELECT 1" query to test if our connection to the database actually works
db.query('SELECT 1')
  .then(() => {
    console.log('✅ Connected to the MySQL database successfully!');
    // We only start the server if the database connects successfully
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Database connection failed! Error:', err.message);
    console.log('⚠️ Server not started. Please start MySQL and make sure your .env values are correct.');
  });
