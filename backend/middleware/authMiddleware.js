const jwt = require('jsonwebtoken');

// This middleware checks if a request is coming from a logged-in user
const verifyToken = (req, res, next) => {
  // A. Get the token from the "Authorization" header
  // Standard format is: "Bearer <token_value>"
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Splits "Bearer <token>" and takes the second part

  // B. If no token is provided, return 401 (Unauthorized)
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No authentication token provided.' });
  }

  try {
    // C. Verify the token using our secret key
    // If the token was altered or expired, this will throw an error
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    
    // D. Attach the user's data (id and role) to the request object
    // This allows subsequent controllers/middleware to know who is making the request
    req.user = verified;

    // E. Pass control to the next function (the controller)
    next();
  } catch (error) {
    res.status(403).json({ message: 'Invalid or expired token.' });
  }
};

module.exports = verifyToken;
