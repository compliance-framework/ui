import { useDeleteConfirmationDialog } from '@/utils/delete-dialog';
import { useToast } from 'primevue/usetoast';
import { useDataApi } from '@/composables/axios';
import type { AxiosRequestConfig } from 'axios';

export function useCatalogDelete() {
  const toast = useToast();
  const { confirmDeleteDialog } = useDeleteConfirmationDialog();
  const { execute: del } = useDataApi<void>(
    '/api/oscal/catalogs',
    {},
    { immediate: false },
  );

  async function deleteCatalog(
    uuid: string,
    title: string,
    onSuccess?: () => void,
    requestConfig?: AxiosRequestConfig,
  ) {
    await confirmDeleteDialog(
      async () => {
        try {
          await del(`/api/oscal/catalogs/${uuid}`, {
            method: 'DELETE',
            ...(requestConfig || {}),
          });
          toast.add({
            severity: 'success',
            summary: 'Catalog deleted',
            detail: `Catalog "${title}" deleted successfully`,
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
                : 'Failed to delete catalog.',
            life: 3000,
          });
        }
      },
      { itemName: title, itemType: 'catalog' },
    );
  }

  return { deleteCatalog };
}
