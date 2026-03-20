import { describe, expect, it } from 'vitest';
import { validateToolDefinition, validateAllTools } from './tool-validator';

describe('ToolValidator', () => {
  describe('validateToolDefinition', () => {
    it('should pass for valid tool definition', () => {
      const definition = {
        description: 'A valid tool description',
        execute: async () => 'result',
      };
      const result = validateToolDefinition('valid-tool', definition);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when description is missing', () => {
      const definition = {
        execute: async () => 'result',
      };
      const result = validateToolDefinition('valid-tool', definition);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        toolName: 'valid-tool',
        field: 'description',
        message: 'Tool must have a description',
      });
    });

    it('should warn when description is too short', () => {
      const definition = {
        description: 'short',
        execute: async () => 'result',
      };
      const result = validateToolDefinition('valid-tool', definition);
      expect(result.warnings).toContainEqual({
        toolName: 'valid-tool',
        field: 'description',
        message: 'Description should be at least 10 characters',
      });
    });

    it('should fail when execute function is missing', () => {
      const definition = {
        description: 'A valid tool description',
      };
      const result = validateToolDefinition('valid-tool', definition);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        toolName: 'valid-tool',
        field: 'execute',
        message: 'Tool must have an execute function',
      });
    });

    it('should fail for invalid tool name format', () => {
      const definition = {
        description: 'A valid tool description',
        execute: async () => 'result',
      };
      const result = validateToolDefinition('InvalidToolName', definition);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        toolName: 'InvalidToolName',
        field: 'name',
        message: 'Tool name must be in kebab-case (e.g., my-tool)',
      });
    });

    it('should warn when args lack descriptions', () => {
      const definition = {
        description: 'A valid tool description',
        args: {
          myArg: {
            type: 'string',
          },
        },
        execute: async () => 'result',
      };
      const result = validateToolDefinition('valid-tool', definition);
      expect(result.warnings).toContainEqual({
        toolName: 'valid-tool',
        field: 'args.myArg',
        message: "Argument 'myArg' should have a description",
      });
    });

    it('should pass for tool name in kebab-case', () => {
      const definition = {
        description: 'A valid tool description',
        execute: async () => 'result',
      };
      const result = validateToolDefinition('my-valid-tool', definition);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateAllTools', () => {
    it('should validate multiple tools', () => {
      const tools = {
        'tool-one': {
          description: 'First valid tool',
          execute: async () => 'result',
        },
        'tool-two': {
          description: 'Second valid tool',
          execute: async () => 'result',
        },
      };
      const result = validateAllTools(tools);
      expect(result.valid).toBe(true);
    });

    it('should collect errors from all tools', () => {
      const tools = {
        'tool-one': {
          description: 'First tool without execute',
        },
        'tool-two': {
          execute: async () => 'result',
        },
      };
      const result = validateAllTools(tools);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('should collect warnings from all tools', () => {
      const tools = {
        'tool-one': {
          description: 'short',
          execute: async () => 'result',
        },
        'tool-two': {
          description: 'A valid description',
          execute: async () => 'result',
        },
      };
      const result = validateAllTools(tools);
      expect(result.warnings.length).toBeGreaterThanOrEqual(1);
    });
  });
});
