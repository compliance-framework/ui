import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import LockedKeysPanel from '../LockedKeysPanel.vue';
import { globalWith, piniaWith, READER } from './helpers';

const modeRow = (doc: object) => {
  const term = mount(LockedKeysPanel, {
    props: { doc },
    global: globalWith(piniaWith(READER)),
  })
    .findAll('dt')
    .find((dt) => dt.text() === 'remote_config.mode')!;
  return term.element.nextElementSibling?.textContent?.trim();
};

describe('LockedKeysPanel', () => {
  it('shows an unset remote_config.mode as the API default (R29: report with credentials, off without)', () => {
    expect(
      modeRow({ api: { auth: { client_id: 'c' } }, remote_config: {} }),
    ).toBe('report');
    expect(modeRow({ remote_config: {} })).toBe('off');
    expect(
      modeRow({
        api: { auth: { client_id: 'c' } },
        remote_config: { mode: 'apply_all' },
      }),
    ).toBe('apply_all');
  });
});
