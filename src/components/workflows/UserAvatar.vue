<template>
  <div
    class="rounded-full flex items-center justify-center font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 flex-shrink-0"
    :class="sizeClasses"
    :title="user.displayName"
  >
    {{ initials }}
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  user: {
    displayName: string;
    fallbackInitials?: string;
  };
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
});

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'xs':
      return 'w-4 h-4 text-[9px] leading-none';
    case 'sm':
      return 'w-6 h-6 text-xs';
    case 'lg':
      return 'w-10 h-10 text-base';
    case 'md':
    default:
      return 'w-8 h-8 text-sm';
  }
});

const initials = computed(() => {
  if (
    props.user.fallbackInitials &&
    (!props.user.displayName || props.user.displayName === '?')
  )
    return props.user.fallbackInitials;
  const name = props.user.displayName || '?';
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
});
</script>
