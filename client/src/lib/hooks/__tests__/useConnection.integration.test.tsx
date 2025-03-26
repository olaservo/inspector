import { renderHook } from '@testing-library/react';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { useConnection } from '../useConnection';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/index.js';
import type { Notification } from '@modelcontextprotocol/sdk/types.js';
import { createServer } from '@modelcontextprotocol/server-everything';

declare global {
  var testTransport: InMemoryTransport; // eslint-disable-line
}

// Mock window.location
const mockLocation = new URL('http://localhost:3000');
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
});

// Default connection options
const defaultOptions = {
  transportType: 'sse' as const,
  command: '',
  args: '',
  sseUrl: 'http://localhost:3000',
  env: {},
  proxyServerUrl: 'http://localhost:3001',
};

describe('useConnection notification handling', () => {
  let server: Server;
  let cleanup: () => Promise<void>;

  beforeAll(async () => {
    const setup = createServer();
    server = setup.server;
    cleanup = setup.cleanup;
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    global.testTransport = clientTransport;
  });

  afterAll(async () => {
    await cleanup();
    await server.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('registers handlers for all notification types', async () => {
    const notificationHandler = jest.fn();
    renderHook(() => useConnection({ 
      ...defaultOptions,
      onNotification: notificationHandler 
    }));

    // Test CancelledNotification
    await server.notification({
      method: 'notifications/cancelled',
      params: {
        requestId: '123',
        reason: 'Test cancellation'
      }
    });
    expect(notificationHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'notifications/cancelled',
        params: expect.objectContaining({
          requestId: '123'
        })
      })
    );

    // Test ResourceListChangedNotification
    await server.notification({
      method: 'notifications/resources/list_changed'
    });
    expect(notificationHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'notifications/resources/list_changed'
      })
    );

    // Test ToolListChangedNotification
    await server.notification({
      method: 'notifications/tools/list_changed'
    });
    expect(notificationHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'notifications/tools/list_changed'
      })
    );

    // Test PromptListChangedNotification
    await server.notification({
      method: 'notifications/prompts/list_changed'
    });
    expect(notificationHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'notifications/prompts/list_changed'
      })
    );
  });

  it('handles fallback notifications', async () => {
    const notificationHandler = jest.fn();
    renderHook(() => useConnection({ 
      ...defaultOptions,
      onNotification: notificationHandler 
    }));

    const customNotification: Notification = {
      method: 'notifications/custom',
      params: {
        data: 'test data'
      }
    };

    await server.notification(customNotification);
    expect(notificationHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'notifications/custom',
        params: expect.objectContaining({
          data: 'test data'
        })
      })
    );
  });

  it('handles resource subscription notifications', async () => {
    const notificationHandler = jest.fn();
    const { result } = renderHook(() => 
      useConnection({ 
        ...defaultOptions,
        onNotification: notificationHandler 
      })
    );

    // Subscribe to a test resource
    await result.current.subscribe('test://static/resource/1');

    // Wait for automatic notification from server-everything
    await new Promise(resolve => setTimeout(resolve, 5000));

    expect(notificationHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'notifications/resources/updated',
        params: expect.objectContaining({
          uri: 'test://static/resource/1'
        })
      })
    );
  });

  it('cleans up notification handlers on unmount', async () => {
    const notificationHandler = jest.fn();
    const { unmount } = renderHook(() => 
      useConnection({ 
        ...defaultOptions,
        onNotification: notificationHandler 
      })
    );

    // Unmount the hook
    unmount();

    // Send a notification after unmount
    await server.notification({
      method: 'notifications/cancelled',
      params: {
        requestId: '123',
        reason: 'Test cancellation'
      }
    });

    // Handler should not be called after unmount
    expect(notificationHandler).not.toHaveBeenCalled();
  });

  it('handles multiple notifications in sequence', async () => {
    const notificationHandler = jest.fn();
    renderHook(() => useConnection({ 
      ...defaultOptions,
      onNotification: notificationHandler 
    }));

    const notifications: Notification[] = [
      {
        method: 'notifications/cancelled',
        params: { requestId: '123' }
      },
      {
        method: 'notifications/resources/list_changed'
      },
      {
        method: 'notifications/tools/list_changed'
      }
    ];

    // Send notifications in sequence
    for (const notification of notifications) {
      await server.notification(notification);
    }

    expect(notificationHandler).toHaveBeenCalledTimes(3);
    notifications.forEach((notification, index) => {
      expect(notificationHandler).toHaveBeenNthCalledWith(
        index + 1,
        expect.objectContaining({
          method: notification.method
        })
      );
    });
  });
});
