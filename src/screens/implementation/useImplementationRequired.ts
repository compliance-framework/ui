import { ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import type { ImplementedRequirement } from '@/oscal';
import { decamelizeKeys, useAuthenticatedInstance } from '@/composables/axios';
import { getErrorDetail } from '@/utils/httpErrors';
import { useToast } from '@/ds/toasts';
import { withImplementationRequired, type PartBand } from './controlParts';
import { useControlTree } from './controlTree';

/**
 * Marks a part of a control as needing an implementation statement of its own or not, on the
 * part's statement in the plan, creating the control's implementation and the part's statement
 * when there are none yet. Must be called in a component under the control tree.
 */
export function useImplementationRequired() {
  const tree = useControlTree();
  const api = useAuthenticatedInstance();
  const toast = useToast();
  const saving = ref(false);

  async function setRequired(
    controlId: string,
    band: PartBand,
    required: boolean,
  ): Promise<void> {
    const base = `/api/oscal/system-security-plans/${tree.sspId()}/control-implementation/implemented-requirements`;
    const send = { transformRequest: [decamelizeKeys] };
    saving.value = true;
    try {
      let requirement = tree.implementation(controlId);
      if (!requirement) {
        const created = await api.post<{ data: ImplementedRequirement }>(
          base,
          { uuid: uuidv4(), controlId },
          send,
        );
        requirement = created.data.data;
      }
      const props = withImplementationRequired(band.statement?.props, required);
      if (band.statement) {
        await api.put(
          `${base}/${requirement.uuid}/statements/${band.statement.uuid}`,
          { ...band.statement, props },
          send,
        );
      } else {
        await api.post(
          `${base}/${requirement.uuid}/statements`,
          { uuid: uuidv4(), statementId: band.id, props },
          send,
        );
      }
      await tree.reload();
      toast.add({
        severity: 'success',
        summary: required
          ? `${band.id} requires implementation`
          : `${band.id} does not require implementation`,
      });
    } catch (error) {
      await tree.reload().catch(() => undefined);
      toast.add({
        severity: 'error',
        summary: "The part wasn't changed",
        detail: await getErrorDetail(error, 'Try again.'),
      });
    } finally {
      saving.value = false;
    }
  }

  return { setRequired, saving };
}
