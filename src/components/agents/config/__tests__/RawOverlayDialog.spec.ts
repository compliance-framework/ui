// R70: the raw overlay YAML dialog feeds the shared draft; forbidden keys (R71) are
// highlighted and block Apply; Clear overlay needs agent:configure.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { resetAgentDrafts } from '@/composables/agent-config/draftRegistry';
import type { ConfigWorkspace } from '@/composables/agent-config/useConfigWorkspace';
import {
  ADMIN,
  READER,
  fakeApi,
  globalWith,
  piniaWith,
  workspaceHost,
} from './helpers';

vi.mock('@/components/code-editor', () => import('./codeEditorMock'));

import RawOverlayDialog from '../workspace/RawOverlayDialog.vue';

async function mountDialog(
  perms: Record<string, string[]> = ADMIN,
  over: Parameters<typeof fakeApi>[0] = {},
) {
  const out: { ws?: ConfigWorkspace } = {};
  const wrapper = mount(
    workspaceHost(
      fakeApi(over),
      RawOverlayDialog,
      () => ({ visible: true }),
      out,
    ),
    { global: globalWith(piniaWith(perms), { teleport: true }) },
  );
  await flushPromises();
  await out.ws!.loadDetails();
  await flushPromises();
  return { wrapper, ws: out.ws! };
}

async function type(wrapper: ReturnType<typeof mount>, text: string) {
  vi.useFakeTimers();
  await wrapper.find('textarea').setValue(text);
  vi.advanceTimersByTime(300);
  vi.useRealTimers();
  await flushPromises();
}

describe('RawOverlayDialog (R70)', () => {
  beforeEach(() => resetAgentDrafts());

  it('starts from the draft and applies a parsed, coerced document to it', async () => {
    const { wrapper, ws } = await mountDialog();
    expect(
      (wrapper.find('textarea').element as HTMLTextAreaElement).value,
    ).toContain('local-ssh-policies:v1.1.0');
    expect(
      wrapper.find('[data-test="raw-apply"]').attributes('disabled'),
    ).toBeDefined();
    await type(
      wrapper,
      'verbosity: 2\nplugins:\n  local-ssh:\n    config:\n      port: 2200\n',
    );
    expect(wrapper.find('[data-test="yaml-coerced"]').text()).toContain(
      '/plugins/local-ssh/config/port',
    );
    await wrapper.find('[data-test="raw-apply"]').trigger('click');
    expect(ws.draft.overlay.value).toEqual({
      verbosity: 2,
      plugins: { 'local-ssh': { config: { port: '2200' } } },
    });
    expect(
      wrapper.findComponent(RawOverlayDialog).emitted('update:visible'),
    ).toEqual([[false]]);
  });

  it('highlights forbidden keys and blocks Apply (R71)', async () => {
    const { wrapper, ws } = await mountDialog();
    await type(
      wrapper,
      'verbosity: 1\ndaemon: false\nremote_config:\n  mode: apply_all\n',
    );
    expect(wrapper.find('[data-test="yaml-forbidden"]').text()).toContain(
      'daemon',
    );
    expect(wrapper.find('[data-test="yaml-forbidden"]').text()).toContain(
      'can never be changed remotely',
    );
    const diags = JSON.parse(
      wrapper.find('textarea').attributes('data-diagnostics') ?? '[]',
    ) as { row: number }[];
    expect(diags.map((d) => d.row)).toEqual([2, 3]);
    expect(
      wrapper.find('[data-test="raw-apply"]').attributes('disabled'),
    ).toBeDefined();
    expect(ws.draft.isDirty.value).toBe(false);
  });

  it('shows YAML errors and keeps Apply disabled', async () => {
    const { wrapper } = await mountDialog();
    await type(wrapper, 'plugins: [unclosed\n');
    expect(wrapper.find('[data-test="yaml-error"]').exists()).toBe(true);
    expect(
      wrapper.find('[data-test="raw-apply"]').attributes('disabled'),
    ).toBeDefined();
  });

  it('Clear overlay replaces the draft with {} for configure', async () => {
    const admin = await mountDialog();
    await admin.wrapper.find('[data-test="clear-overlay"]').trigger('click');
    await flushPromises();
    await admin.wrapper.find('[data-test="raw-apply"]').trigger('click');
    expect(admin.ws.draft.overlay.value).toEqual({});
  });

  it('a reader cannot clear', async () => {
    const { wrapper } = await mountDialog(READER);
    expect(
      wrapper.find('[data-test="clear-overlay"]').attributes('disabled'),
    ).toBeDefined();
  });
});
