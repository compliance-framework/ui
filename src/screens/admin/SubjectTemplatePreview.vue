<script setup lang="ts">
/**
 * A subject template's preview, collapsed by default: sample evidence labels (prefilled from the
 * label schema) and the title, description, purpose and remarks they render to, with any
 * placeholders left unresolved. The script is the classic preview's.
 */
import { computed, ref, watch } from 'vue';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import Disclosure from '@/ds/components/Disclosure/Disclosure.vue';
import FieldList from '@/ds/components/FieldList/FieldList.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Grid from '@/ds/components/layout/Grid.vue';
import Stack from '@/ds/components/layout/Stack.vue';
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

const rendered = computed(() => [
  { key: 'title', label: 'Title', value: renderedTitle.value },
  {
    key: 'description',
    label: 'Description',
    value: renderedDescription.value,
  },
  { key: 'purpose', label: 'Purpose', value: renderedPurpose.value },
  { key: 'remarks', label: 'Remarks', value: renderedRemarks.value },
]);

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
</script>

<template>
  <Disclosure label="Template preview">
    <Stack gap="4">
      <FieldList
        v-model="sampleLabels"
        legend="Sample evidence labels"
        hint="Try the templates with these label values."
        item-label="label"
        add-label="Add label"
        empty-text="Add sample labels to preview substitutions."
        :new-item="() => ({ key: '', value: '' })"
        :disabled-reason="disabled ? 'Wait for the save to finish.' : undefined"
      >
        <template #item="{ item }">
          <Grid min="sm" gap="2">
            <FormField label="Key"><TextInput v-model="item.key" /></FormField>
            <FormField label="Value"
              ><TextInput v-model="item.value"
            /></FormField>
          </Grid>
        </template>
      </FieldList>
      <InlineMessage
        v-if="unresolvedKeys.length"
        tone="warning"
        title="Unresolved placeholders"
        >{{ unresolvedKeys.join(', ') }}</InlineMessage
      >
      <DescriptionList :items="rendered" />
    </Stack>
  </Disclosure>
</template>
