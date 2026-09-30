<template>
  <section class="space-y-3" data-test="policies-section">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h4 class="text-sm font-semibold text-gray-900 dark:text-slate-200">
        Policies
      </h4>
      <div class="flex gap-2">
        <SecondaryButton
          size="small"
          data-test="new-bundle"
          @click="newOpen = true"
        >
          <i class="pi pi-plus mr-1" />New bundle
        </SecondaryButton>
        <SecondaryButton
          size="small"
          data-test="customize-bundle"
          @click="customizeOpen = true"
        >
          Customize a bundle
        </SecondaryButton>
      </div>
    </div>
    <p class="text-xs text-gray-500 dark:text-slate-400">
      {{ CROSS_BUNDLE_HELP }}
    </p>
    <p v-if="!names.length" class="text-sm text-gray-500 dark:text-slate-400">
      No policy bundles.
    </p>
    <PolicyBundleCard
      v-for="n in names"
      :key="n"
      :name="n"
      :ops="ops"
      :diagnostics-for="diagnosticsFor"
      :initially-expanded="n === justCreated"
    />

    <NewBundleDialog
      v-model:visible="newOpen"
      :taken="ops.takenNames.value"
      :plugins="ops.pluginNames.value"
      @create="onCreate"
    />
    <CustomizeBundleDialog
      v-model:visible="customizeOpen"
      :plugins="ops.pluginNames.value"
      :sources-of="ops.nonInlineSources"
      :taken="ops.takenNames.value"
      @customize="onCustomize"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import type { PolicyError } from '@/types/agent-config';
import { getAt } from '@/utils/agent-config/json-pointer';
import { mergePatch } from '@/utils/agent-config/merge-patch';
import { pointer } from '@/utils/agent-config/json-pointer';
import { CROSS_BUNDLE_HELP } from '../constants';
import PolicyBundleCard from './PolicyBundleCard.vue';
import NewBundleDialog from './NewBundleDialog.vue';
import CustomizeBundleDialog from './CustomizeBundleDialog.vue';
import { moduleDiagnostics } from './policyDiagnostics';
import { useBundleOps } from './useBundleOps';
import { useEditor } from './useEditor';

const { draft, ctx } = useEditor();
const ops = useBundleOps();
const newOpen = ref(false);
const customizeOpen = ref(false);
const justCreated = ref<string | null>(null);

const names = computed(() => Object.keys(ops.bundles.value).sort());

const reportInstance = computed(
  () =>
    ctx.instances.value.find(
      (i) => i.instanceId === ctx.placeholderInstanceId.value,
    ) ?? null,
);
const desiredEffective = computed(() =>
  mergePatch(ctx.placeholderBase.value ?? {}, ctx.config.value.overlay ?? {}),
);

function diagnosticsFor(bundle: string, path: string): PolicyError[] {
  return moduleDiagnostics(
    bundle,
    path,
    ctx.lastPreview.value,
    ctx.savePolicyErrors.value,
    {
      instance: reportInstance.value,
      desiredRevision: ctx.config.value.revision,
      unchanged: (b, p) => {
        const ptr = pointer('policy_bundles', b, 'modules', p);
        return (
          getAt(draft.effectiveDraft.value, ptr) ===
          getAt(desiredEffective.value, ptr)
        );
      },
    },
  );
}

async function reveal(name: string) {
  justCreated.value = name;
  await nextTick();
  document
    .getElementById(`editor-bundle-${name}`)
    ?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
}

function onCreate(b: { name: string; extends?: string; usedBy: string[] }) {
  ops.createBundle(b.name, { extends: b.extends, usedBy: b.usedBy });
  reveal(b.name);
}

function onCustomize(c: {
  plugin: string;
  source: string;
  name: string;
  swap: boolean;
}) {
  ops.customizeBundle(c.plugin, c.source, c.name, c.swap);
  reveal(c.name);
}
</script>
