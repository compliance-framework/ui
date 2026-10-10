import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { MAX_LOAD_RETRIES, retryLoad } from '../index';
import CodeEditorError from '../CodeEditorError.vue';

describe('code-editor async loading', () => {
  it(`retries a failed chunk load ${MAX_LOAD_RETRIES} times, then fails`, () => {
    const retry = vi.fn();
    const fail = vi.fn();
    const err = new Error('Failed to fetch dynamically imported module');
    for (let attempts = 1; attempts <= MAX_LOAD_RETRIES; attempts++)
      retryLoad(err, retry, fail, attempts);
    expect(retry).toHaveBeenCalledTimes(MAX_LOAD_RETRIES);
    expect(fail).not.toHaveBeenCalled();
    retryLoad(err, retry, fail, MAX_LOAD_RETRIES + 1);
    expect(fail).toHaveBeenCalledTimes(1);
    expect(retry).toHaveBeenCalledTimes(MAX_LOAD_RETRIES);
  });

  it('tells the user when the editor cannot be loaded', () => {
    const wrapper = mount(CodeEditorError, {
      props: { error: new Error('chunk') },
    });
    expect(wrapper.attributes('role')).toBe('alert');
    expect(wrapper.text()).toContain('The editor failed to load');
  });
});
