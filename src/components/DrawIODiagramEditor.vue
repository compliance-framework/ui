<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from 'vue'
import type { Diagram } from '@/stores/system-security-plans.ts'
import type { Property } from '@/stores/types.ts'

const frame = useTemplateRef('frame');

const props = defineProps<{
  diagram: Diagram,
}>();

const currentDiagram = ref<Diagram>(props.diagram);

const emit = defineEmits({
  saved(diagram: Diagram) {
    return !!diagram.uuid;
  },
});

onMounted(() => {
  window.addEventListener('message', onDrawIoMessage);
});

function onDrawIoMessage(e: MessageEvent) {
  const req = JSON.parse(e.data);

  switch (req.event) {
    case "init":
      loadXml()
      break;
    case "save":
      exportXml(props.diagram);
      break;
    case "autosave":
      // Ignored for now
      // exportXml();
      break;
    case "load":
      // Ignored for now
      // exportXml();
      break;
    case "export":
      if (req.message.diagram != props.diagram.uuid) {
        break;
      }

      const pngProp = {
        ns: 'ccf',
        name: 'ccf-diagram-png',
        value: req.data,
        remarks: 'Exported PNG-formatted CCF Diagram in base64',
      } as Property
      const xmlProp = {
        ns: 'ccf',
        name: 'ccf-diagram-xml',
        value: btoa(req.xml),
        remarks: 'Exported draw.io XML CCF Diagram in base64',
      } as Property
      let foundXml, foundPng = false;

      if (!currentDiagram.value.props) {
        currentDiagram.value.props = [];
      }
      currentDiagram.value.props = currentDiagram.value.props.map((prop: Property) => {
        if (prop.name == "ccf-diagram-xml" && prop.ns == "ccf") {
          foundXml = true;
          return xmlProp
        }
        if (prop.name == "ccf-diagram-png" && prop.ns == "ccf") {
          foundPng = true;
          return pngProp
        }
      }) as Property[];
      if (!foundXml) {
        currentDiagram.value.props = [...currentDiagram.value.props ?? [], {
          ns: 'ccf',
          name: 'ccf-diagram-xml',
          value: btoa(req.xml),
          remarks: 'Exported draw.io XML CCF Diagram in base64',
        } as Property]
      }
      if (!foundPng) {
        currentDiagram.value.props = [...currentDiagram.value.props ?? [], {
          ns: 'ccf',
          name: 'ccf-diagram-png',
          value: req.data,
          remarks: 'Exported PNG-formatted CCF Diagram in base64',
        } as Property]
      }
      emit('saved', currentDiagram.value)
      break;
    default:
      console.log('Unknown event: ', req.event, req);
      break;
  }
}

function findExistingXml() {
  return props.diagram.props?.find((prop: Property): Property | undefined => {
    if (prop.name == "ccf-diagram-xml" && prop.ns == "ccf") {
      return prop;
    }
  })
}

function loadXml() {
  const existingXml = findExistingXml()
  if (existingXml) {
    frame.value?.contentWindow?.postMessage(
      JSON.stringify({
        action: 'load',
        xml: atob(existingXml.value as string),
        noExitBtn: 1,
        autosave: 1,
        title: currentDiagram.value.uuid,
      }),
      '*',
    );
    return;
  }

  frame.value?.contentWindow?.postMessage(
    JSON.stringify({
      action: 'load',
      xml: ``,
      noExitBtn: 1,
      autosave: 1,
    }),
    '*',
  );
}

function exportXml(diagram: Diagram) {
  frame.value?.contentWindow?.postMessage(
    JSON.stringify({
      action: 'export',
      format: `png`,
      diagram: diagram.uuid,
    }),
    '*',
  );
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

