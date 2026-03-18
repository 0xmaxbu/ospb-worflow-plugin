export interface InitOptions {
    requireVerification?: boolean;
    blockedCommands?: string[];
    skipPrompts?: boolean;
}
export interface InitResult {
    success: boolean;
    openspecAvailable: boolean;
    beadsAvailable: boolean;
    configCreated: boolean;
    options: InitOptions;
}
export declare function initCommand(args: string[]): Promise<InitResult>;
