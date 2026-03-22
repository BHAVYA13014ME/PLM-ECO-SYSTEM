const jwt = require('jsonwebtoken');

/**
 * verifyJWT — Middleware that validates the JWT access token.
 *
 * Reads "Authorization: Bearer {token}" from the request header,
 * verifies it against JWT_ACCESS_SECRET, and attaches the decoded
 * payload to req.user.
 *
 * Returns 401 if token is missing or invalid.
 */
const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized — token missing or invalid',
      data: null,
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = decoded; // { _id, email, role }
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized — token missing or invalid',
      data: null,
    });
  }
};

module.exports = { verifyJWT };
