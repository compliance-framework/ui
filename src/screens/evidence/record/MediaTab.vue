<script setup lang="ts">
import { computed } from 'vue';
import CodeBlock from '@/ds/components/CodeBlock/CodeBlock.vue';
import Disclosure from '@/ds/components/Disclosure/Disclosure.vue';
import ImagePreview from '@/ds/components/ImagePreview/ImagePreview.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import {
  isImageMedia,
  isTextMedia,
  linkedMedia,
  mediaHref,
  mediaText,
  mediaType,
  useEvidenceRecord,
} from './evidenceRecord';

/**
 * Media: the back-matter resources the evidence links to. Text (including JSON and YAML) opens
 * in place as a code block; images preview; anything with a payload can be downloaded.
 */
const { evidence } = useEvidenceRecord();

const media = computed(() =>
  linkedMedia(evidence.value?.links, evidence.value?.backMatter?.resources).map(
    (resource) => ({
      id: resource.uuid,
      title: resource.title || resource.uuid,
      type: mediaType(resource) || 'No payload',
      href: mediaHref(resource),
      text: isTextMedia(resource) ? mediaText(resource) : undefined,
      image: isImageMedia(resource) ? mediaHref(resource) : undefined,
      description: resource.description,
    }),
  ),
);
</script>

<template>
  <Panel title="Media">
    <Stack v-if="media.length" gap="4">
      <Stack v-for="item in media" :key="item.id" gap="2">
        <Cluster justify="between">
          <Text variant="label">{{ item.title }} · {{ item.type }}</Text>
          <TextLink v-if="item.href" :href="item.href" :download="item.title"
            >Download {{ item.title }}</TextLink
          >
        </Cluster>
        <Text v-if="item.description" variant="secondary">{{
          item.description
        }}</Text>
        <Disclosure
          v-if="item.text !== undefined"
          :label="`Show ${item.title}`"
        >
          <CodeBlock
            :code="item.text"
            :label="item.title"
            :file-name="item.title"
          />
        </Disclosure>
        <ImagePreview
          v-else-if="item.image"
          :src="item.image"
          :alt="item.title"
        />
      </Stack>
    </Stack>
    <Text v-else variant="secondary">No media is linked to this evidence.</Text>
  </Panel>
</template>
