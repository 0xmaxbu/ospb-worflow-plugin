type ChatTransformMessage = {
    role: string;
    content: string;
};
type ChatTransformInput = {
    messages: ChatTransformMessage[];
    params: Record<string, unknown>;
};
export declare function chatTransformHook(input: ChatTransformInput): Promise<{
    messages: ChatTransformMessage[];
    params: Record<string, unknown>;
}>;
export {};
