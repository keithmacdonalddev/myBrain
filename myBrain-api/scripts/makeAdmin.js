/**
 * =============================================================================
 * MAKEADMIN.JS - Promote User to Admin Script
 * =============================================================================
 *
 * This is a one-time utility script to promote an existing user to admin.
 * Admins have special privileges to manage users, system settings, and content.
 *
 * WHAT DOES THIS SCRIPT DO?
 * -------------------------
 * Finds a user by email and sets their role to 'admin'.
 * This gives them access to the admin panel.
 *
 * WHEN TO USE:
 * -----------
 * - Initial setup: Making the first admin
 * - Promoting trusted user: When you want to share admin responsibilities
 * - Recovery: If all admins are locked out
 *
 * REQUIREMENTS:
 * ---------------
 * - .env file configured (MONGO_URI must be set)
 * - User must exist in database
 * - Email must match exactly
 *
 * USAGE:
 * ------
 * node scripts/makeAdmin.js user@example.com
 *
 * EXAMPLE:
 * node scripts/makeAdmin.js john@mycompany.com
 *
 * OUTPUT:
 * -------
 * Success: "Successfully promoted "john@mycompany.com" to admin!"
 * Error: "User with email "unknown@email.com" not found"
 * Info: User "john@mycompany.com" is already an admin
 *
 * WHAT IS AN ADMIN?
 * ----------------
 * Admins can:
 * - View all users
 * - Suspend/warn users
 * - Access analytics
 * - View system logs
 * - Manage roles and permissions
 * - Configure system settings
 * - Handle user reports
 * - Manage moderation
 *
 * SAFETY:
 * -------
 * Be careful! Admins have a lot of power.
 * Only promote users you trust completely.
 * If you accidentally promote someone, you can:
 * 1. Connect to MongoDB directly
 * 2. Update the user's role field to 'free' or 'premium'
 * 3. Save and they'll lose admin access
 *
 * LIMITATIONS:
 * -----------
 * - Email is case-insensitive (John@Email.com = john@email.com)
 * - Does not send any notification to the user
 * - Cannot set admin with specific permissions (all-or-nothing)
 * - Does not create an admin user (user must already exist)
 *
 * TROUBLESHOOTING:
 * ----------------
 * "User not found" → Check email spelling
 * "Connection error" → Check MONGO_URI in .env
 * "No output" → Make sure you're in the right directory
 *
 * RELATED COMMANDS:
 * -----------------
 * To check if someone is already admin:
 * - View user in admin panel
 * - Check role field in Users collection
 *
 * To remove admin (make them regular user):
 * - Use admin panel to change role
 * - Or run similar script to set role to 'free'
 *
 * SECURITY NOTE:
 * ---------------
 * This script directly modifies the database.
 * It bypasses normal validation and logging.
 * Use only when necessary and keep .env file secure.
 *
 * =============================================================================
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const email = process.argv[2];

if (!email) {
  console.error('Usage: node scripts/makeAdmin.js <email>');
  process.exit(1);
}

async function makeAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const result = await mongoose.connection.db.collection('users').updateOne(
      { email: email.toLowerCase() },
      { $set: { role: 'admin' } }
    );

    if (result.matchedCount === 0) {
      console.error(`User with email "${email}" not found`);
    } else if (result.modifiedCount === 0) {
      console.log(`User "${email}" is already an admin`);
    } else {
      console.log(`Successfully promoted "${email}" to admin!`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

makeAdmin();
