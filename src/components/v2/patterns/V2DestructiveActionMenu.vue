<script setup lang="ts">
import { computed, ref } from 'vue';
import { useConfirm } from 'primevue/useconfirm';
import type { MenuItem } from 'primevue/menuitem';
import Menu from '@/volt/Menu.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';

type MenuAction = {
  id: string;
  label: string;
};

const props = withDefaults(
  defineProps<{
    actions?: MenuAction[];
    destructiveLabel?: string;
    confirmHeader?: string;
    confirmMessage?: string;
    confirmAcceptLabel?: string;
    confirmRejectLabel?: string;
    disabled?: boolean;
  }>(),
  {
    actions: () => [],
    destructiveLabel: 'Delete',
    confirmHeader: 'Confirm destructive action',
    confirmMessage: 'This action cannot be undone.',
    confirmAcceptLabel: 'Delete',
    confirmRejectLabel: 'Cancel',
    disabled: false,
  },
);

const emit = defineEmits<{
  (event: 'action', actionId: string): void;
  (event: 'confirmDestructive'): void;
}>();

const confirm = useConfirm();
const menuRef = ref<InstanceType<typeof Menu> | null>(null);

function toggleMenu(event: Event) {
  menuRef.value?.toggle(event);
}

function confirmDestructive() {
  confirm.require({
    header: props.confirmHeader,
    message: props.confirmMessage,
    acceptLabel: props.confirmAcceptLabel,
    rejectLabel: props.confirmRejectLabel,
    acceptProps: {
      severity: 'danger',
      label: props.confirmAcceptLabel,
    },
    rejectProps: {
      label: props.confirmRejectLabel,
    },
    accept: () => emit('confirmDestructive'),
  });
}

const menuItems = computed(() => {
  const safeItems: MenuItem[] = props.actions.map((action) => ({
    label: action.label,
    command: () => emit('action', action.id),
  }));

  const items: MenuItem[] = [...safeItems];

  if (safeItems.length > 0) {
    items.push({ separator: true });
  }

  items.push({
    label: props.destructiveLabel,
    command: confirmDestructive,
    class: 'text-[var(--ui-v2-error)]',
  });

  return items;
});
</script>

<template>
  <div class="flex items-center gap-2">
    <slot name="primary" />
    <SecondaryButton
      type="button"
      size="small"
      :disabled="props.disabled"
      @click="toggleMenu"
    >
      Actions
    </SecondaryButton>
    <Menu ref="menuRef" :model="menuItems" popup />
  </div>
</template>
