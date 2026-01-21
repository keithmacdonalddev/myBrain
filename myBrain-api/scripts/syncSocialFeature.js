import mongoose from 'mongoose';
import dotenv from 'dotenv';
import RoleConfig from '../src/models/RoleConfig.js';

dotenv.config();

async function syncRoles() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Sync all role configs to add missing features
    const roles = ['free', 'premium', 'admin'];
    for (const role of roles) {
      const config = await RoleConfig.getConfig(role);

      // Check if socialEnabled exists
      if (!config.features.has('socialEnabled')) {
        // Add it based on role (free=false, others=true)
        const enabled = role !== 'free';
        config.features.set('socialEnabled', enabled);
        await config.save();
        console.log(`Added socialEnabled=${enabled} to ${role} role`);
      } else {
        const current = config.features.get('socialEnabled');
        console.log(`${role} role already has socialEnabled=${current}`);

        // Enable for admin if not already
        if (role === 'admin' && !current) {
          config.features.set('socialEnabled', true);
          await config.save();
          console.log(`  -> Enabled socialEnabled for admin`);
        }
      }
    }

    await mongoose.disconnect();
    console.log('Done! Restart your server and refresh the browser.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

syncRoles();
