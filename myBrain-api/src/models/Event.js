import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['notification', 'email'],
    default: 'notification',
  },
  minutes: {
    type: Number,
    required: true,
    default: 15,
  },
}, { _id: false });

const recurrenceSchema = new mongoose.Schema({
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    required: true,
  },
  interval: {
    type: Number,
    default: 1,
    min: 1,
  },
  endDate: {
    type: Date,
  },
  count: {
    type: Number,
  },
  daysOfWeek: [{
    type: Number,
    min: 0,
    max: 6,
  }],
  exceptions: [{
    type: Date,
  }],
}, { _id: false });

const eventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    lifeAreaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LifeArea',
      default: null,
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxLength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxLength: 5000,
    },

    // Timing
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    allDay: {
      type: Boolean,
      default: false,
    },
    timezone: {
      type: String,
      default: 'UTC',
    },

    // Recurrence
    recurrence: recurrenceSchema,

    // Location
    location: {
      type: String,
      trim: true,
      maxLength: 500,
    },
    meetingUrl: {
      type: String,
      trim: true,
    },

    // Relationships
    linkedTasks: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
    }],
    linkedNotes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Note',
    }],
    area: {
      type: String,
      trim: true,
    },

    // Appearance
    color: {
      type: String,
      default: '#3b82f6', // primary blue
    },

    // Reminders
    reminders: [reminderSchema],

    // External sync
    externalId: {
      type: String,
      index: true,
    },
    externalSource: {
      type: String,
      enum: ['google', 'outlook', 'manual'],
      default: 'manual',
    },

    // Status
    status: {
      type: String,
      enum: ['confirmed', 'tentative', 'cancelled'],
      default: 'confirmed',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
eventSchema.index({ userId: 1, startDate: 1, endDate: 1 });
eventSchema.index({ userId: 1, status: 1 });
eventSchema.index({ userId: 1, lifeAreaId: 1, startDate: 1 });
eventSchema.index({ userId: 1, projectId: 1, startDate: 1 });

// Validate endDate is after startDate
eventSchema.pre('validate', function(next) {
  if (this.endDate && this.startDate && this.endDate < this.startDate) {
    this.invalidate('endDate', 'End date must be after start date');
  }
  next();
});

const Event = mongoose.model('Event', eventSchema);

export default Event;
