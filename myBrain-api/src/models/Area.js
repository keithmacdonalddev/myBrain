import mongoose from 'mongoose';

const areaSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Area name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  slug: {
    type: String,
    required: [true, 'Area slug is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens']
  },
  icon: {
    type: String,
    required: true,
    default: 'Folder'
  },
  status: {
    type: String,
    enum: ['active', 'coming_soon', 'hidden'],
    default: 'coming_soon'
  },
  order: {
    type: Number,
    default: 0
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  color: {
    type: String,
    default: null
  },
  permissions: {
    view: {
      type: [String],
      enum: ['user', 'admin'],
      default: ['user', 'admin']
    },
    edit: {
      type: [String],
      enum: ['user', 'admin'],
      default: ['user', 'admin']
    }
  },
  featureFlags: {
    required: {
      type: [String],
      default: []
    }
  },
  metadata: {
    totalRecords: {
      type: Number,
      default: 0
    },
    lastActivity: {
      type: Date,
      default: null
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Indexes
areaSchema.index({ slug: 1 }, { unique: true });
areaSchema.index({ order: 1 });
areaSchema.index({ status: 1 });

// Method to convert to safe JSON
areaSchema.methods.toSafeJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// Static method to get areas for a user based on role and flags
areaSchema.statics.getAreasForUser = async function(user) {
  const areas = await this.find({
    status: { $ne: 'hidden' }
  }).sort({ order: 1 });

  return areas.filter(area => {
    // Check if user role has view permission
    if (!area.permissions.view.includes(user.role)) {
      return false;
    }

    // Check required feature flags
    if (area.featureFlags.required.length > 0) {
      const hasAllFlags = area.featureFlags.required.every(flag =>
        user.flags && user.flags.get(flag) === true
      );
      if (!hasAllFlags) {
        return false;
      }
    }

    return true;
  });
};

const Area = mongoose.model('Area', areaSchema);

export default Area;
