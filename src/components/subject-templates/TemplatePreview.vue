<template>
  <Panel toggleable collapsed>
    <template #header>
      <div>
        <h4 class="font-medium">Template Preview</h4>
        <p class="text-sm text-gray-500 dark:text-slate-400">
          Test template substitution using sample evidence labels.
        </p>
      </div>
    </template>

    <div class="space-y-4">
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="inline-block pb-1 dark:text-slate-300 font-medium">
            Sample Evidence Labels
          </label>
          <TertiaryButton
            type="button"
            :disabled="disabled"
            @click="addSampleLabel"
          >
            Add Label
          </TertiaryButton>
        </div>

        <p
          v-if="sampleLabels.length === 0"
          class="text-sm text-gray-500 dark:text-slate-400"
        >
          Add sample labels to preview substitutions.
        </p>

        <div
          v-for="(sampleLabel, index) in sampleLabels"
          :key="`sample-label-${index}`"
          class="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2"
        >
          <FormInput
            v-model="sampleLabel.key"
            placeholder="Label key"
            :disabled="disabled"
          />
          <FormInput
            v-model="sampleLabel.value"
            placeholder="Label value"
            :disabled="disabled"
          />
          <TertiaryButton
            type="button"
            :disabled="disabled"
            @click="removeSampleLabel(index)"
          >
            Remove
          </TertiaryButton>
        </div>
      </div>

      <div
        v-if="unresolvedKeys.length > 0"
        class="rounded-md border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200"
      >
        <p class="font-medium">Unresolved placeholders</p>
        <p>
          {{ unresolvedKeys.join(', ') }}
        </p>
      </div>

      <div class="rounded-md border border-ccf-300 dark:border-slate-700 p-4">
        <p class="text-sm text-gray-500 dark:text-slate-400 mb-3">
          Rendered Subject Preview
        </p>
        <dl class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <dt
              class="text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400"
            >
              Title
            </dt>
            <dd class="text-sm text-gray-900 dark:text-slate-200">
              {{ renderedTitle || '-' }}
            </dd>
          </div>
          <div>
            <dt
              class="text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400"
            >
              Description
            </dt>
            <dd class="text-sm text-gray-900 dark:text-slate-200">
              {{ renderedDescription || '-' }}
            </dd>
          </div>
          <div>
            <dt
              class="text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400"
            >
              Purpose
            </dt>
            <dd class="text-sm text-gray-900 dark:text-slate-200">
              {{ renderedPurpose || '-' }}
            </dd>
          </div>
          <div>
            <dt
              class="text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400"
            >
              Remarks
            </dt>
            <dd class="text-sm text-gray-900 dark:text-slate-200">
              {{ renderedRemarks || '-' }}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  </Panel>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import FormInput from '@/components/forms/FormInput.vue';
import Panel from '@/volt/Panel.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import {
  renderTemplateString,
  type SubjectTemplateLabelSchemaFormRow,
} from '@/types/subject-templates';

interface SampleLabel {
  key: string;
  value: string;
}

interface Props {
  titleTemplate: string;
  descriptionTemplate: string;
  purposeTemplate: string;
  remarksTemplate: string;
  labelSchema: SubjectTemplateLabelSchemaFormRow[];
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
});

const sampleLabels = ref<SampleLabel[]>([]);

watch(
  () => props.labelSchema,
  (newSchema) => {
    if (sampleLabels.value.length > 0) {
      return;
    }

    const prefilledKeys = newSchema
      .map((schemaField) => schemaField.key.trim())
      .filter((key, index, list) => key && list.indexOf(key) === index)
      .slice(0, 3);

    sampleLabels.value = prefilledKeys.map((key) => ({
      key,
      value: '',
    }));
  },
  { immediate: true, deep: true },
);

const sampleLabelMap = computed<Record<string, string>>(() => {
  return sampleLabels.value.reduce<Record<string, string>>(
    (acc, sampleLabel) => {
      const key = sampleLabel.key.trim();
      if (!key) {
        return acc;
      }

      acc[key] = sampleLabel.value;
      return acc;
    },
    {},
  );
});

const renderedTitleResult = computed(() => {
  return renderTemplateString(props.titleTemplate, sampleLabelMap.value);
});

const renderedDescriptionResult = computed(() => {
  return renderTemplateString(props.descriptionTemplate, sampleLabelMap.value);
});

const renderedPurposeResult = computed(() => {
  return renderTemplateString(props.purposeTemplate, sampleLabelMap.value);
});

const renderedRemarksResult = computed(() => {
  return renderTemplateString(props.remarksTemplate, sampleLabelMap.value);
});

const renderedTitle = computed(() => renderedTitleResult.value.rendered);
const renderedDescription = computed(
  () => renderedDescriptionResult.value.rendered,
);
const renderedPurpose = computed(() => renderedPurposeResult.value.rendered);
const renderedRemarks = computed(() => renderedRemarksResult.value.rendered);

const unresolvedKeys = computed(() => {
  return [
    ...new Set([
      ...renderedTitleResult.value.unresolvedKeys,
      ...renderedDescriptionResult.value.unresolvedKeys,
      ...renderedPurposeResult.value.unresolvedKeys,
      ...renderedRemarksResult.value.unresolvedKeys,
    ]),
  ];
});

function addSampleLabel() {
  if (props.disabled) {
    return;
  }

  sampleLabels.value.push({
    key: '',
    value: '',
  });
}

function removeSampleLabel(index: number) {
  if (props.disabled) {
    return;
  }

  sampleLabels.value.splice(index, 1);
}
</script>
