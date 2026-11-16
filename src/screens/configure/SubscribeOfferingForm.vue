<script setup lang="ts">
/**
 * Subscribing this system to another system's export offering: which of its items to inherit
 * and, for each chosen item, the responsibilities this system already meets. Used by the
 * Leverage section (the whole offering) and by the Implementation statement editor (one item).
 */
import { computed, reactive, ref } from 'vue';
import { useToast } from '@/ds/toasts';
import { useAuthenticatedInstance } from '@/composables/axios';
import type { CatalogOffering } from '@/types/ssp-export-offerings';
import type {
  SSPLeverageLink,
  SubscribeRequest,
  SubscribeResponse,
  SubscribeResponseMeta,
} from '@/types/ssp-leverage';
import { getErrorDetail } from '@/utils/httpErrors';
import Button from '@/ds/components/Button/Button.vue';
import CheckboxGroup from '@/ds/components/CheckboxGroup/CheckboxGroup.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';

const props = defineProps<{
  sspId: string;
  offering: CatalogOffering;
  /** Narrows the form to some of the offering's items; omit for the whole offering. */
  scopedItemIds?: string[];
  /** Items chosen when the form opens. */
  preselectedItemIds?: string[];
}>();

const emit = defineEmits<{
  cancel: [];
  subscribed: [
    payload: { links: SSPLeverageLink[]; meta?: SubscribeResponseMeta },
  ];
}>();

const toast = useToast();
const api = useAuthenticatedInstance();

const visibleItems = computed(() => {
  const items = props.offering.items ?? [];
  if (!props.scopedItemIds?.length) return items;
  const scoped = new Set(props.scopedItemIds);
  return items.filter((item) => scoped.has(item.id));
});

const itemLabel = (item: { controlId: string; statementId?: string }) =>
  `${item.controlId}${item.statementId ? ` · Statement ${item.statementId}` : ''}`;
const itemOptions = computed(() =>
  visibleItems.value.map((item) => ({
    value: item.id,
    label: itemLabel(item),
  })),
);

const selected = ref<string[]>([...(props.preselectedItemIds ?? [])]);
/** The responsibilities this system already meets, by item. */
const satisfied = reactive<Record<string, string[]>>({});
const selectedWithResponsibilities = computed(() =>
  visibleItems.value.filter(
    (item) => selected.value.includes(item.id) && item.responsibilities?.length,
  ),
);

const itemsError = ref('');
const saveError = ref('');
const submitting = ref(false);

async function submit() {
  if (submitting.value) return;
  itemsError.value = '';
  saveError.value = '';
  if (!selected.value.length) {
    itemsError.value = 'Choose at least one item to inherit.';
    return;
  }
  const body: SubscribeRequest = {
    downstreamSspId: props.sspId,
    items: selected.value.map((itemId) => ({
      itemId,
      satisfiedResponsibilityUuids: [...(satisfied[itemId] ?? [])],
    })),
  };
  submitting.value = true;
  try {
    // `meta.created` says which requirements, statements and components the subscribe created;
    // the statement editor uses it to reveal them.
    const response = await api.post<SubscribeResponse>(
      `/api/oscal/ssp-export-offerings/${props.offering.id}/subscribe`,
      body,
    );
    const links = response.data.data ?? [];
    toast.add({
      severity: 'success',
      summary: `Inherited ${links.length} item${links.length === 1 ? '' : 's'}`,
      life: 3000,
    });
    emit('subscribed', { links, meta: response.data.meta });
  } catch (error) {
    saveError.value = await getErrorDetail(error, 'Try again.');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <form novalidate @submit.prevent="submit">
    <Stack gap="5">
      <CheckboxGroup
        v-model="selected"
        legend="Items to inherit"
        :options="itemOptions"
        :error="itemsError || undefined"
        required
      />
      <CheckboxGroup
        v-for="item in selectedWithResponsibilities"
        :key="item.id"
        v-model="satisfied[item.id]"
        :legend="`Already handled for ${itemLabel(item)}`"
        hint="Choose the responsibilities this system already meets."
        :options="
          (item.responsibilities ?? []).map((r) => ({
            value: r.responsibilityUuid,
            label: r.description,
          }))
        "
      />
      <Text variant="caption"
        >Inherited capabilities stay linked to the providing system, and you'll
        be told when it changes what it shares.</Text
      >
      <InlineMessage v-if="saveError" tone="error" title="Not subscribed">
        {{ saveError }}
      </InlineMessage>
      <Cluster justify="end" gap="2">
        <Button @click="emit('cancel')">Cancel</Button>
        <Button variant="primary" type="submit" :loading="submitting"
          >Subscribe</Button
        >
      </Cluster>
    </Stack>
  </form>
</template>
