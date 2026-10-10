import { describe, expect, it } from 'vitest';
import type { ConfigDoc, OverlayDoc } from '@/types/agent-config';
import {
  applyOps,
  diffOps,
  removeValueAt,
  setValue,
} from '../policy-data-patch';
import { getAt } from '../json-pointer';
import { mergePatch } from '../merge-patch';

const PD = '/plugins/p/policy_data';
const base: ConfigDoc = {
  plugins: {
    p: {
      source: 's',
      policy_data: {
        a: 1,
        b: { c: 2, d: 'x' },
        token: '••••',
        list: ['u1', 'u2', 'u3'],
      },
    },
  },
};
const eff = (overlay: OverlayDoc) =>
  getAt(mergePatch(base, overlay), PD) as Record<string, unknown>;
/** Edits the effective policy_data like the editors do: diff → minimal ops. */
function edit(
  overlay: OverlayDoc,
  change: (pd: Record<string, unknown>) => Record<string, unknown>,
  bases: ConfigDoc[] = [base],
) {
  const before = eff(overlay);
  return applyOps(
    overlay,
    diffOps(PD, before, change(structuredClone(before))),
    bases,
    PD,
  );
}

describe('minimal policy_data patches', () => {
  it('a scalar change records one entry at its pointer', () => {
    const o = edit({}, (pd) => ({ ...pd, a: 5 }));
    expect(o).toEqual({ plugins: { p: { policy_data: { a: 5 } } } });
    expect(eff(o).a).toBe(5);
  });

  it('a nested key records only that key', () => {
    const o = edit({}, (pd) => {
      (pd.b as Record<string, unknown>).c = 3;
      return pd;
    });
    expect(o).toEqual({ plugins: { p: { policy_data: { b: { c: 3 } } } } });
  });

  it('removing a file key writes null; removing an overlay-only key drops it', () => {
    let o = edit({}, (pd) => {
      delete pd.a;
      return pd;
    });
    expect(o).toEqual({ plugins: { p: { policy_data: { a: null } } } });
    o = edit(o, (pd) => ({ ...pd, extra: true }));
    expect(getAt(o, `${PD}/extra`)).toBe(true);
    o = edit(o, (pd) => {
      delete pd.extra;
      return pd;
    });
    expect(o).toEqual({ plugins: { p: { policy_data: { a: null } } } });
  });

  it('an array item change writes the whole array', () => {
    const o = edit({}, (pd) => {
      (pd.list as string[])[1] = 'U2';
      return pd;
    });
    expect(o).toEqual({
      plugins: { p: { policy_data: { list: ['u1', 'U2', 'u3'] } } },
    });
  });

  it('setting a value back to the file value removes the entry', () => {
    let o = edit({}, (pd) => ({ ...pd, a: 5 }));
    o = edit(o, (pd) => ({ ...pd, a: 1 }));
    expect(o).toEqual({});
    o = edit({}, (pd) => {
      (pd.list as string[])[0] = 'x';
      return pd;
    });
    o = edit(o, (pd) => {
      (pd.list as string[])[0] = 'u1';
      return pd;
    });
    expect(o).toEqual({});
  });

  it('…but keeps it while another host file differs', () => {
    const other: ConfigDoc = {
      plugins: { p: { source: 's', policy_data: { a: 7 } } },
    };
    const pinned = { plugins: { p: { policy_data: { a: 5 } } } };
    expect(setValue(pinned, `${PD}/a`, 1, [base, other], PD)).toEqual({
      plugins: { p: { policy_data: { a: 1 } } },
    });
    expect(setValue(pinned, `${PD}/a`, 1, [base], PD)).toEqual({});
  });

  it('untouched masked values never reach the overlay', () => {
    const o = edit({}, (pd) => ({ ...pd, a: 2 }));
    expect(getAt(o, `${PD}/token`)).toBeUndefined();
    expect(diffOps(PD, eff({}), eff({}))).toEqual([]);
  });

  it('composes with draft / revision entries already in the overlay', () => {
    const saved: OverlayDoc = {
      verbosity: 1,
      plugins: {
        p: { schedule: '* * * * *', policy_data: { a: 9, b: { d: 'y' } } },
      },
    };
    const o = edit(saved, (pd) => {
      (pd.b as Record<string, unknown>).c = 4;
      return pd;
    });
    expect(o).toEqual({
      verbosity: 1,
      plugins: {
        p: {
          schedule: '* * * * *',
          policy_data: { a: 9, b: { d: 'y', c: 4 } },
        },
      },
    });
  });

  it('works when the overlay deletes base keys (null) and brings keys back', () => {
    // The overlay deleted `b`; adding `b` again only shows the new keys.
    let o: OverlayDoc = { plugins: { p: { policy_data: { b: null } } } };
    o = edit(o, (pd) => ({ ...pd, b: { z: 1 } }));
    expect(eff(o).b).toEqual({ z: 1 });
    expect(getAt(o, `${PD}/b`)).toEqual({ c: null, d: null, z: 1 });

    // The whole policy_data deleted: a new key shows alone.
    o = { plugins: { p: { policy_data: null } } };
    o = setValue(o, `${PD}/n`, 1, [base], PD);
    expect(eff(o)).toEqual({ n: 1 });
  });

  it('removeValueAt nulls file keys only', () => {
    expect(removeValueAt({}, `${PD}/b/c`, [base])).toEqual({
      plugins: { p: { policy_data: { b: { c: null } } } },
    });
    expect(
      removeValueAt({ plugins: { p: { policy_data: { q: 1 } } } }, `${PD}/q`, [
        base,
      ]),
    ).toEqual({});
  });

  it('removeValueAt checks every host file and works outside policy_data', () => {
    const other: ConfigDoc = { plugins: { extra: { source: 'e' } } };
    // Only another host's file has `extra`: still nulled.
    expect(removeValueAt({}, '/plugins/extra', [base, other])).toEqual({
      plugins: { extra: null },
    });
    // No file has `neu`: the overlay entry (and its emptied parents) are dropped.
    expect(
      removeValueAt({ plugins: { neu: { source: 'n' } } }, '/plugins/neu', [
        base,
        other,
      ]),
    ).toEqual({});
  });

  it('keeps an emptied overlay-only object inside policy_data', () => {
    let o = edit({}, (pd) => ({ ...pd, n: { k: 1 } }));
    expect(getAt(o, `${PD}/n`)).toEqual({ k: 1 });
    o = edit(o, (pd) => ({ ...pd, n: {} }));
    expect(o).toEqual({ plugins: { p: { policy_data: { n: {} } } } });
    expect(eff(o).n).toEqual({});

    // Nested: only the emptied parent is kept, its ancestors come back with it.
    o = edit({}, (pd) => ({ ...pd, m: { n: { k: 1 } } }));
    o = edit(o, (pd) => ({ ...pd, m: { n: {} } }));
    expect(eff(o).m).toEqual({ n: {} });
  });

  it('prunes an emptied object every host file already has', () => {
    // `b` is an object in the file: the overlay's `b: {}` would be a no-op.
    let o = edit({}, (pd) => ({ ...pd, b: { c: 2, d: 'x', z: 1 } }));
    expect(o).toEqual({ plugins: { p: { policy_data: { b: { z: 1 } } } } });
    o = edit(o, (pd) => ({ ...pd, b: { c: 2, d: 'x' } }));
    expect(o).toEqual({});
    // With no host file loaded, an emptied object is kept.
    expect(
      removeValueAt(
        { plugins: { p: { policy_data: { b: { z: 1 } } } } },
        `${PD}/b/z`,
        [],
      ),
    ).toEqual({ plugins: { p: { policy_data: { b: {} } } } });
  });

  it('diffOps: objects recurse, everything else is one set', () => {
    expect(
      diffOps(
        PD,
        { a: 1, b: { c: 1 }, l: [1], gone: 0 },
        { a: '1', b: { c: 1, n: 2 }, l: [1, 2], o: {} },
      ),
    ).toEqual([
      { op: 'set', ptr: `${PD}/a`, value: '1' },
      { op: 'set', ptr: `${PD}/b/n`, value: 2 },
      { op: 'set', ptr: `${PD}/l`, value: [1, 2] },
      { op: 'remove', ptr: `${PD}/gone` },
      { op: 'set', ptr: `${PD}/o`, value: {} },
    ]);
  });
});
