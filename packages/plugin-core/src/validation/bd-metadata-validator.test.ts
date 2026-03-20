import { describe, expect, it } from 'vitest';
import {
  validateTaskId,
  validateTaskType,
  validatePriority,
  validateTaskTitle,
  validateTaskMetadata,
  validateDependency,
  validateDependencyList,
} from './bd-metadata-validator';

describe('BdMetadataValidator', () => {
  describe('validateTaskId', () => {
    it('should pass for valid task ID', () => {
      const result = validateTaskId('ospb-worflow-plugin-abc123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for empty task ID', () => {
      const result = validateTaskId('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({ field: 'id', message: 'Task ID is required' });
    });

    it('should fail for invalid format', () => {
      const result = validateTaskId('invalid-id');
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'id',
        message: 'Task ID must match format: ospb-worflow-plugin-<suffix>',
      });
    });
  });

  describe('validateTaskType', () => {
    it('should pass for valid task types', () => {
      const validTypes = ['bug', 'chore', 'epic', 'feature', 'task'];
      for (const type of validTypes) {
        const result = validateTaskType(type);
        expect(result.valid).toBe(true);
      }
    });

    it('should fail for invalid task type', () => {
      const result = validateTaskType('invalid');
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'type',
        message: 'Task type must be one of: bug, chore, epic, feature, task',
      });
    });

    it('should fail for empty type', () => {
      const result = validateTaskType('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({ field: 'type', message: 'Task type is required' });
    });
  });

  describe('validatePriority', () => {
    it('should pass for valid priorities', () => {
      for (const priority of [0, 1, 2, 3, 4]) {
        const result = validatePriority(priority);
        expect(result.valid).toBe(true);
      }
    });

    it('should fail for invalid priority', () => {
      const result = validatePriority(5);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'priority',
        message: 'Priority must be one of: 0, 1, 2, 3, 4',
      });
    });

    it('should fail for non-integer priority', () => {
      const result = validatePriority(2.5);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'priority',
        message: 'Priority must be an integer',
      });
    });
  });

  describe('validateTaskTitle', () => {
    it('should pass for valid task title with prefix', () => {
      const result = validateTaskTitle('Impl: Add new feature');
      expect(result.valid).toBe(true);
    });

    it('should warn for title without valid prefix', () => {
      const result = validateTaskTitle('Some random title');
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should fail for empty title', () => {
      const result = validateTaskTitle('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({ field: 'title', message: 'Task title is required' });
    });

    it('should warn for too short title', () => {
      const result = validateTaskTitle('Ab');
      expect(result.warnings).toContainEqual({ field: 'title', message: 'Task title seems too short' });
    });
  });

  describe('validateTaskMetadata', () => {
    it('should validate complete metadata', () => {
      const metadata = {
        id: 'ospb-worflow-plugin-abc123',
        title: 'Impl: Add feature',
        type: 'feature' as const,
        priority: 2,
      };
      const result = validateTaskMetadata(metadata);
      expect(result.valid).toBe(true);
    });

    it('should collect errors from multiple fields', () => {
      const metadata = {
        id: 'invalid-id',
        type: 'invalid' as 'bug',
        priority: 10,
      };
      const result = validateTaskMetadata(metadata);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('validateDependency', () => {
    it('should pass for valid dependency', () => {
      const result = validateDependency({
        blocked: 'ospb-worflow-plugin-abc',
        blocking: 'ospb-worflow-plugin-xyz',
        type: 'blocks',
      });
      expect(result.valid).toBe(true);
    });

    it('should fail when blocked equals blocking', () => {
      const result = validateDependency({
        blocked: 'ospb-worflow-plugin-abc',
        blocking: 'ospb-worflow-plugin-abc',
        type: 'blocks',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'blocked/blocking',
        message: 'A task cannot block itself',
      });
    });

    it('should fail for invalid dependency type', () => {
      const result = validateDependency({
        blocked: 'ospb-worflow-plugin-abc',
        blocking: 'ospb-worflow-plugin-xyz',
        type: 'invalid' as 'blocks',
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('validateDependencyList', () => {
    it('should pass for valid dependency list', () => {
      const dependencies = [
        { blocked: 'ospb-worflow-plugin-a', blocking: 'ospb-worflow-plugin-b', type: 'blocks' as const },
        { blocked: 'ospb-worflow-plugin-b', blocking: 'ospb-worflow-plugin-c', type: 'blocks' as const },
      ];
      const result = validateDependencyList(dependencies);
      expect(result.valid).toBe(true);
    });

    it('should detect duplicate blocking relationships', () => {
      const dependencies = [
        { blocked: 'ospb-worflow-plugin-a', blocking: 'ospb-worflow-plugin-b', type: 'blocks' as const },
        { blocked: 'ospb-worflow-plugin-a', blocking: 'ospb-worflow-plugin-b', type: 'blocks' as const },
      ];
      const result = validateDependencyList(dependencies);
      expect(result.valid).toBe(false);
    });
  });
});
