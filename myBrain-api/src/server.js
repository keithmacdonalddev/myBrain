import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.js';
import notesRoutes from './routes/notes.js';
import tasksRoutes from './routes/tasks.js';
import filtersRoutes from './routes/filters.js';
import adminRoutes from './routes/admin.js';
import profileRoutes from './routes/profile.js';
import imagesRoutes from './routes/images.js';
import eventsRoutes from './routes/events.js';
import tagsRoutes from './routes/tags.js';
import lifeAreasRoutes from './routes/lifeAreas.js';
import projectsRoutes from './routes/projects.js';
import savedLocationsRoutes from './routes/savedLocations.js';
import weatherRoutes from './routes/weather.js';
import analyticsRoutes from './routes/analytics.js';
import logsRoutes from './routes/logs.js';

// Import middleware
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  exposedHeaders: ['X-Request-Id']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging (adds requestId to all requests)
app.use(requestLogger);

// Test route
app.get('/', (req, res) => {
  res.json({
    message: 'myBrain API is running!',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    requestId: req.requestId
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/auth', authRoutes);
app.use('/notes', notesRoutes);
app.use('/tasks', tasksRoutes);
app.use('/filters', filtersRoutes);
app.use('/admin', adminRoutes);
app.use('/profile', profileRoutes);
app.use('/images', imagesRoutes);
app.use('/events', eventsRoutes);
app.use('/tags', tagsRoutes);
app.use('/life-areas', lifeAreasRoutes);
app.use('/projects', projectsRoutes);
app.use('/saved-locations', savedLocationsRoutes);
app.use('/weather', weatherRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/logs', logsRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;

    if (!mongoURI) {
      console.log('Warning: MONGO_URI not found in environment variables');
      console.log('Server will run without database connection');
      console.log('Add MONGO_URI to .env file to connect to MongoDB');
      return;
    }

    await mongoose.connect(mongoURI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`\nServer running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`CORS enabled for: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
    console.log('\nReady to receive requests!\n');
  });
};

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\nShutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});
