import { ref } from 'vue';
import type { AxiosError } from 'axios';
import { useAuthenticatedInstance, decamelizeKeys } from '@/composables/axios';
import { uuid as newUuid } from '@/utils/uuid';
import { latestRequest } from '@/utils/latest-request';
import type {
  ByComponent,
  ByComponentExport,
  ControlImplementation,
  ImplementedRequirement,
  Statement,
  SystemComponent,
  SystemSecurityPlan,
} from '@/oscal';
import type {
  AllowedDownstream,
  SSPExportOffering,
  SSPExportOfferingItem,
} from '@/types/ssp-export-offerings';
import type { DataResponse, ErrorBody, ErrorResponse } from '@/stores/types';
import {
  uniformImplementationStatusCue,
  type ImplementationStatusState,
} from '@/views/control-implementations/partials/implementation-status';

// The one place the "share this statement's implementation" orchestration lives.
//
// The user-facing model is deliberately simpler than the OSCAL one: "this system exports a
// capability for this statement, visible to these downstreams". Under the hood that spans
// two API families:
//   - the OSCAL control-implementation subtree (kebab-case wire, decamelizeKeys):
//     this-system component -> statement by-component -> export -> provided/responsibilities
//   - the hand-written camelCase offering endpoints (NO decamelizeKeys):
//     default offering -> items -> allowed-downstreams -> publish
// None of those objects are exposed to the user; the dialog only shows text blocks and a
// visibility picker, and this composable makes the tree behind them true.

export type StatementExportStep =
  | 'load'
  | 'component'
  | 'attach'
  | 'export'
  | 'provided'
  | 'responsibilities'
  | 'offering'
  | 'visibility'
  | 'publish';

export interface StatementExportStepError {
  step: StatementExportStep;
  message: string;
}

export interface StatementExportTarget {
  sspId: string;
  sspTitle: string;
  controlId: string;
  // The OSCAL part id (e.g. "ac-2_smt.a") — requirement/statement uuids are resolved here,
  // because the shared-responsibility rollup does not carry them.
  statementId: string;
  // Optional anchor hint: when editing from a rollup row, the by-component the row belongs
  // to. Without it the anchor is resolved (this-system by-component, else the one already
  // carrying an export), or created on the this-system component.
  byComponentUuid?: string;
}

export interface ProvidedDraft {
  uuid?: string;
  description: string;
}

export interface ResponsibilityDraft {
  uuid?: string;
  description: string;
  // Index into the dialog's provided list. Ignored when the provided list is empty — every
  // responsibility then links to the auto-created full-scope block.
  providedIndex: number;
}

export interface StatementExportDraft {
  provided: ProvidedDraft[];
  responsibilities: ResponsibilityDraft[];
  // Empty = any downstream may import.
  allowedSspIds: string[];
}

export interface StatementExportState {
  provided: ProvidedDraft[];
  responsibilities: ResponsibilityDraft[];
  allowedSspIds: string[];
  sspOptions: Array<{ id: string; label: string }>;
  // Whether anything is exported yet — drives the dialog's explanatory copy.
  hasExport: boolean;
  // Whether the managing offering is already published (drives the "importers will be
  // notified" nuance in the success toast).
  alreadyPublished: boolean;
}

export function fullScopeProvidedDescription(sspTitle: string): string {
  return `Full scope of this statement's implementation is provided by ${sspTitle}.`;
}

export function defaultOfferingTitle(sspTitle: string): string {
  return `${sspTitle} — Shared capabilities`;
}

const DEFAULT_OFFERING_DESCRIPTION =
  'Automatically managed from the Controls page. Curate items, versions and the ' +
  'downstream allow-list under Export Offerings.';

interface ResolvedTarget {
  requirement: ImplementedRequirement;
  statement: Statement;
  byComponents: ByComponent[];
  anchor: ByComponent | null;
  uniformState: ImplementationStatusState | null;
  thisSystemComponentUuid: string | null;
  offering: SSPExportOffering | null;
  allowed: AllowedDownstream[];
}

function errorDetail(error: unknown, fallback: string): string {
  const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
  return (
    errorResponse.response?.data?.errors?.body ||
    (error instanceof Error ? error.message : '') ||
    fallback
  );
}

function normalizeId(value?: string): string {
  return (value ?? '').trim().toLowerCase();
}

const THIS_SYSTEM = 'this-system';

export function useStatementExport(target: () => StatementExportTarget) {
  const axiosInstance = useAuthenticatedInstance();
  const oscalConfig = { transformRequest: [decamelizeKeys] };

  const state = ref<StatementExportState | null>(null);
  const loading = ref(false);
  const saving = ref(false);
  const stepError = ref<StatementExportStepError | null>(null);

  // Load-resolved context the save chain builds on. Never exposed to the caller.
  let resolved: ResolvedTarget | null = null;
  // IndexView keeps ONE dialog mounted across targets, so load() can be re-issued for a
  // different statement while an earlier chain is still in flight. `resolved` is what every
  // mutation URL is built from — an older load landing last would silently repoint save at
  // the statement the user already navigated away from.
  const loadGate = latestRequest();

  function oscalBase(sspId: string): string {
    return `/api/oscal/system-security-plans/${sspId}`;
  }

  function statementByComponentsUrl(t: StatementExportTarget): string {
    if (!resolved) throw new Error('load() must succeed before saving.');
    return `${oscalBase(t.sspId)}/control-implementation/implemented-requirements/${resolved.requirement.uuid}/statements/${resolved.statement.uuid}/by-components`;
  }

  async function fail(
    step: StatementExportStep,
    error: unknown,
  ): Promise<never> {
    stepError.value = { step, message: errorDetail(error, '') };
    throw error;
  }

  // ---- LOAD ----

  async function load(): Promise<boolean> {
    const t = target();
    const token = loadGate.begin();
    loading.value = true;
    stepError.value = null;
    state.value = null;
    resolved = null;
    try {
      // 1. Resolve the requirement + statement from the control-implementation tree. The
      // rollup and the catalog only speak controlId/statementId; the OSCAL routes need
      // uuids. Both ids are matched case-insensitively (SSP casing drifts from the
      // catalog's).
      const implementationResponse = await axiosInstance.get<
        DataResponse<ControlImplementation | null>
      >(`${oscalBase(t.sspId)}/control-implementation`);
      const requirements =
        implementationResponse.data.data?.implementedRequirements ?? [];
      const requirement = requirements.find(
        (r) => normalizeId(r.controlId) === normalizeId(t.controlId),
      );
      const statement = requirement?.statements?.find(
        (s) => normalizeId(s.statementId) === normalizeId(t.statementId),
      );
      if (!requirement || !statement) {
        throw new Error(
          'The implementation for this statement could not be found. Refresh and try again.',
        );
      }

      // 2. The whole-system component this export anchors on (may not exist yet).
      const componentsResponse = await axiosInstance.get<
        DataResponse<SystemComponent[]>
      >(`${oscalBase(t.sspId)}/system-implementation/components`);
      const thisSystem =
        (componentsResponse.data.data ?? []).find(
          (c) => normalizeId(c.type) === THIS_SYSTEM,
        ) ?? null;

      // 3. The statement's by-components, with their export subtrees — the authoritative
      // edit source.
      const byComponentsResponse = await axiosInstance.get<
        DataResponse<ByComponent[]>
      >(
        `${oscalBase(t.sspId)}/control-implementation/implemented-requirements/${requirement.uuid}/statements/${statement.uuid}/by-components`,
      );
      const byComponents = byComponentsResponse.data.data ?? [];

      // Anchor preference: the explicit hint (a rollup row's by-component), else the
      // this-system by-component, else whichever by-component already carries an export —
      // existing exports keep being edited where they live instead of growing a parallel
      // copy on this-system.
      const anchor =
        (t.byComponentUuid
          ? byComponents.find((bc) => bc.uuid === t.byComponentUuid)
          : undefined) ??
        (thisSystem
          ? byComponents.find((bc) => bc.componentUuid === thisSystem.uuid)
          : undefined) ??
        byComponents.find((bc) => bc.export) ??
        null;

      // 4. The managing offering: prefer the one already holding an item for this export;
      // fall back to the title convention. Deprecated/revoked offerings are dead ends
      // (publish rejects them), so they never count.
      const offeringsResponse = await axiosInstance.get<
        DataResponse<SSPExportOffering[]>
      >(`${oscalBase(t.sspId)}/export-offerings`);
      const liveOfferings = (offeringsResponse.data.data ?? []).filter(
        (o) => o.status === 'draft' || o.status === 'published',
      );
      const providedUuids = new Set(
        (anchor?.export?.provided ?? []).map((p) => p.uuid),
      );
      const offering =
        liveOfferings.find((o) =>
          (o.items ?? []).some((item) => providedUuids.has(item.providedUuid)),
        ) ??
        liveOfferings.find(
          (o) => o.title === defaultOfferingTitle(t.sspTitle),
        ) ??
        null;

      // 5. Visibility (only meaningful once the offering exists).
      let allowed: AllowedDownstream[] = [];
      if (offering) {
        const allowedResponse = await axiosInstance.get<
          DataResponse<AllowedDownstream[]>
        >(
          `${oscalBase(t.sspId)}/export-offerings/${offering.id}/allowed-downstreams`,
        );
        allowed = allowedResponse.data.data ?? [];
      }

      // 6. SSP options for the visibility picker. Best-effort: without it the picker is
      // empty but everything else still works.
      let sspOptions: Array<{ id: string; label: string }> = [];
      try {
        const sspsResponse = await axiosInstance.get<
          DataResponse<SystemSecurityPlan[]>
        >('/api/oscal/system-security-plans');
        sspOptions = (sspsResponse.data.data ?? [])
          .filter((ssp) => ssp.uuid !== t.sspId)
          .map((ssp) => ({
            id: ssp.uuid,
            label: ssp.metadata?.title ?? ssp.uuid,
          }));
      } catch {
        sspOptions = [];
      }

      // A newer load() has taken over: drop this answer rather than repointing `resolved`
      // (and every save URL built from it) back at a stale target.
      if (loadGate.isStale(token)) return false;

      resolved = {
        requirement,
        statement,
        byComponents,
        anchor,
        uniformState:
          uniformImplementationStatusCue(byComponents)?.state ?? null,
        thisSystemComponentUuid: thisSystem?.uuid ?? null,
        offering,
        allowed,
      };

      const providedEntries = anchor?.export?.provided ?? [];
      const providedIndexByUuid = new Map(
        providedEntries.map((p, index) => [p.uuid, index]),
      );
      state.value = {
        provided: providedEntries.map((p) => ({
          uuid: p.uuid,
          description: p.description ?? '',
        })),
        responsibilities: (anchor?.export?.responsibilities ?? []).map((r) => ({
          uuid: r.uuid,
          description: r.description ?? '',
          providedIndex: providedIndexByUuid.get(r.providedUuid ?? '') ?? 0,
        })),
        allowedSspIds: allowed.map((a) => a.downstreamSspId),
        sspOptions,
        hasExport: providedEntries.length > 0,
        alreadyPublished: offering?.status === 'published',
      };
      return true;
    } catch (error) {
      // Also guarded: a superseded load failing must not report an error over the newer
      // load that succeeded.
      if (loadGate.isStale(token)) return false;
      stepError.value = {
        step: 'load',
        message: errorDetail(
          error,
          'Could not load what this system currently shares for this statement.',
        ),
      };
      return false;
    } finally {
      // Only the newest load owns the spinner; an older one finishing must not clear it
      // while the current chain is still running.
      if (!loadGate.isStale(token)) {
        loading.value = false;
      }
    }
  }

  // ---- SAVE (idempotent ensure-chain) ----

  async function ensureAnchor(t: StatementExportTarget): Promise<ByComponent> {
    if (resolved!.anchor) return resolved!.anchor;

    // A. The whole-system component.
    let componentUuid = resolved!.thisSystemComponentUuid;
    if (!componentUuid) {
      try {
        const body: SystemComponent = {
          uuid: newUuid(),
          type: THIS_SYSTEM,
          title: t.sspTitle,
          description: `The entire ${t.sspTitle} system, represented as a single exportable component.`,
          purpose:
            'Anchors capabilities this system shares with downstream systems.',
          status: { state: 'operational' },
        };
        await axiosInstance.post(
          `${oscalBase(t.sspId)}/system-implementation/components`,
          body,
          oscalConfig,
        );
        componentUuid = body.uuid;
        resolved!.thisSystemComponentUuid = componentUuid;
      } catch (error) {
        await fail('component', error);
      }
    }

    // B. The by-component attaching that component to the statement. It must copy the
    // statement's uniform implementation status: the Controls page only shows a status chip
    // (and the Export button) when every by-component agrees, so an attach without a status
    // would erase both.
    try {
      const body: ByComponent = {
        uuid: newUuid(),
        componentUuid: componentUuid!,
        description: `Implemented by ${t.sspTitle}.`,
        ...(resolved!.uniformState
          ? { implementationStatus: { state: resolved!.uniformState } }
          : {}),
      };
      const response = await axiosInstance.post<DataResponse<ByComponent>>(
        statementByComponentsUrl(t),
        body,
        oscalConfig,
      );
      const anchor = response.data.data ?? body;
      resolved!.anchor = anchor;
      return anchor;
    } catch (error) {
      return fail('attach', error);
    }
  }

  async function ensureExport(
    t: StatementExportTarget,
    anchor: ByComponent,
  ): Promise<ByComponentExport> {
    if (anchor.export) return anchor.export;
    const exportUrl = `${statementByComponentsUrl(t)}/${anchor.uuid}/export`;
    try {
      const response = await axiosInstance.post<
        DataResponse<ByComponentExport>
      >(exportUrl, { description: '', remarks: '' }, oscalConfig);
      anchor.export = {
        ...response.data.data,
        provided: response.data.data.provided ?? [],
        responsibilities: response.data.data.responsibilities ?? [],
      };
      return anchor.export;
    } catch (error) {
      // A 409 means the export already exists (e.g. created out-of-band since load) —
      // refetch instead of failing.
      if ((error as AxiosError).response?.status === 409) {
        const listResponse = await axiosInstance.get<
          DataResponse<ByComponent[]>
        >(statementByComponentsUrl(t));
        const fresh = (listResponse.data.data ?? []).find(
          (bc) => bc.uuid === anchor.uuid,
        );
        if (fresh?.export) {
          anchor.export = fresh.export;
          return anchor.export;
        }
      }
      return fail('export', error);
    }
  }

  async function save(draft: StatementExportDraft): Promise<boolean> {
    const t = target();
    if (!resolved) {
      stepError.value = {
        step: 'load',
        message: 'The dialog state was not loaded. Close and reopen it.',
      };
      return false;
    }
    saving.value = true;
    stepError.value = null;
    try {
      const anchor = await ensureAnchor(t);
      const exported = await ensureExport(t, anchor);

      const byComponentUrl = `${statementByComponentsUrl(t)}/${anchor.uuid}`;
      const providedUrl = `${byComponentUrl}/export/provided`;
      const responsibilitiesUrl = `${byComponentUrl}/export/responsibilities`;

      const existingProvided = exported.provided ?? [];
      const existingResponsibilities = exported.responsibilities ?? [];

      // The user's blocks, or — when they defined none — the auto full-scope block. When a
      // provided entry already exists, its uuid is reused (with the description reset to
      // the full-scope text) rather than deleted and recreated: offering items and any
      // downstream inherited entries point at that uuid.
      //
      // Draft entries are used by reference, not copied: a POSTed entry gets its uuid
      // written back, so a Retry after a partial failure updates instead of duplicating.
      const effectiveProvided: ProvidedDraft[] = draft.provided.length
        ? draft.provided
        : [
            {
              uuid: existingProvided[0]?.uuid,
              description: fullScopeProvidedDescription(t.sspTitle),
            },
          ];

      const keptProvidedUuids = new Set(
        effectiveProvided.map((p) => p.uuid).filter(Boolean),
      );
      const keptResponsibilityUuids = new Set(
        draft.responsibilities.map((r) => r.uuid).filter(Boolean),
      );
      const removedProvided = existingProvided.filter(
        (p) => !keptProvidedUuids.has(p.uuid),
      );
      const removedResponsibilities = existingResponsibilities.filter(
        (r) => !keptResponsibilityUuids.has(r.uuid),
      );

      // Responsibilities removed first — they reference provided entries. The cached
      // export subtree is kept in sync after every mutation so a Retry sees the truth.
      try {
        for (const entry of removedResponsibilities) {
          await axiosInstance.delete(`${responsibilitiesUrl}/${entry.uuid}`);
          exported.responsibilities = (exported.responsibilities ?? []).filter(
            (r) => r.uuid !== entry.uuid,
          );
        }
      } catch (error) {
        await fail('responsibilities', error);
      }

      // Offering items pointing at provided entries about to be removed go next: an item
      // whose provided no longer exists is a dangling catalog row.
      if (resolved.offering && removedProvided.length) {
        try {
          const removedUuids = new Set(removedProvided.map((p) => p.uuid));
          for (const item of resolved.offering.items ?? []) {
            if (removedUuids.has(item.providedUuid)) {
              await axiosInstance.delete(
                `${oscalBase(t.sspId)}/export-offerings/${resolved.offering.id}/items/${item.id}`,
              );
            }
          }
          resolved.offering.items = (resolved.offering.items ?? []).filter(
            (item) => !removedUuids.has(item.providedUuid),
          );
        } catch (error) {
          await fail('offering', error);
        }
      }

      // Provided: delete removed, update changed, create new.
      try {
        for (const entry of removedProvided) {
          await axiosInstance.delete(`${providedUrl}/${entry.uuid}`);
          exported.provided = (exported.provided ?? []).filter(
            (p) => p.uuid !== entry.uuid,
          );
        }
        for (const entry of effectiveProvided) {
          if (entry.uuid) {
            const original = (exported.provided ?? []).find(
              (p) => p.uuid === entry.uuid,
            );
            if (original && original.description !== entry.description) {
              await axiosInstance.put(
                `${providedUrl}/${entry.uuid}`,
                { uuid: entry.uuid, description: entry.description },
                oscalConfig,
              );
              original.description = entry.description;
            }
          } else {
            const body = { uuid: newUuid(), description: entry.description };
            await axiosInstance.post(providedUrl, body, oscalConfig);
            entry.uuid = body.uuid;
            exported.provided = [...(exported.provided ?? []), body];
          }
        }
      } catch (error) {
        await fail('provided', error);
      }

      // Responsibilities: every entry is linked to a provided block. With a single
      // (possibly auto-created) block the link is implicit; with several, providedIndex
      // says which one.
      try {
        for (const entry of draft.responsibilities) {
          const linked =
            effectiveProvided[
              Math.min(
                Math.max(entry.providedIndex, 0),
                effectiveProvided.length - 1,
              )
            ];
          const providedUuid = linked.uuid!;
          if (entry.uuid) {
            const original = (exported.responsibilities ?? []).find(
              (r) => r.uuid === entry.uuid,
            );
            if (
              original &&
              (original.description !== entry.description ||
                original.providedUuid !== providedUuid)
            ) {
              await axiosInstance.put(
                `${responsibilitiesUrl}/${entry.uuid}`,
                {
                  uuid: entry.uuid,
                  description: entry.description,
                  providedUuid,
                },
                oscalConfig,
              );
              original.description = entry.description;
              original.providedUuid = providedUuid;
            }
          } else {
            const body = {
              uuid: newUuid(),
              description: entry.description,
              providedUuid,
            };
            await axiosInstance.post(responsibilitiesUrl, body, oscalConfig);
            entry.uuid = body.uuid;
            exported.responsibilities = [
              ...(exported.responsibilities ?? []),
              body,
            ];
          }
        }
      } catch (error) {
        await fail('responsibilities', error);
      }

      // F. The default offering (camelCase endpoints from here on — no decamelizeKeys).
      try {
        if (!resolved.offering) {
          const response = await axiosInstance.post<
            DataResponse<SSPExportOffering>
          >(`${oscalBase(t.sspId)}/export-offerings`, {
            title: defaultOfferingTitle(t.sspTitle),
            description: DEFAULT_OFFERING_DESCRIPTION,
          });
          resolved.offering = { ...response.data.data, items: [] };
        }

        // G. One item per provided block. The API has no server-side dedupe on
        // (offering, provided) — this client-side check is the idempotency guard.
        const itemProvidedUuids = new Set(
          (resolved.offering.items ?? []).map((item) => item.providedUuid),
        );
        for (const entry of effectiveProvided) {
          if (!itemProvidedUuids.has(entry.uuid!)) {
            const response = await axiosInstance.post<
              DataResponse<SSPExportOfferingItem>
            >(
              `${oscalBase(t.sspId)}/export-offerings/${resolved.offering.id}/items`,
              {
                controlId: t.controlId,
                statementId: resolved.statement.statementId,
                componentUuid: anchor.componentUuid,
                providedUuid: entry.uuid,
              },
            );
            // Kept in sync so a Retry after a later-step failure doesn't re-add the item.
            resolved.offering.items = [
              ...(resolved.offering.items ?? []),
              response.data.data,
            ];
          }
        }
      } catch (error) {
        await fail('offering', error);
      }

      // H. Visibility. Empty selection = any downstream may import (delete every row).
      try {
        const allowedUrl = `${oscalBase(t.sspId)}/export-offerings/${resolved.offering!.id}/allowed-downstreams`;
        const current = new Set(resolved.allowed.map((a) => a.downstreamSspId));
        const desired = new Set(draft.allowedSspIds);
        for (const id of desired) {
          if (!current.has(id)) {
            await axiosInstance.post(allowedUrl, { downstreamSspId: id });
          }
        }
        for (const id of current) {
          if (!desired.has(id)) {
            await axiosInstance.delete(`${allowedUrl}/${id}`);
          }
        }
      } catch (error) {
        await fail('visibility', error);
      }

      // I. Publish — idempotent for draft and published offerings; only bumps the version
      // when the content hash actually changed.
      try {
        await axiosInstance.post(
          `${oscalBase(t.sspId)}/export-offerings/${resolved.offering!.id}/publish`,
        );
      } catch (error) {
        await fail('publish', error);
      }

      return true;
    } catch {
      // stepError is already set by fail(); the chain is idempotent, so the dialog's Retry
      // simply calls save() again and completed steps fall through their ensure-checks.
      return false;
    } finally {
      saving.value = false;
    }
  }

  return { state, loading, saving, stepError, load, save };
}

// Plain-language description per failed step — the dialog shows this next to Retry.
export function stepErrorCopy(error: StatementExportStepError): string {
  switch (error.step) {
    case 'load':
      return (
        error.message ||
        'Could not load what this system currently shares for this statement.'
      );
    case 'component':
    case 'attach':
      return 'Could not set up the system record that anchors sharing.';
    case 'export':
    case 'provided':
      return 'Could not save what this system provides.';
    case 'responsibilities':
      return 'Could not save the consumer responsibilities.';
    case 'offering':
    case 'publish':
      return 'Saved, but could not make it available to other systems yet.';
    case 'visibility':
      return 'Saved, but could not update who can import it.';
  }
}
