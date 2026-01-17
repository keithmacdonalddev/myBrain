import Area from '../models/Area.js';

const initialAreas = [
  {
    name: 'Notes',
    slug: 'notes',
    icon: 'StickyNote',
    status: 'active',
    order: 1,
    description: 'Your second brain - ideas, thoughts, and TODOs',
    color: '#3b82f6',
    permissions: {
      view: ['user', 'admin'],
      edit: ['user', 'admin']
    }
  },
  {
    name: 'Fitness',
    slug: 'fitness',
    icon: 'Dumbbell',
    status: 'coming_soon',
    order: 2,
    description: 'Track workouts, meals, and body metrics',
    color: '#f97316',
    permissions: {
      view: ['user', 'admin'],
      edit: ['user', 'admin']
    },
    featureFlags: {
      required: ['fitness.enabled']
    }
  },
  {
    name: 'Knowledge Base',
    slug: 'kb',
    icon: 'BookOpen',
    status: 'coming_soon',
    order: 3,
    description: 'Organized articles and reference materials',
    color: '#8b5cf6',
    permissions: {
      view: ['user', 'admin'],
      edit: ['user', 'admin']
    },
    featureFlags: {
      required: ['kb.enabled']
    }
  },
  {
    name: 'Messages',
    slug: 'messages',
    icon: 'MessageSquare',
    status: 'coming_soon',
    order: 4,
    description: 'Communication and collaboration',
    color: '#10b981',
    permissions: {
      view: ['user', 'admin'],
      edit: ['user', 'admin']
    },
    featureFlags: {
      required: ['messages.enabled']
    }
  }
];

export async function seedAreas() {
  try {
    // Check if areas already exist
    const existingCount = await Area.countDocuments();

    if (existingCount > 0) {
      console.log(`📋 Areas already seeded (${existingCount} areas exist)`);
      return;
    }

    // Insert initial areas
    await Area.insertMany(initialAreas);
    console.log('✅ Initial areas seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding areas:', error.message);
  }
}

export default seedAreas;
