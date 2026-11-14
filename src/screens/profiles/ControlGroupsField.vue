<script setup lang="ts">
/**
 * A profile import's control groups (included or excluded controls): each group lists its
 * control IDs, each removable, with a picker of the catalog's controls to add more. Groups are
 * edited in place; the tab saves them.
 */
import { ref } from 'vue';
import type { ProfileSelectControlByID } from '@/oscal';
import { useControlOptions } from '@/composables/useControlOptions';
import Button from '@/ds/components/Button/Button.vue';
import Combobox from '@/ds/components/Combobox/Combobox.vue';
import IconButton from '@/ds/components/IconButton/IconButton.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';

const props = defineProps<{
  catalog: string;
  /** "Included" or "Excluded", for names and labels. */
  kind: string;
}>();
const groups = defineModel<ProfileSelectControlByID[]>('groups', {
  default: () => [],
});

const { options, loading } = useControlOptions(() => props.catalog);
/** The control chosen in each group's picker, by group index. */
const chosen = ref<string[]>([]);

function setIds(index: number, ids: (current: string[]) => string[]) {
  groups.value = groups.value.map((group, i) =>
    i === index ? { ...group, withIds: ids(group.withIds ?? []) } : group,
  );
}

function add(index: number) {
  const id = chosen.value[index];
  if (!id) return;
  setIds(index, (ids) => [...new Set([...ids, id])]);
  chosen.value[index] = '';
}

function removeId(index: number, id: string) {
  setIds(index, (ids) => ids.filter((value) => value !== id));
}

function removeGroup(index: number) {
  groups.value = groups.value.filter((_, i) => i !== index);
  chosen.value.splice(index, 1);
}
</script>

<template>
  <Stack gap="3">
    <Text v-if="!groups.length" variant="secondary"
      >No {{ kind.toLowerCase() }} control groups.</Text
    >
    <Panel
      v-for="(group, index) in groups"
      :key="index"
      :title="`${kind} group ${index + 1}`"
      :level="3"
    >
      <template #actions>
        <Button size="sm" icon="delete" @click="removeGroup(index)"
          >Remove group</Button
        >
      </template>
      <Stack gap="3">
        <Cluster v-if="group.withIds?.length" gap="2">
          <Cluster v-for="id in group.withIds" :key="id" gap="1">
            <Tag :label="id" />
            <IconButton
              icon="close"
              :label="`Remove ${id} from ${kind.toLowerCase()} group ${index + 1}`"
              @click="removeId(index, id)"
            />
          </Cluster>
        </Cluster>
        <Text v-else variant="caption">No controls yet.</Text>
        <Cluster gap="2">
          <Combobox
            v-model="chosen[index]"
            :label="`Control to add to ${kind.toLowerCase()} group ${index + 1}`"
            :options="options.filter((o) => !group.withIds?.includes(o.value))"
            :loading="loading"
            placeholder="Control ID or title, e.g. ac-1"
          />
          <Button icon="add" @click="add(index)">Add</Button>
        </Cluster>
      </Stack>
    </Panel>
    <div>
      <Button icon="add" @click="groups = [...groups, { withIds: [] }]"
        >New {{ kind.toLowerCase() }} group</Button
      >
    </div>
  </Stack>
</template>
