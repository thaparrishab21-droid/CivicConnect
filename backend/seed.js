const bcrypt = require('bcryptjs');
const db = require('./config/db');

const seed = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // 1. Clear existing data to prevent unique key constraint errors on reruns
    // Deleting from users will automatically cascade delete all issues
    await db.query('DELETE FROM users');
    console.log('🧹 Cleaned existing database tables.');

    // 2. Hash passwords
    const salt = await bcrypt.genSalt(10);
    const citizenPassword = await bcrypt.hash('citizen123', salt);
    const adminPassword = await bcrypt.hash('admin123', salt);

    // 3. Create Citizen User
    const [citizenResult] = await db.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      ['Rohan Sharma', 'rohan@example.com', citizenPassword, 'citizen']
    );
    const citizenId = citizenResult.insertId;
    console.log(`👤 Created Citizen User: rohan@example.com (Password: citizen123)`);

    // 4. Create Admin User
    const [adminResult] = await db.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      ['Admin Officer', 'admin@civicconnect.com', adminPassword, 'admin']
    );
    const adminId = adminResult.insertId;
    console.log(`🛡️ Created Admin User: admin@civicconnect.com (Password: admin123)`);

    // 5. Create Mock Issues
    // Issue A: Pothole
    await db.query(
      'INSERT INTO issues (title, description, category, location, image_url, status, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        'Large Pothole on Sector 15 Main Road',
        'There is a massive, dangerous pothole near the traffic signals. It is causing heavy traffic congestion and is a safety hazard for motorcycles.',
        'Pothole',
        'Sector 15, near main intersection',
        null,
        'Pending',
        citizenId
      ]
    );

    // Issue B: Garbage Dump
    await db.query(
      'INSERT INTO issues (title, description, category, location, image_url, status, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        'Overflowing Garbage Dump near Public Park',
        'The municipal dump box is overflowing and waste is scattered all over the walkway. The smell is unbearable and stray dogs are gathering.',
        'Garbage Dump',
        'Block C Park Entrance, Sector 22',
        null,
        'In Progress',
        citizenId
      ]
    );

    // Issue C: Broken Streetlight
    await db.query(
      'INSERT INTO issues (title, description, category, location, image_url, status, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        'Main Streetlights Non-functional for 3 Nights',
        'All three consecutive streetlights on Lane 4 are completely off, making the street extremely dark and unsafe at night.',
        'Broken Streetlight',
        'Lane 4, Model Town',
        null,
        'Resolved',
        citizenId
      ]
    );

    console.log('✅ Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed! Error:', error);
    process.exit(1);
  }
};

seed();
