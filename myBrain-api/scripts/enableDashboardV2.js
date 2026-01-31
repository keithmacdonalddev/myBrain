/**
 * Enable Dashboard V2 for a user
 * Usage: node scripts/enableDashboardV2.js <email>
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../src/models/User.js';

const email = process.argv[2];

if (!email) {
  console.log('Usage: node scripts/enableDashboardV2.js <email>');
  process.exit(1);
}

async function enableFlag() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log(`User not found: ${email}`);
      process.exit(1);
    }
    
    // Enable the dashboard V2 flag
    user.flags.set('dashboardV2Enabled', true);
    await user.save();
    
    console.log(`✅ Enabled dashboardV2Enabled for ${email}`);
    console.log('Refresh the app to see the new dashboard!');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

enableFlag();
