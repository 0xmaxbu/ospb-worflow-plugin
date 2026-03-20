import { describe, expect, it } from 'vitest';
import {
  validateChangeName,
  validateSpecId,
  validateChangeStructure,
  validateProposalFrontmatter,
  validateTaskReference,
  validateSpecReference,
} from './openspec-validator';

describe('OpenSpecValidator', () => {
  describe('validateChangeName', () => {
    it('should pass for valid change name', () => {
      const result = validateChangeName('my-feature-change');
      expect(result.valid).toBe(true);
    });

    it('should fail for empty name', () => {
      const result = validateChangeName('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({ field: 'name', message: 'Change name is required' });
    });

    it('should fail for invalid format', () => {
      const result = validateChangeName('Invalid_Name');
      expect(result.valid).toBe(false);
    });

    it('should fail for name starting with hyphen', () => {
      const result = validateChangeName('-invalid');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateSpecId', () => {
    it('should pass for valid spec ID', () => {
      const result = validateSpecId('my-spec');
      expect(result.valid).toBe(true);
    });

    it('should fail for empty spec ID', () => {
      const result = validateSpecId('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({ field: 'id', message: 'Spec ID is required' });
    });

    it('should fail for invalid format', () => {
      const result = validateSpecId('Invalid_ID');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateChangeStructure', () => {
    it('should pass for complete change', () => {
      const change = {
        name: 'complete-change',
        hasProposal: true,
        hasDesign: true,
        hasTasks: true,
        specs: ['spec1.md', 'spec2.md'],
      };
      const result = validateChangeStructure(change);
      expect(result.valid).toBe(true);
    });

    it('should fail for missing name', () => {
      const change = {
        hasProposal: true,
        hasDesign: true,
        hasTasks: true,
        specs: ['spec1.md'],
      };
      const result = validateChangeStructure(change);
      expect(result.valid).toBe(false);
    });

    it('should warn for missing proposal', () => {
      const change = {
        name: 'incomplete-change',
        hasProposal: false,
        hasDesign: true,
        hasTasks: true,
        specs: ['spec1.md'],
      };
      const result = validateChangeStructure(change);
      expect(result.warnings).toContainEqual({ field: 'proposal', message: 'Change lacks proposal.md' });
    });

    it('should warn for missing specs', () => {
      const change = {
        name: 'no-specs-change',
        hasProposal: true,
        hasDesign: true,
        hasTasks: true,
        specs: [],
      };
      const result = validateChangeStructure(change);
      expect(result.warnings).toContainEqual({ field: 'specs', message: 'Change has no spec documents' });
    });
  });

  describe('validateProposalFrontmatter', () => {
    it('should pass for valid frontmatter', () => {
      const frontmatter = {
        title: 'My Feature Proposal',
        status: 'draft',
      };
      const result = validateProposalFrontmatter(frontmatter);
      expect(result.valid).toBe(true);
    });

    it('should fail for missing title', () => {
      const frontmatter = { status: 'draft' };
      const result = validateProposalFrontmatter(frontmatter);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({ field: 'title', message: 'Proposal must have a title' });
    });

    it('should warn for short title', () => {
      const frontmatter = { title: 'Ab', status: 'draft' };
      const result = validateProposalFrontmatter(frontmatter);
      expect(result.warnings).toContainEqual({ field: 'title', message: 'Proposal title seems too short' });
    });

    it('should fail for invalid status', () => {
      const frontmatter = { title: 'Valid Title', status: 'invalid' };
      const result = validateProposalFrontmatter(frontmatter);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateTaskReference', () => {
    it('should pass for valid task reference', () => {
      const result = validateTaskReference('1.2.3');
      expect(result.valid).toBe(true);
    });

    it('should pass for simple number', () => {
      const result = validateTaskReference('1');
      expect(result.valid).toBe(true);
    });

    it('should fail for empty reference', () => {
      const result = validateTaskReference('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({ field: 'ref', message: 'Task reference is required' });
    });

    it('should fail for invalid format', () => {
      const result = validateTaskReference('invalid');
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'ref',
        message: 'Task reference must match format: N or N.M or N.M.P',
      });
    });
  });

  describe('validateSpecReference', () => {
    it('should pass for valid spec reference', () => {
      const result = validateSpecReference('my-spec.md#requirement');
      expect(result.valid).toBe(true);
    });

    it('should pass for spec without requirement', () => {
      const result = validateSpecReference('my-spec.md');
      expect(result.valid).toBe(true);
    });

    it('should fail for empty reference', () => {
      const result = validateSpecReference('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({ field: 'ref', message: 'Spec reference is required' });
    });

    it('should warn for potentially incorrect format', () => {
      const result = validateSpecReference('invalid reference');
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});
