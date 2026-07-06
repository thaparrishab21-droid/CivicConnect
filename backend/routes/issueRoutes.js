const express = require('express');
const router = express.Router();
const issueController = require('../controllers/issueController');
const verifyToken = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Route to Report a Civic Issue: POST /api/issues
// 1. verifyToken: Checks if the user is logged in
// 2. Custom wrapper for upload.single('image'): Handles file upload & returns a neat 400 error if it's too large or not an image
// 3. createIssue: Controller that saves issue details to the database
router.post('/', verifyToken, (req, res, next) => {
  upload.single('image')(req, res, function (err) {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}, issueController.createIssue);

// Route to View/Fetch Civic Issues: GET /api/issues
// Secured by verifyToken so only logged-in users can search/view issues
router.get('/', verifyToken, issueController.getIssues);

// Import admin verification middleware
const isAdmin = require('../middleware/adminMiddleware');

// Route to Update Issue Status: PUT /api/issues/:id/status
// Restrained by verifyToken (must be logged in) AND isAdmin (must have role 'admin')
router.put('/:id/status', verifyToken, isAdmin, issueController.updateIssueStatus);

// Route to Analyze Civic Issue with AI: POST /api/issues/analyze
// Secured by verifyToken
router.post('/analyze', verifyToken, issueController.analyzeIssue);

// Route to Fetch Civic Issue Analytics: GET /api/issues/analytics
// Secured by verifyToken
router.get('/analytics', verifyToken, issueController.getIssuesAnalytics);

// Route to Support/Upvote an issue: POST /api/issues/:id/support
// Secured by verifyToken
router.post('/:id/support', verifyToken, issueController.supportIssue);

module.exports = router;

