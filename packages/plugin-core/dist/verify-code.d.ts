export interface VerifyCodeResult {
    success: boolean;
    taskId: string;
    specRef: string | null;
    message: string;
    errors?: string[];
}
export declare function verifyCode(taskId: string, projectRoot?: string): Promise<VerifyCodeResult>;
