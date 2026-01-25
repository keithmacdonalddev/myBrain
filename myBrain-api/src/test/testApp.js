import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

// Import models to register them with Mongoose (required by services like limitService)
import '../models/User.js';
import '../models/Note.js';
import '../models/Image.js';
import '../models/File.js';
import '../models/Task.js';
import '../models/Project.js';
import '../models/Event.js';
import '../models/LifeArea.js';
import '../models/Folder.js';
import '../models/Tag.js';
import '../models/Connection.js';
import '../models/UserBlock.js';
import '../models/Notification.js';
import '../models/Activity.js';
import '../models/Conversation.js';
import '../models/ItemShare.js';
import '../models/UsageStats.js';
import '../models/SidebarConfig.js';
import '../models/Message.js';
import '../models/SavedFilter.js';
import '../models/SavedLocation.js';
import '../models/FileShare.js';
import '../models/Report.js';
import '../models/Log.js';
import '../models/SystemSettings.js';
import '../models/RoleConfig.js';
import '../models/ModerationAction.js';
import '../models/ModerationTemplate.js';
import '../models/AnalyticsEvent.js';
import '../models/AdminMessage.js';

import authRoutes from '../routes/auth.js';
import savedLocationsRoutes from '../routes/savedLocations.js';
import filtersRoutes from '../routes/filters.js';
import messagesRoutes from '../routes/messages.js';
import connectionsRoutes from '../routes/connections.js';
import notificationsRoutes from '../routes/notifications.js';
import notesRoutes from '../routes/notes.js';
import tasksRoutes from '../routes/tasks.js';
import projectsRoutes from '../routes/projects.js';
import eventsRoutes from '../routes/events.js';
import lifeAreasRoutes from '../routes/lifeAreas.js';
import foldersRoutes from '../routes/folders.js';
import filesRoutes from '../routes/files.js';
import profileRoutes from '../routes/profile.js';
import tagsRoutes from '../routes/tags.js';
import dashboardRoutes from '../routes/dashboard.js';
import settingsRoutes from '../routes/settings.js';
import imagesRoutes from '../routes/images.js';
import itemSharesRoutes from '../routes/itemShares.js';
import usersRoutes from '../routes/users.js';
import sharesRoutes from '../routes/shares.js';
import reportsRoutes from '../routes/reports.js';
import weatherRoutes from '../routes/weather.js';
import analyticsRoutes from '../routes/analytics.js';
import logsRoutes from '../routes/logs.js';
import adminRoutes from '../routes/admin.js';
import { requestLogger } from '../middleware/requestLogger.js';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler.js';

// Create Express app for testing (without starting server)
const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(requestLogger);

// Routes
app.use('/auth', authRoutes);
app.use('/notes', notesRoutes);
app.use('/tasks', tasksRoutes);
app.use('/projects', projectsRoutes);
app.use('/events', eventsRoutes);
app.use('/life-areas', lifeAreasRoutes);
app.use('/folders', foldersRoutes);
app.use('/files', filesRoutes);
app.use('/profile', profileRoutes);
app.use('/tags', tagsRoutes);
app.use('/connections', connectionsRoutes);
app.use('/notifications', notificationsRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/images', imagesRoutes);
app.use('/settings', settingsRoutes);
app.use('/messages', messagesRoutes);
app.use('/filters', filtersRoutes);
app.use('/saved-locations', savedLocationsRoutes);
app.use('/item-shares', itemSharesRoutes);
app.use('/users', usersRoutes);
app.use('/share', sharesRoutes);
app.use('/reports', reportsRoutes);
app.use('/weather', weatherRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/logs', logsRoutes);
app.use('/admin', adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
