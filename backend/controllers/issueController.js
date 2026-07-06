const db = require('../config/db');
const fs = require('fs');
const path = require('path');

// Helper to call Gemini API
async function callGemini(promptText) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return null;
  }
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: promptText
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error("Gemini API Error details:", errText);
    throw new Error(`Gemini API returned status ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

// Haversine distance formula calculation helper (returns distance in meters)
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radius of the Earth in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

// --- CREATE A NEW CIVIC ISSUE (POST /api/issues) ---
exports.createIssue = async (req, res) => {
  try {
    const { title, description, category, location, priority, latitude, longitude, forceSubmit } = req.body;

    // A. Validation: Check if the user filled all required fields
    if (!title || !description || !category || !location) {
      return res.status(400).json({ message: 'Please provide title, description, category, and location.' });
    }

    // B. Get User ID from Middleware
    const userId = req.user.id;

    // C. Check if file was uploaded by multer
    // If a file is uploaded, store its relative public URL path (e.g. /uploads/171987654-pic.jpg)
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const issuePriority = priority || 'Medium';
    const lat = latitude ? parseFloat(latitude) : null;
    const lng = longitude ? parseFloat(longitude) : null;

    // D. AI Duplicate Check (if not forced and API key is set)
    if (forceSubmit !== 'true' && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
      try {
        // Fetch all active complaints in the same category that are NOT soft-deleted
        const [allCandidates] = await db.query(
          'SELECT id, title, description, location, latitude, longitude FROM issues WHERE category = ? AND status != "Resolved" AND is_deleted = 0',
          [category]
        );

        // Filter candidates by geographic proximity (within 300 meters)
        const geoRadiusMeters = 300; 
        const candidates = [];

        if (lat !== null && lng !== null && allCandidates && allCandidates.length > 0) {
          allCandidates.forEach(cand => {
            if (cand.latitude !== null && cand.longitude !== null) {
              const distance = getDistance(lat, lng, cand.latitude, cand.longitude);
              if (distance <= geoRadiusMeters) {
                cand.distance = distance; // attach metadata
                candidates.push(cand);
              }
            }
          });
        }

        // Only run semantic AI check if we have matching candidate complaints in the geographic radius
        if (candidates.length > 0) {
          const duplicateCheckPrompt = `You are an AI assistant for a civic issue reporting system called CivicConnect.
A citizen is trying to submit a new complaint:
Title: "${title}"
Description: "${description}"
Location Reference: "${location}"

Here is a list of existing active complaints in the same category within ${geoRadiusMeters} meters:
${JSON.stringify(candidates.map(c => ({ id: c.id, title: c.title, description: c.description, location: c.location, distance_meters: Math.round(c.distance) })))}

Your task is to determine if the new complaint is a duplicate of any of the existing complaints.
A complaint is a duplicate if:
1. It describes the same physical issue or problem (e.g. the same pothole, same broken streetlight, same garbage pile).
2. It refers to the same general location, intersection, or landmark.

Provide your output in JSON format with the following keys:
- "isDuplicate": boolean (true if it is a duplicate of one of the existing complaints, false otherwise)
- "duplicateId": integer or null (if duplicate, provide the ID of the existing complaint that it duplicates, otherwise null)
- "reason": string (a short explanation of why it is or is not a duplicate, referencing the location and description details)`;

          const resultText = await callGemini(duplicateCheckPrompt);
          if (resultText) {
            const parsedResult = JSON.parse(resultText.trim());
            if (parsedResult.isDuplicate && parsedResult.duplicateId) {
              // Find matching duplicate candidate details
              const matching = candidates.find(c => c.id === parsedResult.duplicateId);
              if (matching) {
                // Production clean-up: unlink the uploaded image since we abort submission
                if (req.file) {
                  const filePath = path.join(__dirname, '../uploads', req.file.filename);
                  fs.unlink(filePath, (err) => {
                    if (err) console.error("Error deleting duplicate issue file:", err);
                  });
                }
                
                return res.status(409).json({
                  message: 'A similar issue has already been reported nearby.',
                  isDuplicate: true,
                  reason: parsedResult.reason,
                  duplicate: matching
                });
              }
            }
          }
        }
      } catch (err) {
        console.error("AI Duplicate Check failed, continuing standard submission:", err.message);
      }
    }

    // E. Save the issue in the database
    const [result] = await db.query(
      'INSERT INTO issues (title, description, category, location, image_url, user_id, priority, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, description, category, location, imageUrl, userId, issuePriority, lat, lng]
    );

    // F. Return success response with the new issue's details
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
        user_id: userId,
        priority: issuePriority,
        latitude: lat,
        longitude: lng
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
    const { status, category, myIssues, showDeleted } = req.query;

    // A. Start with a base SQL query that joins the users table to get the reporter's name
    // and returns the count of supports from the issue_supports table
    let query = `
      SELECT issues.*, users.name AS reporter_name,
             (SELECT COUNT(*) FROM issue_supports WHERE issue_supports.issue_id = issues.id) AS support_count
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

    // 4. Filter out soft-deleted issues unless requested by an admin
    if (req.user && req.user.role === 'admin' && showDeleted === 'true') {
      whereClauses.push('issues.is_deleted = 1');
    } else {
      whereClauses.push('issues.is_deleted = 0');
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

// --- ANALYZE CIVIC ISSUE USING GEMINI API (POST /api/issues/analyze) ---
exports.analyzeIssue = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim() === '') {
      return res.status(400).json({ message: 'Please provide some text to analyze.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      console.warn("⚠️ GEMINI_API_KEY is not configured. Returning fallback mock analysis based on keywords.");
      
      const lowerText = text.toLowerCase();
      let category = "Garbage Dump"; // default
      let priority = "Medium";
      
      if (lowerText.includes("light") || lowerText.includes("lamp") || lowerText.includes("dark") || lowerText.includes("bulb")) {
        category = "Broken Streetlight";
        priority = lowerText.includes("spark") || lowerText.includes("wire") || lowerText.includes("danger") ? "Critical" : "Medium";
      } else if (lowerText.includes("leak") || lowerText.includes("water") || lowerText.includes("burst") || lowerText.includes("flooding")) {
        category = "Water Leakage";
        priority = "High";
      } else if (lowerText.includes("drain") || lowerText.includes("sewage") || lowerText.includes("overflow") || lowerText.includes("clog")) {
        category = "Drainage Issue";
        priority = "Medium";
      } else if (lowerText.includes("pothole") || lowerText.includes("crater") || lowerText.includes("pit")) {
        category = "Pothole";
        priority = "Medium";
      } else if (lowerText.includes("garbage") || lowerText.includes("trash") || lowerText.includes("waste") || lowerText.includes("dump") || lowerText.includes("litter")) {
        category = "Garbage Dump";
        priority = "Low";
      } else if (lowerText.includes("road") || lowerText.includes("crack") || lowerText.includes("asphalt") || lowerText.includes("pavement")) {
        category = "Damaged Road";
        priority = "Medium";
      }

      const rewrittenText = `[AI Fallback Mock Description]\n\nProblem Statement: The user reports an issue regarding ${category.toLowerCase()}.\nDetails: ${text}`;

      return res.json({
        success: true,
        category,
        priority,
        rewrittenText
      });
    }

    const promptText = `You are an AI assistant for a civic issue reporting system called CivicConnect.
Analyze the following natural language complaint from a citizen:
"${text}"

Provide the output in JSON format with the following keys:
- "category": Match it to exactly one of these values: "Pothole", "Garbage Dump", "Water Leakage", "Broken Streetlight", "Drainage Issue", "Damaged Road". If it doesn't fit any of these, pick the closest one.
- "priority": Assign a priority level ("Low", "Medium", "High", "Critical") based on severity, urgency, safety hazard, and public impact.
- "rewrittenText": Rewrite the user's description into a professional, clear, and structured format suitable for city municipal workers. Fix spelling/grammatical errors, structure logically, and make it concise.`;

    const resultText = await callGemini(promptText);
    if (!resultText) {
      throw new Error("Empty response from Gemini API");
    }

    const parsed = JSON.parse(resultText.trim());
    res.json({
      success: true,
      category: parsed.category || "Garbage Dump",
      priority: parsed.priority || "Medium",
      rewrittenText: parsed.rewrittenText || text
    });
  } catch (error) {
    console.error('Analyze Issue Error:', error);
    res.status(500).json({ message: 'Error analyzing issue: ' + error.message });
  }
};

// --- GET CIVIC ISSUES ANALYTICS (GET /api/issues/analytics) ---
exports.getIssuesAnalytics = async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress,
        SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) AS resolved
      FROM issues
      WHERE is_deleted = 0
    `;

    const categoryQuery = `
      SELECT category, COUNT(*) AS count 
      FROM issues 
      WHERE is_deleted = 0
      GROUP BY category 
      ORDER BY count DESC
    `;

    const trendQuery = `
      SELECT strftime('%Y-%m', created_at) AS month, COUNT(*) AS count
      FROM issues
      WHERE created_at >= date('now', '-6 month') AND is_deleted = 0
      GROUP BY month
      ORDER BY month ASC
    `;

    const priorityQuery = `
      SELECT priority, COUNT(*) AS count
      FROM issues
      WHERE is_deleted = 0
      GROUP BY priority
      ORDER BY count DESC
    `;

    // Execute concurrently for optimal SQLite performance
    const [statsRes, categoryRes, trendRes, priorityRes] = await Promise.all([
      db.query(statsQuery),
      db.query(categoryQuery),
      db.query(trendQuery),
      db.query(priorityQuery)
    ]);

    // SQLite may return null for SUM queries if table is empty
    const stats = statsRes[0][0] || { total: 0, pending: 0, in_progress: 0, resolved: 0 };
    stats.total = stats.total || 0;
    stats.pending = stats.pending || 0;
    stats.in_progress = stats.in_progress || 0;
    stats.resolved = stats.resolved || 0;

    res.json({
      success: true,
      stats,
      byCategory: categoryRes[0] || [],
      trends: trendRes[0] || [],
      byPriority: priorityRes[0] || []
    });
  } catch (error) {
    console.error('Get Analytics Error:', error);
    res.status(500).json({ message: 'Server error while compiling analytics.' });
  }
};

// --- SUPPORT / UPVOTE AN ISSUE (POST /api/issues/:id/support) ---
exports.supportIssue = async (req, res) => {
  try {
    const issueId = req.params.id;
    const userId = req.user.id;

    // Check if the issue exists and is not resolved
    const [issues] = await db.query('SELECT id, status FROM issues WHERE id = ?', [issueId]);
    if (!issues || issues.length === 0) {
      return res.status(404).json({ message: 'Civic issue not found.' });
    }
    
    if (issues[0].status === 'Resolved') {
      return res.status(400).json({ message: 'Cannot support a resolved issue.' });
    }

    try {
      await db.query(
        'INSERT INTO issue_supports (issue_id, user_id) VALUES (?, ?)',
        [issueId, userId]
      );
      
      res.json({
        success: true,
        message: 'You have successfully supported/upvoted this complaint!'
      });
    } catch (dbErr) {
      if (dbErr.message.includes('UNIQUE constraint failed') || dbErr.code === 'SQLITE_CONSTRAINT') {
        return res.status(400).json({
          message: 'You have already supported/upvoted this complaint.'
        });
      }
      throw dbErr;
    }
  } catch (error) {
    console.error('Support Issue Error:', error);
    res.status(500).json({ message: 'Server error while supporting issue.' });
  }
};

// --- SOFT DELETE/WITHDRAW A CIVIC ISSUE (DELETE /api/issues/:id) ---
exports.deleteIssue = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // 1. Fetch the issue to verify existence and ownership
    const [issues] = await db.query('SELECT id, user_id, is_deleted FROM issues WHERE id = ?', [id]);
    if (!issues || issues.length === 0) {
      return res.status(404).json({ message: 'Civic issue not found.' });
    }

    const issue = issues[0];
    if (issue.is_deleted === 1) {
      return res.status(400).json({ message: 'Civic issue is already deleted.' });
    }

    // 2. Authorization check: Citizen must be the owner. Admin can delete anything.
    if (userRole !== 'admin' && issue.user_id !== userId) {
      return res.status(403).json({ message: 'You are not authorized to delete this complaint.' });
    }

    const deletionReason = reason ? reason.trim() : (userRole === 'admin' ? 'Removed by Admin' : 'Withdrawn by Citizen');

    // 3. Update columns to soft delete
    await db.query(
      `UPDATE issues 
       SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP, deleted_by = ?, deletion_reason = ? 
       WHERE id = ?`,
      [userId, deletionReason, id]
    );

    res.json({
      success: true,
      message: userRole === 'admin' ? 'Complaint successfully removed by administrator.' : 'Your complaint has been successfully withdrawn.'
    });

  } catch (error) {
    console.error('Delete Issue Error:', error);
    res.status(500).json({ message: 'Server error while deleting issue: ' + error.message });
  }
};

// --- RESTORE A SOFT-DELETED CIVIC ISSUE (POST /api/issues/:id/restore) ---
// Only accessible by Admins
exports.restoreIssue = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Fetch the issue to verify it is deleted
    const [issues] = await db.query('SELECT id, is_deleted FROM issues WHERE id = ?', [id]);
    if (!issues || issues.length === 0) {
      return res.status(404).json({ message: 'Civic issue not found.' });
    }

    const issue = issues[0];
    if (issue.is_deleted === 0) {
      return res.status(400).json({ message: 'Civic issue is not deleted.' });
    }

    // 2. Restore by resetting columns
    await db.query(
      `UPDATE issues 
       SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL, deletion_reason = NULL 
       WHERE id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: 'Complaint successfully restored.'
    });

  } catch (error) {
    console.error('Restore Issue Error:', error);
    res.status(500).json({ message: 'Server error while restoring issue: ' + error.message });
  }
};



