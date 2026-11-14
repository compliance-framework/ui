<script setup lang="ts">
/**
 * A POA&M item's details, inside its disclosure: description, remarks, properties, links, origins
 * and the findings, observations and risks behind it, named from the plan's own lists.
 */
import { computed } from 'vue';
import type { Finding, Observation, POAMItem, Risk } from '@/oscal';
import { useApiQuery } from '@/ds/query';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import ItemList from '@/ds/components/ItemList/ItemList.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import Grid from '@/ds/components/layout/Grid.vue';
import Stack from '@/ds/components/layout/Stack.vue';

const props = defineProps<{ poamId: string; item: POAMItem }>();
const plan = `/api/oscal/plan-of-action-and-milestones/${props.poamId}`;

const findings = useApiQuery<Finding[]>(`${plan}/findings`);
const observations = useApiQuery<Observation[]>(`${plan}/observations`);
const risks = useApiQuery<Risk[]>(`${plan}/risks`);

const facts = computed(() => [
  { key: 'description', label: 'Description', value: props.item.description },
  { key: 'remarks', label: 'Remarks', value: props.item.remarks },
  {
    key: 'props',
    label: 'Properties',
    value: (props.item.props ?? [])
      .map((p) => `${p.name}: ${p.value}`)
      .join(', '),
  },
  { key: 'links', label: 'Links', value: props.item.links?.length ? ' ' : '' },
  {
    key: 'origins',
    label: 'Origins',
    value: (props.item.origins ?? [])
      .flatMap((origin) =>
        origin.actors.map((actor) =>
          [actor.type, actor.roleId, actor.actorUuid]
            .filter(Boolean)
            .join(' · '),
        ),
      )
      .join('; '),
  },
  { key: 'uuid', label: 'UUID', value: props.item.uuid },
]);

/** Linked entries, named where the plan has them; a missing one shows by its UUID. */
const named = <
  T extends { uuid?: string; title?: string; description?: string },
>(
  ids: string[],
  list: T[] | undefined,
) =>
  ids.map((id) => {
    const entry = list?.find((e) => e.uuid === id);
    return {
      id,
      title: entry?.title || entry?.description || id,
      meta: entry ? undefined : 'Not found in this plan',
    };
  });

const linked = computed(() => [
  {
    key: 'findings',
    label: 'Findings',
    items: named(
      (props.item.relatedFindings ?? []).map((f) => f.findingUuid),
      findings.data.value,
    ),
  },
  {
    key: 'observations',
    label: 'Observations',
    items: named(
      (props.item.relatedObservations ?? []).map((o) => o.observationUuid),
      observations.data.value,
    ),
  },
  {
    key: 'risks',
    label: 'Risks',
    items: named(
      (props.item.relatedRisks ?? []).map((r) => r.riskUuid),
      risks.data.value,
    ),
  },
]);
</script>

<template>
  <Stack gap="4">
    <DescriptionList :items="facts" layout="stacked">
      <template v-if="item.links?.length" #value-links>
        <Stack gap="1">
          <TextLink
            v-for="link in item.links"
            :key="link.href"
            :href="link.href"
            >{{ link.text || link.href }}</TextLink
          >
        </Stack>
      </template>
    </DescriptionList>
    <Grid min="sm" gap="4">
      <Stack v-for="group in linked" :key="group.key" gap="2">
        <Text variant="label">{{ group.label }}</Text>
        <ItemList
          :items="group.items"
          :empty-text="`No ${group.label.toLowerCase()} linked.`"
          dense
        />
      </Stack>
    </Grid>
  </Stack>
</template>
