/**
 * SCHEMATIC — NOT BEHAVIORALLY EQUIVALENT.
 * Native/package boundary reconstruction for the inspected macOS artifact.
 * Provenance: build.git-sha, socket.directory-mode, entrypoint.routing.
 * Confidence: observed = Mach-O/Bun layout, signature, dylibs and embedded JS
 * offsets; derived = boundary map; hypothesis = build-pipeline implementation.
 */

export interface InspectedArtifact {
  installLink: string;
  versionPath: string;
  version: string;
  architecture: "arm64";
  format: "Mach-O 64-bit executable";
  sizeBytes: number;
  sha256: string;
  bundleIdentifier: string;
  signingAuthority: string;
  teamIdentifier: string;
  hardenedRuntime: boolean;
  bunSection: { fileOffset: number; sizeBytes: number };
  bunPayload: { fileOffset: number; sizeBytes: number };
  recoveredCliModule: { fileOffset: number; sizeBytes: number; sha256: string };
}

export const INSPECTED_ARTIFACT: InspectedArtifact = {
  installLink: "~/.local/bin/claude",
  versionPath: "~/.local/share/claude/versions/2.1.177",
  version: "2.1.177",
  architecture: "arm64",
  format: "Mach-O 64-bit executable",
  sizeBytes: 225_124_512,
  sha256: "eb0730351be2f02b482b1855870f5877489085aac86b0c4c1db4e458d9e40ed9",
  bundleIdentifier: "com.anthropic.claude-code",
  signingAuthority: "Developer ID Application: Anthropic PBC (Q6L2SF6YDW)",
  teamIdentifier: "Q6L2SF6YDW",
  hardenedRuntime: true,
  bunSection: { fileOffset: 72_368_128, sizeBytes: 150_764_738 },
  bunPayload: { fileOffset: 72_368_136, sizeBytes: 150_764_730 },
  recoveredCliModule: {
    fileOffset: 201_487_816,
    sizeBytes: 17_038_096,
    sha256: "45cb1eaa2b7e274ce87b1df0a1729f017ac06fffe782fac8acb42ab186243573",
  },
};

export type NativeBoundary =
  | "filesystem"
  | "child-process"
  | "network"
  | "keychain"
  | "sandbox"
  | "terminal"
  | "local-ipc"
  | "microphone";

export const NATIVE_DEPENDENCIES = [
  "/usr/lib/libicucore.A.dylib",
  "/usr/lib/libresolv.9.dylib",
  "/usr/lib/libc++.1.dylib",
  "/usr/lib/libSystem.B.dylib",
] as const;

/** The public evidence establishes this check and no broader IPC assurances. */
export const SOCKET_DIRECTORY_CHECK = {
  requiredMode: 0o700,
} as const;

/**
 * The embedded source is a generated deployment artifact, not original module
 * layout. Reconstructed files intentionally preserve semantic boundaries rather
 * than claiming minified identifier names are stable source names.
 */
export const RECONSTRUCTION_LIMITS = {
  originalTypeNamesRecoverable: false,
  originalFileBoundariesRecoverable: false,
  literalSchemasAndMessagesRecoverable: true,
  runtimeControlFlowPartiallyRecoverable: true,
} as const;
