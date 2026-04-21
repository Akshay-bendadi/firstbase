# Security Policy

## Supported Versions

Security fixes are released for the latest published version of `quicky-setup`.

## Reporting A Vulnerability

Do not open a public issue for suspected vulnerabilities.

Send a report to the maintainer with:

- Affected version.
- Steps to reproduce.
- Impact and expected blast radius.
- Any relevant logs with secrets removed.

If you do not have a private contact for the maintainer yet, open a minimal public issue asking for a security contact without disclosing exploit details.

## Security Baseline

- npm publishing is restricted to the GitHub Actions release workflow.
- Release publishing uses npm provenance.
- Maintainers must enable npm account 2FA before receiving publish access.
- CI runs `npm audit --audit-level=high`.
- GitHub Dependency Review runs in its own pull-request workflow.
- CI can run Socket Security policy scans when `SOCKET_SECURITY_API_KEY` is configured.
- Local publish attempts are blocked by `scripts/guard-publish-ci.mjs`.
- Generated projects pin install versions and use `npm run check` for Husky and CI.
- Generated Husky hooks do not make network requests.
