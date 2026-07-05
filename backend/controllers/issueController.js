const db = require('../config/db');

// --- CREATE A NEW CIVIC ISSUE (POST /api/issues) ---
exports.createIssue = async (req, res) => {
  try {
    const { title, description, category, location } = req.body;

    // A. Validation: Check if the user filled all required fields
    if (!title || !description || !category || !location) {
      return res.status(400).json({ message: 'Please provide title, description, category, and location.' });
    }

    // B. Get User ID from Middleware
    const userId = req.user.id;

    // C. Check if file was uploaded by multer
    // If a file is uploaded, store its relative public URL path (e.g. /uploads/171987654-pic.jpg)
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    // D. Save the issue in the database
    const [result] = await db.query(
      'INSERT INTO issues (title, description, category, location, image_url, user_id) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description, category, location, imageUrl, userId]
    );

    // E. Return success response with the new issue's details
    res.status(201).json({
      message: 'Civic issue reported successfully!',
      issue: {
        id: result.insertId,
        title,
        description,
        category,
        location,
        image_url: imageUrl,
        status: 'Pending',
        user_id: userId
      }
    });
  } catch (error) {
    console.error('Create Issue Error:', error);
    res.status(500).json({ message: 'Server error during issue creation.' });
  }
};

// --- VIEW ISSUES WITH FILTERS AND SORTING (GET /api/issues) ---
exports.getIssues = async (req, res) => {
  try {
    const { status, category, myIssues } = req.query;

    // A. Start with a base SQL query that joins the users table to get the reporter's name
    let query = `
      SELECT issues.*, users.name AS reporter_name 
      FROM issues 
      INNER JOIN users ON issues.user_id = users.id
    `;
    let queryParams = [];

    // B. Build dynamic WHERE clauses based on query parameters
    let whereClauses = [];

    // 1. Filter by status (e.g., 'Pending', 'In Progress', 'Resolved')
    if (status) {
      whereClauses.push('issues.status = ?');
      queryParams.push(status);
    }

    // 2. Filter by category (e.g., 'Pothole', 'Garbage')
    if (category) {
      whereClauses.push('issues.category = ?');
      queryParams.push(category);
    }

    // 3. Filter to only show the logged-in user's reported issues
    // We get the logged-in user's ID from the JWT token (verifyToken middleware)
    if (myIssues === 'true') {
      whereClauses.push('issues.user_id = ?');
      queryParams.push(req.user.id);
    }

    // C. If there are any WHERE clauses, append them to the main query
    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }

    // D. Order by creation date (newest issues first)
    query += ' ORDER BY issues.created_at DESC';

    // E. Execute the query
    const [issues] = await db.query(query, queryParams);

    res.json(issues);
  } catch (error) {
    console.error('Get Issues Error:', error);
    res.status(500).json({ message: 'Server error while fetching issues.' });
  }
};

// --- UPDATE CIVIC ISSUE STATUS (PUT /api/issues/:id/status) ---
// Only accessible by Admins
exports.updateIssueStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // A. Validation: Make sure the status is provided and is a valid option
    const validStatuses = ['Pending', 'In Progress', 'Resolved'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Please provide a valid status: Pending, In Progress, or Resolved.' });
    }

    // B. Run SQL UPDATE query to modify the status of the issue
    const [result] = await db.query(
      'UPDATE issues SET status = ? WHERE id = ?',
      [status, id]
    );

    // C. Check if the issue was found
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Civic issue not found.' });
    }

    // D. Return success response
    res.json({
      message: `Issue status updated successfully to '${status}'!`,
      issueId: id,
      newStatus: status
    });
  } catch (error) {
    console.error('Update Status Error:', error);
    res.status(500).json({ message: 'Server error while updating issue status.' });
  }
};
