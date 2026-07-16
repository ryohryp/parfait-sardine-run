import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { AppShell } from './AppShell';

const reactTestEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
reactTestEnvironment.IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement | undefined;
afterEach(() => { container?.remove(); container = undefined; });

describe('AppShell ranking modal', () => {
  it('keeps its child canvas mounted while the modal opens and closes', async () => {
    container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => { root.render(<AppShell gamePhase="menu"><canvas data-testid="game-canvas" /></AppShell>); });
    const canvas = container.querySelector('canvas');
    const trigger = container.querySelector<HTMLButtonElement>('.app-shell__ranking-trigger');
    expect(canvas).not.toBeNull();
    await act(async () => { trigger?.click(); });
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.activeElement).toBe(document.querySelector('[aria-label="ランキングを閉じる"]'));
    await act(async () => { document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })); });
    expect(document.activeElement).toBe(document.querySelector('[aria-label="ランキングを閉じる"]'));
    await act(async () => { document.querySelector<HTMLButtonElement>('[aria-label="ランキングを閉じる"]')?.click(); });
    expect(container.querySelector('canvas')).toBe(canvas);
    expect(document.activeElement).toBe(trigger);
    await act(async () => { root.unmount(); });
  });

  it('closes on Escape and disables the trigger while playing', async () => {
    container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => { root.render(<AppShell gamePhase="menu"><canvas /></AppShell>); });
    const trigger = container.querySelector<HTMLButtonElement>('.app-shell__ranking-trigger');
    await act(async () => { trigger?.click(); });
    await act(async () => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    await act(async () => { root.render(<AppShell gamePhase="playing"><canvas /></AppShell>); });
    expect(trigger?.disabled).toBe(true);
    await act(async () => { root.unmount(); });
  });
});
