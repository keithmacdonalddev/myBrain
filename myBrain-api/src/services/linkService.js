import Link from '../models/Link.js';
import Note from '../models/Note.js';
import Task from '../models/Task.js';

/**
 * Links Service
 * Business logic for bidirectional link operations
 */

/**
 * Create a link between two entities
 */
export async function createLink(userId, source, target, linkType = 'reference') {
  const link = await Link.findOneAndUpdate(
    { sourceId: source.id, targetId: target.id },
    {
      userId,
      sourceType: source.type,
      sourceId: source.id,
      targetType: target.type,
      targetId: target.id,
      linkType
    },
    { upsert: true, new: true }
  );

  return link;
}

/**
 * Remove a link between two entities
 */
export async function removeLink(userId, source, target) {
  const result = await Link.deleteOne({
    userId,
    sourceType: source.type,
    sourceId: source.id,
    targetType: target.type,
    targetId: target.id
  });

  return result.deletedCount > 0;
}

/**
 * Get all backlinks for an entity (entities that link TO this entity)
 */
export async function getBacklinks(userId, entityType, entityId) {
  const backlinks = await Link.find({
    userId,
    targetType: entityType,
    targetId: entityId
  });

  // Populate source entities
  const populated = await Promise.all(
    backlinks.map(async (link) => {
      const linkObj = link.toSafeJSON();

      if (link.sourceType === 'note') {
        const note = await Note.findById(link.sourceId);
        if (note) {
          linkObj.source = note.toSafeJSON();
        }
      } else if (link.sourceType === 'task') {
        const task = await Task.findById(link.sourceId);
        if (task) {
          linkObj.source = task.toSafeJSON();
        }
      }

      return linkObj;
    })
  );

  return populated.filter(l => l.source);
}

/**
 * Get all outgoing links from an entity (entities this entity links TO)
 */
export async function getOutgoingLinks(userId, entityType, entityId) {
  const links = await Link.find({
    userId,
    sourceType: entityType,
    sourceId: entityId
  });

  // Populate target entities
  const populated = await Promise.all(
    links.map(async (link) => {
      const linkObj = link.toSafeJSON();

      if (link.targetType === 'note') {
        const note = await Note.findById(link.targetId);
        if (note) {
          linkObj.target = note.toSafeJSON();
        }
      } else if (link.targetType === 'task') {
        const task = await Task.findById(link.targetId);
        if (task) {
          linkObj.target = task.toSafeJSON();
        }
      }

      return linkObj;
    })
  );

  return populated.filter(l => l.target);
}

/**
 * Get all links for an entity (both directions)
 */
export async function getAllLinks(userId, entityType, entityId) {
  const [backlinks, outgoing] = await Promise.all([
    getBacklinks(userId, entityType, entityId),
    getOutgoingLinks(userId, entityType, entityId)
  ]);

  return { backlinks, outgoing };
}

/**
 * Delete all links associated with an entity
 */
export async function deleteEntityLinks(userId, entityType, entityId) {
  const result = await Link.deleteMany({
    userId,
    $or: [
      { sourceType: entityType, sourceId: entityId },
      { targetType: entityType, targetId: entityId }
    ]
  });

  return result.deletedCount;
}

export default {
  createLink,
  removeLink,
  getBacklinks,
  getOutgoingLinks,
  getAllLinks,
  deleteEntityLinks
};
