import { computed, type Ref } from 'vue';
import type { ControlImplementation, SystemImplementation } from '@/oscal';

export interface OfferableCapability {
  controlId: string;
  statementId?: string;
  componentUuid: string;
  componentTitle: string;
  providedUuid: string;
  providedDescription: string;
}

// Flattens an SSP's authored control-implementation tree (BCH-1343) into the set of
// (control, optional statement, component, provided) tuples an export offering can pick
// from. There's no dedicated "what can I offer" endpoint — this is exactly the
// Export/Provided data the by-component editor authors, read back and joined against
// component titles.
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

  const capabilities = computed<OfferableCapability[]>(() => {
    const result: OfferableCapability[] = [];
    const requirements =
      controlImplementation.value?.implementedRequirements ?? [];

    for (const requirement of requirements) {
      for (const byComponent of requirement.byComponents ?? []) {
        for (const provided of byComponent.export?.provided ?? []) {
          result.push({
            controlId: requirement.controlId,
            componentUuid: byComponent.componentUuid,
            componentTitle:
              componentTitleByUuid.value.get(byComponent.componentUuid) ??
              byComponent.componentUuid,
            providedUuid: provided.uuid,
            providedDescription: provided.description || provided.uuid,
          });
        }
      }

      for (const statement of requirement.statements ?? []) {
        for (const byComponent of statement.byComponents ?? []) {
          for (const provided of byComponent.export?.provided ?? []) {
            result.push({
              controlId: requirement.controlId,
              statementId: statement.statementId,
              componentUuid: byComponent.componentUuid,
              componentTitle:
                componentTitleByUuid.value.get(byComponent.componentUuid) ??
                byComponent.componentUuid,
              providedUuid: provided.uuid,
              providedDescription: provided.description || provided.uuid,
            });
          }
        }
      }
    }

    return result;
  });

  return { capabilities };
}
