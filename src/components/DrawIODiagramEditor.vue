<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, useTemplateRef, computed } from 'vue';
import type { Diagram } from '@/oscal';
import type { Property } from '@/oscal';
import type { ThemeChangeDetail } from '@/composables/useTheme';

const DRAWIO_URL = 'https://embed.diagrams.net/?spin=0&proto=json';
const DRAWIO_ORIGIN = new URL(DRAWIO_URL).origin;

const frame = useTemplateRef<HTMLIFrameElement>('frame');
const xmlCache = new Map<string, string>();

const props = defineProps<{
  diagram: Diagram;
}>();

const currentDiagram = ref<Diagram>(props.diagram);
const latestXml = ref<string>('');
const diagramId = computed(() => currentDiagram.value.uuid);

const emit = defineEmits({
  saved(diagram: Diagram) {
    return !!diagram.uuid;
  },
});

onMounted(() => {
  window.addEventListener('message', onDrawIoMessage);
  window.addEventListener('theme-change', onThemeChange as EventListener);
});

onBeforeUnmount(() => {
  window.removeEventListener('message', onDrawIoMessage);
  window.removeEventListener('theme-change', onThemeChange as EventListener);
  if (diagramId.value) {
    xmlCache.delete(diagramId.value);
  }
});

function onDrawIoMessage(e: MessageEvent) {
  if (e.source !== frame.value?.contentWindow || e.origin !== DRAWIO_ORIGIN) {
    return;
  }
  const req = JSON.parse(e.data);

  switch (req.event) {
    case 'init':
      loadXml();
      break;
    case 'save':
      exportXml(props.diagram);
      break;
    case 'autosave':
      if (req.xml) {
        updateXmlState(req.xml);
      }
      break;
    case 'load':
      // Ignored for now
      // exportXml();
      break;
    case 'export':
      if (req.message.diagram != props.diagram.uuid) {
        break;
      }
      if (req.xml) {
        updateXmlState(req.xml);
      }

      const pngProp = {
        ns: 'ccf',
        name: 'ccf-diagram-png',
        value: req.data,
        remarks: 'Exported PNG-formatted CCF Diagram in base64',
      } as Property;
      const xmlProp = {
        ns: 'ccf',
        name: 'ccf-diagram-xml',
        value: btoa(req.xml),
        remarks: 'Exported draw.io XML CCF Diagram in base64',
      } as Property;
      let foundXml,
        foundPng = false;

      if (!currentDiagram.value.props) {
        currentDiagram.value.props = [];
      }
      currentDiagram.value.props = currentDiagram.value.props.map(
        (prop: Property) => {
          if (prop.name == 'ccf-diagram-xml' && prop.ns == 'ccf') {
            foundXml = true;
            return xmlProp;
          }
          if (prop.name == 'ccf-diagram-png' && prop.ns == 'ccf') {
            foundPng = true;
            return pngProp;
          }
        },
      ) as Property[];
      if (!foundXml) {
        currentDiagram.value.props = [
          ...(currentDiagram.value.props ?? []),
          {
            ns: 'ccf',
            name: 'ccf-diagram-xml',
            value: btoa(req.xml),
            remarks: 'Exported draw.io XML CCF Diagram in base64',
          } as Property,
        ];
      }
      if (!foundPng) {
        currentDiagram.value.props = [
          ...(currentDiagram.value.props ?? []),
          {
            ns: 'ccf',
            name: 'ccf-diagram-png',
            value: req.data,
            remarks: 'Exported PNG-formatted CCF Diagram in base64',
          } as Property,
        ];
      }
      emit('saved', currentDiagram.value);
      break;
    default:
      console.log('Unknown event: ', req.event, req);
      break;
  }
}

function findExistingXml() {
  return props.diagram.props?.find((prop: Property): Property | undefined => {
    if (prop.name == 'ccf-diagram-xml' && prop.ns == 'ccf') {
      return prop;
    }
  });
}

function isDarkModeEnabled(): boolean {
  if (typeof document !== 'undefined') {
    return document.documentElement.classList.contains('dark');
  }
  if (
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return true;
  }
  return false;
}

function sendLoadMessage({
  xml,
  dark,
  title,
  encoded,
}: {
  xml: string;
  dark: boolean;
  title?: string;
  encoded?: boolean;
}) {
  postToFrame({
    action: 'load',
    xml: encoded ? atob(xml) : xml,
    noExitBtn: 1,
    autosave: 1,
    title: title ?? currentDiagram.value.uuid,
    dark,
  });
}

function updateXmlState(xml: string) {
  latestXml.value = xml;
  if (diagramId.value) {
    xmlCache.set(diagramId.value, xml);
  }
}

function loadXml() {
  const existingXml = findExistingXml();
  const dark = isDarkModeEnabled();
  if (existingXml?.value) {
    const decoded = atob(existingXml.value as string);
    updateXmlState(decoded);
    sendLoadMessage({
      xml: decoded,
      dark,
    });
    return;
  }
  updateXmlState('');
  sendLoadMessage({ xml: '', dark });
}

function exportXml(diagram: Diagram, options?: { format?: string }) {
  postToFrame({
    action: 'export',
    format: options?.format ?? `xmlpng`,
    diagram: diagram.uuid,
  });
}

function postToFrame(message: Record<string, unknown>) {
  if (!frame.value?.contentWindow) return;
  frame.value.contentWindow.postMessage(JSON.stringify(message), DRAWIO_ORIGIN);
}

function resolveXmlForReload() {
  const id = diagramId.value;
  if (id && xmlCache.has(id)) {
    return xmlCache.get(id) ?? '';
  }
  if (latestXml.value) {
    return latestXml.value;
  }
  const stored = findExistingXml();
  if (stored?.value) {
    try {
      return atob(stored.value as string);
    } catch {
      return '';
    }
  }
  return '';
}

function onThemeChange(event: CustomEvent<ThemeChangeDetail>) {
  const isDark = event.detail.theme === 'dark';
  const xml = resolveXmlForReload();
  sendLoadMessage({ xml, dark: isDark });
}
</script>

<template>
  <iframe
    ref="frame"
    class="w-full"
    src="https://embed.diagrams.net/?spin=0&proto=json"
    frameborder="0"
  ></iframe>
</template>
