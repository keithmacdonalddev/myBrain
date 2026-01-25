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

import authRoutes from '../routes/auth.js';
import notesRoutes from '../routes/notes.js';
import tasksRoutes from '../routes/tasks.js';
import projectsRoutes from '../routes/projects.js';
import eventsRoutes from '../routes/events.js';
import lifeAreasRoutes from '../routes/lifeAreas.js';
import foldersRoutes from '../routes/folders.js';
import filesRoutes from '../routes/files.js';
import profileRoutes from '../routes/profile.js';
import tagsRoutes from '../routes/tags.js';
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

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
