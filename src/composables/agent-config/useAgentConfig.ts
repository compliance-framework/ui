// State of the agent Configuration tab (LLD U1.3): the desired revision, the reporting
// instances, the selected instance's detail and the overlay of the revision it runs.
// No polling: the tab exposes a Refresh button and is mounted only while visible.

import { computed, ref, shallowRef, type Ref } from 'vue';
import type {
  AgentConfigRevision,
  AgentInstanceDetail,
  AgentInstanceSummary,
  InstancesMeta,
  OverlayDoc,
} from '@/types/agent-config';
import { usePermissionsStore } from '@/stores/permissions';
import { ACTIONS, RESOURCES } from '@/constants/permissions';
import {
  deriveInstanceState,
  summarizeSync,
} from '@/utils/agent-config/instance-status';
import { isAgentConfigApiError, type AgentConfigApi } from './api-types';
import { listAllInstances } from './instancePages';

export type AgentConfigStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'unsupported'
  | 'error';

/** Max concurrent instance-detail requests when the editor needs every base (U2.2). */
const DETAIL_CONCURRENCY = 6;

export function useAgentConfig(agentId: Ref<string>, api: AgentConfigApi) {
  const permissions = usePermissionsStore();

  const config = shallowRef<AgentConfigRevision | null>(null);
  const instances = shallowRef<AgentInstanceSummary[]>([]);
  const meta = shallowRef<InstancesMeta | null>(null);
  /** The loaded rows are not every instance (paginated list past MAX_INSTANCE_PAGES). */
  const instancesPartial = ref(false);
  const selectedInstanceId = ref<string | null>(null);
  const selectedInstance = shallowRef<AgentInstanceDetail | null>(null);
  const appliedOverlay = shallowRef<OverlayDoc | null>(null);
  const instanceLoading = ref(false);
  const instanceError = ref<string | null>(null);
  /** The applied revision's overlay could not be loaded; provenance uses the desired one. */
  const appliedOverlayFallback = ref(false);
  const status = ref<AgentConfigStatus>('idle');
  const error = ref<string | null>(null);

  const revisionCache = new Map<number, AgentConfigRevision>();
  const detailCache = new Map<string, AgentInstanceDetail>();
  let loadSeq = 0;
  let selectSeq = 0;

  const desiredRevision = computed(
    () => config.value?.revision ?? meta.value?.desiredRevision ?? 0,
  );
  const instanceStates = computed(() =>
    instances.value.map((i) => deriveInstanceState(i, desiredRevision.value)),
  );
  /** Every instance of the agent (the API's fleet-wide count), loaded or not. */
  const instanceTotal = computed(
    () => meta.value?.counts?.total ?? instances.value.length,
  );
  const syncSummary = computed(() =>
    summarizeSync(instances.value, instanceStates.value, meta.value?.counts),
  );
  /** The loaded detail belongs to the selected id (false while switching instances). */
  const selectedInstanceCurrent = computed(
    () =>
      !!selectedInstance.value &&
      selectedInstance.value.instanceId === selectedInstanceId.value,
  );
  const selectedState = computed(
    () =>
      instanceStates.value.find(
        (s) => s.instanceId === selectedInstanceId.value,
      ) ?? null,
  );

  async function ensurePermissions(): Promise<boolean> {
    // stores/permissions can() is optimistic before hydration; wait so an unauthorised
    // user never fires requests that race the hydration (D-21).
    if (!permissions.loaded) await permissions.hydrate();
    return permissions.can(RESOURCES.AGENT, ACTIONS.READ);
  }

  function messageOf(e: unknown, fallback: string): string {
    if (isAgentConfigApiError(e)) return e.message || fallback;
    if (e instanceof Error && e.message) return e.message;
    return fallback;
  }

  /** Overlay of a revision, cached per revision number. */
  async function getRevisionCached(rev: number): Promise<AgentConfigRevision> {
    const cached = revisionCache.get(rev);
    if (cached) return cached;
    const loaded = await api.getRevision(agentId.value, rev);
    revisionCache.set(rev, loaded);
    return loaded;
  }

  async function resolveAppliedOverlay(
    inst: AgentInstanceSummary,
  ): Promise<OverlayDoc> {
    const applied = inst.appliedRevision;
    if (applied === null || applied === 0) return {};
    if (config.value && applied === config.value.revision)
      return config.value.overlay ?? {};
    const rev = await getRevisionCached(applied);
    return rev.overlay ?? {};
  }

  function defaultInstanceId(list: AgentInstanceSummary[]): string | null {
    const fresh = list.find((i) => !i.stale && i.reportedAt != null);
    return (fresh ?? list[0])?.instanceId ?? null;
  }

  async function selectInstance(id: string): Promise<void> {
    const seq = ++selectSeq;
    selectedInstanceId.value = id;
    instanceLoading.value = true;
    instanceError.value = null;
    try {
      const detail = await getInstanceDetail(id, true);
      if (seq !== selectSeq) return;
      let overlay: OverlayDoc = {};
      let fallback = false;
      try {
        overlay = await resolveAppliedOverlay(detail);
      } catch {
        // Provenance degrades to the desired overlay when the applied one can't be loaded.
        overlay = config.value?.overlay ?? {};
        fallback = true;
      }
      if (seq !== selectSeq) return;
      // Publish the detail and the overlay of the revision it runs together, so the views
      // never pair one instance's config with another's provenance.
      selectedInstance.value = detail;
      appliedOverlay.value = overlay;
      appliedOverlayFallback.value = fallback;
    } catch (e) {
      if (seq !== selectSeq) return;
      selectedInstance.value = null;
      appliedOverlay.value = null;
      instanceError.value = messageOf(e, 'Failed to load the instance.');
    } finally {
      if (seq === selectSeq) instanceLoading.value = false;
    }
  }

  async function getInstanceDetail(
    id: string,
    fresh = false,
  ): Promise<AgentInstanceDetail> {
    if (!fresh) {
      const cached = detailCache.get(id);
      if (cached) return cached;
    }
    const detail = await api.getInstance(agentId.value, id);
    detailCache.set(id, detail);
    return detail;
  }

  /**
   * Details of every instance that has reported (the editor's review diff needs every base),
   * at most DETAIL_CONCURRENCY in flight. Failures are skipped (the panel falls back to the
   * change list for that instance).
   */
  async function loadAllInstanceDetails(): Promise<
    Map<string, AgentInstanceDetail>
  > {
    const ids = instances.value
      .filter((i) => i.reportedAt != null)
      .map((i) => i.instanceId);
    return fetchDetails(ids, true);
  }

  /** Details of `ids`, at most DETAIL_CONCURRENCY in flight; failures skipped or rethrown. */
  async function fetchDetails(
    ids: string[],
    skipFailures: boolean,
  ): Promise<Map<string, AgentInstanceDetail>> {
    const out = new Map<string, AgentInstanceDetail>();
    let next = 0;
    const worker = async () => {
      while (next < ids.length) {
        const id = ids[next++];
        try {
          out.set(id, await getInstanceDetail(id));
        } catch (e) {
          if (!skipFailures) throw e;
        }
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(DETAIL_CONCURRENCY, ids.length) }, worker),
    );
    return out;
  }

  async function fetchAll(keepSelection: boolean): Promise<void> {
    const seq = ++loadSeq;
    if (!(await ensurePermissions())) {
      status.value = 'error';
      error.value = "You don't have permission to view agent configuration.";
      return;
    }
    const [cfg, list] = await Promise.all([
      api.getConfig(agentId.value),
      listAllInstances(api, agentId.value),
    ]);
    if (seq !== loadSeq) return;
    config.value = cfg;
    if (cfg.overlay) revisionCache.set(cfg.revision, cfg);
    instances.value = list.items;
    meta.value = list.meta;
    instancesPartial.value = list.partial;
    detailCache.clear();
    status.value = 'ready';
    const keep =
      keepSelection &&
      selectedInstanceId.value &&
      list.items.some((i) => i.instanceId === selectedInstanceId.value)
        ? selectedInstanceId.value
        : null;
    const id = keep ?? defaultInstanceId(list.items);
    if (id) {
      await selectInstance(id);
    } else {
      selectedInstanceId.value = null;
      selectedInstance.value = null;
      appliedOverlay.value = null;
    }
  }

  async function load(): Promise<void> {
    status.value = 'loading';
    error.value = null;
    const seq = loadSeq + 1;
    try {
      await fetchAll(false);
    } catch (e) {
      // A newer load/refresh already superseded this one.
      if (seq !== loadSeq) return;
      if (isAgentConfigApiError(e) && e.kind === 'unsupported') {
        status.value = 'unsupported';
      } else {
        status.value = 'error';
        error.value = messageOf(e, 'Failed to load the agent configuration.');
      }
    }
  }

  /** After save/revert: reload and keep the selected instance. */
  async function refresh(): Promise<void> {
    const seq = loadSeq + 1;
    try {
      await fetchAll(true);
    } catch (e) {
      if (seq !== loadSeq) return;
      error.value = messageOf(e, 'Failed to refresh the agent configuration.');
      if (isAgentConfigApiError(e) && e.kind === 'unsupported')
        status.value = 'unsupported';
      else status.value = 'error';
    }
  }

  return {
    config,
    instances,
    meta,
    instancesPartial,
    instanceTotal,
    instanceStates,
    selectedInstanceId,
    selectedInstance,
    selectedInstanceCurrent,
    selectedState,
    appliedOverlay,
    appliedOverlayFallback,
    desiredRevision,
    syncSummary,
    status,
    error,
    instanceLoading,
    instanceError,
    load,
    selectInstance,
    refresh,
    getRevisionCached,
    loadAllInstanceDetails,
  };
}

export type AgentConfigState = ReturnType<typeof useAgentConfig>;
