<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Control } from '@/oscal';
import ControlEvidenceCounter from '@/views/control-implementations/partials/ControlEvidenceCounter.vue';
import Drawer from '@/ds/components/Drawer/Drawer.vue';
import Clause from '@/ds/components/Clause/Clause.vue';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuEntry } from '@/ds/components/Menu/menuEntries';
import Text from '@/ds/components/Text/Text.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import PanelSection from '@/ds/components/layout/PanelSection.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { evidenceLink } from '../filters/evidenceLink';
import PartImplementation from './PartImplementation.vue';
import { partMap, type PartBand } from './controlParts';
import { useControlTree } from './controlTree';
import { useImplementationRequired } from './useImplementationRequired';

/**
 * One control in depth, over nearly all of the page: its statement set out like a legal document,
 * clause by clause at every depth (each label hanging, nested clauses indented under their
 * parent), with what implements each clause a step further in behind an accent rule
 * (PartImplementation: remarks, then "By component" and every component's full text and status).
 * Then the evidence that checks the control: evidence filters link to a control, not to its parts.
 * One link at the top opens the control in its catalog (in a new tab). Each clause's edit button
 * turns its implementation into a form in place (PartEditor), one clause at a time; closing with a
 * form open asks first. Each part's menu, right after its text, marks whether the statement requires
 * implementation (a lead-in whose sub-parts are implemented doesn't); one that doesn't has no
 * implementation block at all.
 */
const props = defineProps<{ control: Control }>();
const open = defineModel<boolean>('open', { default: false });
const tree = useControlTree();

const id = computed(() => props.control.id);
const implementation = computed(() => tree.implementation(id.value));
const map = computed(() => partMap(props.control, implementation.value));
const filters = computed(() => tree.filters(id.value));
const catalogLink = computed(() => tree.catalogLink(id.value));

/** The band being edited: 'whole', a part's ID, or another statement's UUID. */
const editing = ref<string | null>(null);
const editDenied = (key: string) =>
  tree.editDenied() ??
  (editing.value && editing.value !== key
    ? 'Save or cancel the part you are editing first.'
    : undefined);

const { setRequired, saving } = useImplementationRequired();
const REQUIRED_OPTIONS = [
  { value: 'required', label: 'This statement requires implementation' },
  {
    value: 'not-required',
    label: 'This statement does not require implementation',
  },
];
/** A choice between the two, ticked as it stands; inert, with the reason, when it can't change now. */
function partMenu(band: PartBand): MenuEntry[] {
  const denied =
    tree.editDenied() ??
    (editing.value === band.id
      ? 'Save or cancel this part first.'
      : saving.value
        ? 'Saving…'
        : undefined);
  if (denied)
    return REQUIRED_OPTIONS.map((option) => ({
      label: option.label,
      disabledReason: denied,
    }));
  return [
    {
      type: 'radio',
      label: 'Implementation',
      value: band.required ? 'required' : 'not-required',
      options: REQUIRED_OPTIONS,
      onChange: (value) => {
        const required = value === 'required';
        if (required !== band.required) setRequired(id.value, band, required);
      },
    },
  ];
}
</script>

<template>
  <Drawer
    v-model:open="open"
    size="wide"
    :dirty="editing !== null"
    :title="`${control.id} · ${control.title}`"
  >
    <Stack gap="6">
      <PanelSection title="Statement and implementation">
        <Stack gap="4">
          <Text v-if="catalogLink"
            ><TextLink :to="catalogLink" target="_blank"
              >See {{ control.id }} in its catalog (opens in a new
              tab)</TextLink
            ></Text
          >
          <Text v-if="map.lead" variant="prose">{{ map.lead }}</Text>
          <Clause v-if="map.whole.length || implementation?.remarks">
            <Text variant="secondary">The whole control</Text>
            <template #annotation>
              <PartImplementation
                :control-id="id"
                :remarks="implementation?.remarks"
                :by-components="map.whole"
                empty-text=""
                edit-label="Edit what implements the whole control"
                :editing="editing === 'whole'"
                :edit-denied="editDenied('whole')"
                @edit="editing = 'whole'"
                @done="editing = null"
              />
            </template>
          </Clause>
          <Clause
            v-for="band in map.bands"
            :key="band.id"
            :label="band.label"
            :hint="band.id"
            :depth="band.depth"
          >
            {{ band.prose }}
            <template #actions>
              <Menu :label="`Actions for ${band.id}`" :items="partMenu(band)" />
            </template>
            <template v-if="band.required" #annotation>
              <PartImplementation
                :control-id="id"
                :part-id="band.id"
                :statement="band.statement"
                :remarks="band.statement?.remarks"
                :by-components="band.statement?.byComponents ?? []"
                :empty-text="
                  band.statement
                    ? 'No component implements this part yet.'
                    : 'Nothing written for this part yet.'
                "
                :edit-label="`Edit the implementation of ${band.id}`"
                :editing="editing === band.id"
                :edit-denied="editDenied(band.id)"
                @edit="editing = band.id"
                @done="editing = null"
              />
            </template>
          </Clause>
          <Clause
            v-for="statement in map.others"
            :key="statement.uuid"
            :label="statement.statementId"
          >
            <Text variant="secondary"
              >No part of this control has this ID.</Text
            >
            <template #annotation>
              <PartImplementation
                :control-id="id"
                :part-id="statement.statementId"
                :statement="statement"
                :remarks="statement.remarks"
                :by-components="statement.byComponents ?? []"
                empty-text="No component implements this part yet."
                :edit-label="`Edit the implementation of ${statement.statementId}`"
                :editing="editing === statement.uuid"
                :edit-denied="editDenied(statement.uuid)"
                @edit="editing = statement.uuid"
                @done="editing = null"
              />
            </template>
          </Clause>
        </Stack>
      </PanelSection>

      <PanelSection title="Evidence">
        <Stack gap="3">
          <ControlEvidenceCounter :control="control" :ssp-id="tree.sspId()" />
          <Stack v-if="filters.length" as="ul" gap="2">
            <li v-for="filter in filters" :key="filter.id">
              <TextLink :to="evidenceLink(filter)">{{ filter.name }}</TextLink>
            </li>
          </Stack>
          <Text v-else variant="secondary"
            >No evidence filter checks this control yet.</Text
          >
        </Stack>
      </PanelSection>
    </Stack>
  </Drawer>
</template>
