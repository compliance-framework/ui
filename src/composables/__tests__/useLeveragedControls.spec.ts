import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import { linkKey, useLeveragedControls } from '../useLeveragedControls';

const { fetchedUrls, capturedConfigs, serverState } = vi.hoisted(() => ({
  fetchedUrls: [] as string[],
  capturedConfigs: [] as Array<
    { camelcaseStopPaths?: readonly string[] } | undefined
  >,
  serverState: {
    controls: [] as unknown[],
    filters: [] as unknown[],
    failFilters: false,
  },
}));

vi.mock('@/composables/axios', async () => {
  const { ref: vueRef } = await import('vue');
  return {
    useDataApi: (
      _url: unknown,
      config?: { camelcaseStopPaths?: readonly string[] },
    ) => {
      capturedConfigs.push(config);
      const data = vueRef<unknown>(undefined);
      const error = vueRef<unknown>(null);
      const execute = (url: string) => {
        fetchedUrls.push(url);
        if (url.includes('/responsibility-filters')) {
          if (serverState.failFilters) {
            error.value = new Error('boom');
            return Promise.reject(error.value);
          }
          data.value = serverState.filters;
        } else {
          data.value = serverState.controls;
        }
        error.value = null;
        return Promise.resolve({ data: vueRef({ data: data.value }) });
      };
      return { data, isLoading: vueRef(false), error, execute };
    },
  };
});

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('useLeveragedControls', () => {
  beforeEach(() => {
    fetchedUrls.length = 0;
    capturedConfigs.length = 0;
    serverState.controls = [];
    serverState.filters = [];
    serverState.failFilters = false;
  });

  it('fences the posture map off the camelCase interceptor (UUID keys keep their dashes)', () => {
    useLeveragedControls(ref('ssp-1'));
    // The first useDataApi instance is the leveraged-controls fetch.
    expect(capturedConfigs[0]?.camelcaseStopPaths).toContain(
      'data.responsibilityPosture',
    );
  });

  it('fetches both projections once per sspId, and refetches on change', async () => {
    const sspId = ref<string | undefined>('ssp-1');
    const { refresh } = useLeveragedControls(sspId);
    await flushPromises();

    expect(fetchedUrls).toEqual([
      '/api/oscal/system-security-plans/ssp-1/leveraged-controls',
      '/api/oscal/system-security-plans/ssp-1/responsibility-filters',
    ]);

    // KeepAlive trap: switching the SSP must re-execute with the new URLs.
    sspId.value = 'ssp-2';
    await nextTick();
    await flushPromises();
    expect(fetchedUrls.slice(2)).toEqual([
      '/api/oscal/system-security-plans/ssp-2/leveraged-controls',
      '/api/oscal/system-security-plans/ssp-2/responsibility-filters',
    ]);

    fetchedUrls.length = 0;
    await refresh();
    expect(fetchedUrls).toHaveLength(2);
  });

  it('does not fetch without an sspId', async () => {
    useLeveragedControls(ref(undefined));
    await flushPromises();
    expect(fetchedUrls).toHaveLength(0);
  });

  it('groups links by (controlId, statementId) case-insensitively', async () => {
    serverState.controls = [
      { id: 'l-1', controlId: 'AC-1', statementId: 'ac-1_smt.a' },
      { id: 'l-2', controlId: 'ac-1', statementId: 'AC-1_SMT.A' },
      { id: 'l-3', controlId: 'cm-5', statementId: undefined },
    ];
    const { linksByStatement } = useLeveragedControls(ref('ssp-1'));
    await flushPromises();

    const acLinks = linksByStatement.value.get(linkKey('ac-1', 'AC-1_smt.a'));
    expect(acLinks?.map((l) => (l as { id: string }).id)).toEqual([
      'l-1',
      'l-2',
    ]);
    expect(linksByStatement.value.get(linkKey('CM-5', undefined))).toHaveLength(
      1,
    );
  });

  it('groups responsibility filters by responsibility uuid', async () => {
    serverState.filters = [
      { responsibilityUuid: 'r-1', filterId: 'f-1', filterName: 'A' },
      { responsibilityUuid: 'r-1', filterId: 'f-2', filterName: 'B' },
      { responsibilityUuid: 'r-2', filterId: 'f-3', filterName: 'C' },
    ];
    const { filtersByResponsibility } = useLeveragedControls(ref('ssp-1'));
    await flushPromises();

    expect(filtersByResponsibility.value.get('r-1')).toHaveLength(2);
    expect(filtersByResponsibility.value.get('r-2')).toHaveLength(1);
  });

  it('surfaces a filters fetch failure via the error ref, with empty maps', async () => {
    serverState.failFilters = true;
    const { responsibilityFiltersError, filtersByResponsibility } =
      useLeveragedControls(ref('ssp-1'));
    await flushPromises();

    expect(responsibilityFiltersError.value).toBeTruthy();
    expect(filtersByResponsibility.value.size).toBe(0);
  });
});
