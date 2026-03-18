type ExecResult = {
    stdout: string;
    stderr: string;
};
type ExecFunction = (command: string) => Promise<ExecResult>;
export interface ToolCheckResult {
    openspec: boolean;
    beads: boolean;
}
export declare function isOpenSpecAvailable(): Promise<boolean>;
export declare function isBeadsAvailable(): Promise<boolean>;
export declare function checkAllTools(): Promise<ToolCheckResult>;
declare global {
    var exec: ExecFunction | undefined;
}
export {};
