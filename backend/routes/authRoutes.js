const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Route for User Registration: POST /api/auth/register
router.post('/register', authController.register);

// Route for User Login: POST /api/auth/login
router.post('/login', authController.login);

module.exports = router;
