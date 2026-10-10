import { computed, type Ref } from 'vue';
import type {
  ByComponent,
  ControlImplementation,
  SystemImplementation,
} from '@/oscal';

export interface OfferableCapability {
  controlId: string;
  statementId?: string;
  componentUuid: string;
  componentTitle: string;
  providedUuid: string;
  providedDescription: string;
  // A capability authored on a requirement rather than a statement. The API rejects an
  // offering item without a statementId, so these can never be offered — they are still
  // listed, disabled, so an author can see *why* and move the export to a statement.
  legacy: boolean;
}

// Appends one OfferableCapability per provided entry across a set of by-components — shared
// by the requirement-level and statement-level walks below, which differ only in whether a
// statementId is set (and therefore whether the capability is offerable at all).
function appendCapabilities(
  byComponents: ByComponent[] | undefined,
  controlId: string,
  statementId: string | undefined,
  componentTitleByUuid: Map<string, string>,
  result: OfferableCapability[],
) {
  for (const byComponent of byComponents ?? []) {
    for (const provided of byComponent.export?.provided ?? []) {
      result.push({
        controlId,
        statementId,
        componentUuid: byComponent.componentUuid,
        componentTitle:
          componentTitleByUuid.get(byComponent.componentUuid) ??
          byComponent.componentUuid,
        providedUuid: provided.uuid,
        providedDescription: provided.description || provided.uuid,
        legacy: !statementId,
      });
    }
  }
}

// Flattens an SSP's authored control-implementation tree (BCH-1343) into the set of
// (control, statement, component, provided) tuples an export offering can pick from. There's
// no dedicated "what can I offer" endpoint — this is exactly the Export/Provided data the
// by-component editor authors, read back and joined against component titles.
//
// A statement is the anchor: `capabilities` is what may actually be offered, and
// `legacyCapabilities` is the requirement-anchored remainder, surfaced only so it can be
// shown disabled.
export function useOfferableCapabilities(
  controlImplementation: Ref<ControlImplementation | undefined>,
  systemImplementation: Ref<SystemImplementation | undefined>,
) {
  const componentTitleByUuid = computed(() => {
    const map = new Map<string, string>();
    for (const component of systemImplementation.value?.components ?? []) {
      map.set(component.uuid, component.title);
    }
    return map;
  });

  const allCapabilities = computed<OfferableCapability[]>(() => {
    const result: OfferableCapability[] = [];
    const requirements =
      controlImplementation.value?.implementedRequirements ?? [];

    for (const requirement of requirements) {
      appendCapabilities(
        requirement.byComponents,
        requirement.controlId,
        undefined,
        componentTitleByUuid.value,
        result,
      );

      for (const statement of requirement.statements ?? []) {
        appendCapabilities(
          statement.byComponents,
          requirement.controlId,
          statement.statementId,
          componentTitleByUuid.value,
          result,
        );
      }
    }

    return result;
  });

  const capabilities = computed(() =>
    allCapabilities.value.filter((capability) => !capability.legacy),
  );

  const legacyCapabilities = computed(() =>
    allCapabilities.value.filter((capability) => capability.legacy),
  );

  return { capabilities, legacyCapabilities, allCapabilities };
}
