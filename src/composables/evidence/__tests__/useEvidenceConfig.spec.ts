import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { useEvidenceConfig } from '../useEvidenceConfig';

const { config } = vi.hoisted(() => ({
  config: { value: undefined as unknown },
}));

vi.mock('@/composables/axios', () => ({
  useDataApi: (url: string) => {
    expect(url).toBe('/api/evidence/config');
    return { data: ref(config.value) };
  },
}));

describe('useEvidenceConfig', () => {
  it('reports whether manual evidence needs a subject', () => {
    config.value = { manualSubjectRequired: true };
    expect(useEvidenceConfig().manualSubjectRequired.value).toBe(true);

    config.value = { manualSubjectRequired: false };
    expect(useEvidenceConfig().manualSubjectRequired.value).toBe(false);
  });

  it('does not require a subject when the API has no config', () => {
    config.value = undefined;
    expect(useEvidenceConfig().manualSubjectRequired.value).toBe(false);
  });
});
