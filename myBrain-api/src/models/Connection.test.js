/**
 * =============================================================================
 * CONNECTION MODEL TESTS
 * =============================================================================
 *
 * Tests for Connection model static and instance methods:
 * - areConnected(userId1, userId2) - Bidirectional check
 * - getConnection(userId1, userId2) - Bidirectional query
 * - getConnections(userId, options) - List with populate
 * - getPendingRequests(userId, options) - Status filtering
 * - getSentRequests(userId, options) - Status filtering
 * - getConnectionCount(userId) - Aggregation
 * - getPendingCount(userId) - Status filtering
 * - getOtherUser(currentUserId) - Handle populated vs unpopulated
 * - Unique constraint enforcement
 *
 * =============================================================================
 */

import mongoose from 'mongoose';
import Connection from './Connection.js';
import User from './User.js';

describe('Connection Model', () => {
  let userA;
  let userB;
  let userC;

  // Create test users before each test
  beforeEach(async () => {
    const timestamp = Date.now();

    userA = await User.create({
      email: `usera-${timestamp}@example.com`,
      passwordHash: '$2a$10$hashedpassword123',
      profile: {
        displayName: 'User A',
        firstName: 'Alice',
        lastName: 'Anderson',
        bio: 'Test user A'
      }
    });

    userB = await User.create({
      email: `userb-${timestamp}@example.com`,
      passwordHash: '$2a$10$hashedpassword123',
      profile: {
        displayName: 'User B',
        firstName: 'Bob',
        lastName: 'Brown'
      }
    });

    userC = await User.create({
      email: `userc-${timestamp}@example.com`,
      passwordHash: '$2a$10$hashedpassword123',
      profile: {
        displayName: 'User C',
        firstName: 'Charlie',
        lastName: 'Chen'
      }
    });
  });

  // ==========================================================================
  // areConnected() Tests
  // ==========================================================================

  describe('areConnected(userId1, userId2)', () => {
    it('should return true when users are connected (requester to addressee)', async () => {
      await Connection.create({
        requesterId: userA._id,
        addresseeId: userB._id,
        status: 'accepted',
        acceptedAt: new Date()
      });

      const connected = await Connection.areConnected(userA._id, userB._id);

      expect(connected).toBe(true);
    });

    it('should return true when checking in reverse direction (addressee to requester)', async () => {
      await Connection.create({
        requesterId: userA._id,
        addresseeId: userB._id,
        status: 'accepted',
        acceptedAt: new Date()
      });

      // Check from B to A (reverse direction)
      const connected = await Connection.areConnected(userB._id, userA._id);

      expect(connected).toBe(true);
    });

    it('should return false when connection is pending', async () => {
      await Connection.create({
        requesterId: userA._id,
        addresseeId: userB._id,
        status: 'pending'
      });

      const connected = await Connection.areConnected(userA._id, userB._id);

      expect(connected).toBe(false);
    });

    it('should return false when connection is declined', async () => {
      await Connection.create({
        requesterId: userA._id,
        addresseeId: userB._id,
        status: 'declined',
        declinedAt: new Date()
      });

      const connected = await Connection.areConnected(userA._id, userB._id);

      expect(connected).toBe(false);
    });

    it('should return false when connection is blocked', async () => {
      await Connection.create({
        requesterId: userA._id,
        addresseeId: userB._id,
        status: 'blocked'
      });

      const connected = await Connection.areConnected(userA._id, userB._id);

      expect(connected).toBe(false);
    });

    it('should return false when no connection exists', async () => {
      const connected = await Connection.areConnected(userA._id, userB._id);

      expect(connected).toBe(false);
    });

    it('should work with string IDs', async () => {
      await Connection.create({
        requesterId: userA._id,
        addresseeId: userB._id,
        status: 'accepted',
        acceptedAt: new Date()
      });

      const connected = await Connection.areConnected(
        userA._id.toString(),
        userB._id.toString()
      );

      expect(connected).toBe(true);
    });
  });

  // ==========================================================================
  // getConnection() Tests
  // ==========================================================================

  describe('getConnection(userId1, userId2)', () => {
    it('should return connection regardless of status', async () => {
      const createdConnection = await Connection.create({
        requesterId: userA._id,
        addresseeId: userB._id,
        status: 'pending',
        requestMessage: 'Hi!'
      });

      const connection = await Connection.getConnection(userA._id, userB._id);

      expect(connection).toBeDefined();
      expect(connection._id.toString()).toBe(createdConnection._id.toString());
    });

    it('should return connection when checking in reverse direction', async () => {
      await Connection.create({
        requesterId: userA._id,
        addresseeId: userB._id,
        status: 'accepted'
      });

      // Check from B to A (reverse direction)
      const connection = await Connection.getConnection(userB._id, userA._id);

      expect(connection).toBeDefined();
      expect(connection.requesterId.toString()).toBe(userA._id.toString());
    });

    it('should return null when no connection exists', async () => {
      const connection = await Connection.getConnection(userA._id, userB._id);

      expect(connection).toBeNull();
    });

    it('should return declined connections', async () => {
      await Connection.create({
        requesterId: userA._id,
        addresseeId: userB._id,
        status: 'declined',
        declinedAt: new Date()
      });

      const connection = await Connection.getConnection(userA._id, userB._id);

      expect(connection).toBeDefined();
      expect(connection.status).toBe('declined');
    });

    it('should return blocked connections', async () => {
      await Connection.create({
        requesterId: userA._id,
        addresseeId: userB._id,
        status: 'blocked'
      });

      const connection = await Connection.getConnection(userA._id, userB._id);

      expect(connection).toBeDefined();
      expect(connection.status).toBe('blocked');
    });
  });

  // ==========================================================================
  // getConnections() Tests
  // ==========================================================================

  describe('getConnections(userId, options)', () => {
    beforeEach(async () => {
      // Create connections: A connected to B and C
      await Connection.create([
        {
          requesterId: userA._id,
          addresseeId: userB._id,
          status: 'accepted',
          acceptedAt: new Date(Date.now() - 1000) // 1 second ago
        },
        {
          requesterId: userC._id,
          addresseeId: userA._id,
          status: 'accepted',
          acceptedAt: new Date() // Now (more recent)
        }
      ]);
    });

    it('should return all accepted connections for a user', async () => {
      const connections = await Connection.getConnections(userA._id);

      expect(connections).toHaveLength(2);
    });

    it('should include connections where user is requester', async () => {
      const connections = await Connection.getConnections(userA._id);

      const asRequester = connections.filter(
        c => c.requesterId._id.toString() === userA._id.toString()
      );

      expect(asRequester.length).toBeGreaterThan(0);
    });

    it('should include connections where user is addressee', async () => {
      const connections = await Connection.getConnections(userA._id);

      const asAddressee = connections.filter(
        c => c.addresseeId._id.toString() === userA._id.toString()
      );

      expect(asAddressee.length).toBeGreaterThan(0);
    });

    it('should not include pending connections', async () => {
      const userD = await User.create({
        email: `userd-${Date.now()}@example.com`,
        passwordHash: '$2a$10$hashedpassword123'
      });

      await Connection.create({
        requesterId: userA._id,
        addresseeId: userD._id,
        status: 'pending'
      });

      const connections = await Connection.getConnections(userA._id);

      // Should only have the 2 accepted connections
      expect(connections).toHaveLength(2);
    });

    it('should sort by acceptedAt descending (most recent first)', async () => {
      const connections = await Connection.getConnections(userA._id);

      // C->A was accepted more recently
      expect(connections[0].requesterId._id.toString()).toBe(userC._id.toString());
    });

    it('should support pagination with limit', async () => {
      const connections = await Connection.getConnections(userA._id, {
        limit: 1
      });

      expect(connections).toHaveLength(1);
    });

    it('should support pagination with skip', async () => {
      const firstPage = await Connection.getConnections(userA._id, {
        limit: 1,
        skip: 0
      });

      const secondPage = await Connection.getConnections(userA._id, {
        limit: 1,
        skip: 1
      });

      expect(firstPage[0]._id.toString()).not.toBe(secondPage[0]._id.toString());
    });

    it('should populate user details when populate: true (default)', async () => {
      const connections = await Connection.getConnections(userA._id);

      // Check that requesterId and addresseeId are populated
      expect(connections[0].requesterId.email).toBeDefined();
      expect(connections[0].addresseeId.email).toBeDefined();
      expect(connections[0].requesterId.profile).toBeDefined();
    });

    it('should not populate when populate: false', async () => {
      const connections = await Connection.getConnections(userA._id, {
        populate: false
      });

      // Without population, these should be ObjectIds
      expect(connections[0].requesterId.email).toBeUndefined();
    });

    it('should return empty array when no connections', async () => {
      const userD = await User.create({
        email: `userd-${Date.now()}@example.com`,
        passwordHash: '$2a$10$hashedpassword123'
      });

      const connections = await Connection.getConnections(userD._id);

      expect(connections).toHaveLength(0);
    });
  });

  // ==========================================================================
  // getPendingRequests() Tests
  // ==========================================================================

  describe('getPendingRequests(userId, options)', () => {
    beforeEach(async () => {
      // Create pending requests TO userA
      await Connection.create([
        {
          requesterId: userB._id,
          addresseeId: userA._id,
          status: 'pending',
          requestMessage: 'Hi from B!'
        },
        {
          requesterId: userC._id,
          addresseeId: userA._id,
          status: 'pending',
          requestMessage: 'Hi from C!'
        }
      ]);
    });

    it('should return pending requests received by user', async () => {
      const pending = await Connection.getPendingRequests(userA._id);

      expect(pending).toHaveLength(2);
      expect(pending.every(p => p.status === 'pending')).toBe(true);
      expect(pending.every(p => p.addresseeId._id.toString() === userA._id.toString())).toBe(true);
    });

    it('should not include requests sent BY the user', async () => {
      // A sends request to D
      const userD = await User.create({
        email: `userd-${Date.now()}@example.com`,
        passwordHash: '$2a$10$hashedpassword123'
      });

      await Connection.create({
        requesterId: userA._id,
        addresseeId: userD._id,
        status: 'pending'
      });

      const pending = await Connection.getPendingRequests(userA._id);

      // Should still be 2 (B and C's requests to A)
      expect(pending).toHaveLength(2);
    });

    it('should not include accepted connections', async () => {
      await Connection.findOneAndUpdate(
        { requesterId: userB._id, addresseeId: userA._id },
        { status: 'accepted', acceptedAt: new Date() }
      );

      const pending = await Connection.getPendingRequests(userA._id);

      expect(pending).toHaveLength(1);
      expect(pending[0].requesterId._id.toString()).toBe(userC._id.toString());
    });

    it('should sort by createdAt descending (newest first)', async () => {
      const pending = await Connection.getPendingRequests(userA._id);

      // Verify sorted by createdAt descending
      for (let i = 1; i < pending.length; i++) {
        expect(pending[i - 1].createdAt >= pending[i].createdAt).toBe(true);
      }
    });

    it('should support pagination', async () => {
      const firstPage = await Connection.getPendingRequests(userA._id, {
        limit: 1
      });

      const secondPage = await Connection.getPendingRequests(userA._id, {
        limit: 1,
        skip: 1
      });

      expect(firstPage).toHaveLength(1);
      expect(secondPage).toHaveLength(1);
      expect(firstPage[0]._id.toString()).not.toBe(secondPage[0]._id.toString());
    });

    it('should populate requester details including bio', async () => {
      const pending = await Connection.getPendingRequests(userA._id);

      expect(pending[0].requesterId.email).toBeDefined();
      expect(pending[0].requesterId.profile).toBeDefined();
    });

    it('should return empty array when no pending requests', async () => {
      const userD = await User.create({
        email: `userd-${Date.now()}@example.com`,
        passwordHash: '$2a$10$hashedpassword123'
      });

      const pending = await Connection.getPendingRequests(userD._id);

      expect(pending).toHaveLength(0);
    });
  });

  // ==========================================================================
  // getSentRequests() Tests
  // ==========================================================================

  describe('getSentRequests(userId, options)', () => {
    beforeEach(async () => {
      // Create pending requests FROM userA
      await Connection.create([
        {
          requesterId: userA._id,
          addresseeId: userB._id,
          status: 'pending'
        },
        {
          requesterId: userA._id,
          addresseeId: userC._id,
          status: 'pending'
        }
      ]);
    });

    it('should return pending requests sent by user', async () => {
      const sent = await Connection.getSentRequests(userA._id);

      expect(sent).toHaveLength(2);
      expect(sent.every(s => s.status === 'pending')).toBe(true);
      expect(sent.every(s => s.requesterId.toString() === userA._id.toString())).toBe(true);
    });

    it('should not include requests received BY the user', async () => {
      // D sends request to A
      const userD = await User.create({
        email: `userd-${Date.now()}@example.com`,
        passwordHash: '$2a$10$hashedpassword123'
      });

      await Connection.create({
        requesterId: userD._id,
        addresseeId: userA._id,
        status: 'pending'
      });

      const sent = await Connection.getSentRequests(userA._id);

      // Should still be 2 (A's requests to B and C)
      expect(sent).toHaveLength(2);
    });

    it('should not include accepted connections', async () => {
      await Connection.findOneAndUpdate(
        { requesterId: userA._id, addresseeId: userB._id },
        { status: 'accepted', acceptedAt: new Date() }
      );

      const sent = await Connection.getSentRequests(userA._id);

      expect(sent).toHaveLength(1);
      expect(sent[0].addresseeId._id.toString()).toBe(userC._id.toString());
    });

    it('should sort by createdAt descending', async () => {
      const sent = await Connection.getSentRequests(userA._id);

      for (let i = 1; i < sent.length; i++) {
        expect(sent[i - 1].createdAt >= sent[i].createdAt).toBe(true);
      }
    });

    it('should support pagination', async () => {
      const firstPage = await Connection.getSentRequests(userA._id, {
        limit: 1
      });

      expect(firstPage).toHaveLength(1);
    });

    it('should populate addressee details', async () => {
      const sent = await Connection.getSentRequests(userA._id);

      expect(sent[0].addresseeId.email).toBeDefined();
      expect(sent[0].addresseeId.profile).toBeDefined();
    });

    it('should return empty array when no sent requests', async () => {
      const userD = await User.create({
        email: `userd-${Date.now()}@example.com`,
        passwordHash: '$2a$10$hashedpassword123'
      });

      const sent = await Connection.getSentRequests(userD._id);

      expect(sent).toHaveLength(0);
    });
  });

  // ==========================================================================
  // getConnectionCount() Tests
  // ==========================================================================

  describe('getConnectionCount(userId)', () => {
    it('should return count of accepted connections', async () => {
      await Connection.create([
        {
          requesterId: userA._id,
          addresseeId: userB._id,
          status: 'accepted',
          acceptedAt: new Date()
        },
        {
          requesterId: userC._id,
          addresseeId: userA._id,
          status: 'accepted',
          acceptedAt: new Date()
        }
      ]);

      const count = await Connection.getConnectionCount(userA._id);

      expect(count).toBe(2);
    });

    it('should count connections where user is requester', async () => {
      await Connection.create({
        requesterId: userA._id,
        addresseeId: userB._id,
        status: 'accepted',
        acceptedAt: new Date()
      });

      const count = await Connection.getConnectionCount(userA._id);

      expect(count).toBe(1);
    });

    it('should count connections where user is addressee', async () => {
      await Connection.create({
        requesterId: userB._id,
        addresseeId: userA._id,
        status: 'accepted',
        acceptedAt: new Date()
      });

      const count = await Connection.getConnectionCount(userA._id);

      expect(count).toBe(1);
    });

    it('should not count pending connections', async () => {
      await Connection.create({
        requesterId: userA._id,
        addresseeId: userB._id,
        status: 'pending'
      });

      const count = await Connection.getConnectionCount(userA._id);

      expect(count).toBe(0);
    });

    it('should not count declined connections', async () => {
      await Connection.create({
        requesterId: userA._id,
        addresseeId: userB._id,
        status: 'declined',
        declinedAt: new Date()
      });

      const count = await Connection.getConnectionCount(userA._id);

      expect(count).toBe(0);
    });

    it('should return 0 when no connections', async () => {
      const count = await Connection.getConnectionCount(userA._id);

      expect(count).toBe(0);
    });
  });

  // ==========================================================================
  // getPendingCount() Tests
  // ==========================================================================

  describe('getPendingCount(userId)', () => {
    it('should return count of pending requests received', async () => {
      await Connection.create([
        {
          requesterId: userB._id,
          addresseeId: userA._id,
          status: 'pending'
        },
        {
          requesterId: userC._id,
          addresseeId: userA._id,
          status: 'pending'
        }
      ]);

      const count = await Connection.getPendingCount(userA._id);

      expect(count).toBe(2);
    });

    it('should not count requests sent by user', async () => {
      await Connection.create({
        requesterId: userA._id,
        addresseeId: userB._id,
        status: 'pending'
      });

      const count = await Connection.getPendingCount(userA._id);

      expect(count).toBe(0);
    });

    it('should not count accepted connections', async () => {
      await Connection.create({
        requesterId: userB._id,
        addresseeId: userA._id,
        status: 'accepted',
        acceptedAt: new Date()
      });

      const count = await Connection.getPendingCount(userA._id);

      expect(count).toBe(0);
    });

    it('should return 0 when no pending requests', async () => {
      const count = await Connection.getPendingCount(userA._id);

      expect(count).toBe(0);
    });
  });

  // ==========================================================================
  // getOtherUser() Tests
  // ==========================================================================

  describe('getOtherUser(currentUserId)', () => {
    describe('when populated', () => {
      it('should return addressee when current user is requester', async () => {
        await Connection.create({
          requesterId: userA._id,
          addresseeId: userB._id,
          status: 'accepted'
        });

        const connection = await Connection.findOne({
          requesterId: userA._id
        }).populate('requesterId addresseeId');

        const otherUser = connection.getOtherUser(userA._id);

        expect(otherUser._id.toString()).toBe(userB._id.toString());
        // Use the dynamic email from userB instead of hardcoded value
        expect(otherUser.email).toBe(userB.email);
      });

      it('should return requester when current user is addressee', async () => {
        await Connection.create({
          requesterId: userA._id,
          addresseeId: userB._id,
          status: 'accepted'
        });

        const connection = await Connection.findOne({
          requesterId: userA._id
        }).populate('requesterId addresseeId');

        const otherUser = connection.getOtherUser(userB._id);

        expect(otherUser._id.toString()).toBe(userA._id.toString());
        // Use the dynamic email from userA instead of hardcoded value
        expect(otherUser.email).toBe(userA.email);
      });

      it('should work with string userId', async () => {
        await Connection.create({
          requesterId: userA._id,
          addresseeId: userB._id,
          status: 'accepted'
        });

        const connection = await Connection.findOne({
          requesterId: userA._id
        }).populate('requesterId addresseeId');

        const otherUser = connection.getOtherUser(userA._id.toString());

        expect(otherUser._id.toString()).toBe(userB._id.toString());
      });
    });

    describe('when not populated', () => {
      it('should return addressee ObjectId when current user is requester', async () => {
        await Connection.create({
          requesterId: userA._id,
          addresseeId: userB._id,
          status: 'accepted'
        });

        const connection = await Connection.findOne({
          requesterId: userA._id
        });
        // Not populated

        const otherUser = connection.getOtherUser(userA._id);

        expect(otherUser.toString()).toBe(userB._id.toString());
        // Should be ObjectId, not full user object
        expect(otherUser.email).toBeUndefined();
      });

      it('should return requester ObjectId when current user is addressee', async () => {
        await Connection.create({
          requesterId: userA._id,
          addresseeId: userB._id,
          status: 'accepted'
        });

        const connection = await Connection.findOne({
          requesterId: userA._id
        });
        // Not populated

        const otherUser = connection.getOtherUser(userB._id);

        expect(otherUser.toString()).toBe(userA._id.toString());
      });
    });
  });

  // ==========================================================================
  // Unique Constraint Tests
  // ==========================================================================

  describe('Unique Constraint Enforcement', () => {
    it('should prevent duplicate connections in same direction', async () => {
      await Connection.create({
        requesterId: userA._id,
        addresseeId: userB._id,
        status: 'pending'
      });

      await expect(Connection.create({
        requesterId: userA._id,
        addresseeId: userB._id,
        status: 'pending'
      })).rejects.toThrow();
    });

    it('should allow connections in different direction (different pair)', async () => {
      // Note: The model allows B->A even if A->B exists
      // The unique index is on (requesterId, addresseeId) not the pair
      await Connection.create({
        requesterId: userA._id,
        addresseeId: userB._id,
        status: 'pending'
      });

      // This is technically allowed by the schema's unique index
      // but application logic should prevent it
      const reverseConnection = await Connection.create({
        requesterId: userB._id,
        addresseeId: userA._id,
        status: 'pending'
      });

      expect(reverseConnection).toBeDefined();
    });

    it('should allow connections between different user pairs', async () => {
      await Connection.create({
        requesterId: userA._id,
        addresseeId: userB._id,
        status: 'pending'
      });

      const differentPair = await Connection.create({
        requesterId: userA._id,
        addresseeId: userC._id,
        status: 'pending'
      });

      expect(differentPair).toBeDefined();
    });
  });

  // ==========================================================================
  // Schema Validation Tests
  // ==========================================================================

  describe('Schema Validation', () => {
    it('should require requesterId', async () => {
      await expect(Connection.create({
        addresseeId: userB._id,
        status: 'pending'
      })).rejects.toThrow();
    });

    it('should require addresseeId', async () => {
      await expect(Connection.create({
        requesterId: userA._id,
        status: 'pending'
      })).rejects.toThrow();
    });

    it('should enforce valid status enum', async () => {
      await expect(Connection.create({
        requesterId: userA._id,
        addresseeId: userB._id,
        status: 'invalid_status'
      })).rejects.toThrow();
    });

    it('should enforce valid connectionSource enum', async () => {
      await expect(Connection.create({
        requesterId: userA._id,
        addresseeId: userB._id,
        connectionSource: 'invalid_source'
      })).rejects.toThrow();
    });

    it('should enforce requestMessage max length', async () => {
      const longMessage = 'a'.repeat(501);

      await expect(Connection.create({
        requesterId: userA._id,
        addresseeId: userB._id,
        requestMessage: longMessage
      })).rejects.toThrow();
    });

    it('should set default values correctly', async () => {
      const connection = await Connection.create({
        requesterId: userA._id,
        addresseeId: userB._id
      });

      expect(connection.status).toBe('pending');
      expect(connection.connectionSource).toBe('search');
      expect(connection.acceptedAt).toBeNull();
      expect(connection.declinedAt).toBeNull();
    });

    it('should accept valid connectionSource values', async () => {
      const sources = ['search', 'profile', 'shared_item', 'invitation', 'suggested'];

      for (const source of sources) {
        // Clean up between tests
        await Connection.deleteMany({});

        const connection = await Connection.create({
          requesterId: userA._id,
          addresseeId: userB._id,
          connectionSource: source
        });

        expect(connection.connectionSource).toBe(source);
      }
    });

    it('should accept valid status values', async () => {
      const statuses = ['pending', 'accepted', 'declined', 'blocked'];

      for (const status of statuses) {
        await Connection.deleteMany({});

        const connection = await Connection.create({
          requesterId: userA._id,
          addresseeId: userB._id,
          status: status
        });

        expect(connection.status).toBe(status);
      }
    });
  });

  // ==========================================================================
  // Timestamp Tests
  // ==========================================================================

  describe('Timestamps', () => {
    it('should set createdAt and updatedAt on creation', async () => {
      const connection = await Connection.create({
        requesterId: userA._id,
        addresseeId: userB._id
      });

      expect(connection.createdAt).toBeDefined();
      expect(connection.updatedAt).toBeDefined();
    });

    it('should update updatedAt on modification', async () => {
      const connection = await Connection.create({
        requesterId: userA._id,
        addresseeId: userB._id,
        status: 'pending'
      });

      const originalUpdatedAt = connection.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      connection.status = 'accepted';
      connection.acceptedAt = new Date();
      await connection.save();

      expect(connection.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });
});
