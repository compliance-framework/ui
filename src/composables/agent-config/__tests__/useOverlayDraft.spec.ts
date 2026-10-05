import { beforeEach, describe, expect, it } from 'vitest';
import { ref } from 'vue';
import type { AgentConfigRevision, ConfigDoc } from '@/types/agent-config';
import { createDraftState, useOverlayDraft } from '../useOverlayDraft';
import {
  agentDraftState,
  resetAgentDrafts,
  syncDraftState,
} from '../draftRegistry';

const base: ConfigDoc = {
  verbosity: 0,
  plugins: {
    ssh: {
      source: 'ghcr.io/x/ssh:v1',
      schedule: '*/5 * * * *',
      protocol_version: 2,
      config: { port: '22' },
    },
  },
};

const rev = (overlay = {}, revision = 7): AgentConfigRevision => ({
  agentId: 'a',
  revision,
  overlay,
  overlaySize: 2,
  comment: null,
  createdBy: null,
  createdAt: null,
  revertOf: null,
});

describe('useOverlayDraft', () => {
  it('set / unset / remove / makeAbsent on nested and new plugins', () => {
    const d = useOverlayDraft(rev(), ref(base));
    d.set('/plugins/ssh/config/port', '2222');
    d.set('/plugins/neu', { source: 's', policies: [] });
    expect(d.overlay.value).toEqual({
      plugins: {
        ssh: { config: { port: '2222' } },
        neu: { source: 's', policies: [] },
      },
    });
    d.unset('/plugins/ssh/config/port');
    expect(d.overlay.value).toEqual({
      plugins: { neu: { source: 's', policies: [] } },
    });
    d.makeAbsent('/plugins/neu');
    expect(d.overlay.value).toEqual({});
    d.makeAbsent('/plugins/ssh');
    expect(d.overlay.value).toEqual({ plugins: { ssh: null } });
    d.remove('/plugins/ssh/schedule');
    expect(d.overlay.value).toEqual({ plugins: { ssh: { schedule: null } } });
  });

  it('un-removes a nulled plugin by editing a field', () => {
    const d = useOverlayDraft(rev({ plugins: { ssh: null } }), ref(base));
    d.set('/plugins/ssh/enabled', false);
    expect(d.overlay.value).toEqual({ plugins: { ssh: { enabled: false } } });
    expect(d.effectiveDraft.value.plugins?.ssh).toEqual({
      ...base.plugins!.ssh,
      enabled: false,
    });
  });

  it('protocol (R56): file value omits, Auto writes null, 1/2 explicit; 0 never written', () => {
    const d = useOverlayDraft(rev(), ref(base));
    d.set('/plugins/ssh/protocol_version', 1);
    expect(d.overlay.value).toEqual({
      plugins: { ssh: { protocol_version: 1 } },
    });
    d.remove('/plugins/ssh/protocol_version'); // Auto
    expect(d.overlay.value).toEqual({
      plugins: { ssh: { protocol_version: null } },
    });
    expect(
      d.effectiveDraft.value.plugins?.ssh?.protocol_version,
    ).toBeUndefined();
    d.unset('/plugins/ssh/protocol_version'); // File value
    expect(d.overlay.value).toEqual({});
    expect(JSON.stringify(d.overlay.value)).not.toContain(':0');
  });

  it('schedule: Clear omits the key; only "Use agent default" writes null', () => {
    const d = useOverlayDraft(
      rev({ plugins: { ssh: { schedule: '@hourly' } } }),
      ref(base),
    );
    d.unset('/plugins/ssh/schedule');
    expect(d.overlay.value).toEqual({});
    d.remove('/plugins/ssh/schedule');
    expect(d.overlay.value).toEqual({ plugins: { ssh: { schedule: null } } });
  });

  it('tracks isDirty', () => {
    const d = useOverlayDraft(rev({ verbosity: 1 }), ref(base));
    expect(d.isDirty.value).toBe(false);
    d.set('/verbosity', 2);
    expect(d.isDirty.value).toBe(true);
    d.set('/verbosity', 1);
    expect(d.isDirty.value).toBe(false);
  });

  it('rebase keeps or discards the draft', () => {
    const keep = useOverlayDraft(rev({ verbosity: 1 }, 7), ref(base));
    keep.set('/verbosity', 2);
    // Both sides changed /verbosity: the draft's value wins and the pointer is reported.
    expect(keep.rebase(rev({ verbosity: 0 }, 8), true)).toEqual(['/verbosity']);
    expect(keep.baseRevision.value).toBe(8);
    expect(keep.original.value).toEqual({ verbosity: 0 });
    expect(keep.overlay.value).toEqual({ verbosity: 2 });

    const discard = useOverlayDraft(rev({ verbosity: 1 }, 7), ref(base));
    discard.set('/verbosity', 2);
    expect(discard.rebase(rev({ verbosity: 0 }, 8), false)).toEqual([]);
    expect(discard.overlay.value).toEqual({ verbosity: 0 });
    expect(discard.isDirty.value).toBe(false);
  });

  it("rebase keeps the other revision's changes and re-applies only the draft's", () => {
    const d = useOverlayDraft(
      rev({ verbosity: 1, plugins: { ssh: { schedule: '0 * * * *' } } }, 7),
      ref(base),
    );
    d.set('/plugins/ssh/config/port', '2222');
    d.unset('/plugins/ssh/schedule');
    d.set('/verbosity', 3);
    const latest = rev(
      {
        verbosity: 3,
        plugins: {
          ssh: { schedule: '0 * * * *', enabled: false },
          c: { source: 'ghcr.io/x/c:v1' },
        },
      },
      8,
    );
    // /verbosity changed to the same value on both sides: not a conflict.
    expect(d.rebase(latest, true)).toEqual([]);
    expect(d.overlay.value).toEqual({
      verbosity: 3,
      plugins: {
        ssh: { enabled: false, config: { port: '2222' } },
        c: { source: 'ghcr.io/x/c:v1' },
      },
    });
    expect(d.original.value).toEqual(latest.overlay);
    expect(d.changedPaths.value).toEqual([
      '/plugins/ssh/config/port',
      '/plugins/ssh/schedule',
    ]);
  });

  it('rebase reports a pointer the other revision removed under the draft', () => {
    const d = useOverlayDraft(
      rev({ plugins: { ssh: { enabled: true } } }),
      ref(base),
    );
    d.set('/plugins/ssh/config/port', '2222');
    expect(d.rebase(rev({ plugins: { ssh: null } }, 8), true)).toEqual([
      '/plugins/ssh/config/port',
    ]);
    expect(d.overlay.value).toEqual({
      plugins: { ssh: { config: { port: '2222' } } },
    });
  });

  it('replaceAll clears the overlay; issues add the extra (preview) ones', () => {
    const d = useOverlayDraft(rev({ verbosity: 1 }), ref(base), {
      extraIssues: () => [{ ptr: '/api', message: 'locked', blocking: true }],
    });
    d.replaceAll({});
    expect(d.overlay.value).toEqual({});
    d.set('/plugins/ssh/config/password', '••••');
    expect(d.clientIssues.value.map((i) => i.ptr)).toEqual([
      '/plugins/ssh/config/password',
    ]);
    expect(d.issues.value.map((i) => i.ptr)).toEqual([
      '/plugins/ssh/config/password',
      '/api',
    ]);
  });

  it('makeAbsent nulls a key that only another instance file defines', () => {
    const other: ConfigDoc = {
      plugins: { extra: { source: 'ghcr.io/x/extra:v1' } },
    };
    const d = useOverlayDraft(rev(), ref(base), { bases: ref([base, other]) });
    d.makeAbsent('/plugins/extra');
    expect(d.overlay.value).toEqual({ plugins: { extra: null } });
    d.set('/plugins/neu', { source: 's' });
    d.makeAbsent('/plugins/neu');
    expect(d.overlay.value).toEqual({ plugins: { extra: null } });
  });

  it('counts changed leaves, answers pendingAt and undoes one pointer (R69)', () => {
    const d = useOverlayDraft(
      rev({ verbosity: 1, plugins: { ssh: { schedule: '0 * * * *' } } }),
      ref(base),
    );
    expect(d.changedPaths.value).toEqual([]);
    d.set('/verbosity', 2);
    d.set('/plugins/ssh/config/port', '2222');
    d.set('/plugins/ssh/policies', ['a', 'b']);
    expect(d.changedPaths.value).toEqual([
      '/plugins/ssh/config/port',
      '/plugins/ssh/policies',
      '/verbosity',
    ]);
    expect(d.pendingAt('/plugins/ssh/config')).toBe(true);
    expect(d.pendingAt('/plugins/ssh/schedule')).toBe(false);
    expect(d.pendingAt('/plugins')).toBe(true);
    d.revertPointer('/verbosity');
    expect(d.overlay.value.verbosity).toBe(1);
    d.revertPointer('/plugins/ssh/config/port');
    expect(d.overlay.value).toEqual({
      verbosity: 1,
      plugins: { ssh: { schedule: '0 * * * *', policies: ['a', 'b'] } },
    });
    d.discard();
    expect(d.isDirty.value).toBe(false);
  });

  it('two drafts over one DraftState see the same changes (a remounted tab)', () => {
    const state = createDraftState(rev({ verbosity: 1 }));
    const first = useOverlayDraft(state, ref(base));
    const second = useOverlayDraft(state, ref(base));
    first.set('/verbosity', 2);
    second.set('/plugins/ssh/labels', { team: 'x' });
    expect(first.changedPaths.value).toEqual([
      '/plugins/ssh/labels/team',
      '/verbosity',
    ]);
    expect(second.overlay.value).toBe(first.overlay.value);
  });
});

describe('draft registry (R69)', () => {
  beforeEach(() => resetAgentDrafts());

  it('keeps one draft per agent and user for the session', () => {
    const a = agentDraftState('a', 'u1');
    expect(agentDraftState('a', 'u1')).toBe(a);
    expect(agentDraftState('b', 'u1')).not.toBe(a);
    // Another user in the same tab (logout does not reload) never gets u1's draft.
    expect(agentDraftState('a', 'u2')).not.toBe(a);
    expect(a.baseRevision.value).toBe(-1);
  });

  it('adopts newer revisions while clean, keeps the base while dirty, forces after a save', () => {
    const s = agentDraftState('a');
    syncDraftState(s, rev({ verbosity: 1 }, 7));
    expect(s.baseRevision.value).toBe(7);
    syncDraftState(s, rev({ verbosity: 0 }, 8));
    expect([s.baseRevision.value, s.overlay.value]).toEqual([
      8,
      { verbosity: 0 },
    ]);

    s.overlay.value = { verbosity: 2 };
    s.comment.value = 'why';
    syncDraftState(s, rev({ verbosity: 0 }, 9));
    expect(s.baseRevision.value).toBe(8);
    expect(s.overlay.value).toEqual({ verbosity: 2 });

    syncDraftState(s, rev({ verbosity: 2 }, 10), true);
    expect(s.baseRevision.value).toBe(10);
    expect(s.original.value).toEqual({ verbosity: 2 });
    expect(s.comment.value).toBe('');
  });
});

describe('policy_data arrays: one element change per edited item', () => {
  const pdBase: ConfigDoc = {
    plugins: {
      ssh: {
        source: 's',
        policies: ['p1'],
        policy_data: { users: ['root', 'admin', 'ops'], n: 1 },
      },
    },
  };
  const USERS = '/plugins/ssh/policy_data/users';

  it('counts, marks and reverts a single changed item of a whole-array write', () => {
    const d = useOverlayDraft(rev(), ref(pdBase));
    d.setValue(USERS, ['root', 'ADMIN', 'ops'], '/plugins/ssh/policy_data');
    // The overlay holds the whole array…
    expect(d.overlay.value).toEqual({
      plugins: { ssh: { policy_data: { users: ['root', 'ADMIN', 'ops'] } } },
    });
    // …shown as one element change.
    expect(d.changedPaths.value).toEqual([`${USERS}/1`]);
    expect(d.pendingAt(`${USERS}/1`)).toBe(true);
    expect(d.pendingAt(`${USERS}/0`)).toBe(false);
    d.revertPointer(`${USERS}/1`);
    expect(d.isDirty.value).toBe(false);
  });

  it('additions and removals are element changes; reverting one keeps the other', () => {
    const d = useOverlayDraft(rev(), ref(pdBase));
    d.setValue(USERS, ['admin', 'ops', 'dev'], '/plugins/ssh/policy_data');
    expect(d.changedPaths.value).toEqual([`${USERS}/0`, `${USERS}/2`]);
    // Undo the removal of "root" (old index 0): only the addition remains.
    d.revertPointer(`${USERS}/0`);
    expect(d.overlay.value).toEqual({
      plugins: {
        ssh: { policy_data: { users: ['root', 'admin', 'ops', 'dev'] } },
      },
    });
    expect(d.changedPaths.value).toEqual([`${USERS}/3`]);
    d.revertPointer(`${USERS}/3`);
    expect(d.isDirty.value).toBe(false);
  });

  it('counts from the saved revision, and leaves other arrays whole', () => {
    const saved = { plugins: { ssh: { policy_data: { users: ['x'] } } } };
    const d = useOverlayDraft(rev(saved), ref(pdBase));
    d.setValue(USERS, ['x', 'y'], '/plugins/ssh/policy_data');
    expect(d.changedPaths.value).toEqual([`${USERS}/1`]);
    d.set('/plugins/ssh/policies', ['p1', 'p2']);
    expect(d.changedPaths.value).toContain('/plugins/ssh/policies');
  });
});
