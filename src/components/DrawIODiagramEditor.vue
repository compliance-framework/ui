<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, useTemplateRef, computed } from 'vue';
import type { Diagram } from '@/oscal';
import type { Property } from '@/oscal';
import type { ThemeChangeDetail } from '@/composables/useTheme';

const DRAWIO_URL =
  'https://embed.diagrams.net/?spin=0&proto=json&configure=1&noSaveBtn=1&saveAndExit=0&noExitBtn=1';
const DRAWIO_ORIGIN = new URL(DRAWIO_URL).origin;
const DRAWIO_EDITOR_CONFIG = {
  customFonts: ['Space Grotesk', 'JetBrains Mono'],
  defaultFonts: [
    'Space Grotesk',
    'JetBrains Mono',
    'Helvetica',
    'Verdana',
    'Times New Roman',
    'Garamond',
    'Courier New',
  ],
  fontCss:
    "@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@400;500;700&display=swap');",
  defaultTextStyle:
    'text;html=1;whiteSpace=wrap;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;rounded=0;fontFamily=Space Grotesk;fontColor=#4c4f69;',
  defaultVertexStyle: {
    rounded: '0',
    fontFamily: 'Space Grotesk',
    fontSize: '12',
    fontColor: '#4c4f69',
    fillColor: '#dce0e8',
    strokeColor: '#ccd0da',
  },
  defaultEdgeStyle: {
    edgeStyle: 'orthogonalEdgeStyle',
    rounded: '0',
    jettySize: 'auto',
    orthogonalLoop: '1',
    fontFamily: 'Space Grotesk',
    fontSize: '12',
    fontColor: '#4c4f69',
    strokeColor: '#6c6f85',
  },
  customPresetColors: [
    'DF8E1D',
    '1E66F5',
    '40A02B',
    'D20F39',
    '4C4F69',
    '5C5F77',
    '6C6F85',
    '8C8FA1',
    'EFF1F5',
    'E6E9EF',
    'DCE0E8',
    'CCD0DA',
  ],
  css: `.geMenubarContainer,
        .geToolbarContainer,
        .geSidebarContainer,
        .geFormatContainer,
        .mxPopupMenu,
        .geDialog,
        .geBtn,
        .geLabel,
        .geItem,
        .geStatus,
        .geTitle,
        .geHint,
        .geToolbarButton,
        .geSidebar,
        .geFormatSection,
        .geFormatSectionTitle {
          font-family: 'JetBrains Mono', ui-monospace, 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace !important;
          color: #4c4f69 !important;
        }

        .geMenubarContainer,
        .geMenubar {
          background: #dce0e8 !important;
          border-color: #ccd0da !important;
        }

        .geToolbarContainer,
        .geToolbar {
          background: #e6e9ef !important;
          border-color: #ccd0da !important;
        }

        .geSidebarContainer,
        .geFormatContainer,
        .geSidebar,
        .geFormatSection {
          background: #eff1f5 !important;
          border-color: #ccd0da !important;
        }

        .geItem:hover,
        .geToolbarButton:hover,
        .geButton:hover,
        .geBtn:hover {
          background: #df8e1d15 !important;
          color: #4c4f69 !important;
        }

        .geMenubar > a.geItem:nth-child(5),
        .geMenubar > a.geItem:nth-child(6),
        .geMenubar > a.geItem:nth-last-child(2),
        .geMenubar > a.geItem:nth-last-child(3) {
          display: none !important;
        }`,
};

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
    case 'configure':
      postToFrame({
        action: 'configure',
        config: DRAWIO_EDITOR_CONFIG,
      });
      break;
    case 'init':
      loadXml();
      break;
    case 'save':
      exportXml(currentDiagram.value);
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
    noSaveBtn: 1,
    saveAndExit: 0,
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

function requestSave() {
  exportXml(currentDiagram.value);
}

defineExpose({
  requestSave,
});

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
  <iframe ref="frame" class="w-full" :src="DRAWIO_URL" frameborder="0"></iframe>
</template>
