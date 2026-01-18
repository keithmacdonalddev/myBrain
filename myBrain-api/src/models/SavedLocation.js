import mongoose from 'mongoose';

const savedLocationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Location name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
    maxlength: [500, 'Address cannot exceed 500 characters']
  },
  // Optional coordinates for future map features
  coordinates: {
    lat: { type: Number, default: null },
    lon: { type: Number, default: null }
  },
  // Category for organization (home, work, etc.)
  category: {
    type: String,
    enum: ['home', 'work', 'other'],
    default: 'other'
  },
  // Order for custom sorting
  order: {
    type: Number,
    default: 0
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound index for user's locations
savedLocationSchema.index({ userId: 1, order: 1 });

// Ensure only one default per user
savedLocationSchema.index(
  { userId: 1, isDefault: 1 },
  {
    unique: true,
    partialFilterExpression: { isDefault: true }
  }
);

// Method to convert to safe JSON
savedLocationSchema.methods.toSafeJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// Static method to get all locations for a user
savedLocationSchema.statics.getUserLocations = async function(userId) {
  return this.find({ userId }).sort({ order: 1, createdAt: -1 });
};

// Static method to set default location
savedLocationSchema.statics.setDefault = async function(userId, locationId) {
  // Remove default from all other locations
  await this.updateMany(
    { userId, isDefault: true },
    { $set: { isDefault: false } }
  );

  // Set new default
  return this.findOneAndUpdate(
    { _id: locationId, userId },
    { $set: { isDefault: true } },
    { new: true }
  );
};

// Static method to reorder locations
savedLocationSchema.statics.reorder = async function(userId, orderedIds) {
  const updates = orderedIds.map((id, index) => ({
    updateOne: {
      filter: { _id: id, userId },
      update: { $set: { order: index } }
    }
  }));

  await this.bulkWrite(updates);
  return this.getUserLocations(userId);
};

const SavedLocation = mongoose.model('SavedLocation', savedLocationSchema);

export default SavedLocation;
