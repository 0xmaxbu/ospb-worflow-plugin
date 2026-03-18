import { loadState, persistState } from '../workflow-state';
export async function sessionCompactingHook(_input) {
    await persistState();
    await loadState();
}
