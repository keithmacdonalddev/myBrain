import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { WebSocketProvider, useWebSocket, useSocketEvent, useConversationSocket } from './useWebSocket';
import { io } from 'socket.io-client';

// Mock socket.io-client
const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

// Mock getAuthToken
vi.mock('../lib/api', () => ({
  getAuthToken: vi.fn(() => 'mock-jwt-token'),
}));

// Helper to create a mock Redux store
const createMockStore = (authState = {}) => {
  return configureStore({
    reducer: {
      auth: () => ({
        user: null,
        isAuthenticated: false,
        ...authState,
      }),
    },
  });
};

// Helper to create wrapper with Redux provider and WebSocketProvider
const createWrapper = (store) => {
  return ({ children }) => (
    <Provider store={store}>
      <WebSocketProvider>{children}</WebSocketProvider>
    </Provider>
  );
};

// Helper to create wrapper with just Redux (no WebSocketProvider)
const createReduxOnlyWrapper = (store) => {
  return ({ children }) => <Provider store={store}>{children}</Provider>;
};

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock socket event handlers
    mockSocket.on.mockClear();
    mockSocket.off.mockClear();
    mockSocket.emit.mockClear();
    mockSocket.disconnect.mockClear();
    // Reset the io mock
    io.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('WebSocketProvider', () => {
    it('should not create socket when user is not authenticated', () => {
      const store = createMockStore({ user: null, isAuthenticated: false });

      renderHook(() => useWebSocket(), {
        wrapper: createWrapper(store),
      });

      expect(io).not.toHaveBeenCalled();
    });

    it('should create socket when user is authenticated', () => {
      const store = createMockStore({
        user: { _id: '123', email: 'test@example.com' },
        isAuthenticated: true,
      });

      renderHook(() => useWebSocket(), {
        wrapper: createWrapper(store),
      });

      expect(io).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          withCredentials: true,
          auth: { token: 'mock-jwt-token' },
          transports: ['websocket', 'polling'],
          reconnection: true,
        })
      );
    });

    it('should register event handlers on socket', () => {
      const store = createMockStore({
        user: { _id: '123', email: 'test@example.com' },
        isAuthenticated: true,
      });

      renderHook(() => useWebSocket(), {
        wrapper: createWrapper(store),
      });

      // Check that event handlers were registered
      const eventNames = mockSocket.on.mock.calls.map((call) => call[0]);
      expect(eventNames).toContain('connect');
      expect(eventNames).toContain('disconnect');
      expect(eventNames).toContain('connect_error');
      expect(eventNames).toContain('error');
    });

    it('should disconnect socket when user logs out', () => {
      const store = createMockStore({
        user: { _id: '123', email: 'test@example.com' },
        isAuthenticated: true,
      });

      const { rerender, unmount } = renderHook(() => useWebSocket(), {
        wrapper: createWrapper(store),
      });

      // Unmount to trigger cleanup
      unmount();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('useWebSocket hook', () => {
    it('should throw error when used outside WebSocketProvider', () => {
      const store = createMockStore();
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useWebSocket(), {
          wrapper: createReduxOnlyWrapper(store),
        });
      }).toThrow('useWebSocket must be used within a WebSocketProvider');

      consoleError.mockRestore();
    });

    it('should return socket, isConnected, and connectionError', () => {
      const store = createMockStore({
        user: { _id: '123', email: 'test@example.com' },
        isAuthenticated: true,
      });

      const { result } = renderHook(() => useWebSocket(), {
        wrapper: createWrapper(store),
      });

      expect(result.current).toHaveProperty('socket');
      expect(result.current).toHaveProperty('isConnected');
      expect(result.current).toHaveProperty('connectionError');
    });

    it('should return isConnected as false initially', () => {
      const store = createMockStore({
        user: { _id: '123', email: 'test@example.com' },
        isAuthenticated: true,
      });

      const { result } = renderHook(() => useWebSocket(), {
        wrapper: createWrapper(store),
      });

      expect(result.current.isConnected).toBe(false);
    });

    it('should return connectionError as null initially', () => {
      const store = createMockStore({
        user: { _id: '123', email: 'test@example.com' },
        isAuthenticated: true,
      });

      const { result } = renderHook(() => useWebSocket(), {
        wrapper: createWrapper(store),
      });

      expect(result.current.connectionError).toBe(null);
    });

    it('should update isConnected to true when connect event fires', async () => {
      const store = createMockStore({
        user: { _id: '123', email: 'test@example.com' },
        isAuthenticated: true,
      });

      const { result } = renderHook(() => useWebSocket(), {
        wrapper: createWrapper(store),
      });

      // Find and call the connect handler
      const connectHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'connect'
      )?.[1];

      expect(connectHandler).toBeDefined();

      act(() => {
        connectHandler();
      });

      expect(result.current.isConnected).toBe(true);
    });

    it('should update isConnected to false when disconnect event fires', async () => {
      const store = createMockStore({
        user: { _id: '123', email: 'test@example.com' },
        isAuthenticated: true,
      });

      const { result } = renderHook(() => useWebSocket(), {
        wrapper: createWrapper(store),
      });

      // First connect
      const connectHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'connect'
      )?.[1];
      act(() => {
        connectHandler();
      });

      expect(result.current.isConnected).toBe(true);

      // Then disconnect
      const disconnectHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'disconnect'
      )?.[1];
      act(() => {
        disconnectHandler('io server disconnect');
      });

      expect(result.current.isConnected).toBe(false);
    });

    it('should update connectionError when connect_error event fires', async () => {
      const store = createMockStore({
        user: { _id: '123', email: 'test@example.com' },
        isAuthenticated: true,
      });

      const { result } = renderHook(() => useWebSocket(), {
        wrapper: createWrapper(store),
      });

      const connectErrorHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'connect_error'
      )?.[1];

      expect(connectErrorHandler).toBeDefined();

      act(() => {
        connectErrorHandler({ message: 'Connection refused' });
      });

      expect(result.current.connectionError).toBe('Connection refused');
    });

    it('should update connectionError when error event fires', async () => {
      const store = createMockStore({
        user: { _id: '123', email: 'test@example.com' },
        isAuthenticated: true,
      });

      const { result } = renderHook(() => useWebSocket(), {
        wrapper: createWrapper(store),
      });

      const errorHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'error'
      )?.[1];

      expect(errorHandler).toBeDefined();

      act(() => {
        errorHandler({ message: 'Socket error occurred' });
      });

      expect(result.current.connectionError).toBe('Socket error occurred');
    });

    it('should clear connectionError when connect succeeds after error', async () => {
      const store = createMockStore({
        user: { _id: '123', email: 'test@example.com' },
        isAuthenticated: true,
      });

      const { result } = renderHook(() => useWebSocket(), {
        wrapper: createWrapper(store),
      });

      // First cause an error
      const connectErrorHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'connect_error'
      )?.[1];
      act(() => {
        connectErrorHandler({ message: 'Connection refused' });
      });

      expect(result.current.connectionError).toBe('Connection refused');

      // Then connect successfully
      const connectHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'connect'
      )?.[1];
      act(() => {
        connectHandler();
      });

      expect(result.current.connectionError).toBe(null);
    });
  });

  describe('useSocketEvent', () => {
    it('should throw error when used outside WebSocketProvider', () => {
      const store = createMockStore();
      const handler = vi.fn();
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useSocketEvent('message', handler), {
          wrapper: createReduxOnlyWrapper(store),
        });
      }).toThrow('useWebSocket must be used within a WebSocketProvider');

      consoleError.mockRestore();
    });

    it('should subscribe to socket event', () => {
      const store = createMockStore({
        user: { _id: '123', email: 'test@example.com' },
        isAuthenticated: true,
      });
      const handler = vi.fn();

      renderHook(() => useSocketEvent('newMessage', handler), {
        wrapper: createWrapper(store),
      });

      // Check that the event was subscribed
      const subscribeCall = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'newMessage'
      );
      expect(subscribeCall).toBeDefined();
      expect(subscribeCall[1]).toBe(handler);
    });

    it('should unsubscribe from socket event on unmount', () => {
      const store = createMockStore({
        user: { _id: '123', email: 'test@example.com' },
        isAuthenticated: true,
      });
      const handler = vi.fn();

      const { unmount } = renderHook(() => useSocketEvent('newMessage', handler), {
        wrapper: createWrapper(store),
      });

      unmount();

      // Check that the event was unsubscribed
      const unsubscribeCall = mockSocket.off.mock.calls.find(
        (call) => call[0] === 'newMessage'
      );
      expect(unsubscribeCall).toBeDefined();
      expect(unsubscribeCall[1]).toBe(handler);
    });

    it('should update subscription when eventName changes', () => {
      const store = createMockStore({
        user: { _id: '123', email: 'test@example.com' },
        isAuthenticated: true,
      });
      const handler = vi.fn();

      const { rerender } = renderHook(
        ({ eventName }) => useSocketEvent(eventName, handler),
        {
          wrapper: createWrapper(store),
          initialProps: { eventName: 'event1' },
        }
      );

      // Clear mocks to track new calls
      mockSocket.on.mockClear();
      mockSocket.off.mockClear();

      rerender({ eventName: 'event2' });

      // Old event should be unsubscribed
      expect(mockSocket.off).toHaveBeenCalledWith('event1', handler);
      // New event should be subscribed
      expect(mockSocket.on).toHaveBeenCalledWith('event2', handler);
    });

    it('should update subscription when handler changes', () => {
      const store = createMockStore({
        user: { _id: '123', email: 'test@example.com' },
        isAuthenticated: true,
      });
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      const { rerender } = renderHook(
        ({ handler }) => useSocketEvent('testEvent', handler),
        {
          wrapper: createWrapper(store),
          initialProps: { handler: handler1 },
        }
      );

      // Clear mocks to track new calls
      mockSocket.on.mockClear();
      mockSocket.off.mockClear();

      rerender({ handler: handler2 });

      // Old handler should be unsubscribed
      expect(mockSocket.off).toHaveBeenCalledWith('testEvent', handler1);
      // New handler should be subscribed
      expect(mockSocket.on).toHaveBeenCalledWith('testEvent', handler2);
    });

    it('should not subscribe when socket is null', () => {
      const store = createMockStore({
        user: null,
        isAuthenticated: false,
      });
      const handler = vi.fn();

      renderHook(() => useSocketEvent('newMessage', handler), {
        wrapper: createWrapper(store),
      });

      // Since socket is null (not authenticated), no custom event should be registered
      // Only the internal events from the provider itself
      const customEventCall = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'newMessage'
      );
      expect(customEventCall).toBeUndefined();
    });
  });

  describe('useConversationSocket', () => {
    it('should throw error when used outside WebSocketProvider', () => {
      const store = createMockStore();
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useConversationSocket('conv-123'), {
          wrapper: createReduxOnlyWrapper(store),
        });
      }).toThrow('useWebSocket must be used within a WebSocketProvider');

      consoleError.mockRestore();
    });

    it('should return sendTyping function', () => {
      const store = createMockStore({
        user: { _id: '123', email: 'test@example.com' },
        isAuthenticated: true,
      });

      const { result } = renderHook(() => useConversationSocket('conv-123'), {
        wrapper: createWrapper(store),
      });

      expect(typeof result.current.sendTyping).toBe('function');
    });

    it('should emit conversation:join when connected', async () => {
      const store = createMockStore({
        user: { _id: '123', email: 'test@example.com' },
        isAuthenticated: true,
      });

      // First render the hook to set up the socket
      const { result } = renderHook(
        () => {
          const ws = useWebSocket();
          const conv = useConversationSocket('conv-123');
          return { ws, conv };
        },
        {
          wrapper: createWrapper(store),
        }
      );

      // Simulate connect event to set isConnected to true
      const connectHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'connect'
      )?.[1];

      act(() => {
        connectHandler();
      });

      // Wait for the emit to be called
      await waitFor(() => {
        expect(mockSocket.emit).toHaveBeenCalledWith('conversation:join', 'conv-123');
      });
    });

    it('should emit conversation:leave on unmount', async () => {
      const store = createMockStore({
        user: { _id: '123', email: 'test@example.com' },
        isAuthenticated: true,
      });

      const { unmount } = renderHook(
        () => {
          const ws = useWebSocket();
          const conv = useConversationSocket('conv-456');
          return { ws, conv };
        },
        {
          wrapper: createWrapper(store),
        }
      );

      // Simulate connect event
      const connectHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'connect'
      )?.[1];

      act(() => {
        connectHandler();
      });

      // Wait for join to be called
      await waitFor(() => {
        expect(mockSocket.emit).toHaveBeenCalledWith('conversation:join', 'conv-456');
      });

      // Clear emit mock to track leave call
      mockSocket.emit.mockClear();

      unmount();

      expect(mockSocket.emit).toHaveBeenCalledWith('conversation:leave', 'conv-456');
    });

    it('should not emit when conversationId is null', () => {
      const store = createMockStore({
        user: { _id: '123', email: 'test@example.com' },
        isAuthenticated: true,
      });

      renderHook(
        () => {
          const ws = useWebSocket();
          const conv = useConversationSocket(null);
          return { ws, conv };
        },
        {
          wrapper: createWrapper(store),
        }
      );

      // Simulate connect event
      const connectHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'connect'
      )?.[1];

      act(() => {
        connectHandler();
      });

      // Should not emit join for null conversationId
      expect(mockSocket.emit).not.toHaveBeenCalledWith('conversation:join', null);
    });

    it('should not emit when not connected', () => {
      const store = createMockStore({
        user: { _id: '123', email: 'test@example.com' },
        isAuthenticated: true,
      });

      renderHook(
        () => {
          const ws = useWebSocket();
          const conv = useConversationSocket('conv-123');
          return { ws, conv };
        },
        {
          wrapper: createWrapper(store),
        }
      );

      // Don't call connect handler, so isConnected remains false
      expect(mockSocket.emit).not.toHaveBeenCalledWith('conversation:join', 'conv-123');
    });

    describe('sendTyping', () => {
      it('should emit typing:start when called with true', async () => {
        const store = createMockStore({
          user: { _id: '123', email: 'test@example.com' },
          isAuthenticated: true,
        });

        const { result } = renderHook(
          () => {
            const ws = useWebSocket();
            const conv = useConversationSocket('conv-789');
            return { ws, conv };
          },
          {
            wrapper: createWrapper(store),
          }
        );

        // Simulate connect event
        const connectHandler = mockSocket.on.mock.calls.find(
          (call) => call[0] === 'connect'
        )?.[1];

        act(() => {
          connectHandler();
        });

        // Clear emit mock
        mockSocket.emit.mockClear();

        act(() => {
          result.current.conv.sendTyping(true);
        });

        expect(mockSocket.emit).toHaveBeenCalledWith('typing:start', 'conv-789');
      });

      it('should emit typing:stop when called with false', async () => {
        const store = createMockStore({
          user: { _id: '123', email: 'test@example.com' },
          isAuthenticated: true,
        });

        const { result } = renderHook(
          () => {
            const ws = useWebSocket();
            const conv = useConversationSocket('conv-789');
            return { ws, conv };
          },
          {
            wrapper: createWrapper(store),
          }
        );

        // Simulate connect event
        const connectHandler = mockSocket.on.mock.calls.find(
          (call) => call[0] === 'connect'
        )?.[1];

        act(() => {
          connectHandler();
        });

        // Clear emit mock
        mockSocket.emit.mockClear();

        act(() => {
          result.current.conv.sendTyping(false);
        });

        expect(mockSocket.emit).toHaveBeenCalledWith('typing:stop', 'conv-789');
      });

      it('should not emit when socket is null', () => {
        const store = createMockStore({
          user: null,
          isAuthenticated: false,
        });

        const { result } = renderHook(() => useConversationSocket('conv-123'), {
          wrapper: createWrapper(store),
        });

        act(() => {
          result.current.sendTyping(true);
        });

        // Socket is null, so emit should not be called for typing events
        expect(mockSocket.emit).not.toHaveBeenCalledWith('typing:start', 'conv-123');
      });

      it('should not emit when conversationId is null', () => {
        const store = createMockStore({
          user: { _id: '123', email: 'test@example.com' },
          isAuthenticated: true,
        });

        const { result } = renderHook(
          () => {
            const ws = useWebSocket();
            const conv = useConversationSocket(null);
            return { ws, conv };
          },
          {
            wrapper: createWrapper(store),
          }
        );

        // Simulate connect event
        const connectHandler = mockSocket.on.mock.calls.find(
          (call) => call[0] === 'connect'
        )?.[1];

        act(() => {
          connectHandler();
        });

        mockSocket.emit.mockClear();

        act(() => {
          result.current.conv.sendTyping(true);
        });

        expect(mockSocket.emit).not.toHaveBeenCalledWith('typing:start', null);
      });

      it('should have stable sendTyping reference', () => {
        const store = createMockStore({
          user: { _id: '123', email: 'test@example.com' },
          isAuthenticated: true,
        });

        const { result, rerender } = renderHook(
          () => useConversationSocket('conv-123'),
          {
            wrapper: createWrapper(store),
          }
        );

        const firstSendTyping = result.current.sendTyping;

        rerender();

        expect(result.current.sendTyping).toBe(firstSendTyping);
      });
    });
  });

  describe('error handling', () => {
    it('should handle error event with message property', async () => {
      const store = createMockStore({
        user: { _id: '123', email: 'test@example.com' },
        isAuthenticated: true,
      });

      const { result } = renderHook(() => useWebSocket(), {
        wrapper: createWrapper(store),
      });

      const errorHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'error'
      )?.[1];

      act(() => {
        errorHandler({ message: 'Custom error message' });
      });

      expect(result.current.connectionError).toBe('Custom error message');
    });

    it('should handle error event without message property', async () => {
      const store = createMockStore({
        user: { _id: '123', email: 'test@example.com' },
        isAuthenticated: true,
      });

      const { result } = renderHook(() => useWebSocket(), {
        wrapper: createWrapper(store),
      });

      const errorHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'error'
      )?.[1];

      act(() => {
        errorHandler({});
      });

      expect(result.current.connectionError).toBe('Unknown error');
    });
  });
});
