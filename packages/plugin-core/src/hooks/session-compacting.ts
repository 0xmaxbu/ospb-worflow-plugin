import type { Hooks } from '@opencode-ai/plugin';

import { loadState, persistState } from '../workflow-state';

type SessionCompactingHook = NonNullable<Hooks['experimental.session.compacting']>;
type SessionCompactingHookInput = Parameters<SessionCompactingHook>[0];

export async function sessionCompactingHook(
  _input: SessionCompactingHookInput,
): Promise<void> {
  await persistState();
  await loadState();
}
