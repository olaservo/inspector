import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { InspectorOAuthClientProvider } from "../lib/auth";
import {
  auth,
  discoverOAuthMetadata,
  registerClient,
  startAuthorization,
  exchangeAuthorization,
} from "@modelcontextprotocol/sdk/client/auth.js";
import { SESSION_KEYS, getServerSpecificKey } from "../lib/constants";
import {
  OAuthTokensSchema,
  OAuthMetadataSchema,
  OAuthMetadata,
  OAuthClientInformationFull,
  OAuthClientInformation,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import { CheckCircle2, Circle, ExternalLink, AlertCircle } from "lucide-react";

interface AuthDebuggerProps {
  sseUrl: string;
  onBack: () => void;
}

// OAuth flow steps
type OAuthStep =
  | "not_started"
  | "metadata_discovery"
  | "client_registration"
  | "authorization_redirect"
  | "authorization_code"
  | "token_request"
  | "complete";

// Message types for inline feedback
type MessageType = "success" | "error" | "info";

interface StatusMessage {
  type: MessageType;
  message: string;
}

// Single state interface to replace multiple useState calls
interface AuthDebuggerState {
  isInitiatingAuth: boolean;
  oauthTokens: OAuthTokens | null;
  loading: boolean;
  oauthStep: OAuthStep;
  oauthMetadata: OAuthMetadata | null;
  oauthClientInfo: OAuthClientInformationFull | OAuthClientInformation | null;
  authorizationUrl: string | null;
  authorizationCode: string;
  latestError: Error | null;
  statusMessage: StatusMessage | null;
  validationError: string | null;
}

// Enhanced version of the OAuth client provider specifically for debug flows
class DebugInspectorOAuthClientProvider extends InspectorOAuthClientProvider {
  get redirectUrl(): string {
    return `${window.location.origin}/oauth/callback/debug`;
  }
}

const AuthDebugger = ({ sseUrl, onBack }: AuthDebuggerProps) => {
  // Single state object instead of multiple useState calls
  const [state, setState] = useState<AuthDebuggerState>({
    isInitiatingAuth: false,
    oauthTokens: null,
    loading: true,
    oauthStep: "not_started",
    oauthMetadata: null,
    oauthClientInfo: null,
    authorizationUrl: null,
    authorizationCode: "",
    latestError: null,
    statusMessage: null,
    validationError: null,
  });

  // Helper function to update specific state properties
  const updateState = (updates: Partial<AuthDebuggerState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  // Load OAuth tokens on component mount
  useEffect(() => {
    const loadOAuthTokens = async () => {
      try {
        if (sseUrl) {
          const key = getServerSpecificKey(SESSION_KEYS.TOKENS, sseUrl);
          const tokens = sessionStorage.getItem(key);
          if (tokens) {
            const parsedTokens = await OAuthTokensSchema.parseAsync(
              JSON.parse(tokens),
            );
            updateState({
              oauthTokens: parsedTokens,
              oauthStep: "complete",
            });
          }
        }
      } catch (error) {
        console.error("Error loading OAuth tokens:", error);
      } finally {
        updateState({ loading: false });
      }
    };

    loadOAuthTokens();
  }, [sseUrl]);

  // Check for debug callback code and load client info
  useEffect(() => {
    const debugCode = sessionStorage.getItem(SESSION_KEYS.DEBUG_CODE);
    if (debugCode && sseUrl) {
      // We've returned from a debug OAuth callback with a code
      updateState({
        authorizationCode: debugCode,
        oauthStep: "token_request",
      });

      // Load client info asynchronously
      const provider = new DebugInspectorOAuthClientProvider(sseUrl);
      provider
        .clientInformation()
        .then((info) => {
          updateState({ oauthClientInfo: info || null });
        })
        .catch((error) => {
          console.error("Failed to load client information:", error);
        });

      // Now that we've processed it, clear the debug code
      sessionStorage.removeItem(SESSION_KEYS.DEBUG_CODE);
    }
  }, [sseUrl]);

  const validateOAuthMetadata = (
    metadata: OAuthMetadata | null,
  ): OAuthMetadata => {
    if (!metadata) {
      throw new Error("Can't advance without successfully fetching metadata");
    }
    return metadata;
  };

  const validateClientInformation = async (
    provider: DebugInspectorOAuthClientProvider,
  ): Promise<OAuthClientInformation> => {
    const clientInformation = await provider.clientInformation();

    if (!clientInformation) {
      throw new Error("Can't advance without successful client registration");
    }
    return clientInformation;
  };

  const startOAuthFlow = () => {
    if (!sseUrl) {
      updateState({
        statusMessage: {
          type: "error",
          message:
            "Please enter a server URL in the sidebar before authenticating",
        },
      });
      return;
    }

    updateState({
      oauthStep: "not_started",
      authorizationUrl: null,
      statusMessage: null,
      latestError: null,
    });
  };

  const proceedToNextStep = async () => {
    if (!sseUrl) return;
    const provider = new DebugInspectorOAuthClientProvider(sseUrl);

    try {
      updateState({
        isInitiatingAuth: true,
        statusMessage: null,
        latestError: null,
      });

      if (state.oauthStep === "not_started") {
        updateState({ oauthStep: "metadata_discovery" });
        const metadata = await discoverOAuthMetadata(sseUrl);
        if (!metadata) {
          throw new Error("Failed to discover OAuth metadata");
        }
        const parsedMetadata = await OAuthMetadataSchema.parseAsync(metadata);
        updateState({ oauthMetadata: parsedMetadata });
      } else if (state.oauthStep === "metadata_discovery") {
        const metadata = validateOAuthMetadata(state.oauthMetadata);

        updateState({ oauthStep: "client_registration" });

        const clientMetadata = provider.clientMetadata;
        // Add all supported scopes to client registration.
        if (metadata.scopes_supported) {
          clientMetadata["scope"] = metadata.scopes_supported.join(" ");
        }

        const fullInformation = await registerClient(sseUrl, {
          metadata,
          clientMetadata,
        });

        provider.saveClientInformation(fullInformation);
        updateState({ oauthClientInfo: fullInformation });
      } else if (state.oauthStep === "client_registration") {
        const metadata = validateOAuthMetadata(state.oauthMetadata);
        const clientInformation = await validateClientInformation(provider);
        updateState({ oauthStep: "authorization_redirect" });
        try {
          const { authorizationUrl, codeVerifier } = await startAuthorization(
            sseUrl,
            {
              metadata,
              clientInformation,
              redirectUrl: provider.redirectUrl,
            },
          );

          provider.saveCodeVerifier(codeVerifier);

          if (metadata.scopes_supported) {
            const url = new URL(authorizationUrl.toString());
            url.searchParams.set("scope", metadata.scopes_supported.join(" "));
            updateState({ authorizationUrl: url.toString() });
          } else {
            updateState({ authorizationUrl: authorizationUrl.toString() });
          }

          updateState({ oauthStep: "authorization_code" });
        } catch (error) {
          console.error("OAuth flow step error:", error);
          throw new Error(
            `Failed to complete OAuth setup: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      } else if (state.oauthStep === "authorization_code") {
        if (!state.authorizationCode || state.authorizationCode.trim() === "") {
          updateState({ validationError: "You need to provide an authorization code" });
          return;
        }
        updateState({ validationError: null, oauthStep: "token_request" });
      } else if (state.oauthStep === "token_request") {
        const codeVerifier = provider.codeVerifier();
        const metadata = validateOAuthMetadata(state.oauthMetadata);
        const clientInformation = await validateClientInformation(provider);

        const tokens = await exchangeAuthorization(sseUrl, {
          metadata,
          clientInformation,
          authorizationCode: state.authorizationCode,
          codeVerifier,
          redirectUri: provider.redirectUrl,
        });

        provider.saveTokens(tokens);
        updateState({ oauthTokens: tokens, oauthStep: "complete" });
      }
    } catch (error) {
      console.error("OAuth flow error:", error);
      updateState({ latestError: error instanceof Error ? error : new Error(String(error)) });
    } finally {
      updateState({ isInitiatingAuth: false });
    }
  };

  const handleStartOAuth = async () => {
    if (!sseUrl) {
      updateState({
        statusMessage: {
          type: "error",
          message:
            "Please enter a server URL in the sidebar before authenticating",
        },
      });
      return;
    }

    updateState({ isInitiatingAuth: true, statusMessage: null });
    try {
      const serverAuthProvider = new DebugInspectorOAuthClientProvider(sseUrl);
      await auth(serverAuthProvider, { serverUrl: sseUrl });
      updateState({
        statusMessage: {
          type: "info",
          message: "Starting OAuth authentication process...",
        },
      });
    } catch (error) {
      console.error("OAuth initialization error:", error);
      updateState({
        statusMessage: {
          type: "error",
          message: `Failed to start OAuth flow: ${error instanceof Error ? error.message : String(error)}`,
        },
      });
    } finally {
      updateState({ isInitiatingAuth: false });
    }
  };

  const handleClearOAuth = () => {
    if (sseUrl) {
      const serverAuthProvider = new DebugInspectorOAuthClientProvider(sseUrl);
      serverAuthProvider.clear();
      updateState({
        oauthTokens: null,
        oauthStep: "not_started",
        latestError: null,
        oauthClientInfo: null,
        authorizationCode: "",
        validationError: null,
        statusMessage: {
          type: "success",
          message: "OAuth tokens cleared successfully",
        },
      });

      // Clear success message after 3 seconds
      setTimeout(() => {
        updateState({ statusMessage: null });
      }, 3000);
    }
  };

  const renderStatusMessage = () => {
    if (!state.statusMessage) return null;

    const bgColor =
      state.statusMessage.type === "error"
        ? "bg-red-50"
        : state.statusMessage.type === "success"
          ? "bg-green-50"
          : "bg-blue-50";
    const textColor =
      state.statusMessage.type === "error"
        ? "text-red-700"
        : state.statusMessage.type === "success"
          ? "text-green-700"
          : "text-blue-700";
    const borderColor =
      state.statusMessage.type === "error"
        ? "border-red-200"
        : state.statusMessage.type === "success"
          ? "border-green-200"
          : "border-blue-200";

    return (
      <div
        className={`p-3 rounded-md border ${bgColor} ${borderColor} ${textColor} mb-4`}
      >
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <p className="text-sm">{state.statusMessage.message}</p>
        </div>
      </div>
    );
  };

  const renderOAuthFlow = () => {
    const steps = [
      {
        key: "not_started",
        label: "Starting OAuth Flow",
        metadata: null,
      },
      {
        key: "metadata_discovery",
        label: "Metadata Discovery",
        metadata: state.oauthMetadata && (
          <details className="text-xs mt-2">
            <summary className="cursor-pointer text-muted-foreground font-medium">
              Retrieved OAuth Metadata from {sseUrl}
              /.well-known/oauth-authorization-server
            </summary>
            <pre className="mt-2 p-2 bg-muted rounded-md overflow-auto max-h-[300px]">
              {JSON.stringify(state.oauthMetadata, null, 2)}
            </pre>
          </details>
        ),
      },
      {
        key: "client_registration",
        label: "Client Registration",
        metadata: state.oauthClientInfo && (
          <details className="text-xs mt-2">
            <summary className="cursor-pointer text-muted-foreground font-medium">
              Registered Client Information
            </summary>
            <pre className="mt-2 p-2 bg-muted rounded-md overflow-auto max-h-[300px]">
              {JSON.stringify(state.oauthClientInfo, null, 2)}
            </pre>
          </details>
        ),
      },
      {
        key: "authorization_redirect",
        label: "Preparing Authorization",
        metadata: state.authorizationUrl && (
          <div className="mt-2 p-3 border rounded-md bg-muted">
            <p className="font-medium mb-2 text-sm">Authorization URL:</p>
            <div className="flex items-center gap-2">
              <p className="text-xs break-all">{state.authorizationUrl}</p>
              <a
                href={state.authorizationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-blue-500 hover:text-blue-700"
                aria-label="Open authorization URL in new tab"
                title="Open authorization URL"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Click the link to authorize in your browser. After authorization,
              you'll be redirected back to continue the flow.
            </p>
          </div>
        ),
      },
      {
        key: "authorization_code",
        label: "Request Authorization and acquire authorization code",
        metadata: (
          <div className="mt-3">
            <label
              htmlFor="authCode"
              className="block text-sm font-medium mb-1"
            >
              Authorization Code
            </label>
            <div className="flex gap-2">
              <input
                id="authCode"
                value={state.authorizationCode}
                onChange={(e) => {
                  updateState({
                    authorizationCode: e.target.value,
                    validationError: null,
                  });
                }}
                placeholder="Enter the code from the authorization server"
                className={`flex h-9 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  state.validationError ? "border-red-500" : "border-input"
                }`}
              />
            </div>
            {state.validationError && (
              <p className="text-xs text-red-600 mt-1">{state.validationError}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Once you've completed authorization in the link, paste the code
              here.
            </p>
          </div>
        ),
      },
      {
        key: "token_request",
        label: "Token Request",
        metadata: state.oauthMetadata && (
          <details className="text-xs mt-2">
            <summary className="cursor-pointer text-muted-foreground font-medium">
              Token Request Details
            </summary>
            <div className="mt-2 p-2 bg-muted rounded-md">
              <p className="font-medium">Token Endpoint:</p>
              <code className="block mt-1 text-xs overflow-x-auto">
                {state.oauthMetadata.token_endpoint}
              </code>
            </div>
          </details>
        ),
      },
      {
        key: "complete",
        label: "Authentication Complete",
        metadata: state.oauthTokens && (
          <details className="text-xs mt-2">
            <summary className="cursor-pointer text-muted-foreground font-medium">
              Access Tokens
            </summary>
            <p className="mt-1 text-sm">
              Authentication successful! You can now use the authenticated
              connection. These tokens will be used automatically for server
              requests.
            </p>
            <pre className="mt-2 p-2 bg-muted rounded-md overflow-auto max-h-[300px]">
              {JSON.stringify(state.oauthTokens, null, 2)}
            </pre>
          </details>
        ),
      },
    ];

    return (
      <div className="rounded-md border p-6 space-y-4 mt-4">
        <h3 className="text-lg font-medium">OAuth Flow Progress</h3>
        <p className="text-sm text-muted-foreground">
          Follow these steps to complete OAuth authentication with the server.
        </p>

        <div className="space-y-3">
          {steps.map((step, idx) => {
            const currentStepIdx = steps.findIndex((s) => s.key === state.oauthStep);
            const isComplete = idx <= currentStepIdx;
            const isCurrent = step.key === state.oauthStep;

            return (
              <div key={step.key}>
                <div
                  className={`flex items-center p-2 rounded-md ${isCurrent ? "bg-accent" : ""}`}
                >
                  {isComplete ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground mr-2" />
                  )}
                  <span className={`${isCurrent ? "font-medium" : ""}`}>
                    {step.label}
                  </span>
                </div>

                {/* Show step metadata if current step and metadata exists */}
                {(isCurrent || isComplete) && step.metadata && (
                  <div className="ml-7 mt-1">{step.metadata}</div>
                )}

                {/* Display error if current step and an error exists */}
                {isCurrent && state.latestError && (
                  <div className="ml-7 mt-2 p-3 border border-red-300 bg-red-50 rounded-md">
                    <p className="text-sm font-medium text-red-700">Error:</p>
                    <p className="text-xs text-red-600 mt-1">
                      {state.latestError.message}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 mt-4">
          {state.oauthStep !== "complete" && (
            <Button onClick={proceedToNextStep} disabled={state.isInitiatingAuth}>
              {state.isInitiatingAuth
                ? "Processing..."
                : state.oauthStep === "authorization_redirect" && state.authorizationUrl
                  ? "Open Authorization URL"
                  : "Continue"}
            </Button>
          )}

          {state.oauthStep === "authorization_redirect" && state.authorizationUrl && (
            <Button
              variant="outline"
              onClick={() => window.open(state.authorizationUrl!, "_blank")}
            >
              Open in New Tab
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Authentication Settings</h2>
        <Button variant="outline" onClick={onBack}>
          Back to Connect
        </Button>
      </div>

      <div className="w-full space-y-6">
        <div className="flex flex-col gap-6">
          <div className="grid w-full gap-2">
            <p className="text-muted-foreground mb-4">
              Configure authentication settings for your MCP server connection.
            </p>

            <div className="rounded-md border p-6 space-y-6">
              <h3 className="text-lg font-medium">OAuth Authentication</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Use OAuth to securely authenticate with the MCP server.
              </p>

              {renderStatusMessage()}

              {state.loading ? (
                <p>Loading authentication status...</p>
              ) : (
                <div className="space-y-4">
                  {state.oauthTokens && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Access Token:</p>
                      <div className="bg-muted p-2 rounded-md text-xs overflow-x-auto">
                        {state.oauthTokens.access_token.substring(0, 25)}...
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      onClick={startOAuthFlow}
                      disabled={state.isInitiatingAuth}
                    >
                      {state.oauthTokens
                        ? "Guided Token Refresh"
                        : "Guided OAuth Flow"}
                    </Button>

                    <Button
                      onClick={handleStartOAuth}
                      disabled={state.isInitiatingAuth}
                    >
                      {state.isInitiatingAuth
                        ? "Initiating..."
                        : state.oauthTokens
                          ? "Quick Refresh"
                          : "Quick OAuth Flow"}
                    </Button>

                    <Button variant="outline" onClick={handleClearOAuth}>
                      Clear OAuth State
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Choose "Guided" for step-by-step instructions or "Quick" for
                    the standard automatic flow.
                  </p>
                </div>
              )}
            </div>

            {renderOAuthFlow()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthDebugger;