/**
 * SCHEMATIC — NOT BEHAVIORALLY EQUIVALENT.
 * Reconstructed credential resolution and storage boundary.
 * Provenance: auth.api-key, auth.api-key-helper, auth.macos-keychain,
 * auth.oauth-url, workspace-trust.proxy-helper.
 * Confidence: observed = credential source names and Keychain/helper seams;
 * derived = provider interfaces; hypothesis = precedence, cache durations, and
 * portable fallback-store mechanics.
 */

export type CredentialSource =
  | "ANTHROPIC_AUTH_TOKEN"
  | "CLAUDE_CODE_OAUTH_TOKEN"
  | "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR"
  | "CCR_OAUTH_TOKEN_FILE"
  | "ANTHROPIC_API_KEY"
  | "apiKeyHelper"
  | "profile"
  | "claude.ai"
  | "macOS-keychain"
  | "credentials-file"
  | "none";

export interface Credential {
  source: CredentialSource;
  token: string | null;
  kind: "api-key" | "oauth" | "auth-token" | "none";
  expiresAt?: number;
}

export interface CredentialEnvironment {
  ANTHROPIC_AUTH_TOKEN?: string;
  CLAUDE_CODE_OAUTH_TOKEN?: string;
  CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR?: string;
  ANTHROPIC_API_KEY?: string;
}

export interface CredentialBackends {
  runApiKeyHelper(command: string): Promise<string | null>;
  readOAuthTokenFromDescriptor(reference: string): Promise<string | null>;
  readProfileToken(): Promise<string | null>;
  readClaudeAiOAuth(): Promise<{
    accessToken: string;
    expiresAt?: number;
  } | null>;
  readMacOSKeychain(): Promise<string | null>;
  readCredentialsFile(): Promise<string | null>;
}

export interface CredentialPolicy {
  apiKeyHelper?: string;
  allowOAuthAndKeychain: boolean;
  allowProjectHelper: boolean;
  remoteHostMode: boolean;
}

export async function resolveCredential(
  env: CredentialEnvironment,
  policy: CredentialPolicy,
  backends: CredentialBackends,
): Promise<Credential> {
  if (env.ANTHROPIC_AUTH_TOKEN)
    return credential(
      "ANTHROPIC_AUTH_TOKEN",
      env.ANTHROPIC_AUTH_TOKEN,
      "auth-token",
    );
  if (env.CLAUDE_CODE_OAUTH_TOKEN)
    return credential(
      "CLAUDE_CODE_OAUTH_TOKEN",
      env.CLAUDE_CODE_OAUTH_TOKEN,
      "oauth",
    );
  if (env.CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR) {
    const token = await backends.readOAuthTokenFromDescriptor(
      env.CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR,
    );
    if (token)
      return credential(
        "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR",
        token,
        "oauth",
      );
  }
  if (env.ANTHROPIC_API_KEY)
    return credential("ANTHROPIC_API_KEY", env.ANTHROPIC_API_KEY, "api-key");

  if (
    policy.apiKeyHelper &&
    policy.allowProjectHelper &&
    !policy.remoteHostMode
  ) {
    const token = await backends.runApiKeyHelper(policy.apiKeyHelper);
    if (token) return credential("apiKeyHelper", token, "api-key");
  }

  const profile = await backends.readProfileToken();
  if (profile) return credential("profile", profile, "oauth");

  if (policy.allowOAuthAndKeychain) {
    const oauth = await backends.readClaudeAiOAuth();
    if (oauth)
      return {
        source: "claude.ai",
        token: oauth.accessToken,
        kind: "oauth",
        expiresAt: oauth.expiresAt,
      };
    const keychain = await backends.readMacOSKeychain();
    if (keychain) return credential("macOS-keychain", keychain, "api-key");
    const file = await backends.readCredentialsFile();
    if (file) return credential("credentials-file", file, "api-key");
  }

  return credential("none", null, "none");
}

function credential(
  source: CredentialSource,
  token: string | null,
  kind: Credential["kind"],
): Credential {
  return { source, token, kind };
}

/**
 * Storage boundary: macOS uses `security add-generic-password -U`. Portable
 * fallback representation, file mode, and atomicity are not asserted here.
 */
export interface CredentialStore {
  read(): Promise<unknown>;
  write(value: unknown): Promise<void>;
  delete(): Promise<void>;
}

export function safeCredentialLog(
  credential: Credential,
): Record<string, unknown> {
  return {
    source: credential.source,
    kind: credential.kind,
    hasToken: credential.token !== null,
    expiresAt: credential.expiresAt,
  };
}
