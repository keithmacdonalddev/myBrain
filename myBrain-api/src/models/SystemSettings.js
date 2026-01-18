import mongoose from 'mongoose';

const killSwitchSchema = new mongoose.Schema({
  enabled: {
    type: Boolean,
    default: true
  },
  disabledAt: Date,
  disabledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reason: String
}, { _id: false });

const systemSettingsSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: 'system'
  },
  featureKillSwitches: {
    type: Map,
    of: killSwitchSchema,
    default: new Map()
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: false,
  collection: 'system_settings'
});

/**
 * Get system settings singleton
 * Creates default settings if none exist
 */
systemSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findById('system');
  if (!settings) {
    settings = await this.create({ _id: 'system' });
  }
  return settings;
};

/**
 * Check if a feature is globally killed
 * Returns true if feature is killed (disabled), false otherwise
 */
systemSettingsSchema.statics.isFeatureKilled = async function(featureName) {
  const settings = await this.getSettings();
  const killSwitch = settings.featureKillSwitches.get(featureName);
  if (!killSwitch) return false;
  return !killSwitch.enabled;
};

/**
 * Set a feature kill switch
 * @param {string} featureName - Name of the feature
 * @param {boolean} enabled - Whether the feature should be enabled
 * @param {ObjectId} adminId - Admin user ID making the change
 * @param {string} reason - Reason for the change
 */
systemSettingsSchema.statics.setFeatureKillSwitch = async function(featureName, enabled, adminId, reason = '') {
  const settings = await this.getSettings();

  const killSwitch = {
    enabled,
    reason
  };

  if (!enabled) {
    killSwitch.disabledAt = new Date();
    killSwitch.disabledBy = adminId;
  } else {
    // When re-enabling, clear the disabled info but keep record
    killSwitch.disabledAt = null;
    killSwitch.disabledBy = null;
  }

  settings.featureKillSwitches.set(featureName, killSwitch);
  settings.updatedAt = new Date();
  settings.updatedBy = adminId;

  await settings.save();
  return settings;
};

/**
 * Get all kill switches as a plain object
 */
systemSettingsSchema.methods.getKillSwitchesObject = function() {
  const result = {};
  for (const [key, value] of this.featureKillSwitches) {
    result[key] = {
      enabled: value.enabled,
      disabledAt: value.disabledAt,
      disabledBy: value.disabledBy,
      reason: value.reason
    };
  }
  return result;
};

/**
 * Convert to safe JSON for API response
 */
systemSettingsSchema.methods.toSafeJSON = function() {
  return {
    featureKillSwitches: this.getKillSwitchesObject(),
    updatedAt: this.updatedAt,
    updatedBy: this.updatedBy
  };
};

const SystemSettings = mongoose.model('SystemSettings', systemSettingsSchema);

export default SystemSettings;
