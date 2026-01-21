import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function fixMockImages() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('MONGO_URI not found in environment variables');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB\n');

    const Image = (await import('../src/models/Image.js')).default;

    // Find all mock images (those with cloudinaryId starting with 'mock_')
    const mockImages = await Image.find({
      cloudinaryId: { $regex: /^mock_/ }
    });

    console.log(`Found ${mockImages.length} mock images to update\n`);

    let updated = 0;

    for (const image of mockImages) {
      // Generate a consistent random seed based on the image ID for reproducible images
      const seed = image._id.toString().substring(0, 8);
      const width = image.width || 800;
      const height = image.height || 600;

      // Use picsum.photos for placeholder images
      const placeholderUrl = `https://picsum.photos/seed/${seed}/${width}/${height}`;

      image.url = placeholderUrl;
      image.secureUrl = placeholderUrl;

      await image.save();
      updated++;

      if (updated % 20 === 0) {
        console.log(`Updated ${updated}/${mockImages.length} images...`);
      }
    }

    console.log(`\nDone! Updated ${updated} mock images with placeholder URLs.`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error fixing mock images:', error);
    process.exit(1);
  }
}

fixMockImages();
