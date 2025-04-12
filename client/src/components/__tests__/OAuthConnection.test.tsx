import { render, act } from "@testing-library/react";
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "@jest/globals";
import "@testing-library/jest-dom";
import React, { useState, useEffect } from "react";
import OAuthCallback from "../OAuthCallback";
import { SESSION_KEYS } from "../../lib/constants";
import { createProxyTestServer, ProxyTestServer } from "./proxy-test-utils";

// Mock auth module
jest.mock("@modelcontextprotocol/sdk/client/auth.js", () => {
  const mockAuth = jest.fn().mockResolvedValue("AUTHORIZED");
  return { auth: mockAuth };
});

// Export mock for use in tests
export const mockAuth = jest.fn().mockResolvedValue("AUTHORIZED");

// Mock toast hook for UI feedback
const mockToast = jest.fn();
jest.mock("@/hooks/use-toast.ts", () => ({
  useToast: () => ({ toast: mockToast })
}));

describe("OAuth Connection Lifecycle", () => {
  const TEST_PORT = 3001;
  let proxyServer: ProxyTestServer;

  beforeAll(async () => {
    proxyServer = await createProxyTestServer(TEST_PORT);
  });

  beforeEach(() => {
    window.sessionStorage.clear();
    window.sessionStorage.setItem(SESSION_KEYS.SERVER_URL, proxyServer.proxyUrl);
    mockToast.mockClear();
    proxyServer.resetCounters();
  });

  afterAll(async () => {
    await proxyServer.cleanup();
  });

  it("maintains single connection through re-renders", async () => {
    const mockOnConnect = jest.fn();
    
    // Set up successful OAuth callback URL
    const callbackUrl = new URL(`${proxyServer.proxyUrl}/oauth/callback`);
    callbackUrl.searchParams.set("code", "test-auth-code");
    Object.defineProperty(window, "location", {
      value: callbackUrl,
      writable: true,
    });

    // Initial render
    let rerender: (ui: React.ReactElement) => void;
    await act(async () => {
      const { rerender: r } = render(<OAuthCallback onConnect={mockOnConnect} />);
      rerender = r;
    });

    // Wait for initial connection
    await proxyServer.waitForConnection();
    expect(proxyServer.getConnectionCount()).toBe(1);

    // Trigger multiple re-renders
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        rerender(<OAuthCallback onConnect={mockOnConnect} />);
      });
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Verify connection count hasn't increased
    expect(proxyServer.getConnectionCount()).toBe(1);
  });

  it("cleans up connection on unmount", async () => {
    const mockOnConnect = jest.fn();
    
    // Set up successful OAuth callback URL
    const callbackUrl = new URL(`${proxyServer.proxyUrl}/oauth/callback`);
    callbackUrl.searchParams.set("code", "test-auth-code");
    Object.defineProperty(window, "location", {
      value: callbackUrl,
      writable: true,
    });

    // Mount component
    let unmount: () => void;
    await act(async () => {
      const { unmount: u } = render(<OAuthCallback onConnect={mockOnConnect} />);
      unmount = u;
    });

    // Wait for connection
    await proxyServer.waitForConnection();
    expect(proxyServer.getConnectionCount()).toBe(1);

    // Unmount and verify cleanup
    await act(async () => {
      unmount();
    });
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(proxyServer.getConnectionCount()).toBe(0);
  });

  it("handles connection state through parent updates", async () => {
    const mockOnConnect = jest.fn();
    
    // Set up successful OAuth callback URL
    const callbackUrl = new URL(`${proxyServer.proxyUrl}/oauth/callback`);
    callbackUrl.searchParams.set("code", "test-auth-code");
    Object.defineProperty(window, "location", {
      value: callbackUrl,
      writable: true,
    });

    // Create wrapper component that can trigger re-renders
    function Wrapper() {
      const [count, setCount] = useState(0);
      
      useEffect(() => {
        let mounted = true;
        
        const updateCount = async () => {
          if (mounted) {
            await act(async () => {
              setCount(c => c + 1);
            });
            setTimeout(updateCount, 100);
          }
        };
        
        updateCount();
        return () => {
          mounted = false;
        };
      }, []);

      return (
        <div>
          <span>Count: {count}</span>
          <OAuthCallback onConnect={mockOnConnect} />
        </div>
      );
    }

    // Mount component and wait for initial connection
    await act(async () => {
      render(<Wrapper />);
      await proxyServer.waitForConnection();
    });

    // Verify single connection maintained
    expect(proxyServer.getConnectionCount()).toBe(1);
  });

  it("handles network errors during connection", async () => {
    const mockOnConnect = jest.fn();
    
    // Set up successful OAuth callback URL
    const callbackUrl = new URL(`${proxyServer.proxyUrl}/oauth/callback`);
    callbackUrl.searchParams.set("code", "test-auth-code");
    Object.defineProperty(window, "location", {
      value: callbackUrl,
      writable: true,
    });

    // Mount component
    await act(async () => {
      render(<OAuthCallback onConnect={mockOnConnect} />);
    });

    // Wait for initial connection
    await proxyServer.waitForConnection();
    expect(proxyServer.getConnectionCount()).toBe(1);

    // Stop the proxy to simulate network error
    await proxyServer.cleanup();
    
    // Wait for connection to drop
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(proxyServer.getConnectionCount()).toBe(0);

    // Verify error was shown to user
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: expect.any(String),
      variant: "destructive"
    }));
  });

  it("handles URL parsing edge cases", async () => {
    const mockOnConnect = jest.fn();
    
    const testCases = [
      {
        description: "handles missing code parameter",
        url: new URL(`${proxyServer.proxyUrl}/oauth/callback`),
        expectedError: "Missing authorization code"
      },
      {
        description: "handles empty code parameter",
        url: new URL(`${proxyServer.proxyUrl}/oauth/callback?code=`),
        expectedError: "Invalid authorization code"
      },
      {
        description: "handles malformed callback URL",
        url: new URL(`${proxyServer.proxyUrl}/oauth/callback?code=test&state=%`),
        expectedError: "Invalid state parameter"
      },
      {
        description: "handles unexpected parameters",
        url: new URL(`${proxyServer.proxyUrl}/oauth/callback?code=test&unknown=value`),
        expectedToast: false
      }
    ];

    for (const testCase of testCases) {
      // Reset state
      mockToast.mockClear();
      proxyServer.resetCounters();

      // Set up test URL
      Object.defineProperty(window, "location", {
        value: testCase.url,
        writable: true,
      });

      // Mount component
      await act(async () => {
        render(<OAuthCallback onConnect={mockOnConnect} />);
      });

      // Wait for potential connection attempt
      await new Promise(resolve => setTimeout(resolve, 100));

      if (testCase.expectedError) {
        // Verify error was shown
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "OAuth Authorization Error",
            description: expect.any(String),
            variant: "destructive"
          })
        );
        // Verify no connection was established
        expect(proxyServer.getConnectionCount()).toBe(0);
      } else if (testCase.expectedToast === false) {
        // Verify no error was shown
        expect(mockToast).not.toHaveBeenCalled();
        // Verify connection was established
        expect(proxyServer.getConnectionCount()).toBe(1);
      }
    }
  });
});
