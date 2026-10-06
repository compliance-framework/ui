import { describe, expect, it, vi } from 'vitest';
import type { ConfigDoc } from '@/types/agent-config';
import { definedInAnyBase, setStringKey } from '../emptyValue';

const PTR = '/plugins/p/config/k';
const withKey = { plugins: { p: { config: { k: 'file' } } } } as ConfigDoc;
const without = { plugins: { p: { config: {} } } } as ConfigDoc;

function fakeDraft() {
  return { set: vi.fn(), unset: vi.fn() };
}

describe('emptied string keys', () => {
  it('knows whether any base defines the key', () => {
    expect(definedInAnyBase([null, without, withKey], PTR)).toBe(true);
    expect(definedInAnyBase([null, without], PTR)).toBe(false);
  });

  it('empty unsets a key some file defines', () => {
    const d = fakeDraft();
    setStringKey(d, [without, withKey], PTR, '');
    expect(d.unset).toHaveBeenCalledWith(PTR);
    expect(d.set).not.toHaveBeenCalled();
  });

  it('empty keeps "" for an overlay-only key; a value is always set', () => {
    const d = fakeDraft();
    setStringKey(d, [without], PTR, '');
    expect(d.set).toHaveBeenCalledWith(PTR, '');
    setStringKey(d, [withKey], PTR, 'v');
    expect(d.set).toHaveBeenCalledWith(PTR, 'v');
    expect(d.unset).not.toHaveBeenCalled();
  });
});
