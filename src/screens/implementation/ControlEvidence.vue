<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Dashboard } from '@/stores/filters';
import { useAuthenticatedInstance } from '@/composables/axios';
import { getErrorDetail } from '@/utils/httpErrors';
import Combobox from '@/ds/components/Combobox/Combobox.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import IconButton from '@/ds/components/IconButton/IconButton.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { useToast } from '@/ds/toasts';
import EvidenceCapsule from '../EvidenceCapsule.vue';
import { evidenceLink } from '../filters/evidenceLink';
import { useControlTree } from './controlTree';

/**
 * The evidence filters that check a control (its results overall sit by the section's title), each
 * with its own results after its name (each a capsule of satisfied, unknown and not satisfied counts), a link to its evidence and a button to unlink it. Any of the plan's
 * filters (global or its own) can be linked by typing its name; new ones are made on the evidence
 * filters page, linked from here in a new tab. A filter links to controls or to components, not
 * both, so filters linked to components aren't offered. Links save straight away; without access
 * to change filters, the list shows without the controls to change it.
 */
const props = defineProps<{ controlId: string }>();
const tree = useControlTree();
const api = useAuthenticatedInstance();
const toast = useToast();

const filters = computed(() => tree.filters(props.controlId));
const linked = computed(() => new Set(filters.value.map((f) => f.id)));
const choices = computed(() =>
  tree
    .allFilters()
    .filter((f) => f.id && !linked.value.has(f.id) && !f.components?.length)
    .map((f) => ({ value: f.id!, label: f.name })),
);

const saving = ref(false);
const denied = computed(
  () => tree.filterEditDenied() ?? (saving.value ? 'Saving…' : undefined),
);

/** Saves the filter with its controls changed, the rest of it as it was. */
async function saveControls(filter: Dashboard, controls: string[]) {
  // A filter following its plan's scope is saved as its own expression, still following.
  const following = filter.scopeBase
    ? { filter: filter.scopeBase, followSspScope: true }
    : {};
  // /api/filters is a camelCase API: no decamelizeKeys.
  await api.put(`/api/filters/${filter.id}`, {
    ...filter,
    ...following,
    controls,
    components: (filter.components ?? []).map((c) => c.uuid),
  });
}

async function change(filter: Dashboard, link: boolean) {
  saving.value = true;
  const others = (filter.controls ?? [])
    .map((c) => c.id)
    .filter((id) => id.toLowerCase() !== props.controlId.toLowerCase());
  try {
    await saveControls(filter, link ? [...others, props.controlId] : others);
    await tree.reloadFilters();
    toast.add({
      severity: 'success',
      summary: link
        ? `Linked ${filter.name} to ${props.controlId}`
        : `Unlinked ${filter.name} from ${props.controlId}`,
    });
  } catch (error) {
    await tree.reloadFilters().catch(() => undefined);
    toast.add({
      severity: 'error',
      summary: link ? "The filter wasn't linked" : "The filter wasn't unlinked",
      detail: await getErrorDetail(error, 'Try again.'),
    });
  } finally {
    saving.value = false;
  }
}

const chosen = ref('');
watch(chosen, (id) => {
  const filter = tree.allFilters().find((f) => f.id === id);
  if (!filter) return;
  chosen.value = '';
  void change(filter, true);
});
</script>

<template>
  <Stack gap="4">
    <Stack v-if="filters.length" as="ul" gap="2">
      <li v-for="filter in filters" :key="filter.id">
        <Cluster gap="2" align="center">
          <TextLink :to="evidenceLink(filter)">{{ filter.name }}</TextLink>
          <EvidenceCapsule :filter-id="filter.id" />
          <IconButton
            icon="unlink"
            :label="`Unlink ${filter.name}`"
            :disabled-reason="denied"
            @click="change(filter, false)"
          />
        </Cluster>
      </li>
    </Stack>
    <Text v-else variant="secondary"
      >No evidence filter checks this control yet.</Text
    >
    <template v-if="!tree.filterEditDenied()">
      <FormField label="Link an evidence filter">
        <Combobox
          v-model="chosen"
          :options="choices"
          placeholder="Type a filter's name"
          empty-text="No other filter matches."
          @update:open="(open) => open && void tree.reloadFilters()"
        />
      </FormField>
      <Text variant="caption"
        >Not there yet?
        <TextLink :to="tree.newFilterLink()" target="_blank"
          >Create an evidence filter (opens in a new tab)</TextLink
        >, then search again.</Text
      >
    </template>
  </Stack>
</template>
