import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SidebarConfig from '../src/models/SidebarConfig.js';

dotenv.config();

async function resetSidebar() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Delete existing sidebar config
    await SidebarConfig.deleteOne({ _id: 'sidebar' });
    console.log('Deleted existing sidebar config');

    // Create new config with defaults (which now include social section)
    const config = await SidebarConfig.getConfig();
    console.log('Created new sidebar config with social section');
    console.log('Sections:', config.sections.map(s => s.key));
    console.log('Social items:', config.items.filter(i => i.section === 'social').map(i => i.key));

    await mongoose.disconnect();
    console.log('\nDone! Restart your server and refresh the browser.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

resetSidebar();
