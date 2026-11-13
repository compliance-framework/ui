<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue';
import Button from '../Button/Button.vue';
import InlineMessage from '../InlineMessage/InlineMessage.vue';
import { useScrollable } from '../ScrollArea/useScrollable';
import { useToast } from 'primevue/usetoast';

/**
 * Read-only code, such as an OSCAL document, with line numbers, Copy and Download (F-30 AC1,
 * F-18 AC1). The code never wraps: the block grows with its content, so the page scrolls, and it
 * scrolls sideways only, inside a labelled region that is focusable while it overflows (DEC-34).
 * Line numbers are aria-hidden and not selectable, so selecting by hand copies only the code.
 * Plain-text lines retain optional rule highlights and focus by stable line number.
 */
const props = withDefaults(
  defineProps<{
    code: string;
    label: string;
    fileName?: string;
    highlightRanges?: { startLine: number; endLine: number }[];
  }>(),
  {
    fileName: undefined,
    highlightRanges: () => [],
  },
);

const toast = useToast();
const fileNameId = useId();
const { scrollable, el: region } = useScrollable('region', 'horizontal');
const copyError = ref('');
const downloadError = ref('');
const focusedLine = ref<number>();
watch(
  () => [props.code, props.fileName],
  () => {
    copyError.value = '';
    downloadError.value = '';
  },
);
const lines = computed(() => props.code.replace(/\n$/, '').split('\n'));
const lineNumbers = computed(() =>
  lines.value.map((_, index) => index + 1).join('\n'),
);

const mimeTypes: Record<string, string> = {
  json: 'application/json',
  xml: 'application/xml',
  yaml: 'application/yaml',
  yml: 'application/yaml',
};

async function copy(): Promise<void> {
  try {
    await navigator.clipboard.writeText(props.code);
    copyError.value = '';
    toast.add({
      severity: 'success',
      summary: 'Copied to the clipboard',
      life: 3000,
    });
  } catch {
    copyError.value =
      'Copying is unavailable. Retry copy or select the text and copy it.';
  }
}
function highlighted(line: number): boolean {
  return props.highlightRanges.some(
    (range) => line >= range.startLine && line <= range.endLine,
  );
}
async function focusLine(line: number): Promise<void> {
  if (!Number.isInteger(line) || line < 1 || line > lines.value.length) return;
  focusedLine.value = line;
  await nextTick();
  const target = region.value?.querySelector<HTMLElement>(
    `[data-line="${line}"]`,
  );
  target?.focus({ preventScroll: true });
  target?.scrollIntoView({
    block: 'center',
    inline: 'nearest',
    behavior: 'instant',
  });
}
defineExpose({ focusLine });

function download(): void {
  if (!props.fileName) return;
  const extension = props.fileName.split('.').pop()?.toLowerCase() ?? '';
  let url: string | undefined;
  try {
    url = URL.createObjectURL(
      new Blob([props.code], { type: mimeTypes[extension] ?? 'text/plain' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = props.fileName;
    link.click();
    downloadError.value = '';
  } catch {
    downloadError.value =
      'Download is unavailable. Retry download or copy the text.';
  } finally {
    if (url) {
      const allocatedUrl = url;
      window.setTimeout(() => URL.revokeObjectURL(allocatedUrl));
    }
  }
}
</script>

<template>
  <div class="code-block">
    <div class="code-block__toolbar">
      <span v-if="fileName" :id="fileNameId" class="code-block__file">{{
        fileName
      }}</span>
      <div class="code-block__actions">
        <Button variant="tertiary" size="sm" icon="copy" @click="copy"
          >Copy</Button
        >
        <Button
          v-if="fileName"
          size="sm"
          icon="download"
          :aria-describedby="fileNameId"
          @click="download"
        >
          Download
        </Button>
      </div>
    </div>
    <InlineMessage v-if="copyError" tone="error" title="Could not copy">
      {{ copyError }}
      <template #actions
        ><Button size="sm" @click="copy">Retry copy</Button></template
      >
    </InlineMessage>
    <InlineMessage v-if="downloadError" tone="error" title="Could not download">
      {{ downloadError }}
      <template #actions
        ><Button size="sm" @click="download">Retry download</Button></template
      >
    </InlineMessage>
    <div
      ref="region"
      class="code-block__region"
      role="region"
      :aria-label="label"
      :tabindex="scrollable ? 0 : undefined"
      :data-scroll="scrollable ? '' : undefined"
    >
      <div class="code-block__body">
        <div class="code-block__gutter" aria-hidden="true">
          {{ lineNumbers }}
        </div>
        <pre
          class="code-block__code"
        ><template v-for="(line, index) in lines" :key="index"><span class="code-block__line" :class="{ 'code-block__line--highlighted': highlighted(index + 1) }" :data-line="index + 1" :role="focusedLine === index + 1 ? 'group' : undefined" :aria-label="focusedLine === index + 1 ? `${label}, line ${index + 1}: ${line}` : undefined" tabindex="-1">{{ line }}</span>{{ index < lines.length - 1 ? '\n' : '' }}</template></pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.code-block {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
  min-width: 0;
}

.code-block__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--ds-space-2) var(--ds-space-4);
}

.code-block__file {
  min-width: 0;
  color: var(--ds-color-text-secondary);
  font-size: var(--ds-font-size-caption);
  line-height: var(--ds-leading-snug);
  overflow-wrap: anywhere;
}

.code-block__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ds-space-2);
  margin-inline-start: auto;
}

.code-block__region {
  min-width: 0;
  overflow-x: auto;
  background: var(--ds-color-surface-sunken);
  border: var(--ds-border-width) solid var(--ds-color-border-subtle);
  border-radius: var(--ds-radius-none);
}

.code-block__region:focus-visible {
  outline-offset: calc(var(--ds-focus-width) * -1);
}

.code-block__body {
  display: flex;
  width: max-content;
  min-width: 100%;
  font-family: var(--ds-font-code);
  font-size: var(--ds-font-size-body);
  line-height: var(--ds-leading-body);
}

.code-block__gutter {
  position: sticky;
  left: 0;
  flex: none;
  padding: var(--ds-space-3);
  background: var(--ds-color-surface-sunken);
  border-inline-end: var(--ds-border-width) solid var(--ds-color-border-subtle);
  color: var(--ds-color-text-secondary);
  text-align: end;
  white-space: pre;
  user-select: none;
}

.code-block__code {
  flex: 1;
  margin: 0;
  padding: var(--ds-space-3) var(--ds-space-4);
  font: inherit;
  white-space: pre;
  tab-size: 2;
}

.code-block__line--highlighted {
  background: var(--ds-color-surface-selected);
  font-weight: var(--ds-font-weight-bold);
}
</style>
