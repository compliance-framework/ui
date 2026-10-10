import { describe, expect, it } from 'vitest';
import { latestRequest } from './latest-request';

describe('latestRequest', () => {
  it('treats the only outstanding token as current', () => {
    const gate = latestRequest();
    const token = gate.begin();

    expect(gate.isStale(token)).toBe(false);
  });

  it('marks every earlier token stale once a newer one begins', () => {
    const gate = latestRequest();
    const first = gate.begin();
    const second = gate.begin();

    expect(gate.isStale(first)).toBe(true);
    expect(gate.isStale(second)).toBe(false);
  });

  it('keeps a token current across repeated checks', () => {
    const gate = latestRequest();
    const token = gate.begin();

    expect(gate.isStale(token)).toBe(false);
    expect(gate.isStale(token)).toBe(false);
  });

  it('gives each gate its own sequence', () => {
    const a = latestRequest();
    const b = latestRequest();
    const tokenA = a.begin();
    b.begin();
    b.begin();

    // b advancing must not strand a's outstanding token.
    expect(a.isStale(tokenA)).toBe(false);
  });

  // The ordering the helper exists for: whichever request LANDS last must not win, only the
  // one that was ISSUED last.
  it('lets the newest request win when an older one resolves after it', async () => {
    const gate = latestRequest();
    const writes: string[] = [];

    async function load(name: string, delayMs: number) {
      const token = gate.begin();
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      if (gate.isStale(token)) return;
      writes.push(name);
    }

    // 'slow' is issued first but resolves last; without the gate it would write last.
    const slow = load('slow', 20);
    const fast = load('fast', 1);
    await Promise.all([slow, fast]);

    expect(writes).toEqual(['fast']);
  });
});
