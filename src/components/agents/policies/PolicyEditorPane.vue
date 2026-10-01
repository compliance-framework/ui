<template>
  <section class="flex min-h-0 flex-col gap-2" data-test="editor-pane">
    <header class="flex flex-wrap items-center gap-2">
      <h3 class="font-mono text-sm font-semibold break-all">
        {{ bundle }}/{{ path }}
      </h3>
      <ConfigPill
        v-if="mode === 'view'"
        severity="secondary"
        data-test="read-only"
        >vendor source · read-only</ConfigPill
      >
      <ConfigPill v-else-if="readonly" severity="secondary"
        >read-only</ConfigPill
      >
      <span class="flex-1" />
      <SecondaryButton
        v-if="mode === 'view' && canOverride"
        size="small"
        data-test="override-from-view"
        @click="$emit('override')"
      >
        Override this file
      </SecondaryButton>
    </header>

    <p
      v-if="stream"
      class="text-xs text-gray-500 dark:text-slate-400"
      data-test="stream-identity"
    >
      Evidence stream:
      <span class="font-medium" :data-stream="stream.kind">{{
        STREAM_LABELS[stream.kind]
      }}</span>
      <template v-if="stream.policyId">
        ·
        <code class="font-mono break-all">{{ stream.policyId }}</code></template
      >
      <template v-else-if="stream.automaticId">
        · the agent adds
        <code class="font-mono break-all" data-test="stream-automatic-id"
          >policy_id := {{ JSON.stringify(stream.automaticId) }}</code
        ></template
      >
    </p>
    <Message v-if="stream?.fork" severity="warn" data-test="stream-fork">
      <span class="text-sm">{{
        forkMessage(stream.fork, stream.policyId)
      }}</span>
    </Message>

    <Message
      v-if="vendorTests.length && mode === 'edit' && !readonly"
      severity="warn"
      data-test="vendor-tests-offer"
    >
      <div class="space-y-2 text-sm">
        <p>
          Vendor tests cover this package:
          <code class="font-mono">{{ vendorTests.join(', ') }}</code
          >. If your override removes or renames a rule they reference, the
          bundle no longer compiles and the revision is rejected.
          {{ VENDOR_TEST_TOOLTIP }}
        </p>
        <SecondaryButton
          size="small"
          data-test="delete-vendor-tests"
          @click="$emit('delete-tests', vendorTests)"
        >
          Also delete
          {{
            vendorTests.length === 1 ? 'this vendor test' : 'these vendor tests'
          }}
        </SecondaryButton>
      </div>
    </Message>

    <p
      v-if="loading"
      class="text-sm text-gray-500 dark:text-slate-400"
      data-test="source-loading"
    >
      <i class="pi pi-spin pi-spinner mr-1" />Loading the vendor source…
    </p>
    <Message v-else-if="error" severity="warn" data-test="source-error">
      {{ error }}
    </Message>
    <p
      v-else-if="text === null && mode === 'edit'"
      class="rounded-md border border-dashed border-ccf-300 p-4 text-sm text-gray-500 dark:border-slate-700 dark:text-slate-400"
      data-test="no-module-text"
    >
      The draft has no module text for this file (it is inherited, deleted or
      restored). Use View or Override in the file list.
    </p>
    <RegoModuleEditor
      v-else-if="text !== null"
      :key="`${bundle}/${path}/${mode}`"
      :bundle="bundle"
      :path="path"
      :model-value="text"
      :diagnostics="mode === 'view' ? [] : diagnostics"
      :readonly="readonly || mode === 'view'"
      min-height="calc(100vh - 26rem)"
      max-height="calc(100vh - 20rem)"
      @update:model-value="$emit('update', $event)"
    />
  </section>
</template>

<script setup lang="ts">
// Right column of the Policies view (R68): a full-height CodeMirror editor for one module
// (contract + lint markers, R63), or the read-only vendor source (View, R64).
import Message from '@/volt/Message.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import type { PolicyError } from '@/types/agent-config';
import ConfigPill from '../config/ConfigPill.vue';
import RegoModuleEditor from '../config/editor/RegoModuleEditor.vue';
import { VENDOR_TEST_TOOLTIP } from '../config/constants';
import {
  STREAM_LABELS,
  forkMessage,
  type StreamIdentity,
} from '@/utils/agent-config/policy-identity';

defineProps<{
  bundle: string;
  path: string;
  mode: 'edit' | 'view';
  text: string | null;
  loading?: boolean;
  error?: string | null;
  diagnostics: PolicyError[];
  readonly?: boolean;
  /** Vendor tests of the overridden package still inherited (R64 offer). */
  vendorTests: string[];
  /** View mode on an inherited vendor file the user may override. */
  canOverride?: boolean;
  /** R78/R82: the module's evidence stream (policy modules of a bundle). */
  stream?: StreamIdentity | null;
}>();
defineEmits<{
  update: [text: string];
  'delete-tests': [paths: string[]];
  override: [];
}>();
</script>
