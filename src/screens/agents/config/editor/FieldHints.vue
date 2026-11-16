<script setup lang="ts">
// Hints beside an editor's field: the preview's shield (needs apply_all, or forbidden), whether
// the instances' files differ, and Reset to the file value.
import { computed } from 'vue';
import IconButton from '@/ds/components/IconButton/IconButton.vue';
import InfoTip from '@/ds/components/InfoTip/InfoTip.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import { TOOLTIPS } from '@/config/tooltips';
import { useEditor } from './useEditor';

const RESET_TOOLTIP = TOOLTIPS['agents.config.field.resetToFile'];

const props = defineProps<{
  ptr: string;
  disabled?: boolean;
  hideReset?: boolean;
}>();
defineEmits<{ reset: [] }>();

const { has, shield, differsAcrossInstances } = useEditor();
const shieldInfo = computed(() => shield(props.ptr));
const differs = computed(() => differsAcrossInstances(props.ptr));
const showReset = computed(() => !props.hideReset && has(props.ptr));
</script>

<template>
  <Cluster gap="1" as="span">
    <InfoTip
      v-if="shieldInfo"
      :icon="shieldInfo.level === 'forbidden' ? 'forbidden' : 'warning'"
      :tone="shieldInfo.level === 'forbidden' ? 'error' : 'warning'"
      :text="shieldInfo.tooltip"
      :data-test="`shield-${ptr}`"
    />
    <Text
      v-if="differs"
      as="span"
      variant="caption"
      :data-test="`differs-${ptr}`"
      >Differs across instances</Text
    >
    <IconButton
      v-if="showReset"
      icon="undo"
      size="sm"
      :label="`${RESET_TOOLTIP}: ${ptr}`"
      :disabled-reason="
        disabled ? 'The configuration can\'t be edited now.' : undefined
      "
      :data-test="`reset-${ptr}`"
      @click="$emit('reset')"
    />
  </Cluster>
</template>
