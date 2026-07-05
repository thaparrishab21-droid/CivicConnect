// This middleware checks if the logged-in user is an Admin
const isAdmin = (req, res, next) => {
  // A. Check if the user object exists and if their role is 'admin'
  // Remember: verifyToken attached the decoded token data (which includes the role) to 'req.user'
  if (req.user && req.user.role === 'admin') {
    // B. If they are admin, let them proceed to the controller
    next();
  } else {
    // C. If not admin, block them with 403 Forbidden
    return res.status(403).json({ message: 'Access denied. Only administrators are allowed to perform this action.' });
  }
};

module.exports = isAdmin;
