import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import type { AgentConfigRevision, ConfigDoc } from '@/types/agent-config';
import { YAML_DEBOUNCE_MS, useOverlayDraft } from '../useOverlayDraft';

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
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

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

  it('round-trips form ↔ yaml', () => {
    const d = useOverlayDraft(rev({ verbosity: 1 }), ref(base));
    d.set('/plugins/ssh/config/port', '2222');
    expect(d.setMode('yaml')).toBe(true);
    expect(d.yamlText.value).toContain("port: '2222'");
    d.onYamlInput('verbosity: 2\n');
    vi.advanceTimersByTime(YAML_DEBOUNCE_MS);
    expect(d.overlay.value).toEqual({ verbosity: 2 });
    expect(d.setMode('form')).toBe(true);
    expect(d.mode.value).toBe('form');
  });

  it('blocks the yaml → form switch on a YAML error (flushing a pending parse)', () => {
    const d = useOverlayDraft(rev(), ref(base));
    d.setMode('yaml');
    d.onYamlInput('plugins: [unclosed\n');
    expect(d.setMode('form')).toBe(false);
    expect(d.mode.value).toBe('yaml');
    expect(d.yamlError.value?.message).toBeTruthy();
    d.onYamlInput('verbosity: 1\n');
    vi.advanceTimersByTime(YAML_DEBOUNCE_MS);
    expect(d.yamlError.value).toBeNull();
    expect(d.setMode('form')).toBe(true);
  });

  it('coerces scalar config values from YAML (R27) without rewriting the text', () => {
    const d = useOverlayDraft(rev(), ref(base));
    d.setMode('yaml');
    const text = 'plugins:\n  ssh:\n    config:\n      port: 2222\n';
    d.onYamlInput(text);
    vi.advanceTimersByTime(YAML_DEBOUNCE_MS);
    expect(d.overlay.value).toEqual({
      plugins: { ssh: { config: { port: '2222' } } },
    });
    expect(d.coerced.value).toEqual(['/plugins/ssh/config/port']);
    expect(d.yamlText.value).toBe(text);
  });

  it('rebase keeps or discards the draft', () => {
    const keep = useOverlayDraft(rev({ verbosity: 1 }, 7), ref(base));
    keep.set('/verbosity', 2);
    keep.rebase(rev({ verbosity: 0 }, 8), true);
    expect(keep.baseRevision.value).toBe(8);
    expect(keep.original.value).toEqual({ verbosity: 0 });
    expect(keep.overlay.value).toEqual({ verbosity: 2 });

    const discard = useOverlayDraft(rev({ verbosity: 1 }, 7), ref(base));
    discard.set('/verbosity', 2);
    discard.rebase(rev({ verbosity: 0 }, 8), false);
    expect(discard.overlay.value).toEqual({ verbosity: 0 });
    expect(discard.isDirty.value).toBe(false);
  });

  it('replaceAll clears the overlay and client issues are computed', () => {
    const d = useOverlayDraft(rev({ verbosity: 1 }), ref(base));
    d.replaceAll({});
    expect(d.overlay.value).toEqual({});
    d.set('/api', { url: 'x' });
    expect(
      d.clientIssues.value.some((i) => i.ptr === '/api' && i.blocking),
    ).toBe(true);
  });
});
