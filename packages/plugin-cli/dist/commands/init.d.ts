export interface InitResult {
    success: boolean;
    openspecAvailable: boolean;
    beadsAvailable: boolean;
    configCreated: boolean;
}
export declare function initCommand(_args: string[]): Promise<InitResult>;
