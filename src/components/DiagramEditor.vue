<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue';

const diagram = useTemplateRef('diagram');

onMounted(() => {
  window.addEventListener('message', onDrawIoMessage);
});

function onDrawIoMessage(e: MessageEvent) {
  console.log(e);
  console.log('message from iframe:', e.data);
  const req = JSON.parse(e.data);
  console.log(req.xml);
  if (req.event == "init") {
    loadXml()
  }
}

function loadXml() {
  diagram.value?.contentWindow?.postMessage(
    JSON.stringify({
      action: 'load',
      xml: `<mxfile host="embed.diagrams.net" agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36" version="26.2.14">
  <diagram name="Page-1" id="kD9J6v2FM4cTq4V1tpBd">
    <mxGraphModel dx="528" dy="406" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="850" pageHeight="1100" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="4" value="" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;" edge="1" parent="1" source="2" target="3">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="2" value="Something" style="rounded=0;whiteSpace=wrap;html=1;" parent="1" vertex="1">
          <mxGeometry x="120" y="150" width="120" height="60" as="geometry" />
        </mxCell>
        <mxCell id="3" value="Another Something" style="rounded=0;whiteSpace=wrap;html=1;" vertex="1" parent="1">
          <mxGeometry x="320" y="150" width="120" height="60" as="geometry" />
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`,
      noExitBtn: 1,
      dark: true,
    }),
    '*',
  );
}
</script>

<template>
  <iframe
    ref="diagram"
    class="w-full h-full"
    src="https://embed.diagrams.net/?spin=0&proto=json"
    frameborder="0"
  ></iframe>
</template>

