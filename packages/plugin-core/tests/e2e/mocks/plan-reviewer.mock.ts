import { vi } from 'vitest';

export interface MockPlanReviewerResult {
  passed: boolean;
  issues: Array<{
    severity: 'blocking' | 'severe' | 'medium';
    section: string;
    message: string;
    suggestion?: string;
  }>;
}

export function createMockPlanReviewer() {
  return {
    review: vi.fn().mockResolvedValue({
      passed: true,
      issues: [],
    } satisfies MockPlanReviewerResult),
    reviewWithIssues: vi.fn().mockResolvedValue({
      passed: false,
      issues: [
        {
          severity: 'medium',
          section: 'Step 3',
          message: 'Missing edge case handling',
          suggestion: 'Add error handling for null input',
        },
      ],
    } satisfies MockPlanReviewerResult),
  };
}

export const mockPlanReviewer = createMockPlanReviewer();
