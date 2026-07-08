# Dynamic evidence

This directory contains sanitized reports produced by running the exact signed
Claude Code binary identified in [`../provenance.json`](../provenance.json).

Dynamic probes obey a stricter publication boundary than ordinary debug logs:

- execution happens under a newly created temporary home and project;
- provider traffic is redirected to loopback with a dummy credential;
- nonessential traffic and telemetry are disabled;
- raw system prompts, message text, tool descriptions, credentials, and user
  configuration are never written to committed reports;
- sensitive strings are represented only by byte length and SHA-256 digest;
- file snapshots retain normalized relative paths, byte sizes, and hashes;
- generated reports are checked for absolute paths and credential patterns.

The probes are behavioral experiments, not proof that every code path uses the
same mechanism. Each report names the binary hash, command shape, fixture, and
observed boundary so later versions can be compared.
