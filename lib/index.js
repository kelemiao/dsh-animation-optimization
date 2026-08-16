/**
 * dsh-animation-optimization — host side (no-op).
 *
 * This plugin is appearance-only. The host half exists purely so the package
 * is a valid cordis loader entry (which the client-modules scanner keys on to
 * serve the client bundle). The client half injects three CSS layers at
 * runtime — behavior (open/close/streaming), color tokens, and fonts — plus a
 * MutationObserver that drives the disclosure state machine.
 */
export const inject = []
export function apply() {}
