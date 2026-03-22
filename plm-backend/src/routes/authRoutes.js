const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout,
  refreshAccessToken,
  getMe,
} = require('../controllers/authController');
const { verifyJWT } = require('../middleware/auth');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshAccessToken);

// Protected routes
router.post('/logout', verifyJWT, logout);
router.get('/me', verifyJWT, getMe);

module.exports = router;
