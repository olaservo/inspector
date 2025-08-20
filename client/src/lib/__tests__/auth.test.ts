import { discoverScopes, InspectorOAuthClientProvider } from "../auth";
import { discoverAuthorizationServerMetadata } from "@modelcontextprotocol/sdk/client/auth.js";

jest.mock("@modelcontextprotocol/sdk/client/auth.js", () => ({
  discoverAuthorizationServerMetadata: jest.fn(),
}));

const mockDiscoverAuth =
  discoverAuthorizationServerMetadata as jest.MockedFunction<
    typeof discoverAuthorizationServerMetadata
  >;

const baseMetadata = {
  issuer: "https://test.com",
  authorization_endpoint: "https://test.com/authorize",
  token_endpoint: "https://test.com/token",
  response_types_supported: ["code"],
  grant_types_supported: ["authorization_code"],
  scopes_supported: ["read", "write"],
};

describe("discoverScopes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const testCases = [
    {
      name: "returns joined scopes from OAuth metadata",
      mockResolves: baseMetadata,
      serverUrl: "https://example.com",
      expected: "read write",
      expectedCallUrl: "https://example.com/",
    },
    {
      name: "prefers resource metadata over OAuth metadata",
      mockResolves: baseMetadata,
      serverUrl: "https://example.com",
      resourceMetadata: {
        resource: "https://example.com",
        scopes_supported: ["admin", "full"],
      },
      expected: "admin full",
    },
    {
      name: "falls back to OAuth when resource has empty scopes",
      mockResolves: baseMetadata,
      serverUrl: "https://example.com",
      resourceMetadata: {
        resource: "https://example.com",
        scopes_supported: [],
      },
      expected: "read write",
    },
    {
      name: "normalizes URL with port and path",
      mockResolves: baseMetadata,
      serverUrl: "https://example.com:8080/some/path",
      expected: "read write",
      expectedCallUrl: "https://example.com:8080/",
    },
    {
      name: "normalizes URL with trailing slash",
      mockResolves: baseMetadata,
      serverUrl: "https://example.com/",
      expected: "read write",
      expectedCallUrl: "https://example.com/",
    },
    {
      name: "handles single scope",
      mockResolves: { ...baseMetadata, scopes_supported: ["admin"] },
      serverUrl: "https://example.com",
      expected: "admin",
    },
    {
      name: "prefers resource metadata even with fewer scopes",
      mockResolves: {
        ...baseMetadata,
        scopes_supported: ["read", "write", "admin", "full"],
      },
      serverUrl: "https://example.com",
      resourceMetadata: {
        resource: "https://example.com",
        scopes_supported: ["read"],
      },
      expected: "read",
    },
  ];

  const undefinedCases = [
    {
      name: "returns undefined when OAuth discovery fails",
      mockRejects: new Error("Discovery failed"),
      serverUrl: "https://example.com",
    },
    {
      name: "returns undefined when OAuth has no scopes",
      mockResolves: { ...baseMetadata, scopes_supported: [] },
      serverUrl: "https://example.com",
    },
    {
      name: "returns undefined when scopes_supported missing",
      mockResolves: (() => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { scopes_supported, ...rest } = baseMetadata;
        return rest;
      })(),
      serverUrl: "https://example.com",
    },
    {
      name: "returns undefined with resource metadata but OAuth fails",
      mockRejects: new Error("No OAuth metadata"),
      serverUrl: "https://example.com",
      resourceMetadata: {
        resource: "https://example.com",
        scopes_supported: ["read", "write"],
      },
    },
  ];

  test.each(testCases)(
    "$name",
    async ({
      mockResolves,
      serverUrl,
      resourceMetadata,
      expected,
      expectedCallUrl,
    }) => {
      mockDiscoverAuth.mockResolvedValue(mockResolves);

      const result = await discoverScopes(serverUrl, resourceMetadata);

      expect(result).toBe(expected);
      if (expectedCallUrl) {
        expect(mockDiscoverAuth).toHaveBeenCalledWith(new URL(expectedCallUrl));
      }
    },
  );

  test.each(undefinedCases)(
    "$name",
    async ({ mockResolves, mockRejects, serverUrl, resourceMetadata }) => {
      if (mockRejects) {
        mockDiscoverAuth.mockRejectedValue(mockRejects);
      } else {
        mockDiscoverAuth.mockResolvedValue(mockResolves);
      }

      const result = await discoverScopes(serverUrl, resourceMetadata);

      expect(result).toBeUndefined();
    },
  );
});

describe("InspectorOAuthClientProvider", () => {
  let provider: InspectorOAuthClientProvider;

  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear();
    provider = new InspectorOAuthClientProvider("https://example.com");
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe("client_secret handling", () => {
    it("should temporarily store client_secret for OAuth flow", async () => {
      const clientInfo = {
        client_id: "test_client_id",
        client_secret: "test_client_secret",
        redirect_uris: ["http://localhost:3000/oauth/callback"],
      };

      // Save client information (this should store the secret temporarily)
      provider.saveClientInformation(clientInfo);

      // Retrieve client information (should include the temporary secret)
      const retrievedInfo = await provider.clientInformation();
      expect(retrievedInfo?.client_id).toBe("test_client_id");
      expect(retrievedInfo?.client_secret).toBe("test_client_secret");

      // Verify that the secret is not stored in sessionStorage
      const storedValue = sessionStorage.getItem(
        "[https://example.com] mcp_client_information",
      );
      expect(storedValue).toBeTruthy();
      const storedInfo = JSON.parse(storedValue!);
      expect(storedInfo.client_secret).toBeUndefined();
      expect(storedInfo.client_id).toBe("test_client_id");
    });

    it("should clear temporary client_secret after saving tokens", async () => {
      const clientInfo = {
        client_id: "test_client_id",
        client_secret: "test_client_secret",
        redirect_uris: ["http://localhost:3000/oauth/callback"],
      };

      // Save client information
      provider.saveClientInformation(clientInfo);

      // Verify secret is available
      let retrievedInfo = await provider.clientInformation();
      expect(retrievedInfo?.client_secret).toBe("test_client_secret");

      // Save tokens (this should clear the temporary secret)
      provider.saveTokens({
        access_token: "test_access_token",
        token_type: "Bearer",
        expires_in: 3600,
      });

      // Verify secret is no longer available
      retrievedInfo = await provider.clientInformation();
      expect(retrievedInfo?.client_secret).toBeUndefined();
    });

    it("should clear temporary client_secret when clear is called", async () => {
      const clientInfo = {
        client_id: "test_client_id",
        client_secret: "test_client_secret",
        redirect_uris: ["http://localhost:3000/oauth/callback"],
      };

      // Save client information
      provider.saveClientInformation(clientInfo);

      // Verify secret is available
      let retrievedInfo = await provider.clientInformation();
      expect(retrievedInfo?.client_secret).toBe("test_client_secret");

      // Clear OAuth state
      provider.clear();

      // Verify secret is no longer available
      retrievedInfo = await provider.clientInformation();
      expect(retrievedInfo).toBeUndefined();
    });

    it("should handle client information without client_secret", async () => {
      const clientInfo = {
        client_id: "test_client_id",
        redirect_uris: ["http://localhost:3000/oauth/callback"],
      };

      // Save client information without secret
      provider.saveClientInformation(clientInfo);

      // Retrieve client information
      const retrievedInfo = await provider.clientInformation();
      expect(retrievedInfo?.client_id).toBe("test_client_id");
      expect(retrievedInfo?.client_secret).toBeUndefined();
    });
  });
});
