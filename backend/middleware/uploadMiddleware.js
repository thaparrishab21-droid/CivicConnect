const multer = require('multer');
const path = require('path');

// 1. Define where to store the files and what to name them
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Save files in the 'backend/uploads' folder
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    // Generate a unique filename: current timestamp + original name (spaces replaced with dashes)
    // Example: 1719876543210-pothole-image.jpg
    const uniqueName = Date.now() + '-' + file.originalname.replace(/\s+/g, '-');
    cb(null, uniqueName);
  }
});

// 2. Define a filter to check if the uploaded file is actually an image
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  
  // Check extension name
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime type (e.g. image/jpeg, image/png)
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    // If not an image, return an error
    cb(new Error('Error: Only images (jpeg, jpg, png, gif) are allowed!'), false);
  }
};

// 3. Create the multer instance with size limit of 5MB
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: fileFilter
});

module.exports = upload;
