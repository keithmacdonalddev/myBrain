import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import authRoutes from '../routes/auth.js';
import notesRoutes from '../routes/notes.js';
import lifeAreasRoutes from '../routes/lifeAreas.js';
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
app.use('/life-areas', lifeAreasRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
