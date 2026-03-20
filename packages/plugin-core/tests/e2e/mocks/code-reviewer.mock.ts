import { vi } from 'vitest';

export interface MockCodeReviewerResult {
  passed: boolean;
  issues: Array<{
    severity: 'blocking' | 'severe' | 'medium';
    file: string;
    line?: number;
    message: string;
    suggestion?: string;
  }>;
}

export function createMockCodeReviewer() {
  return {
    review: vi.fn().mockResolvedValue({
      passed: true,
      issues: [],
    } satisfies MockCodeReviewerResult),
    reviewWithIssues: vi.fn().mockResolvedValue({
      passed: false,
      issues: [
        {
          severity: 'medium',
          file: 'src/example.ts',
          line: 10,
          message: 'Consider using const instead of let',
          suggestion: 'Change "let" to "const" for immutable binding',
        },
      ],
    } satisfies MockCodeReviewerResult),
  };
}

export const mockCodeReviewer = createMockCodeReviewer();
