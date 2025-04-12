import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, jest, beforeAll, beforeEach, afterAll } from "@jest/globals";
import "@testing-library/jest-dom";
import OAuthCallback from "../OAuthCallback";
import { SESSION_KEYS } from "../../lib/constants";
import { createTestServer, setupOAuthTest, TestServer } from "./test-utils";

// Mock auth module
jest.mock("@modelcontextprotocol/sdk/client/auth.js", () => ({
  auth: jest.fn().mockResolvedValue("AUTHORIZED")
}));

// Mock toast for UI feedback
const mockToast = jest.fn();
jest.mock("@/hooks/use-toast.ts", () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe("OAuth Callback Integration", () => {
  const TEST_PORT = 3000;
  let testServer: TestServer;
  let cleanup: () => void;

  beforeAll(async () => {
    const { testProvider, cleanup: providerCleanup } = setupOAuthTest();
    testServer = await createTestServer(TEST_PORT, testProvider);
    cleanup = providerCleanup;
  });

  beforeEach(() => {
    cleanup();
    window.sessionStorage.setItem(SESSION_KEYS.SERVER_URL, testServer.url);
    mockToast.mockClear();
  });

  afterAll(async () => {
    await testServer.cleanup();
  });

  it("completes full OAuth flow", async () => {
    const mockOnConnect = jest.fn();
    
    // Set up successful OAuth callback URL
    const callbackUrl = new URL(`${testServer.url}/oauth/callback`);
    callbackUrl.searchParams.set("code", "test-auth-code");
    Object.defineProperty(window, "location", {
      value: callbackUrl,
      writable: true,
    });

    await act(async () => {
      render(<OAuthCallback onConnect={mockOnConnect} />);
    });

    // Verify loading state
    expect(screen.getByText("Processing OAuth callback...")).toBeInTheDocument();

    // Verify success toast
    expect(mockToast).toHaveBeenCalledWith({
      title: "Success",
      description: "Successfully authenticated with OAuth",
      variant: "default",
    });

    // Verify onConnect callback
    expect(mockOnConnect).toHaveBeenCalledWith(testServer.url);
  });

  it("handles authorization errors", async () => {
    const mockOnConnect = jest.fn();
    
    // Set up error OAuth callback URL
    const errorUrl = new URL(`${testServer.url}/oauth/callback`);
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

    // Verify callback not called
    expect(mockOnConnect).not.toHaveBeenCalled();
  });

  it("handles missing server URL", async () => {
    const mockOnConnect = jest.fn();
    
    // Clear server URL from session
    window.sessionStorage.clear();

    // Set up a valid callback URL (but missing server URL in session)
    const callbackUrl = new URL(`${testServer.url}/oauth/callback`);
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

    // Verify callback not called
    expect(mockOnConnect).not.toHaveBeenCalled();
  });
});
