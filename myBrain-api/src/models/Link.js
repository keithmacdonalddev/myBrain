import mongoose from 'mongoose';

const linkSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sourceType: {
    type: String,
    enum: ['note', 'task'],
    required: true
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'sourceType'
  },
  targetType: {
    type: String,
    enum: ['note', 'task'],
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'targetType'
  },
  linkType: {
    type: String,
    enum: ['reference', 'converted_from', 'related'],
    default: 'reference'
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
linkSchema.index({ userId: 1, sourceType: 1, sourceId: 1 });
linkSchema.index({ userId: 1, targetType: 1, targetId: 1 });
linkSchema.index({ sourceId: 1, targetId: 1 }, { unique: true });

// Method to convert to safe JSON
linkSchema.methods.toSafeJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// Get all links for an entity (both directions)
linkSchema.statics.getLinks = async function(userId, entityType, entityId) {
  const [outgoing, incoming] = await Promise.all([
    this.find({ userId, sourceType: entityType, sourceId: entityId }),
    this.find({ userId, targetType: entityType, targetId: entityId })
  ]);
  return { outgoing, incoming };
};

// Get backlinks (entities linking TO this entity)
linkSchema.statics.getBacklinks = async function(userId, entityType, entityId) {
  return this.find({
    userId,
    targetType: entityType,
    targetId: entityId
  });
};

const Link = mongoose.model('Link', linkSchema);

export default Link;
