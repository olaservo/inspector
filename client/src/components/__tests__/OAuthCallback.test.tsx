import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, jest, beforeAll, beforeEach, afterAll } from "@jest/globals";
import "@testing-library/jest-dom";
import OAuthCallback from "../OAuthCallback";
import { SESSION_KEYS } from "../../lib/constants";
import { createProxyTestServer, ProxyTestServer } from "./proxy-test-utils";
import { AuthResult } from "@modelcontextprotocol/sdk/client/auth.js";

// Mock auth module
jest.mock("@modelcontextprotocol/sdk/client/auth.js", () => {
  const mockAuth = jest.fn<() => Promise<AuthResult>>().mockResolvedValue("AUTHORIZED");
  return { auth: mockAuth };
});

// Export mock for use in tests
export const mockAuth = jest.fn<() => Promise<AuthResult>>().mockResolvedValue("AUTHORIZED");

// Mock toast for UI feedback
const mockToast = jest.fn();
jest.mock("@/hooks/use-toast.ts", () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe("OAuth Callback Integration", () => {
  const TEST_PORT = 3000;
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

  it("completes full OAuth flow", async () => {
    const mockOnConnect = jest.fn();
    
    // Set up successful OAuth callback URL
    const callbackUrl = new URL(`${proxyServer.proxyUrl}/oauth/callback`);
    callbackUrl.searchParams.set("code", "test-auth-code");
    Object.defineProperty(window, "location", {
      value: callbackUrl,
      writable: true,
    });

    await act(async () => {
      render(<OAuthCallback onConnect={mockOnConnect} />);
    });

    // Wait for connection
    await proxyServer.waitForConnection();

    // Verify loading state
    expect(screen.getByText("Processing OAuth callback...")).toBeInTheDocument();

    // Verify success toast
    expect(mockToast).toHaveBeenCalledWith({
      title: "Success",
      description: "Successfully authenticated with OAuth",
      variant: "default",
    });

    // Verify onConnect callback
    expect(mockOnConnect).toHaveBeenCalledWith(proxyServer.proxyUrl);
    expect(proxyServer.getTokenExchangeCount()).toBe(1);
  });

  it("handles authorization errors", async () => {
    const mockOnConnect = jest.fn();
    
    // Set up error OAuth callback URL
    const errorUrl = new URL(`${proxyServer.proxyUrl}/oauth/callback`);
    errorUrl.searchParams.set("error", "access_denied");
    errorUrl.searchParams.set("error_description", "User denied access");
    Object.defineProperty(window, "location", {
      value: errorUrl,
      writable: true,
    });

    await act(async () => {
      render(<OAuthCallback onConnect={mockOnConnect} />);
    });

    // Verify error toast
    expect(mockToast).toHaveBeenCalledWith({
      title: "OAuth Authorization Error",
      description: expect.stringContaining("access_denied"),
      variant: "destructive",
    });

    // Verify no connection or token exchange
    expect(proxyServer.getConnectionCount()).toBe(0);
    expect(proxyServer.getTokenExchangeCount()).toBe(0);
    expect(mockOnConnect).not.toHaveBeenCalled();
  });

  it("handles missing server URL", async () => {
    const mockOnConnect = jest.fn();
    
    // Clear server URL from session
    window.sessionStorage.clear();

    // Set up a valid callback URL (but missing server URL in session)
    const callbackUrl = new URL(`${proxyServer.proxyUrl}/oauth/callback`);
    callbackUrl.searchParams.set("code", "test-auth-code");
    Object.defineProperty(window, "location", {
      value: callbackUrl,
      writable: true,
    });

    await act(async () => {
      render(<OAuthCallback onConnect={mockOnConnect} />);
    });

    // Verify error toast
    expect(mockToast).toHaveBeenCalledWith({
      title: "OAuth Authorization Error",
      description: "Missing Server URL",
      variant: "destructive",
    });

    // Verify no connection or token exchange
    expect(proxyServer.getConnectionCount()).toBe(0);
    expect(proxyServer.getTokenExchangeCount()).toBe(0);
    expect(mockOnConnect).not.toHaveBeenCalled();
  });

  it("handles proxy token exchange errors", async () => {
    const mockOnConnect = jest.fn();
    
    // Mock auth module to simulate token exchange error
    mockAuth.mockRejectedValueOnce(new Error("Token exchange failed"));
    
    // Set up callback URL
    const callbackUrl = new URL(`${proxyServer.proxyUrl}/oauth/callback`);
    callbackUrl.searchParams.set("code", "invalid-code");
    Object.defineProperty(window, "location", {
      value: callbackUrl,
      writable: true,
    });

    await act(async () => {
      render(<OAuthCallback onConnect={mockOnConnect} />);
    });

    // Verify error toast
    expect(mockToast).toHaveBeenCalledWith({
      title: "OAuth Authorization Error",
      description: expect.stringContaining("Token exchange failed"),
      variant: "destructive",
    });

    // Verify no connection established
    expect(proxyServer.getConnectionCount()).toBe(0);
    expect(mockOnConnect).not.toHaveBeenCalled();
  });
});
