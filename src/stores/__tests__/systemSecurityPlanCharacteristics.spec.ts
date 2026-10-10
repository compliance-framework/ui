import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useSystemSecurityPlanStore } from '@/stores/system-security-plans';
import type { SystemCharacteristics } from '@/oscal';

vi.mock('@/stores/config', () => ({
  useConfigStore: () => ({
    getConfig: async () => ({ API_URL: 'http://api.test' }),
  }),
}));

describe('updateCharacteristics', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    setActivePinia(createPinia());
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ data: {} }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // The API ignores camelCase keys and replaces the associations it isn't
  // given, so shallow kebab-casing wiped information types and impact levels.
  it('kebab-cases nested keys so information types and impact levels survive', async () => {
    const store = useSystemSecurityPlanStore();
    await store.updateCharacteristics('ssp-1', {
      systemName: 'IFA GoodRead',
      securityImpactLevel: {
        securityObjectiveConfidentiality: 'low',
        securityObjectiveIntegrity: 'medium',
        securityObjectiveAvailability: 'low',
      },
      systemInformation: {
        informationTypes: [
          {
            uuid: 'it-1',
            title: 'Link data',
            confidentialityImpact: { base: 'fips-199-low' },
          },
        ],
      },
    } as unknown as SystemCharacteristics);

    const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(body['security-impact-level']).toEqual({
      'security-objective-confidentiality': 'low',
      'security-objective-integrity': 'medium',
      'security-objective-availability': 'low',
    });
    expect(body['system-information']['information-types'][0]).toMatchObject({
      'confidentiality-impact': { base: 'fips-199-low' },
    });
  });
});
