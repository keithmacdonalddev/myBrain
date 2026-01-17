import mongoose from 'mongoose';

const savedFilterSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Filter name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  entityType: {
    type: String,
    enum: ['note', 'task'],
    required: true
  },
  filters: {
    q: { type: String, default: '' },
    status: { type: mongoose.Schema.Types.Mixed, default: null },
    tags: { type: [String], default: [] },
    priority: { type: String, default: null },
    dueDate: { type: mongoose.Schema.Types.Mixed, default: null },
    processed: { type: Boolean, default: null }
  },
  sortBy: {
    type: String,
    default: '-updatedAt'
  },
  icon: {
    type: String,
    default: 'filter'
  },
  color: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Compound index for user's filters
savedFilterSchema.index({ userId: 1, entityType: 1 });

// Method to convert to safe JSON
savedFilterSchema.methods.toSafeJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const SavedFilter = mongoose.model('SavedFilter', savedFilterSchema);

export default SavedFilter;
