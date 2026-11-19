<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Control } from '@/oscal';
import IndexControlImplementation from '@/views/control-implementations/partials/IndexControlImplementation.vue';
import ControlEvidenceCounter from '@/views/control-implementations/partials/ControlEvidenceCounter.vue';
import Button from '@/ds/components/Button/Button.vue';
import Drawer from '@/ds/components/Drawer/Drawer.vue';
import IconButton from '@/ds/components/IconButton/IconButton.vue';
import LinkedColumns from '@/ds/components/LinkedColumns/LinkedColumns.vue';
import LinkedColumnsHeader from '@/ds/components/LinkedColumns/LinkedColumnsHeader.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import PanelSection from '@/ds/components/layout/PanelSection.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { evidenceLink } from '../filters/evidenceLink';
import ComponentStatements from './ComponentStatements.vue';
import PartEditor from './PartEditor.vue';
import { partMap } from './controlParts';
import { useControlTree } from './controlTree';

/**
 * One control in depth, over nearly all of the page: its statement part by part, at every depth
 * (nested parts indented under their parent), each part beside
 * the implementation statement for it (every component's full text and status), then the
 * evidence that checks the control, then the editors. Evidence filters link to a control, not to
 * its parts, so evidence is the control's, below the parts. One link at the top opens the control
 * in its catalog (in a new tab). Each implementation box shows the statement's remarks, then
 * "By component" and the components when there are any, and has an edit button that
 * turns it into a form in place (PartEditor), one part at a time; closing with a form open asks
 * first.
 */
const props = defineProps<{ control: Control }>();
const open = defineModel<boolean>('open', { default: false });
const tree = useControlTree();

const PART_COLUMNS = [
  { key: 'part', label: 'Control statement' },
  { key: 'implementation', label: 'Implementation' },
];

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
          <Text v-if="implementation?.remarks" variant="prose">{{
            implementation.remarks
          }}</Text>
          <Text v-if="map.lead" variant="prose">{{ map.lead }}</Text>
          <LinkedColumnsHeader :columns="PART_COLUMNS" />
          <Stack as="ul" gap="4">
            <li v-if="map.whole.length">
              <LinkedColumns :columns="PART_COLUMNS">
                <template #part>
                  <Text variant="secondary">The whole control</Text>
                </template>
                <template #implementation>
                  <Cluster
                    v-if="editing !== 'whole'"
                    :wrap="false"
                    align="start"
                    gap="2"
                  >
                    <Stack gap="3">
                      <Text as="span" variant="label">By component</Text>
                      <ComponentStatements :by-components="map.whole" />
                    </Stack>
                    <IconButton
                      icon="edit"
                      label="Edit what implements the whole control"
                      :disabled-reason="editDenied('whole')"
                      @click="editing = 'whole'"
                    />
                  </Cluster>
                  <template v-else>
                    <Text as="span" variant="label">By component</Text>
                    <PartEditor
                      :control-id="id"
                      :by-components="map.whole"
                      @done="editing = null"
                    />
                  </template>
                </template>
              </LinkedColumns>
            </li>
            <li v-for="band in map.bands" :key="band.id">
              <LinkedColumns :columns="PART_COLUMNS" :depth="band.depth">
                <template #part>
                  <Cluster gap="2"><Tag :label="band.id" code /></Cluster>
                  <Text preserve-whitespace>{{ band.text }}</Text>
                </template>
                <template #implementation>
                  <Cluster
                    v-if="editing !== band.id"
                    :wrap="false"
                    align="start"
                    gap="2"
                  >
                    <Stack gap="3">
                      <Text
                        v-if="band.statement?.remarks"
                        variant="secondary"
                        preserve-whitespace
                        >{{ band.statement.remarks }}</Text
                      >
                      <template v-if="band.statement?.byComponents?.length">
                        <Text as="span" variant="label">By component</Text>
                        <ComponentStatements
                          :by-components="band.statement.byComponents"
                        />
                      </template>
                      <Text v-else variant="secondary">{{
                        band.statement
                          ? 'No component implements this part yet.'
                          : 'Nothing written for this part yet.'
                      }}</Text>
                    </Stack>
                    <IconButton
                      icon="edit"
                      :label="`Edit the implementation of ${band.id}`"
                      :disabled-reason="editDenied(band.id)"
                      @click="editing = band.id"
                    />
                  </Cluster>
                  <template v-else>
                    <Text
                      v-if="band.statement?.remarks"
                      variant="secondary"
                      preserve-whitespace
                      >{{ band.statement.remarks }}</Text
                    >
                    <Text as="span" variant="label">By component</Text>
                    <PartEditor
                      :control-id="id"
                      :part-id="band.id"
                      :statement="band.statement"
                      :by-components="band.statement?.byComponents ?? []"
                      @done="editing = null"
                    />
                  </template>
                </template>
              </LinkedColumns>
            </li>
            <li v-for="statement in map.others" :key="statement.uuid">
              <LinkedColumns :columns="PART_COLUMNS">
                <template #part>
                  <Cluster gap="2"
                    ><Tag :label="statement.statementId" code
                  /></Cluster>
                  <Text variant="secondary"
                    >No part of this control has this ID.</Text
                  >
                </template>
                <template #implementation>
                  <Cluster
                    v-if="editing !== statement.uuid"
                    :wrap="false"
                    align="start"
                    gap="2"
                  >
                    <Stack gap="3">
                      <Text
                        v-if="statement.remarks"
                        variant="secondary"
                        preserve-whitespace
                        >{{ statement.remarks }}</Text
                      >
                      <template v-if="statement.byComponents?.length">
                        <Text as="span" variant="label">By component</Text>
                        <ComponentStatements
                          :by-components="statement.byComponents"
                        />
                      </template>
                      <Text v-else variant="secondary"
                        >No component implements this part yet.</Text
                      >
                    </Stack>
                    <IconButton
                      icon="edit"
                      :label="`Edit the implementation of ${statement.statementId}`"
                      :disabled-reason="editDenied(statement.uuid)"
                      @click="editing = statement.uuid"
                    />
                  </Cluster>
                  <template v-else>
                    <Text
                      v-if="statement.remarks"
                      variant="secondary"
                      preserve-whitespace
                      >{{ statement.remarks }}</Text
                    >
                    <Text as="span" variant="label">By component</Text>
                    <PartEditor
                      :control-id="id"
                      :part-id="statement.statementId"
                      :statement="statement"
                      :by-components="statement.byComponents ?? []"
                      @done="editing = null"
                    />
                  </template>
                </template>
              </LinkedColumns>
            </li>
          </Stack>
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

      <PanelSection
        title="Edit"
        description="Until editing moves into this view: the statements editor, and the component, suggestion and sharing details."
      >
        <Stack gap="4">
          <Cluster gap="2">
            <Button
              icon="next"
              :disabled-reason="
                implementation || tree.suggestionCount(id)
                  ? undefined
                  : 'No implementation or suggestions yet.'
              "
              @click="tree.openDrawer(id)"
              >Components and sharing</Button
            >
          </Cluster>
          <IndexControlImplementation
            :control="control"
            :implementation="implementation"
            @exported="tree.onExported"
            @imported="tree.onImported"
            @closed="tree.onStatementsClosed"
          />
        </Stack>
      </PanelSection>
    </Stack>
  </Drawer>
</template>
