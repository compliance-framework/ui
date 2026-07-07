import { useDeleteConfirmationDialog } from '@/utils/delete-dialog';
import { useToast } from 'primevue/usetoast';
import { useDataApi } from '@/composables/axios';
import type { CatalogLinkSummary, ControlLink } from '@/types/control-links';

// Delete-with-confirmation for control links, mirroring useCatalogDelete. A link
// has no surrogate id, so DELETE identifies it by its full composite key passed
// as query params (all five are required by the API).
export function useControlLinkDelete() {
  const toast = useToast();
  const { confirmDeleteDialog } = useDeleteConfirmationDialog();
  const { execute: del } = useDataApi<void>(
    '/api/control-links',
    {},
    { immediate: false },
  );

  async function deleteControlLink(
    link: ControlLink,
    label: string,
    onSuccess?: () => void,
  ) {
    await confirmDeleteDialog(
      async () => {
        try {
          await del('/api/control-links', {
            method: 'DELETE',
            params: {
              sourceCatalogId: link.sourceCatalogId,
              sourceControlId: link.sourceControlId,
              targetCatalogId: link.targetCatalogId,
              targetControlId: link.targetControlId,
              relationshipType: link.relationshipType,
            },
          });
          toast.add({
            severity: 'success',
            summary: 'Control link deleted',
            detail: `Control link "${label}" deleted successfully`,
            life: 3000,
          });
          onSuccess?.();
        } catch (error) {
          toast.add({
            severity: 'error',
            summary: 'Delete Failed',
            detail:
              error instanceof Error
                ? error.message
                : 'Failed to delete control link.',
            life: 3000,
          });
        }
      },
      { itemName: label, itemType: 'control link' },
    );
  }

  // Delete a whole catalog-level link — every fanned-out control_links row for
  // (source catalog, target control, relationship) — via the /catalog endpoint.
  const { execute: delCatalog } = useDataApi<void>(
    '/api/control-links/catalog',
    {},
    { immediate: false },
  );

  async function deleteCatalogLink(
    summary: CatalogLinkSummary,
    label: string,
    onSuccess?: () => void,
  ) {
    await confirmDeleteDialog(
      async () => {
        try {
          await delCatalog('/api/control-links/catalog', {
            method: 'DELETE',
            params: {
              sourceCatalogId: summary.sourceCatalogId,
              targetCatalogId: summary.targetCatalogId,
              targetControlId: summary.targetControlId,
              relationshipType: summary.relationshipType,
            },
          });
          toast.add({
            severity: 'success',
            summary: 'Catalog link deleted',
            detail: `Removed all ${summary.controlCount} links for "${label}"`,
            life: 3000,
          });
          onSuccess?.();
        } catch (error) {
          toast.add({
            severity: 'error',
            summary: 'Delete Failed',
            detail:
              error instanceof Error
                ? error.message
                : 'Failed to delete catalog link.',
            life: 3000,
          });
        }
      },
      {
        itemName: label,
        itemType: `catalog link (${summary.controlCount} controls)`,
      },
    );
  }

  return { deleteControlLink, deleteCatalogLink };
}
