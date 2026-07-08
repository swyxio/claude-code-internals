# Threat Model and Disclosure

Visual companion: [threat model and control register](../maps/threat-model.md).

This atlas documents mechanisms and review surfaces. It does not publish uncoordinated vulnerabilities, exploit chains, credentials, or attack tooling.

## Threat scenarios

| Scenario | Boundary crossed | Relevant controls |
|---|---|---|
| Malicious repository activates executable configuration | Repository → local process | Workspace trust, safe/bare mode, strict MCP |
| Prompt injection requests destructive or exfiltrating tool use | Model/context → machine | Permission rules, user confirmation, sandbox |
| Compromised plugin or marketplace update executes code | Supply chain → hooks/MCP/LSP | Pinning, manifest review, component inventory |
| Local peer attaches to IPC | Local user/process → session | `0700` socket directory, peer authentication |
| Remote peer controls wrong machine/session | Network peer → local tools | Remote peer isolation, session binding, permissions |
| Credential leaks to child process or logs | Auth store → extension/debug output | Environment scrub, redaction, minimal helpers |
| Update channel delivers unexpected artifact | Release origin → runtime | Manifest checksum, code signature, version pinning |
| Sandbox silently degrades | Allowed tool → host | Fail-closed policy, no-escape setting, compatibility review |

These scenarios are not claims that exploitation succeeds. They identify where evidence-backed controls should be tested.

## Severity considerations

A local issue becomes more serious when it is reachable before workspace trust, requires no explicit extension installation, escapes managed policy, exposes credentials or files outside the workspace, crosses account/machine boundaries, or persists silently. A behavior requiring a deliberately enabled bypass mode in a disposable sandbox has a different risk profile.

## Safe research constraints

- Use only an installation and accounts you are authorized to test.
- Prefer static inspection and synthetic repositories.
- Do not access another user’s data, account, session, IPC endpoint, or MCP server.
- Do not degrade service, automate high-volume traffic, or test production denial of service.
- Stop after the minimum proof needed to establish a security issue.
- Keep proof material private, encrypted, and free of unrelated user data.
- Do not publish a patch diff that makes a newly fixed issue immediately exploitable.

## Anthropic reporting path

Anthropic’s [Responsible Disclosure Policy](https://www.anthropic.com/responsible-disclosure-policy) covers its internet-facing systems and provides a HackerOne reporting route. It asks researchers to avoid harm, access only what is necessary, not retain inadvertently accessed data, and coordinate public disclosure until receiving prior written notice. Questions about whether research fits the policy can be sent to `disclosure@anthropic.com`.

The policy also excludes third-party-controlled systems. If a plugin, marketplace, MCP service, cloud provider, or dependency is affected, follow that owner’s disclosure process as well.

!!! warning "Do not borrow the wrong deadline"
    Anthropic’s separate coordinated-disclosure framework for vulnerabilities Anthropic discovers in other software mentions a target timeline. It is not automatically the policy governing an external report to Anthropic. Use the Responsible Disclosure Policy and the coordination instructions for the actual report.

## Repository disclosure workflow

1. Do not open a public issue with exploit details.
2. Preserve the affected artifact hash, version, platform, and minimal reproduction privately.
3. Separate observed facts from impact hypotheses.
4. Submit to the appropriate vendor and identify any third-party component.
5. Record an embargoed claim ID without sensitive content if project coordination requires it.
6. Publish only after remediation and coordinated approval, with secrets and weaponizable detail removed as appropriate.

## Current findings posture

The entitlements, unsandboxed hook trust, strict-mode switches, and compatibility settings documented here are **review surfaces**, not vulnerability declarations. The public evidence set contains no claim labeled as a confirmed exploitable vulnerability.

## Takedown and correction

If a page inadvertently exposes confidential data, proprietary source, or an uncoordinated vulnerability, maintainers should remove it from the served site and Git history promptly, preserve only the minimum private evidence needed for incident response, rotate affected secrets, and contact the appropriate owner.
