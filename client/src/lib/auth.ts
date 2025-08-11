import { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import {
  OAuthClientInformation,
  OAuthTokens,
  OAuthClientMetadata,
  OAuthMetadata,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import { SESSION_KEYS, getServerSpecificKey } from "./constants";

// Stub implementations for backward compatibility - these now do nothing
// since client information is stored securely in memory
export const saveClientInformationToSessionStorage = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _params: {
    serverUrl: string;
    clientInformation: OAuthClientInformation;
    isPreregistered?: boolean;
  },
) => {
  // No-op: Client information is now stored securely in memory
};

export const clearClientInformationFromSessionStorage = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _params: {
    serverUrl: string;
    isPreregistered?: boolean;
  },
) => {
  // No-op: Client information is now stored securely in memory
};

// In-memory storage for sensitive OAuth data
class SecureOAuthStorage {
  private static tokenStorage = new Map<string, OAuthTokens>();
  private static verifierStorage = new Map<string, string>();
  private static clientInfoStorage = new Map<string, OAuthClientInformation>();

  static saveTokens(serverUrl: string, tokens: OAuthTokens) {
    this.tokenStorage.set(serverUrl, tokens);
  }

  static getTokens(serverUrl: string): OAuthTokens | undefined {
    return this.tokenStorage.get(serverUrl);
  }

  static saveCodeVerifier(serverUrl: string, verifier: string) {
    this.verifierStorage.set(serverUrl, verifier);
  }

  static getCodeVerifier(serverUrl: string): string | undefined {
    return this.verifierStorage.get(serverUrl);
  }

  static saveClientInformation(serverUrl: string, clientInfo: OAuthClientInformation, isPreregistered: boolean = false) {
    const key = isPreregistered ? `${serverUrl}:preregistered` : serverUrl;
    this.clientInfoStorage.set(key, clientInfo);
  }

  static getClientInformation(serverUrl: string, isPreregistered: boolean = false): OAuthClientInformation | undefined {
    const key = isPreregistered ? `${serverUrl}:preregistered` : serverUrl;
    return this.clientInfoStorage.get(key);
  }

  static clearTokens(serverUrl: string) {
    this.tokenStorage.delete(serverUrl);
  }

  static clearCodeVerifier(serverUrl: string) {
    this.verifierStorage.delete(serverUrl);
  }

  static clearClientInformation(serverUrl: string, isPreregistered: boolean = false) {
    const key = isPreregistered ? `${serverUrl}:preregistered` : serverUrl;
    this.clientInfoStorage.delete(key);
  }

  static clearAll(serverUrl: string) {
    this.clearTokens(serverUrl);
    this.clearCodeVerifier(serverUrl);
    this.clearClientInformation(serverUrl, false);
    this.clearClientInformation(serverUrl, true);
  }
}

export class InspectorOAuthClientProvider implements OAuthClientProvider {
  constructor(protected serverUrl: string) {
    // Save the server URL to session storage (not sensitive)
    sessionStorage.setItem(SESSION_KEYS.SERVER_URL, serverUrl);
  }

  get redirectUrl() {
    return window.location.origin + "/oauth/callback";
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      redirect_uris: [this.redirectUrl],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      client_name: "MCP Inspector",
      client_uri: "https://github.com/modelcontextprotocol/inspector",
    };
  }

  async clientInformation() {
    // Try to get the preregistered client information from secure storage first
    const preregisteredClientInformation = SecureOAuthStorage.getClientInformation(
      this.serverUrl,
      true
    );

    // If no preregistered client information is found, get the dynamically registered client information
    return (
      preregisteredClientInformation ??
      SecureOAuthStorage.getClientInformation(this.serverUrl, false)
    );
  }

  saveClientInformation(clientInformation: OAuthClientInformation) {
    // Save the dynamically registered client information to secure storage
    SecureOAuthStorage.saveClientInformation(this.serverUrl, clientInformation, false);
  }

  async tokens() {
    return SecureOAuthStorage.getTokens(this.serverUrl);
  }

  saveTokens(tokens: OAuthTokens) {
    SecureOAuthStorage.saveTokens(this.serverUrl, tokens);
  }

  redirectToAuthorization(authorizationUrl: URL) {
    window.location.href = authorizationUrl.href;
  }

  saveCodeVerifier(codeVerifier: string) {
    SecureOAuthStorage.saveCodeVerifier(this.serverUrl, codeVerifier);
  }

  codeVerifier() {
    const verifier = SecureOAuthStorage.getCodeVerifier(this.serverUrl);
    if (!verifier) {
      throw new Error("No code verifier saved for session");
    }

    return verifier;
  }

  clear() {
    SecureOAuthStorage.clearAll(this.serverUrl);
  }
}

// Overrides debug URL and allows saving server OAuth metadata to
// display in debug UI.
export class DebugInspectorOAuthClientProvider extends InspectorOAuthClientProvider {
  get redirectUrl(): string {
    return `${window.location.origin}/oauth/callback/debug`;
  }

  saveServerMetadata(metadata: OAuthMetadata) {
    const key = getServerSpecificKey(
      SESSION_KEYS.SERVER_METADATA,
      this.serverUrl,
    );
    sessionStorage.setItem(key, JSON.stringify(metadata));
  }

  getServerMetadata(): OAuthMetadata | null {
    const key = getServerSpecificKey(
      SESSION_KEYS.SERVER_METADATA,
      this.serverUrl,
    );
    const metadata = sessionStorage.getItem(key);
    if (!metadata) {
      return null;
    }
    return JSON.parse(metadata);
  }

  clear() {
    super.clear();
    sessionStorage.removeItem(
      getServerSpecificKey(SESSION_KEYS.SERVER_METADATA, this.serverUrl),
    );
  }
}
