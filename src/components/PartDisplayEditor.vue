<template>
  <div class="mb-2">
    <slot name="header"></slot>

    <div class="prose prose-slate dark:prose-invert">
      <VueMarkdown :source="text" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { type Part } from '@/stores/types.ts';
import VueMarkdown from 'vue-markdown-render';

import { onMounted, ref } from 'vue';

const props = defineProps<{
  part: Part;
}>();

const text = ref<string>('');

onMounted(() => {
  text.value = renderPart(props.part);
});

function getLabel(part: Part): string {
  if (part.props) {
    for (const prop of part.props) {
      if (prop.name === 'label') {
        return prop.value ?? '';
      }
    }
  }
  return '';
}

function renderPart(_part: Part, depth: number = 0) {
  const label = getLabel(_part);

  let text = '';
  if (_part.parts) {
    for (const child of _part.parts) {
      if (child.prose || getLabel(child)) {
        text += renderPart(child, depth + 1);
      } else {
        text += renderPart(child, depth);
      }
    }
  }

  if (!label && !_part.prose) {
    return text;
  }

  return (
    '  '.repeat(depth) +
    `${label ? label + ' ' : ''}${_part.prose ?? ''}\n` +
    text
  );
}
</script>
