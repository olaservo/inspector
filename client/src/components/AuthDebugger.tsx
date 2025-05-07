import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
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
import { CheckCircle2, Circle, ExternalLink } from "lucide-react";

// Type for the toast function from the useToast hook
type ToastFunction = ReturnType<typeof useToast>["toast"];

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

// Enhanced version of the OAuth client provider specifically for debug flows
class DebugInspectorOAuthClientProvider extends InspectorOAuthClientProvider {
  get redirectUrl(): string {
    return `${window.location.origin}/oauth/callback/debug`;
  }
}

const validateOAuthMetadata = (
  metadata: OAuthMetadata | null,
  toast: ToastFunction,
): OAuthMetadata => {
  if (!metadata) {
    toast({
      title: "Error",
      description: "Can't advance without successfully fetching metadata",
      variant: "destructive",
    });
    throw new Error("OAuth metadata not found");
  }
  return metadata;
};

const validateClientInformation = async (
  provider: DebugInspectorOAuthClientProvider,
  toast: ToastFunction,
): Promise<OAuthClientInformation> => {
  const clientInformation = await provider.clientInformation();

  if (!clientInformation) {
    toast({
      title: "Error",
      description: "Can't advance without successful client registration",
      variant: "destructive",
    });
    throw new Error("OAuth client information not found");
  }
  return clientInformation;
};

const AuthDebugger = ({ sseUrl, onBack }: AuthDebuggerProps) => {
  const { toast } = useToast();
  const [isInitiatingAuth, setIsInitiatingAuth] = useState(false);
  const [oauthTokens, setOAuthTokens] = useState<OAuthTokens | null>(null);
  const [loading, setLoading] = useState(true);
  const [oauthStep, setOAuthStep] = useState<OAuthStep>("not_started");
  const [oauthMetadata, setOAuthMetadata] = useState<OAuthMetadata | null>(
    null,
  );
  const [oauthClientInfo, setOAuthClientInfo] = useState<
    OAuthClientInformationFull | OAuthClientInformation | null
  >(null);
  const [authorizationUrl, setAuthorizationUrl] = useState<string | null>(null);
  const [oauthFlowVisible, setOAuthFlowVisible] = useState(false);
  const [authorizationCode, setAuthorizationCode] = useState<string>("");
  const [latestError, setLatestError] = useState<Error | null>(null);
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
            setOAuthTokens(parsedTokens);
            setOAuthStep("complete");
          }
        }
      } catch (error) {
        console.error("Error loading OAuth tokens:", error);
      } finally {
        setLoading(false);
      }
    };

    loadOAuthTokens();
  }, [sseUrl]); // Check for debug callback code

  // Check for debug callback code and load client info
  useEffect(() => {
    const debugCode = sessionStorage.getItem(SESSION_KEYS.DEBUG_CODE);
    if (debugCode && sseUrl) {
      // We've returned from a debug OAuth callback with a code
      setAuthorizationCode(debugCode);
      setOAuthFlowVisible(true);
      setOAuthStep("token_request");

      // Load client info asynchronously
      const provider = new DebugInspectorOAuthClientProvider(sseUrl);
      provider
        .clientInformation()
        .then((info) => {
          setOAuthClientInfo(info || null);
        })
        .catch((error) => {
          console.error("Failed to load client information:", error);
        });

      // Now that we've processed it, clear the debug code
      sessionStorage.removeItem(SESSION_KEYS.DEBUG_CODE);
    }
  }, [sseUrl]);

  const startOAuthFlow = () => {
    if (!sseUrl) {
      toast({
        title: "Error",
        description:
          "Please enter a server URL in the sidebar before authenticating",
        variant: "destructive",
      });
      return;
    }

    setOAuthFlowVisible(true);
    setOAuthStep("not_started");
    setAuthorizationUrl(null);
  };

  const proceedToNextStep = async () => {
    if (!sseUrl) return;
    const provider = new DebugInspectorOAuthClientProvider(sseUrl);

    try {
      setIsInitiatingAuth(true);

      if (oauthStep === "not_started") {
        setOAuthStep("metadata_discovery");
        const metadata = await discoverOAuthMetadata(sseUrl);
        if (!metadata) {
          toast({
            title: "Error",
            description: "Failed to discover OAuth metadata",
            variant: "destructive",
          });
          return;
        }
        const parsedMetadata = await OAuthMetadataSchema.parseAsync(metadata);
        setOAuthMetadata(parsedMetadata);
      } else if (oauthStep === "metadata_discovery") {
        const metadata = validateOAuthMetadata(oauthMetadata, toast);

        setOAuthStep("client_registration");

        const clientMetadata = provider.clientMetadata;
        // Add all supported scopes to client registration.
        // This is the maximal set of scopes the client can request, the
        // scope of the actual token is specified below
        if (metadata.scopes_supported) {
          // TODO: add this to schema
          clientMetadata["scope"] = metadata.scopes_supported.join(" ");
        }

        const fullInformation = await registerClient(sseUrl, {
          metadata,
          clientMetadata,
        });

        provider.saveClientInformation(fullInformation);
        // save it here to be more convenient for display
        setOAuthClientInfo(fullInformation);
      } else if (oauthStep === "client_registration") {
        const metadata = validateOAuthMetadata(oauthMetadata, toast);
        const clientInformation = await validateClientInformation(
          provider,
          toast,
        );
        setOAuthStep("authorization_redirect");
        try {
          const { authorizationUrl, codeVerifier } = await startAuthorization(
            sseUrl,
            {
              metadata,
              clientInformation,
              redirectUrl: provider.redirectUrl,
              // TODO: fix this once SDK PR is merged
              // scope: metadata.scopes_supported,
            },
          );

          provider.saveCodeVerifier(codeVerifier);

          // TODO: remove this once scope is valid parameter above
          // Modify the authorization URL to include all supported scopes
          if (metadata.scopes_supported) {
            //Add all supported scopes to the authorization URL
            const url = new URL(authorizationUrl.toString());
            url.searchParams.set("scope", metadata.scopes_supported.join(" "));
            setAuthorizationUrl(url.toString());
          } else {
            setAuthorizationUrl(authorizationUrl.toString());
          }

          setOAuthStep("authorization_code");
        } catch (error) {
          console.error("OAuth flow step error:", error);
          toast({
            title: "OAuth Setup Error",
            description: `Failed to complete OAuth setup: ${error instanceof Error ? error.message : String(error)}`,
            variant: "destructive",
          });
        }
      } else if (oauthStep === "authorization_code") {
        if (!authorizationCode || authorizationCode.trim() === "") {
          toast({
            title: "Error",
            description: "You need to provide an authorization code",
            variant: "destructive",
          });
          return;
        }
        // We have a code, continue to token request
        setOAuthStep("token_request");
      } else if (oauthStep === "token_request") {
        const codeVerifier = provider.codeVerifier();
        const metadata = validateOAuthMetadata(oauthMetadata, toast);
        const clientInformation = await validateClientInformation(
          provider,
          toast,
        );

        const tokens = await exchangeAuthorization(sseUrl, {
          metadata,
          clientInformation,
          authorizationCode,
          codeVerifier,
          redirectUri: provider.redirectUrl,
        });

        provider.saveTokens(tokens);
        setOAuthTokens(tokens);
        setOAuthStep("complete");
      }
    } catch (error) {
      console.error("OAuth flow error:", error);
      setLatestError(error instanceof Error ? error : new Error(String(error)));

      toast({
        title: "OAuth Flow Error",
        description: `Error in OAuth flow: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    } finally {
      setIsInitiatingAuth(false);
    }
  };

  const handleStartOAuth = async () => {
    if (!sseUrl) {
      toast({
        title: "Error",
        description:
          "Please enter a server URL in the sidebar before authenticating",
        variant: "destructive",
      });
      return;
    }

    setIsInitiatingAuth(true);
    try {
      // Create an auth provider with the current server URL
      const serverAuthProvider = new DebugInspectorOAuthClientProvider(sseUrl);

      // Start the OAuth flow with immediate redirect
      await auth(serverAuthProvider, { serverUrl: sseUrl });

      // This code may not run if redirected to OAuth provider
      toast({
        title: "Authenticating",
        description: "Starting OAuth authentication process...",
      });
    } catch (error) {
      console.error("OAuth initialization error:", error);
      toast({
        title: "OAuth Error",
        description: `Failed to start OAuth flow: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    } finally {
      setIsInitiatingAuth(false);
    }
  };

  const handleClearOAuth = () => {
    if (sseUrl) {
      const serverAuthProvider = new DebugInspectorOAuthClientProvider(sseUrl);
      serverAuthProvider.clear();
      setOAuthTokens(null);
      setOAuthStep("not_started");
      setOAuthFlowVisible(false);
      setLatestError(null);
      setOAuthClientInfo(null);
      setAuthorizationCode("");
      toast({
        title: "Success",
        description: "OAuth tokens cleared successfully",
      });
    }
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
        metadata: oauthMetadata && (
          <details className="text-xs mt-2">
            <summary className="cursor-pointer text-muted-foreground font-medium">
              Retrieved OAuth Metadata from {sseUrl}
              /.well-known/oauth-authorization-server
            </summary>
            <pre className="mt-2 p-2 bg-muted rounded-md overflow-auto max-h-[300px]">
              {JSON.stringify(oauthMetadata, null, 2)}
            </pre>
          </details>
        ),
      },
      {
        key: "client_registration",
        label: "Client Registration",
        metadata: (
          <details className="text-xs mt-2">
            <summary className="cursor-pointer text-muted-foreground font-medium">
              Registered Client Information
            </summary>
            <pre className="mt-2 p-2 bg-muted rounded-md overflow-auto max-h-[300px]">
              {JSON.stringify(oauthClientInfo, null, 2)}
            </pre>
          </details>
        ),
      },
      {
        key: "authorization_redirect",
        label: "Preparing Authorization",
        metadata: authorizationUrl && (
          <div className="mt-2 p-3 border rounded-md bg-muted">
            <p className="font-medium mb-2 text-sm">Authorization URL:</p>
            <div className="flex items-center gap-2">
              <p className="text-xs break-all">{authorizationUrl}</p>
              <a
                href={authorizationUrl}
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
                value={authorizationCode}
                onChange={(e) => setAuthorizationCode(e.target.value)}
                placeholder="Enter the code from the authorization server"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
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
        metadata: oauthMetadata && (
          <details className="text-xs mt-2">
            <summary className="cursor-pointer text-muted-foreground font-medium">
              Token Request Details
            </summary>
            <div className="mt-2 p-2 bg-muted rounded-md">
              <p className="font-medium">Token Endpoint:</p>
              <code className="block mt-1 text-xs overflow-x-auto">
                {oauthMetadata.token_endpoint}
              </code>
              {/* TODO: break down the URL components */}
            </div>
          </details>
        ),
      },
      {
        key: "complete",
        label: "Authentication Complete",
        metadata: oauthTokens && (
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
              {JSON.stringify(oauthTokens, null, 2)}
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
            const currentStepIdx = steps.findIndex((s) => s.key === oauthStep);
            const isComplete = idx <= currentStepIdx;
            const isCurrent = step.key === oauthStep;

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
                {isCurrent && latestError && (
                  <div className="ml-7 mt-2 p-3 border border-red-300 bg-red-50 rounded-md">
                    <p className="text-sm font-medium text-red-700">Error:</p>
                    <p className="text-xs text-red-600 mt-1">
                      {latestError.message}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 mt-4">
          {oauthStep !== "complete" && (
            <Button onClick={proceedToNextStep} disabled={isInitiatingAuth}>
              {isInitiatingAuth
                ? "Processing..."
                : oauthStep === "authorization_redirect" && authorizationUrl
                  ? "Open Authorization URL"
                  : "Continue"}
            </Button>
          )}

          {oauthStep === "authorization_redirect" && authorizationUrl && (
            <Button
              variant="outline"
              onClick={() => window.open(authorizationUrl, "_blank")}
            >
              Open in New Tab
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => {
              setOAuthFlowVisible(false);
              setOAuthStep("not_started");
            }}
          >
            Close Flow
          </Button>
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

              {loading ? (
                <p>Loading authentication status...</p>
              ) : (
                <div className="space-y-4">
                  {oauthTokens && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Access Token:</p>
                      <div className="bg-muted p-2 rounded-md text-xs overflow-x-auto">
                        {oauthTokens.access_token.substring(0, 25)}...
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      onClick={startOAuthFlow}
                      disabled={isInitiatingAuth}
                    >
                      {oauthTokens
                        ? "Guided Token Refresh"
                        : "Guided OAuth Flow"}
                    </Button>

                    <Button
                      onClick={handleStartOAuth}
                      disabled={isInitiatingAuth}
                    >
                      {isInitiatingAuth
                        ? "Initiating..."
                        : oauthTokens
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

            {oauthFlowVisible && renderOAuthFlow()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthDebugger;
