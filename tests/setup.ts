import { vi } from 'vitest';

vi.mock('primevue/usetoast', () => {
  return {
    useToast: () => ({ add: vi.fn() }),
  };
});

vi.mock('primevue/useconfirm', () => {
  return {
    useConfirm: () => ({ require: vi.fn() }),
  };
});

vi.mock('@/utils/delete-dialog', () => {
  return {
    useDeleteConfirmationDialog: () => ({ confirmDeleteDialog: vi.fn() }),
  };
});
