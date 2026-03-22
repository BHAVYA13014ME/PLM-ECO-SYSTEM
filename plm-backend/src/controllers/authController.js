const User = require('../models/User');
const ApiResponse = require('../utils/ApiResponse');
const jwt = require('jsonwebtoken');

// ──────────────────────────────────────────────────
// POST /api/v1/auth/register
// ──────────────────────────────────────────────────
const register = async (req, res) => {
  const { name, email, password, role } = req.body;

  // Validate required fields
  if (!name || !email || !password || !role) {
    return new ApiResponse(res, 400, 'All fields are required: name, email, password, role');
  }

  // Validate role
  const validRoles = ['ADMIN', 'ENGINEER', 'APPROVER', 'OPERATIONS'];
  if (!validRoles.includes(role)) {
    return new ApiResponse(res, 400, `Role must be one of: ${validRoles.join(', ')}`);
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return new ApiResponse(res, 409, 'User with this email already exists');
  }

  // Create user — passwordHash will be bcrypt-hashed by pre-save hook
  const user = await User.create({
    name,
    email,
    passwordHash: password,
    role,
  });

  // Return user without sensitive fields
  const userResponse = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  new ApiResponse(res, 201, 'User registered successfully', userResponse);
};

// ──────────────────────────────────────────────────
// POST /api/v1/auth/login
// ──────────────────────────────────────────────────
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return new ApiResponse(res, 400, 'Email and password are required');
  }

  // Find user WITH passwordHash (not selected by default)
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    return new ApiResponse(res, 401, 'Invalid email or password');
  }

  // Compare password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return new ApiResponse(res, 401, 'Invalid email or password');
  }

  // Generate tokens
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // Store refresh token in DB
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  // Set refresh token as httpOnly cookie
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  };

  res.cookie('refreshToken', refreshToken, cookieOptions);

  // Return user without sensitive fields
  const userResponse = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  new ApiResponse(res, 200, 'Login successful', { accessToken, user: userResponse });
};

// ──────────────────────────────────────────────────
// POST /api/v1/auth/logout  (requires verifyJWT)
// ──────────────────────────────────────────────────
const logout = async (req, res) => {
  // Clear refresh token in DB
  await User.findByIdAndUpdate(req.user._id, { refreshToken: null });

  // Clear the cookie
  res.clearCookie('refreshToken', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  });

  new ApiResponse(res, 200, 'Logged out successfully');
};

// ──────────────────────────────────────────────────
// POST /api/v1/auth/refresh-token
// ──────────────────────────────────────────────────
const refreshAccessToken = async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (!token) {
    return new ApiResponse(res, 401, 'Refresh token not found');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    return new ApiResponse(res, 401, 'Invalid or expired refresh token');
  }

  // Find user with stored refreshToken
  const user = await User.findById(decoded._id).select('+refreshToken');
  if (!user || user.refreshToken !== token) {
    return new ApiResponse(res, 401, 'Invalid refresh token — please login again');
  }

  // Issue new access token
  const accessToken = user.generateAccessToken();

  const userResponse = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  new ApiResponse(res, 200, 'Access token refreshed', { accessToken, user: userResponse });
};

// ──────────────────────────────────────────────────
// GET /api/v1/auth/me  (requires verifyJWT)
// ──────────────────────────────────────────────────
const getMe = async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return new ApiResponse(res, 404, 'User not found');
  }

  new ApiResponse(res, 200, 'User profile fetched', user);
};

module.exports = {
  register,
  login,
  logout,
  refreshAccessToken,
  getMe,
};
