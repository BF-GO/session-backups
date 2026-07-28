# Threat model

This is a practical review of Session Saver's local-extension risks. It is not a formal audit or security certification.

## Protected assets

- Saved URLs, titles, names, grouping, and timestamps.
- Integrity of current sessions and settings.
- Predictable browser restore behavior.
- The extension's minimal permission boundary.

## Trust boundaries

Chrome extension pages and the background worker are trusted code. Imported files and stored legacy values are untrusted. Export files leave Chrome's storage boundary and become the user's responsibility. Restored URLs are handed to Chrome for navigation.

## Risks and controls

| Risk                               | Controls                                                                                                      | Remaining limitation                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Malformed or oversized imports     | 5 MiB limit, strict Zod schemas, bounded nested collections, duplicate-ID checks, and repository revalidation | Validation consumes local memory proportional to the accepted file            |
| Unsafe URL schemes                 | Explicit allowlist and a second restore-plan check                                                            | Allowed `file:` and `chrome:` URLs remain subject to Chrome/user policy       |
| Sensitive exports                  | Explicit user action, documented sensitivity, no automatic upload                                             | JSON exports are plaintext and can be copied by other local software          |
| Storage corruption                 | Full-document validation, no silent reset, serialized writes                                                  | Recovery may require removing damaged extension storage manually              |
| Interrupted or duplicate migration | Verify-before-delete sequence and idempotent completed marker                                                 | Invalid legacy records require user correction or manual export recovery      |
| Excessive restore                  | Maximum 2000 selected tabs before any window is created                                                       | Large restores below the limit can still consume significant resources        |
| Partial browser API failure        | Per-window results and explicit errors                                                                        | Chrome may create part of a requested workspace before a later API call fails |
| Permission expansion               | Manifest review, documented permission table, no host permissions                                             | Future releases must preserve this review discipline                          |
| Dependency or workflow compromise  | Lockfile-based installs, minimal official Actions, no release secrets                                         | npm and GitHub-hosted infrastructure remain supply-chain dependencies         |

## Out of scope

Session Saver does not defend against a compromised operating system, Chrome profile, malicious extension with equivalent local access, or a user intentionally opening a harmful URL. It does not encrypt local Chrome storage or exported files.

## Review triggers

Revisit this model when adding a permission, URL scheme, browser target, import format, network request, dependency with runtime privileges, or store-publishing automation.
