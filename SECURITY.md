# Security policy

## Supported versions

Security fixes are provided for the latest published major version.

| Version | Supported |
| ------- | --------- |
| 2.x     | Yes       |
| 1.x     | No        |

## Report a vulnerability

Use [GitHub private vulnerability reporting](https://github.com/BF-GO/session-backups/security/advisories/new). Do not open a public issue or include exploit details in a public pull request.

Include:

- affected version and Chrome version;
- a concise description of the impact;
- reproduction steps or a minimal synthetic file;
- relevant logs with private URLs, tokens, and browsing data removed;
- any known mitigation.

Reports will be acknowledged as soon as practical. Validation, severity, remediation, and coordinated disclosure timing will be discussed in the private advisory. Please allow time for a fix and release before publishing details.

## Scope

Useful reports include import validation bypasses, unsafe restore behavior, unintended data transmission, permission escalation, storage/migration data loss, and vulnerabilities in bundled runtime dependencies.

Reports requiring a compromised operating system or Chrome profile, social engineering without a product flaw, denial of service through inputs above documented limits, or issues affecting only the archived v1.7 source may be closed as out of scope.
