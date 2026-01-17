import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    cloudinaryId: {
      type: String,
      required: true,
      unique: true,
    },
    url: {
      type: String,
      required: true,
    },
    secureUrl: {
      type: String,
      required: true,
    },
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    format: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    width: {
      type: Number,
    },
    height: {
      type: Number,
    },
    folder: {
      type: String,
      enum: ['library', 'avatars'],
      default: 'library',
    },
    alt: {
      type: String,
      default: '',
    },
    tags: [{
      type: String,
    }],
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
imageSchema.index({ userId: 1, folder: 1, createdAt: -1 });

const Image = mongoose.model('Image', imageSchema);

export default Image;
