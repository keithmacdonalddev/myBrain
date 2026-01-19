import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// Mock user data
const mockUsers = [
  {
    email: 'sarah.johnson@example.com',
    firstName: 'Sarah',
    lastName: 'Johnson',
    displayName: 'Sarah J.',
    phone: '+1 (555) 123-4567',
    bio: 'Product designer passionate about creating intuitive user experiences. Coffee enthusiast and weekend hiker.',
    location: 'San Francisco, CA',
    website: 'https://sarahjohnson.design',
    timezone: 'America/Los_Angeles',
    role: 'premium'
  },
  {
    email: 'michael.chen@example.com',
    firstName: 'Michael',
    lastName: 'Chen',
    displayName: 'Mike Chen',
    phone: '+1 (555) 234-5678',
    bio: 'Software engineer by day, amateur chef by night. Always learning something new.',
    location: 'Seattle, WA',
    website: 'https://mikechen.dev',
    timezone: 'America/Los_Angeles',
    role: 'free'
  },
  {
    email: 'emma.williams@example.com',
    firstName: 'Emma',
    lastName: 'Williams',
    displayName: 'Emma W.',
    phone: '+1 (555) 345-6789',
    bio: 'Marketing strategist helping startups find their voice. Dog mom to two golden retrievers.',
    location: 'Austin, TX',
    website: 'https://emmawilliams.co',
    timezone: 'America/Chicago',
    role: 'premium'
  },
  {
    email: 'james.rodriguez@example.com',
    firstName: 'James',
    lastName: 'Rodriguez',
    displayName: 'James R.',
    phone: '+1 (555) 456-7890',
    bio: 'Freelance photographer capturing moments that matter. Travel addict with 30+ countries visited.',
    location: 'Miami, FL',
    website: 'https://jamesrodriguezphoto.com',
    timezone: 'America/New_York',
    role: 'free'
  },
  {
    email: 'olivia.brown@example.com',
    firstName: 'Olivia',
    lastName: 'Brown',
    displayName: 'Liv Brown',
    phone: '+1 (555) 567-8901',
    bio: 'UX researcher obsessed with understanding user behavior. Podcast host and bookworm.',
    location: 'Boston, MA',
    website: 'https://oliviabrown.research',
    timezone: 'America/New_York',
    role: 'premium'
  },
  {
    email: 'david.kim@example.com',
    firstName: 'David',
    lastName: 'Kim',
    displayName: 'Dave Kim',
    phone: '+1 (555) 678-9012',
    bio: 'Data scientist turning numbers into insights. Board game collector and strategy enthusiast.',
    location: 'Chicago, IL',
    website: 'https://davidkim.data',
    timezone: 'America/Chicago',
    role: 'free'
  },
  {
    email: 'sophia.martinez@example.com',
    firstName: 'Sophia',
    lastName: 'Martinez',
    displayName: 'Sophie M.',
    phone: '+1 (555) 789-0123',
    bio: 'Content creator and social media consultant. Yoga instructor on weekends.',
    location: 'Los Angeles, CA',
    website: 'https://sophiamartinez.social',
    timezone: 'America/Los_Angeles',
    role: 'premium'
  },
  {
    email: 'william.taylor@example.com',
    firstName: 'William',
    lastName: 'Taylor',
    displayName: 'Will Taylor',
    phone: '+1 (555) 890-1234',
    bio: 'Startup founder building the future of remote work. Former consultant turned entrepreneur.',
    location: 'Denver, CO',
    website: 'https://williamtaylor.io',
    timezone: 'America/Denver',
    role: 'premium'
  },
  {
    email: 'ava.anderson@example.com',
    firstName: 'Ava',
    lastName: 'Anderson',
    displayName: 'Ava A.',
    phone: '+1 (555) 901-2345',
    bio: 'Graphic designer with a love for minimalist aesthetics. Plant parent to 47 succulents.',
    location: 'Portland, OR',
    website: 'https://avaanderson.design',
    timezone: 'America/Los_Angeles',
    role: 'free'
  },
  {
    email: 'alexander.lee@example.com',
    firstName: 'Alexander',
    lastName: 'Lee',
    displayName: 'Alex Lee',
    phone: '+1 (555) 012-3456',
    bio: 'Full-stack developer passionate about clean code. Open source contributor and mentor.',
    location: 'New York, NY',
    website: 'https://alexlee.codes',
    timezone: 'America/New_York',
    role: 'premium'
  },
  {
    email: 'isabella.garcia@example.com',
    firstName: 'Isabella',
    lastName: 'Garcia',
    displayName: 'Bella Garcia',
    phone: '+1 (555) 111-2222',
    bio: 'HR professional focused on building inclusive workplaces. Amateur salsa dancer.',
    location: 'Phoenix, AZ',
    website: 'https://isabellagarcia.hr',
    timezone: 'America/Phoenix',
    role: 'free'
  },
  {
    email: 'ethan.wilson@example.com',
    firstName: 'Ethan',
    lastName: 'Wilson',
    displayName: 'Ethan W.',
    phone: '+1 (555) 222-3333',
    bio: 'DevOps engineer automating everything. Mountain biker and craft beer enthusiast.',
    location: 'Salt Lake City, UT',
    website: 'https://ethanwilson.ops',
    timezone: 'America/Denver',
    role: 'free'
  },
  {
    email: 'mia.thompson@example.com',
    firstName: 'Mia',
    lastName: 'Thompson',
    displayName: 'Mia T.',
    phone: '+1 (555) 333-4444',
    bio: 'Technical writer making complex topics accessible. Fiction writer in my spare time.',
    location: 'Nashville, TN',
    website: 'https://miathompson.writes',
    timezone: 'America/Chicago',
    role: 'premium'
  },
  {
    email: 'benjamin.moore@example.com',
    firstName: 'Benjamin',
    lastName: 'Moore',
    displayName: 'Ben Moore',
    phone: '+1 (555) 444-5555',
    bio: 'Product manager bridging business and tech. Amateur astronomer and space enthusiast.',
    location: 'Houston, TX',
    website: 'https://benjaminmoore.pm',
    timezone: 'America/Chicago',
    role: 'free'
  },
  {
    email: 'charlotte.jackson@example.com',
    firstName: 'Charlotte',
    lastName: 'Jackson',
    displayName: 'Charlie J.',
    phone: '+1 (555) 555-6666',
    bio: 'Financial analyst with a passion for personal finance education. Marathon runner.',
    location: 'Philadelphia, PA',
    website: 'https://charlottejackson.finance',
    timezone: 'America/New_York',
    role: 'premium'
  },
  {
    email: 'daniel.white@example.com',
    firstName: 'Daniel',
    lastName: 'White',
    displayName: 'Dan White',
    phone: '+1 (555) 666-7777',
    bio: 'Mobile app developer specializing in React Native. Vinyl collector and music producer.',
    location: 'Atlanta, GA',
    website: 'https://danielwhite.mobile',
    timezone: 'America/New_York',
    role: 'free'
  },
  {
    email: 'amelia.harris@example.com',
    firstName: 'Amelia',
    lastName: 'Harris',
    displayName: 'Amy Harris',
    phone: '+1 (555) 777-8888',
    bio: 'Customer success manager dedicated to client happiness. Avid reader and podcast junkie.',
    location: 'San Diego, CA',
    website: 'https://ameliaharris.success',
    timezone: 'America/Los_Angeles',
    role: 'premium'
  },
  {
    email: 'henry.clark@example.com',
    firstName: 'Henry',
    lastName: 'Clark',
    displayName: 'Henry C.',
    phone: '+1 (555) 888-9999',
    bio: 'Backend engineer building scalable systems. Chess player and puzzle solver.',
    location: 'Minneapolis, MN',
    website: 'https://henryclark.backend',
    timezone: 'America/Chicago',
    role: 'free'
  },
  {
    email: 'harper.lewis@example.com',
    firstName: 'Harper',
    lastName: 'Lewis',
    displayName: 'Harper L.',
    phone: '+1 (555) 999-0000',
    bio: 'Brand strategist helping companies tell their story. Watercolor artist and nature lover.',
    location: 'Raleigh, NC',
    website: 'https://harperlewis.brand',
    timezone: 'America/New_York',
    role: 'premium'
  },
  {
    email: 'lucas.walker@example.com',
    firstName: 'Lucas',
    lastName: 'Walker',
    displayName: 'Luke Walker',
    phone: '+1 (555) 000-1111',
    bio: 'Security engineer keeping systems safe. CTF player and ethical hacking enthusiast.',
    location: 'Washington, DC',
    website: 'https://lucaswalker.security',
    timezone: 'America/New_York',
    role: 'free'
  }
];

async function seedUsers() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('MONGO_URI not found in environment variables');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Import User model after connection
    const User = (await import('../src/models/User.js')).default;

    // Default password for all mock users
    const defaultPassword = 'MockUser123!';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    let created = 0;
    let skipped = 0;

    for (const userData of mockUsers) {
      // Check if user already exists
      const existing = await User.findOne({ email: userData.email.toLowerCase() });
      if (existing) {
        console.log(`Skipped: ${userData.email} (already exists)`);
        skipped++;
        continue;
      }

      // Create user
      const user = new User({
        email: userData.email.toLowerCase(),
        passwordHash,
        role: userData.role,
        status: 'active',
        profile: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          displayName: userData.displayName,
          phone: userData.phone,
          bio: userData.bio,
          location: userData.location,
          website: userData.website,
          timezone: userData.timezone
        }
      });

      await user.save();
      console.log(`Created: ${userData.email} (${userData.role})`);
      created++;
    }

    console.log(`\nDone! Created ${created} users, skipped ${skipped} existing.`);
    console.log(`Default password for all mock users: ${defaultPassword}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding users:', error);
    process.exit(1);
  }
}

seedUsers();
