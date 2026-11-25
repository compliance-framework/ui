import { computed, ref, watch, type Ref } from 'vue';
import type { ControlImplementation } from '@/oscal';
import { useAuthenticatedInstance } from '@/composables/axios';
import { useLeveragedControls } from '@/composables/useLeveragedControls';
import type {
  LeveragedControl,
  ResponsibilityPostureValue,
  SSPLeverageStatus,
} from '@/types/ssp-leverage';

/** One responsibility an upstream system leaves to this one, for an inherited implementation. */
export interface InheritedResponsibility {
  uuid: string;
  description: string;
  /** This system has said how it meets it (a satisfied entry). */
  met: boolean;
  /** What the responsibility's evidence filters say. */
  evidence: ResponsibilityPostureValue;
}

/**
 * The part of a control's implementation this system inherits from an upstream system: the
 * offering it subscribes to, the link's standing, what the upstream system provides and what it
 * leaves to this system.
 */
export interface InheritedImplementation {
  upstreamSspId: string;
  offeringTitle: string;
  offeringVersion: number;
  status: SSPLeverageStatus;
  /** What the upstream system provides, from its own implementation; missing until fetched. */
  provided?: string;
  responsibilities: InheritedResponsibility[];
}

/** Every provided capability in an implementation, by UUID. */
function providedTexts(implementation: ControlImplementation | undefined) {
  const texts = new Map<string, string>();
  for (const requirement of implementation?.implementedRequirements ?? [])
    for (const bc of [
      ...(requirement.byComponents ?? []),
      ...(requirement.statements ?? []).flatMap((s) => s.byComponents ?? []),
    ])
      for (const provided of bc.export?.provided ?? [])
        texts.set(provided.uuid, provided.description);
  return texts;
}

export function inheritedImplementation(
  link: LeveragedControl,
  provided: string | undefined,
): InheritedImplementation {
  const outstanding = new Set(
    link.outstandingResponsibilities.map((r) => r.responsibilityUuid),
  );
  return {
    upstreamSspId: link.inheritedFrom.upstreamSspId,
    offeringTitle: link.inheritedFrom.offeringTitle,
    offeringVersion: link.inheritedFrom.offeringVersion,
    status: link.status,
    provided,
    responsibilities: (
      link.responsibilities ?? link.outstandingResponsibilities
    ).map((r) => ({
      uuid: r.responsibilityUuid,
      description: r.description,
      met: !outstanding.has(r.responsibilityUuid),
      evidence: link.responsibilityPosture[r.responsibilityUuid] ?? 'unknown',
    })),
  };
}

/**
 * The plan's inherited implementations, looked up by the component implementation (by-component)
 * that carries each one. The leverage links come from `leveraged-controls`; what each upstream
 * system provides comes from that system's own implementation, fetched once per upstream system.
 * An upstream system this user can't read just leaves `provided` empty.
 */
export function useInheritedImplementations(sspId: Ref<string | undefined>) {
  const api = useAuthenticatedInstance();
  const { controls, refresh } = useLeveragedControls(sspId);
  const provided = ref(new Map<string, string>());
  const fetchedUpstream = new Set<string>();

  watch(controls, async (links) => {
    const upstream = [
      ...new Set((links ?? []).map((l) => l.inheritedFrom.upstreamSspId)),
    ].filter((id) => !fetchedUpstream.has(id));
    upstream.forEach((id) => fetchedUpstream.add(id));
    const found = await Promise.all(
      upstream.map((id) =>
        api
          .get<{ data: ControlImplementation }>(
            `/api/oscal/system-security-plans/${id}/control-implementation`,
          )
          .then((response) => providedTexts(response.data.data))
          .catch(() => new Map<string, string>()),
      ),
    );
    if (found.some((texts) => texts.size))
      provided.value = new Map([
        ...provided.value,
        ...found.flatMap((texts) => [...texts]),
      ]);
  });

  const byByComponent = computed(() => {
    const map = new Map<string, InheritedImplementation>();
    for (const link of controls.value ?? [])
      if (link.byComponentId)
        map.set(
          link.byComponentId,
          inheritedImplementation(link, provided.value.get(link.providedUuid)),
        );
    return map;
  });

  return {
    inherited: (byComponentUuid: string) =>
      byByComponent.value.get(byComponentUuid),
    refresh,
  };
}
