export function validateChangeName(name) {
    const errors = [];
    const warnings = [];
    if (!name) {
        errors.push({ field: 'name', message: 'Change name is required' });
    }
    else if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
        errors.push({
            field: 'name',
            message: 'Change name must be lowercase alphanumeric with hyphens',
        });
    }
    return { valid: errors.length === 0, errors, warnings };
}
export function validateSpecId(specId) {
    const errors = [];
    const warnings = [];
    if (!specId) {
        errors.push({ field: 'id', message: 'Spec ID is required' });
    }
    else if (!/^[a-z][a-z0-9-]*$/.test(specId)) {
        errors.push({
            field: 'id',
            message: 'Spec ID must be lowercase alphanumeric with hyphens',
        });
    }
    return { valid: errors.length === 0, errors, warnings };
}
export function validateChangeStructure(change) {
    const errors = [];
    const warnings = [];
    if (!change.name) {
        errors.push({ field: 'name', message: 'Change name is required' });
    }
    else {
        const nameResult = validateChangeName(change.name);
        errors.push(...nameResult.errors);
        warnings.push(...nameResult.warnings);
    }
    if (change.hasProposal === false) {
        warnings.push({ field: 'proposal', message: 'Change lacks proposal.md' });
    }
    if (change.hasDesign === false) {
        warnings.push({ field: 'design', message: 'Change lacks design.md' });
    }
    if (change.hasTasks === false) {
        warnings.push({ field: 'tasks', message: 'Change lacks tasks.md' });
    }
    if (change.specs && change.specs.length === 0) {
        warnings.push({ field: 'specs', message: 'Change has no spec documents' });
    }
    return { valid: errors.length === 0, errors, warnings };
}
export function validateProposalFrontmatter(frontmatter) {
    const errors = [];
    const warnings = [];
    if (!frontmatter.title) {
        errors.push({ field: 'title', message: 'Proposal must have a title' });
    }
    else if (frontmatter.title.length < 3) {
        warnings.push({ field: 'title', message: 'Proposal title seems too short' });
    }
    if (!frontmatter.status) {
        warnings.push({ field: 'status', message: 'Proposal lacks status' });
    }
    else {
        const validStatuses = ['draft', 'proposed', 'approved', 'rejected'];
        if (!validStatuses.includes(frontmatter.status)) {
            errors.push({
                field: 'status',
                message: `Proposal status must be one of: ${validStatuses.join(', ')}`,
            });
        }
    }
    return { valid: errors.length === 0, errors, warnings };
}
export function validateTaskReference(ref) {
    const errors = [];
    const warnings = [];
    if (!ref) {
        errors.push({ field: 'ref', message: 'Task reference is required' });
    }
    else if (!/^\d+(\.\d+)*$/.test(ref)) {
        errors.push({
            field: 'ref',
            message: 'Task reference must match format: N or N.M or N.M.P',
        });
    }
    return { valid: errors.length === 0, errors, warnings };
}
export function validateSpecReference(ref) {
    const errors = [];
    const warnings = [];
    if (!ref) {
        errors.push({ field: 'ref', message: 'Spec reference is required' });
    }
    else if (!/^[a-z0-9-]+(\.md)?(#[\w-]+)?$/.test(ref)) {
        warnings.push({
            field: 'ref',
            message: 'Spec reference format may be incorrect (expected: spec-name.md#requirement)',
        });
    }
    return { valid: errors.length === 0, errors, warnings };
}
