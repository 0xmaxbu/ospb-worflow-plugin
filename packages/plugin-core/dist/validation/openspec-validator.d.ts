export interface OpenSpecChange {
    name: string;
    path: string;
    hasProposal: boolean;
    hasDesign: boolean;
    hasTasks: boolean;
    specs: string[];
}
export interface OpenSpecDraft {
    id: string;
    title: string;
    status: 'draft' | 'in-progress' | 'review' | 'completed';
}
export interface OpenSpecSpec {
    id: string;
    name: string;
    path: string;
    requirements: string[];
}
export interface OpenSpecValidationResult {
    valid: boolean;
    errors: OpenSpecValidationError[];
    warnings: OpenSpecValidationWarning[];
}
export interface OpenSpecValidationError {
    field: string;
    message: string;
}
export interface OpenSpecValidationWarning {
    field: string;
    message: string;
}
export declare function validateChangeName(name: string): OpenSpecValidationResult;
export declare function validateSpecId(specId: string): OpenSpecValidationResult;
export declare function validateChangeStructure(change: Partial<OpenSpecChange>): OpenSpecValidationResult;
export declare function validateProposalFrontmatter(frontmatter: Record<string, string>): OpenSpecValidationResult;
export declare function validateTaskReference(ref: string): OpenSpecValidationResult;
export declare function validateSpecReference(ref: string): OpenSpecValidationResult;
