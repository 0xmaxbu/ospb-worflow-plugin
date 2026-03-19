import { describe, expect, it } from 'vitest';

import { parseSpecRefs } from './bd';

describe('parseSpecRefs', () => {
  it('should parse Spec-task-ref annotations', () => {
    const content = `
## Step 1.1
Some task description

Spec-task-ref: 1.1

## Step 1.2
Another task

Spec-task-ref: 1.2
`;
    const refs = parseSpecRefs(content);

    expect(refs).toHaveLength(2);
    expect(refs[0].type).toBe('task');
    expect(refs[0].ref).toBe('1.1');
    expect(refs[1].type).toBe('task');
    expect(refs[1].ref).toBe('1.2');
  });

  it('should parse Spec-ref annotations', () => {
    const content = `
## Phase 1
Some phase description

Spec-ref: 1
`;
    const refs = parseSpecRefs(content);

    expect(refs).toHaveLength(1);
    expect(refs[0].type).toBe('phase');
    expect(refs[0].ref).toBe('1');
  });

  it('should parse both task and phase refs', () => {
    const content = `
## Step 1.1.1
Task description

Spec-task-ref: 1.1.1

## Phase 2
Phase description

Spec-ref: 2
`;
    const refs = parseSpecRefs(content);

    expect(refs).toHaveLength(2);
    expect(refs.find((r) => r.type === 'task' && r.ref === '1.1.1')).toBeDefined();
    expect(refs.find((r) => r.type === 'phase' && r.ref === '2')).toBeDefined();
  });

  it('should not duplicate refs that appear as both task and phase', () => {
    const content = `
## Step 1
Description

Spec-task-ref: 1
Spec-ref: 1
`;
    const refs = parseSpecRefs(content);

    const phaseRefs = refs.filter((r) => r.type === 'phase');
    expect(phaseRefs).toHaveLength(1);
  });

  it('should handle empty content', () => {
    const refs = parseSpecRefs('');
    expect(refs).toHaveLength(0);
  });

  it('should handle content with no refs', () => {
    const content = `
## Step 1
Some description

Just regular text
`;
    const refs = parseSpecRefs(content);
    expect(refs).toHaveLength(0);
  });

  it('should extract task title from heading', () => {
    const content = `
## 2.3.1 This is the extracted title

Spec-task-ref: 2.3.1
`;
    const refs = parseSpecRefs(content);

    expect(refs[0].taskTitle).toContain('extracted title');
  });
});
