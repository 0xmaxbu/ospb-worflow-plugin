import type { Hooks } from '@opencode-ai/plugin';
type SessionCompactingHook = NonNullable<Hooks['experimental.session.compacting']>;
type SessionCompactingHookInput = Parameters<SessionCompactingHook>[0];
export declare function sessionCompactingHook(_input: SessionCompactingHookInput): Promise<void>;
export {};
