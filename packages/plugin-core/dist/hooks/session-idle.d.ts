type SessionIdleHookInput = {
    sessionId: string;
};
type SessionIdleHookOutput = {
    role: 'user';
    content: string;
};
export declare function sessionIdleHook(_input: SessionIdleHookInput): Promise<SessionIdleHookOutput | null>;
export {};
