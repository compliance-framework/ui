import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';

export type DeleteConfirmationOptions = {
  itemName?: string;
  itemType?: string;
};

export function useDeleteConfirmationDialog() {
  const toast = useToast();
  const confirm = useConfirm();
  const confirmDeleteDialog = (
    deleteFunction: () => Promise<void>,
    opts: DeleteConfirmationOptions = {},
  ) => {
    let deleteConfirmMessage = 'Are you sure want to delete this resource?';
    if (opts.itemName && opts.itemType) {
      deleteConfirmMessage = `Are you sure want to delete ${opts.itemType} "${opts.itemName}"?`;
    } else if (opts.itemType) {
      deleteConfirmMessage = `Are you sure want to delete this ${opts.itemType}?`;
    } else if (opts.itemName) {
      deleteConfirmMessage = `Are you sure want to delete resource "${opts.itemName}"?`;
    }

    deleteConfirmMessage += ' This action cannot be undone.';

    confirm.require({
      message: deleteConfirmMessage,
      header: 'Confirm Deletion',
      rejectProps: {
        label: 'Cancel',
        severity: 'secondary',
        outlined: true,
      },
      acceptProps: {
        label: 'Confirm',
      },
      accept: async () => {
        await deleteFunction();
      },
      reject: () => {
        toast.add({
          severity: 'info',
          summary: 'Cancelled',
          detail: 'Inventory item deletion cancelled',
          life: 3000,
        });
      },
    });
  };
  return { confirmDeleteDialog };
}
