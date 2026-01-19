import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Helper to get random items from array
const randomFrom = (arr, count = 1) => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return count === 1 ? shuffled[0] : shuffled.slice(0, count);
};

// Helper to get random date within range
const randomDate = (daysBack = 30, daysForward = 30) => {
  const now = Date.now();
  const back = now - daysBack * 24 * 60 * 60 * 1000;
  const forward = now + daysForward * 24 * 60 * 60 * 1000;
  return new Date(back + Math.random() * (forward - back));
};

// Helper to get past date
const pastDate = (daysBack = 30) => {
  return new Date(Date.now() - Math.random() * daysBack * 24 * 60 * 60 * 1000);
};

// ============================================
// CONTENT TEMPLATES
// ============================================

const projectTemplates = [
  { title: 'Website Redesign', description: 'Complete overhaul of the company website with modern design principles', outcome: 'Launch new website with improved UX and 30% faster load times', tags: ['design', 'web', 'ux'] },
  { title: 'Mobile App Development', description: 'Build a cross-platform mobile application for our core product', outcome: 'Release MVP on iOS and Android app stores', tags: ['mobile', 'development', 'react-native'] },
  { title: 'Q4 Marketing Campaign', description: 'Plan and execute marketing campaign for holiday season', outcome: 'Achieve 25% increase in brand awareness', tags: ['marketing', 'campaign', 'q4'] },
  { title: 'Customer Feedback System', description: 'Implement a system to collect and analyze customer feedback', outcome: 'Deploy feedback widget and dashboard', tags: ['customer', 'feedback', 'analytics'] },
  { title: 'Team Knowledge Base', description: 'Create centralized documentation for team processes and guidelines', outcome: 'Complete wiki with 50+ articles', tags: ['documentation', 'wiki', 'team'] },
  { title: 'Security Audit', description: 'Comprehensive security review of all systems and processes', outcome: 'Pass SOC 2 compliance audit', tags: ['security', 'compliance', 'audit'] },
  { title: 'Performance Optimization', description: 'Improve application performance and reduce server costs', outcome: 'Reduce response time by 50% and costs by 30%', tags: ['performance', 'optimization', 'devops'] },
  { title: 'New Feature: Dashboard', description: 'Build analytics dashboard for power users', outcome: 'Ship dashboard with 10 customizable widgets', tags: ['feature', 'dashboard', 'analytics'] },
  { title: 'Content Strategy 2024', description: 'Develop comprehensive content strategy for the year', outcome: 'Publish content calendar and style guide', tags: ['content', 'strategy', 'planning'] },
  { title: 'API Integration Hub', description: 'Build integrations with popular third-party services', outcome: 'Launch 5 new integrations', tags: ['api', 'integrations', 'development'] },
  { title: 'User Onboarding Revamp', description: 'Redesign the user onboarding experience', outcome: 'Increase activation rate by 40%', tags: ['onboarding', 'ux', 'growth'] },
  { title: 'Data Pipeline Migration', description: 'Migrate data pipelines to new architecture', outcome: 'Complete migration with zero downtime', tags: ['data', 'migration', 'infrastructure'] },
  { title: 'Brand Refresh', description: 'Update brand identity and visual language', outcome: 'New brand guidelines and asset library', tags: ['brand', 'design', 'identity'] },
  { title: 'Employee Training Program', description: 'Develop comprehensive training for new hires', outcome: 'Launch 20-hour training curriculum', tags: ['training', 'hr', 'onboarding'] },
  { title: 'Accessibility Compliance', description: 'Ensure all products meet WCAG 2.1 standards', outcome: 'Achieve AA compliance across all pages', tags: ['accessibility', 'a11y', 'compliance'] },
];

const taskTemplates = [
  { title: 'Review pull request for authentication module', body: 'Check code quality, security implications, and test coverage', tags: ['code-review', 'security'] },
  { title: 'Update project documentation', body: 'Add new API endpoints and update architecture diagrams', tags: ['documentation'] },
  { title: 'Schedule team standup meeting', body: 'Send calendar invites for daily standups next week', tags: ['meeting', 'team'] },
  { title: 'Fix responsive layout issues', body: 'Mobile menu not working correctly on iOS Safari', tags: ['bug', 'mobile', 'css'] },
  { title: 'Prepare quarterly presentation', body: 'Create slides summarizing Q3 achievements and Q4 goals', tags: ['presentation', 'quarterly'] },
  { title: 'Research competitor features', body: 'Analyze top 5 competitors and document feature gaps', tags: ['research', 'competitive'] },
  { title: 'Optimize database queries', body: 'Slow queries identified in monitoring - need optimization', tags: ['database', 'performance'] },
  { title: 'Write unit tests for payment service', body: 'Increase test coverage from 60% to 80%', tags: ['testing', 'payments'] },
  { title: 'Design email templates', body: 'Create responsive templates for transactional emails', tags: ['design', 'email'] },
  { title: 'Set up monitoring alerts', body: 'Configure PagerDuty alerts for critical services', tags: ['devops', 'monitoring'] },
  { title: 'Review user feedback from survey', body: 'Categorize and prioritize feedback from NPS survey', tags: ['feedback', 'user-research'] },
  { title: 'Update privacy policy', body: 'Legal team requested updates for GDPR compliance', tags: ['legal', 'privacy'] },
  { title: 'Create API documentation', body: 'Document new REST endpoints using OpenAPI spec', tags: ['api', 'documentation'] },
  { title: 'Implement dark mode toggle', body: 'Add theme switcher to settings page', tags: ['feature', 'ui'] },
  { title: 'Migrate to new CI/CD pipeline', body: 'Move from Jenkins to GitHub Actions', tags: ['devops', 'ci-cd'] },
  { title: 'Conduct user interviews', body: 'Schedule and run 5 user interviews this week', tags: ['research', 'interviews'] },
  { title: 'Refactor authentication flow', body: 'Simplify login/signup process based on feedback', tags: ['refactor', 'auth'] },
  { title: 'Create onboarding tutorial', body: 'Build interactive walkthrough for new users', tags: ['onboarding', 'tutorial'] },
  { title: 'Audit npm dependencies', body: 'Check for security vulnerabilities and outdated packages', tags: ['security', 'dependencies'] },
  { title: 'Plan team offsite agenda', body: 'Organize activities and sessions for Q4 offsite', tags: ['team', 'planning'] },
  { title: 'Review analytics dashboard', body: 'Check metrics and prepare weekly report', tags: ['analytics', 'reporting'] },
  { title: 'Update error handling', body: 'Improve error messages and add better logging', tags: ['errors', 'logging'] },
  { title: 'Create social media content', body: 'Draft posts for product launch announcement', tags: ['social', 'marketing'] },
  { title: 'Test payment integration', body: 'Verify Stripe webhook handling in staging', tags: ['testing', 'payments'] },
  { title: 'Organize design assets', body: 'Clean up Figma files and create component library', tags: ['design', 'organization'] },
  { title: 'Write blog post draft', body: 'Technical blog post about our architecture decisions', tags: ['content', 'blog'] },
  { title: 'Review support tickets', body: 'Triage and respond to high-priority support requests', tags: ['support', 'customer'] },
  { title: 'Update deployment scripts', body: 'Add rollback capability to deployment process', tags: ['devops', 'deployment'] },
  { title: 'Create user personas', body: 'Document 3 primary user personas based on research', tags: ['research', 'personas'] },
  { title: 'Implement rate limiting', body: 'Add rate limiting to public API endpoints', tags: ['api', 'security'] },
];

const noteTemplates = [
  { title: 'Meeting Notes: Product Roadmap', body: '# Product Roadmap Discussion\n\n## Key Decisions\n- Prioritize mobile app for Q1\n- Delay analytics dashboard to Q2\n- Focus on core user workflows\n\n## Action Items\n- [ ] Create detailed specs for mobile features\n- [ ] Schedule design review\n- [ ] Update stakeholders on timeline changes', tags: ['meeting', 'product', 'roadmap'] },
  { title: 'Ideas for User Engagement', body: '# Engagement Ideas\n\n1. **Gamification** - Add achievements and streaks\n2. **Social features** - Allow sharing and collaboration\n3. **Personalization** - Smart recommendations based on usage\n4. **Email campaigns** - Re-engagement sequences for inactive users\n\nNeed to validate these with user research.', tags: ['ideas', 'engagement', 'growth'] },
  { title: 'Technical Architecture Notes', body: '# System Architecture\n\n## Current Stack\n- Frontend: React + Redux\n- Backend: Node.js + Express\n- Database: MongoDB\n- Cache: Redis\n\n## Proposed Changes\n- Add message queue for async processing\n- Implement CDN for static assets\n- Consider GraphQL for mobile API', tags: ['technical', 'architecture'] },
  { title: 'Competitive Analysis Summary', body: '# Competitor Review\n\n## Competitor A\n- Strengths: Great UX, fast performance\n- Weaknesses: Limited integrations, expensive\n\n## Competitor B\n- Strengths: Many features, good pricing\n- Weaknesses: Cluttered UI, slow support\n\n## Our Differentiators\n- Simplicity and ease of use\n- Superior customer support\n- Flexible pricing', tags: ['research', 'competitive', 'analysis'] },
  { title: 'User Interview Insights', body: '# Interview with Sarah (Power User)\n\n## Pain Points\n- Difficulty finding old content\n- Wants better search functionality\n- Mobile app crashes occasionally\n\n## Feature Requests\n- Keyboard shortcuts\n- Dark mode\n- Export to PDF\n\n## Quotes\n> "I love the simplicity but wish I could customize more"', tags: ['research', 'interviews', 'feedback'] },
  { title: 'Sprint Retrospective', body: '# Sprint 23 Retro\n\n## What Went Well\n- Shipped auth improvements on time\n- Great collaboration with design team\n- Reduced bug count by 30%\n\n## What Could Improve\n- Better estimation of complex tasks\n- More async communication\n- Earlier involvement of QA\n\n## Action Items\n- Add buffer to estimates for unknowns\n- Create shared Slack channel for updates', tags: ['sprint', 'retro', 'team'] },
  { title: 'Feature Specification: Notifications', body: '# Notification System Spec\n\n## Requirements\n- Push notifications (iOS, Android, Web)\n- Email digests (daily/weekly)\n- In-app notification center\n- User preferences for each type\n\n## Technical Approach\n- Use Firebase for push\n- SendGrid for email\n- WebSocket for real-time in-app\n\n## Timeline\n- Design: 1 week\n- Development: 3 weeks\n- Testing: 1 week', tags: ['spec', 'feature', 'notifications'] },
  { title: 'Personal Goals Q4', body: '# Q4 Goals\n\n## Professional\n- [ ] Complete AWS certification\n- [ ] Give 2 tech talks\n- [ ] Mentor junior developer\n\n## Health\n- [ ] Exercise 3x per week\n- [ ] Read 4 books\n- [ ] Meditate daily\n\n## Financial\n- [ ] Max out 401k\n- [ ] Build emergency fund', tags: ['goals', 'personal', 'quarterly'] },
  { title: 'Book Notes: Atomic Habits', body: '# Atomic Habits by James Clear\n\n## Key Takeaways\n1. **1% better every day** - Small improvements compound\n2. **Identity-based habits** - Focus on who you want to become\n3. **Habit stacking** - Link new habits to existing ones\n4. **Environment design** - Make good habits easy, bad ones hard\n\n## Favorite Quotes\n> "You do not rise to the level of your goals. You fall to the level of your systems."', tags: ['books', 'productivity', 'learning'] },
  { title: 'API Design Guidelines', body: '# API Design Best Practices\n\n## Naming Conventions\n- Use plural nouns: `/users`, `/posts`\n- Use kebab-case: `/user-profiles`\n- Version in URL: `/v1/users`\n\n## Response Format\n```json\n{\n  "data": {},\n  "meta": { "page": 1, "total": 100 },\n  "errors": []\n}\n```\n\n## Error Handling\n- Use appropriate HTTP status codes\n- Include error code and message\n- Add request ID for debugging', tags: ['api', 'guidelines', 'technical'] },
  { title: 'Weekly Review Template', body: '# Weekly Review\n\n## Wins This Week\n- \n- \n- \n\n## Challenges\n- \n- \n\n## Lessons Learned\n- \n\n## Next Week Priorities\n1. \n2. \n3. \n\n## Gratitude\n- ', tags: ['template', 'review', 'productivity'] },
  { title: 'Design System Components', body: '# Component Library\n\n## Buttons\n- Primary, Secondary, Tertiary\n- Sizes: sm, md, lg\n- States: default, hover, active, disabled\n\n## Form Elements\n- Input, Textarea, Select\n- Checkbox, Radio, Toggle\n- Date picker, File upload\n\n## Feedback\n- Toast notifications\n- Modal dialogs\n- Inline alerts', tags: ['design', 'components', 'ui'] },
  { title: 'Debugging Session Notes', body: '# Bug: Users unable to save changes\n\n## Symptoms\n- Save button unresponsive\n- No network request sent\n- Console shows validation error\n\n## Root Cause\n- Form validation blocking submit\n- Hidden required field was empty\n\n## Solution\n- Added proper default value\n- Improved error messaging\n\n## Prevention\n- Add e2e test for save flow\n- Better form validation UX', tags: ['debugging', 'bug', 'technical'] },
  { title: 'Brainstorm: New Features', body: '# Feature Ideas Brainstorm\n\n## Quick Wins\n- Keyboard shortcuts\n- Duplicate item action\n- Bulk select and edit\n\n## Medium Effort\n- Templates library\n- Custom fields\n- Recurring items\n\n## Big Bets\n- AI-powered suggestions\n- Real-time collaboration\n- Mobile offline mode\n\nNeed to prioritize based on user requests and business impact.', tags: ['brainstorm', 'features', 'ideas'] },
  { title: 'Conference Talk Outline', body: '# Talk: Building Scalable Systems\n\n## Abstract\nLessons learned scaling from 1K to 1M users\n\n## Outline\n1. **Intro** (2 min) - Background and context\n2. **Challenge 1: Database** (8 min) - Sharding and caching\n3. **Challenge 2: API** (8 min) - Rate limiting and CDN\n4. **Challenge 3: Team** (5 min) - Communication at scale\n5. **Q&A** (7 min)\n\n## Key Slides\n- Before/after architecture diagram\n- Performance metrics graph\n- Cost comparison chart', tags: ['talk', 'conference', 'speaking'] },
];

const imageTemplates = [
  { title: 'Product Dashboard Screenshot', description: 'Main dashboard view showing key metrics', tags: ['screenshot', 'product', 'dashboard'], format: 'png', width: 1920, height: 1080 },
  { title: 'Team Photo - Offsite 2024', description: 'Group photo from our annual team offsite', tags: ['team', 'photo', 'offsite'], format: 'jpg', width: 4032, height: 3024 },
  { title: 'Architecture Diagram', description: 'High-level system architecture overview', tags: ['diagram', 'architecture', 'technical'], format: 'png', width: 2400, height: 1600 },
  { title: 'Mobile App Mockup', description: 'Design mockup for new mobile app feature', tags: ['design', 'mobile', 'mockup'], format: 'png', width: 1170, height: 2532 },
  { title: 'Logo Variations', description: 'Brand logo in different formats and colors', tags: ['brand', 'logo', 'design'], format: 'svg', width: 800, height: 400 },
  { title: 'User Flow Diagram', description: 'Onboarding user flow documentation', tags: ['ux', 'flow', 'diagram'], format: 'png', width: 3000, height: 2000 },
  { title: 'Conference Badge', description: 'Speaker badge from TechConf 2024', tags: ['conference', 'badge', 'event'], format: 'jpg', width: 1200, height: 1200 },
  { title: 'Office Space', description: 'Our new office in downtown', tags: ['office', 'photo', 'workspace'], format: 'jpg', width: 4000, height: 3000 },
  { title: 'Wireframe - Settings Page', description: 'Low-fidelity wireframe for settings redesign', tags: ['wireframe', 'design', 'settings'], format: 'png', width: 1440, height: 900 },
  { title: 'Analytics Chart', description: 'Monthly active users growth chart', tags: ['analytics', 'chart', 'data'], format: 'png', width: 1600, height: 900 },
  { title: 'Social Media Banner', description: 'Twitter header image for product launch', tags: ['social', 'marketing', 'banner'], format: 'jpg', width: 1500, height: 500 },
  { title: 'Icon Set Preview', description: 'Custom icon set for the application', tags: ['icons', 'design', 'ui'], format: 'png', width: 2000, height: 1500 },
  { title: 'Presentation Slide', description: 'Key slide from investor presentation', tags: ['presentation', 'slide', 'business'], format: 'png', width: 1920, height: 1080 },
  { title: 'Error State Design', description: 'Empty state and error page designs', tags: ['design', 'error', 'ui'], format: 'png', width: 1440, height: 900 },
  { title: 'Customer Testimonial', description: 'Quote graphic from happy customer', tags: ['testimonial', 'marketing', 'customer'], format: 'jpg', width: 1080, height: 1080 },
];

const fileTemplates = [
  { title: 'Q3 Financial Report', description: 'Quarterly financial summary and projections', tags: ['finance', 'report', 'quarterly'], mimeType: 'application/pdf', extension: 'pdf', fileCategory: 'document', size: 2500000 },
  { title: 'Product Requirements Doc', description: 'PRD for notification system feature', tags: ['product', 'prd', 'requirements'], mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extension: 'docx', fileCategory: 'document', size: 150000 },
  { title: 'Budget Spreadsheet 2024', description: 'Annual budget planning and tracking', tags: ['finance', 'budget', 'spreadsheet'], mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', extension: 'xlsx', fileCategory: 'spreadsheet', size: 500000 },
  { title: 'Brand Guidelines', description: 'Complete brand identity guidelines', tags: ['brand', 'design', 'guidelines'], mimeType: 'application/pdf', extension: 'pdf', fileCategory: 'document', size: 8000000 },
  { title: 'Team Presentation', description: 'Company all-hands presentation slides', tags: ['presentation', 'team', 'slides'], mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', extension: 'pptx', fileCategory: 'presentation', size: 15000000 },
  { title: 'API Documentation', description: 'REST API reference documentation', tags: ['api', 'documentation', 'technical'], mimeType: 'application/pdf', extension: 'pdf', fileCategory: 'document', size: 1200000 },
  { title: 'User Research Data', description: 'Survey responses and analysis', tags: ['research', 'data', 'survey'], mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', extension: 'xlsx', fileCategory: 'spreadsheet', size: 800000 },
  { title: 'Contract Template', description: 'Standard contractor agreement template', tags: ['legal', 'contract', 'template'], mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extension: 'docx', fileCategory: 'document', size: 95000 },
  { title: 'Marketing Assets Archive', description: 'Collection of marketing materials', tags: ['marketing', 'assets', 'archive'], mimeType: 'application/zip', extension: 'zip', fileCategory: 'archive', size: 50000000 },
  { title: 'Database Schema', description: 'Current database schema documentation', tags: ['database', 'schema', 'technical'], mimeType: 'application/pdf', extension: 'pdf', fileCategory: 'document', size: 450000 },
  { title: 'Meeting Recording', description: 'Product strategy meeting recording', tags: ['meeting', 'recording', 'video'], mimeType: 'video/mp4', extension: 'mp4', fileCategory: 'video', size: 250000000 },
  { title: 'Podcast Episode Draft', description: 'Raw audio for company podcast', tags: ['podcast', 'audio', 'content'], mimeType: 'audio/mpeg', extension: 'mp3', fileCategory: 'audio', size: 45000000 },
  { title: 'Source Code Backup', description: 'Repository backup from last release', tags: ['code', 'backup', 'technical'], mimeType: 'application/zip', extension: 'zip', fileCategory: 'archive', size: 75000000 },
  { title: 'Employee Handbook', description: 'Company policies and procedures', tags: ['hr', 'handbook', 'policies'], mimeType: 'application/pdf', extension: 'pdf', fileCategory: 'document', size: 3500000 },
  { title: 'Sales Deck', description: 'Customer-facing sales presentation', tags: ['sales', 'presentation', 'customer'], mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', extension: 'pptx', fileCategory: 'presentation', size: 12000000 },
];

// ============================================
// SEED FUNCTION
// ============================================

async function seedContent() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('MONGO_URI not found in environment variables');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB\n');

    // Import models
    const User = (await import('../src/models/User.js')).default;
    const Task = (await import('../src/models/Task.js')).default;
    const Note = (await import('../src/models/Note.js')).default;
    const Project = (await import('../src/models/Project.js')).default;
    const Image = (await import('../src/models/Image.js')).default;
    const File = (await import('../src/models/File.js')).default;

    // Get all mock users (non-admin)
    const mockUsers = await User.find({
      email: { $regex: '@example.com$' },
      role: { $ne: 'admin' }
    });

    if (mockUsers.length === 0) {
      console.error('No mock users found. Run seedMockUsers.js first.');
      process.exit(1);
    }

    console.log(`Found ${mockUsers.length} mock users. Adding content...\n`);

    const statuses = ['todo', 'in_progress', 'done'];
    const priorities = ['low', 'medium', 'high'];
    const projectStatuses = ['active', 'completed', 'on_hold', 'someday'];
    const noteStatuses = ['active', 'archived'];

    let totalProjects = 0, totalTasks = 0, totalNotes = 0, totalImages = 0, totalFiles = 0;

    for (const user of mockUsers) {
      console.log(`Adding content for ${user.email}...`);

      // Add 2-4 projects per user
      const projectCount = 2 + Math.floor(Math.random() * 3);
      const userProjects = randomFrom(projectTemplates, projectCount);

      for (const template of userProjects) {
        const project = new Project({
          userId: user._id,
          title: template.title,
          description: template.description,
          outcome: template.outcome,
          status: randomFrom(projectStatuses),
          priority: randomFrom(priorities),
          deadline: Math.random() > 0.3 ? randomDate(0, 60) : null,
          tags: template.tags,
          createdAt: pastDate(60),
        });
        await project.save();
        totalProjects++;
      }

      // Add 8-15 tasks per user
      const taskCount = 8 + Math.floor(Math.random() * 8);
      const userTasks = randomFrom(taskTemplates, taskCount);

      for (const template of userTasks) {
        const status = randomFrom(statuses);
        const task = new Task({
          userId: user._id,
          title: template.title,
          body: template.body,
          status,
          priority: randomFrom(priorities),
          dueDate: Math.random() > 0.4 ? randomDate(-7, 14) : null,
          tags: template.tags,
          completedAt: status === 'done' ? pastDate(14) : null,
          createdAt: pastDate(45),
        });
        await task.save();
        totalTasks++;
      }

      // Add 5-10 notes per user
      const noteCount = 5 + Math.floor(Math.random() * 6);
      const userNotes = randomFrom(noteTemplates, noteCount);

      for (const template of userNotes) {
        const note = new Note({
          userId: user._id,
          title: template.title,
          body: template.body,
          tags: template.tags,
          pinned: Math.random() > 0.8,
          status: randomFrom(noteStatuses),
          processed: Math.random() > 0.5,
          createdAt: pastDate(90),
          lastOpenedAt: pastDate(7),
        });
        await note.save();
        totalNotes++;
      }

      // Add 3-8 images per user (mock entries)
      const imageCount = 3 + Math.floor(Math.random() * 6);
      const userImages = randomFrom(imageTemplates, imageCount);

      for (const template of userImages) {
        const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
        const image = new Image({
          userId: user._id,
          storageProvider: 's3',
          storageKey: `users/${user._id}/images/${uniqueId}.${template.format}`,
          storageBucket: 'mybrain-uploads',
          cloudinaryId: `mock_${user._id}_${uniqueId}`, // Unique ID to avoid duplicate key error
          filename: `${template.title.toLowerCase().replace(/\s+/g, '-')}.${template.format}`,
          originalName: `${template.title}.${template.format}`,
          format: template.format,
          mimeType: `image/${template.format === 'svg' ? 'svg+xml' : template.format}`,
          size: 100000 + Math.floor(Math.random() * 5000000),
          width: template.width,
          height: template.height,
          aspectRatio: template.width / template.height,
          title: template.title,
          description: template.description,
          tags: template.tags,
          favorite: Math.random() > 0.8,
          createdAt: pastDate(120),
        });
        await image.save();
        totalImages++;
      }

      // Add 2-5 files per user (mock entries)
      const fileCount = 2 + Math.floor(Math.random() * 4);
      const userFiles = randomFrom(fileTemplates, fileCount);

      for (const template of userFiles) {
        const file = new File({
          userId: user._id,
          storageProvider: 's3',
          storageKey: `users/${user._id}/files/${Date.now()}-${Math.random().toString(36).substring(7)}.${template.extension}`,
          storageBucket: 'mybrain-uploads',
          filename: `${template.title.toLowerCase().replace(/\s+/g, '-')}.${template.extension}`,
          originalName: `${template.title}.${template.extension}`,
          mimeType: template.mimeType,
          extension: template.extension,
          fileCategory: template.fileCategory,
          size: template.size,
          title: template.title,
          description: template.description,
          tags: template.tags,
          favorite: Math.random() > 0.85,
          createdAt: pastDate(90),
        });
        await file.save();
        totalFiles++;
      }
    }

    console.log('\n========================================');
    console.log('SEED COMPLETE');
    console.log('========================================');
    console.log(`Projects: ${totalProjects}`);
    console.log(`Tasks:    ${totalTasks}`);
    console.log(`Notes:    ${totalNotes}`);
    console.log(`Images:   ${totalImages}`);
    console.log(`Files:    ${totalFiles}`);
    console.log(`Total:    ${totalProjects + totalTasks + totalNotes + totalImages + totalFiles} items`);
    console.log('========================================');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding content:', error);
    process.exit(1);
  }
}

seedContent();
