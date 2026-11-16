<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { AgentInstanceSummary } from '@/types/agent-config';
import type { InstanceUiState } from '@/utils/agent-config/instance-status';
import InstanceStatusChip from './InstanceStatusChip.vue';
import Button from '@/ds/components/Button/Button.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import ToggleChip from '@/ds/components/ToggleChip/ToggleChip.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';

/** Instances per picker page (the API's page size). */
const PICKER_PAGE_SIZE = 25;

const props = defineProps<{
  instances: AgentInstanceSummary[];
  states: InstanceUiState[];
  selectedId: string | null;
}>();

defineEmits<{ select: [id: string] }>();

const items = computed(() =>
  props.instances.map((inst, i) => ({ inst, state: props.states[i] })),
);
// Staleness is the API's flag (R14); stale instances are collapsed.
const freshItems = computed(() => items.value.filter((i) => !i.inst.stale));
const staleItems = computed(() => items.value.filter((i) => i.inst.stale));
const showStale = ref(false);
/** Fresh instances, then the stale ones when shown; rendered a page at a time. */
const shown = computed(() =>
  showStale.value
    ? [...freshItems.value, ...staleItems.value]
    : freshItems.value,
);
const page = ref(0);
const pageCount = computed(() =>
  Math.max(1, Math.ceil(shown.value.length / PICKER_PAGE_SIZE)),
);
const pageItems = computed(() =>
  shown.value.slice(
    page.value * PICKER_PAGE_SIZE,
    (page.value + 1) * PICKER_PAGE_SIZE,
  ),
);
watch(pageCount, (n) => {
  if (page.value > n - 1) page.value = n - 1;
});

// The selected instance is always on the shown page (stale ones expand the list).
watch(
  () => props.selectedId,
  (id) => {
    if (staleItems.value.some((i) => i.inst.instanceId === id))
      showStale.value = true;
    const at = shown.value.findIndex((i) => i.inst.instanceId === id);
    if (at >= 0) page.value = Math.floor(at / PICKER_PAGE_SIZE);
  },
  { immediate: true },
);

function label(inst: AgentInstanceSummary): string {
  return inst.hostname || inst.instanceId.slice(0, 8);
}
</script>

<template>
  <Stack gap="2" data-test="instance-picker">
    <Cluster gap="2">
      <ToggleChip
        v-for="item in pageItems"
        :key="item.inst.instanceId"
        :pressed="item.inst.instanceId === selectedId"
        :muted="item.inst.stale"
        :data-test="`pick-${item.inst.instanceId}`"
        @click="$emit('select', item.inst.instanceId)"
      >
        <Text as="code" variant="code">{{ label(item.inst) }}</Text>
        <Tag v-if="item.inst.stale" label="Stale" />
        <InstanceStatusChip :state="item.state" />
      </ToggleChip>
    </Cluster>
    <Cluster v-if="pageCount > 1" gap="2" data-test="picker-pager">
      <Button
        variant="tertiary"
        size="sm"
        :disabled-reason="page === 0 ? 'This is the first page.' : undefined"
        data-test="picker-prev"
        @click="page--"
        >Previous</Button
      >
      <Text as="span" variant="caption" data-test="picker-range"
        >{{ page * PICKER_PAGE_SIZE + 1 }}–{{
          Math.min((page + 1) * PICKER_PAGE_SIZE, shown.length)
        }}
        of {{ shown.length }}</Text
      >
      <Button
        variant="tertiary"
        size="sm"
        :disabled-reason="
          page >= pageCount - 1 ? 'This is the last page.' : undefined
        "
        data-test="picker-next"
        @click="page++"
        >Next</Button
      >
    </Cluster>
    <Cluster v-if="staleItems.length">
      <Button
        variant="tertiary"
        size="sm"
        :aria-expanded="showStale"
        data-test="toggle-stale"
        @click="showStale = !showStale"
      >
        {{ showStale ? 'Hide' : 'Show' }} {{ staleItems.length }} stale
        instance{{ staleItems.length === 1 ? '' : 's' }}
      </Button>
    </Cluster>
  </Stack>
</template>
