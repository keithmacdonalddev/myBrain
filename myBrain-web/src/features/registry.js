import { lazy } from 'react';

/**
 * Feature Registry
 *
 * Each feature module is registered here with its configuration.
 * Features can be lazy-loaded for better performance.
 *
 * Note: The actual area status (active/coming_soon) comes from the API.
 * This registry maps slugs to their frontend components.
 */
export const FEATURE_REGISTRY = {
  notes: {
    slug: 'notes',
    name: 'Notes',
    icon: 'StickyNote',
    // Lazy load the notes routes when needed
    component: lazy(() => import('./notes/routes')),
    basePath: '/app/notes',
  },

  fitness: {
    slug: 'fitness',
    name: 'Fitness',
    icon: 'Dumbbell',
    component: lazy(() => import('./fitness/routes')),
    basePath: '/app/fitness',
  },

  kb: {
    slug: 'kb',
    name: 'Knowledge Base',
    icon: 'BookOpen',
    component: lazy(() => import('./kb/routes')),
    basePath: '/app/kb',
  },

  messages: {
    slug: 'messages',
    name: 'Messages',
    icon: 'MessageSquare',
    component: lazy(() => import('./messages/routes')),
    basePath: '/app/messages',
  },
};

/**
 * Get feature config by slug
 */
export function getFeatureBySlug(slug) {
  return FEATURE_REGISTRY[slug] || null;
}

/**
 * Check if a feature has a registered component
 */
export function hasFeatureComponent(slug) {
  return slug in FEATURE_REGISTRY;
}

export default FEATURE_REGISTRY;
