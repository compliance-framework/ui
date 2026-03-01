import { FRAME_DATA } from './frames-data.js';
import { FLOW_ORDER, FLOW_NOTES } from './flow.js';

const frameById = new Map(FRAME_DATA.map((frame) => [frame.id, frame]));
const allIds = FRAME_DATA.map((frame) => frame.id);

const orderedIds = [
  ...FLOW_ORDER.filter((id) => frameById.has(id)),
  ...allIds.filter((id) => !FLOW_ORDER.includes(id)),
];

const state = {
  currentIndex: 0,
  fitMode: true,
};

const els = {
  frameCounter: document.getElementById('frameCounter'),
  frameSelect: document.getElementById('frameSelect'),
  prevBtn: document.getElementById('prevBtn'),
  nextBtn: document.getElementById('nextBtn'),
  leftArrow: document.getElementById('leftArrow'),
  rightArrow: document.getElementById('rightArrow'),
  fullscreenBtn: document.getElementById('fullscreenBtn'),
  fitBtn: document.getElementById('fitBtn'),
  frameViewport: document.getElementById('frameViewport'),
  frameCanvasWrap: document.getElementById('frameCanvasWrap'),
  frameCanvas: document.getElementById('frameCanvas'),

  notesTitle: document.getElementById('notesTitle'),
  notesSection: document.getElementById('notesSection'),
  notesSummary: document.getElementById('notesSummary'),
  oldUiBullets: document.getElementById('oldUiBullets'),
  newDesignBullets: document.getElementById('newDesignBullets'),
  whyBullets: document.getElementById('whyBullets'),
  metaId: document.getElementById('metaId'),
  metaName: document.getElementById('metaName'),
  metaSize: document.getElementById('metaSize'),
};

function cssValue(value) {
  if (typeof value === 'number') {
    return `${value}px`;
  }

  if (typeof value === 'string') {
    return value;
  }

  return '';
}

function normalizePadding(padding) {
  if (typeof padding === 'number') {
    return `${padding}px`;
  }

  if (!Array.isArray(padding)) {
    return '';
  }

  if (padding.length === 2) {
    return `${padding[0]}px ${padding[1]}px`;
  }

  if (padding.length === 4) {
    return `${padding[0]}px ${padding[1]}px ${padding[2]}px ${padding[3]}px`;
  }

  if (padding.length === 1) {
    return `${padding[0]}px`;
  }

  return '';
}

function mapAlignValue(value) {
  if (!value) {
    return '';
  }

  const known = {
    space_between: 'space-between',
    start: 'flex-start',
    end: 'flex-end',
    center: 'center',
  };

  return known[value] ?? value;
}

function applyStroke(el, stroke) {
  if (!stroke || !stroke.fill || !stroke.thickness) {
    return;
  }

  const color = stroke.fill;
  const thickness = stroke.thickness;

  if (typeof thickness === 'number') {
    el.style.border = `${thickness}px solid ${color}`;
    return;
  }

  if (typeof thickness !== 'object') {
    return;
  }

  const top = thickness.top ?? 0;
  const right = thickness.right ?? 0;
  const bottom = thickness.bottom ?? 0;
  const left = thickness.left ?? 0;

  if (top > 0) {
    el.style.borderTop = `${top}px solid ${color}`;
  }

  if (right > 0) {
    el.style.borderRight = `${right}px solid ${color}`;
  }

  if (bottom > 0) {
    el.style.borderBottom = `${bottom}px solid ${color}`;
  }

  if (left > 0) {
    el.style.borderLeft = `${left}px solid ${color}`;
  }
}

function applySizing(el, node, parentLayout) {
  if (typeof node.width === 'number') {
    el.style.width = `${node.width}px`;
  } else if (node.width === 'fill_container') {
    if (parentLayout === 'horizontal') {
      el.style.flex = '1 1 0';
      el.style.minWidth = '0';
    } else {
      el.style.width = '100%';
    }
  } else if (node.width === 'fit_content') {
    el.style.width = 'fit-content';
  }

  if (typeof node.height === 'number') {
    el.style.height = `${node.height}px`;
  } else if (node.height === 'fill_container') {
    if (parentLayout === 'vertical') {
      if (!el.style.flex) {
        el.style.flex = '1 1 0';
      }
      el.style.minHeight = '0';
    } else {
      el.style.height = '100%';
    }
  } else if (node.height === 'fit_content') {
    el.style.height = 'fit-content';
  }
}

const LUCIDE_ICON_NODES = {
  'arrow-left': [
    { tag: 'line', attrs: { x1: '19', y1: '12', x2: '5', y2: '12' } },
    { tag: 'polyline', attrs: { points: '12 19 5 12 12 5' } },
  ],
  'arrow-right': [
    { tag: 'line', attrs: { x1: '5', y1: '12', x2: '19', y2: '12' } },
    { tag: 'polyline', attrs: { points: '12 5 19 12 12 19' } },
  ],
  check: [{ tag: 'polyline', attrs: { points: '20 6 9 17 4 12' } }],
  copy: [
    {
      tag: 'rect',
      attrs: { x: '9', y: '9', width: '13', height: '13', rx: '2', ry: '2' },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',
      },
    },
  ],
  'chevron-down': [{ tag: 'polyline', attrs: { points: '6 9 12 15 18 9' } }],
  'chevron-up': [{ tag: 'polyline', attrs: { points: '18 15 12 9 6 15' } }],
  'chevron-right': [{ tag: 'polyline', attrs: { points: '9 18 15 12 9 6' } }],
  'chevron-left': [{ tag: 'polyline', attrs: { points: '15 18 9 12 15 6' } }],
  x: [
    { tag: 'line', attrs: { x1: '18', y1: '6', x2: '6', y2: '18' } },
    { tag: 'line', attrs: { x1: '6', y1: '6', x2: '18', y2: '18' } },
  ],
  view: [
    {
      tag: 'path',
      attrs: {
        d: 'M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0',
      },
    },
    { tag: 'circle', attrs: { cx: '12', cy: '12', r: '3' } },
  ],
  plus: [
    { tag: 'line', attrs: { x1: '12', y1: '5', x2: '12', y2: '19' } },
    { tag: 'line', attrs: { x1: '5', y1: '12', x2: '19', y2: '12' } },
  ],
  minus: [{ tag: 'line', attrs: { x1: '5', y1: '12', x2: '19', y2: '12' } }],
  search: [
    { tag: 'circle', attrs: { cx: '11', cy: '11', r: '8' } },
    { tag: 'line', attrs: { x1: '21', y1: '21', x2: '16.65', y2: '16.65' } },
  ],
};

function createLucideIcon(name) {
  const nodes = LUCIDE_ICON_NODES[name];
  if (!nodes) {
    return null;
  }

  const svgNs = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNs, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');

  for (const node of nodes) {
    const child = document.createElementNS(svgNs, node.tag);
    for (const [key, value] of Object.entries(node.attrs)) {
      child.setAttribute(key, value);
    }
    svg.appendChild(child);
  }

  return svg;
}

function renderNode(node, parentLayout = null) {
  const el = document.createElement('div');
  const nodeType = node.type || 'unknown';
  const children = Array.isArray(node.children) ? node.children : [];

  el.className = 'pen-node';
  el.dataset.type = nodeType;
  el.dataset.nodeId = node.id ?? '';

  if (node.fill) {
    if (nodeType === 'text' || nodeType === 'icon_font') {
      el.style.color = node.fill;
    } else {
      el.style.background = node.fill;
    }
  }

  applyStroke(el, node.stroke);
  applySizing(el, node, parentLayout);

  if (node.padding !== undefined) {
    const padding = normalizePadding(node.padding);
    if (padding) {
      el.style.padding = padding;
    }
  }

  if (node.gap !== undefined) {
    el.style.gap = cssValue(node.gap);
  }

  if (nodeType === 'text') {
    el.textContent = node.content ?? '';
    if (node.fontFamily) {
      el.style.fontFamily = `"${node.fontFamily}", sans-serif`;
    }
    if (node.fontSize !== undefined) {
      el.style.fontSize = cssValue(node.fontSize);
    }
    if (node.fontWeight !== undefined) {
      el.style.fontWeight = String(node.fontWeight);
    }
    if (node.letterSpacing !== undefined) {
      el.style.letterSpacing = cssValue(node.letterSpacing);
    }

    return el;
  }

  if (nodeType === 'icon_font') {
    const iconName = node.iconFontName;
    const icon = createLucideIcon(iconName);

    if (icon) {
      el.appendChild(icon);
    } else {
      el.textContent = iconName?.slice(0, 1)?.toUpperCase() ?? '?';
    }

    if (node.width !== undefined && typeof node.width === 'number') {
      el.style.width = `${node.width}px`;
    } else {
      el.style.width = '14px';
    }

    if (node.height !== undefined && typeof node.height === 'number') {
      el.style.height = `${node.height}px`;
    } else {
      el.style.height = '14px';
    }

    if (node.iconFontFamily) {
      el.title = `${node.iconFontFamily}:${node.iconFontName}`;
    }

    return el;
  }

  if (children.length > 0) {
    el.style.display = 'flex';
    const layout = node.layout === 'vertical' ? 'column' : 'row';
    el.style.flexDirection = layout;

    if (node.justifyContent) {
      el.style.justifyContent = mapAlignValue(node.justifyContent);
    }
    if (node.alignItems) {
      el.style.alignItems = mapAlignValue(node.alignItems);
    }

    const childLayout = node.layout === 'vertical' ? 'vertical' : 'horizontal';
    for (const child of children) {
      el.appendChild(renderNode(child, childLayout));
    }
  }

  return el;
}

function stripLatte(name) {
  if (typeof name !== 'string') {
    return '';
  }

  return name
    .split('/')
    .map((part) => part.trim())
    .filter((part) => part && part.toLowerCase() !== 'latte')
    .join(' / ');
}

function splitNameParts(name) {
  return stripLatte(name)
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);
}

function titleFromName(name) {
  const parts = splitNameParts(name);
  return parts.slice(-3).join(' / ');
}

function sectionFromName(name) {
  const parts = splitNameParts(name);
  return parts.slice(0, 4).join(' / ');
}

function autoSummary(name) {
  if (name.includes('/ Loading /')) {
    return 'Loading state for this flow surface.';
  }
  if (name.includes('/ Error /')) {
    return 'Error state for this flow surface.';
  }
  if (name.includes('/ Empty /') || name.includes('/ No Data /')) {
    return 'Empty or no-data state for this flow surface.';
  }
  if (name.includes('/ No Profile /')) {
    return 'State when an SSP has no profile context attached.';
  }
  if (name.includes('Prototype /')) {
    return 'Focused prototype intended to test and communicate editor behavior.';
  }
  return 'Primary SSP page view in the redesign flow.';
}

function fallbackOldUi(frame) {
  if (frame.name.includes('/ Loading /')) {
    return ['Old UI used a lightweight loading placeholder for this area.'];
  }

  if (frame.name.includes('/ Error /')) {
    return ['Old UI showed a basic inline error message for this area.'];
  }

  if (frame.name.includes('/ Empty /') || frame.name.includes('/ No Data /')) {
    return ['Old UI showed a simple inline empty or no-data message.'];
  }

  return ['Old UI behavior notes are being filled for this frame.'];
}

function fallbackNewDesign(frame) {
  if (frame.name.includes('Prototype /')) {
    return [
      'This frame represents a focused editor prototype in the new flow.',
    ];
  }

  return ['This frame is part of the redesigned SSP workflow.'];
}

function fallbackWhy(frame) {
  if (
    frame.name.includes('/ Loading /') ||
    frame.name.includes('/ Error /') ||
    frame.name.includes('/ Empty /')
  ) {
    return ['Adds clearer and more consistent state handling.'];
  }

  return ['Improves clarity and consistency versus the old implementation.'];
}

function renderBulletList(container, bullets) {
  container.innerHTML = '';
  for (const bullet of bullets) {
    const li = document.createElement('li');
    li.textContent = bullet;
    container.appendChild(li);
  }
}

function updateNotes(frame) {
  const notes = FLOW_NOTES[frame.id] ?? {};

  els.notesTitle.textContent = stripLatte(
    notes.title ?? titleFromName(frame.name),
  );
  els.notesSection.textContent = stripLatte(
    notes.section ?? sectionFromName(frame.name),
  );
  els.notesSummary.textContent = notes.summary ?? autoSummary(frame.name);
  els.metaId.textContent = frame.id;
  els.metaName.textContent = stripLatte(frame.name);
  els.metaSize.textContent = `${frame.width} x ${frame.height}`;

  renderBulletList(els.oldUiBullets, notes.oldUi ?? fallbackOldUi(frame));
  renderBulletList(
    els.newDesignBullets,
    notes.newDesign ?? fallbackNewDesign(frame),
  );
  renderBulletList(els.whyBullets, notes.why ?? fallbackWhy(frame));
}

function syncQuery(frameId) {
  const url = new URL(window.location.href);
  url.searchParams.set('frame', frameId);
  window.history.replaceState(null, '', url.toString());
}

function frameFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('frame');
  if (!id) {
    return null;
  }

  if (!frameById.has(id)) {
    return null;
  }

  return id;
}

function updateScale(frame) {
  const viewportRect = els.frameViewport.getBoundingClientRect();
  const frameWidth = Number(frame.width) || 1;
  const frameHeight = Number(frame.height) || 1;

  const viewportStyles = window.getComputedStyle(els.frameViewport);
  const paddingLeft = parseFloat(viewportStyles.paddingLeft) || 0;
  const paddingRight = parseFloat(viewportStyles.paddingRight) || 0;
  const availableWidth = Math.max(
    viewportRect.width - paddingLeft - paddingRight,
    1,
  );

  let scale = 1;
  if (state.fitMode) {
    scale = Math.min(availableWidth / frameWidth, 1);
  }

  const clampedScale = Math.max(scale, 0.05);
  const scaledWidth = Math.round(frameWidth * clampedScale);
  const scaledHeight = Math.round(frameHeight * clampedScale);

  els.frameCanvasWrap.style.width = `${scaledWidth}px`;
  els.frameCanvasWrap.style.height = `${scaledHeight}px`;
  els.frameCanvas.style.transform = `scale(${clampedScale})`;
  els.frameViewport.classList.toggle('mode-1to1', !state.fitMode);
}

function renderCurrentFrame() {
  const frameId = orderedIds[state.currentIndex];
  const frame = frameById.get(frameId);
  if (!frame) {
    return;
  }

  els.frameCanvas.innerHTML = '';
  els.frameCanvas.style.width = `${frame.width}px`;
  els.frameCanvas.style.height = `${frame.height}px`;

  const root = renderNode(frame, null);
  root.classList.add('presentation-root');
  els.frameCanvas.appendChild(root);

  els.frameCounter.textContent = `Frame ${state.currentIndex + 1} / ${orderedIds.length}`;
  els.frameSelect.value = frame.id;
  els.prevBtn.disabled = state.currentIndex === 0;
  els.leftArrow.disabled = state.currentIndex === 0;
  els.nextBtn.disabled = state.currentIndex === orderedIds.length - 1;
  els.rightArrow.disabled = state.currentIndex === orderedIds.length - 1;
  els.fitBtn.textContent = state.fitMode ? 'Fit Width' : '1:1';

  updateNotes(frame);
  updateScale(frame);
  els.frameViewport.scrollTop = 0;
  els.frameViewport.scrollLeft = 0;
  syncQuery(frame.id);
}

function goToIndex(index) {
  if (index < 0 || index >= orderedIds.length) {
    return;
  }
  state.currentIndex = index;
  renderCurrentFrame();
}

function goNext() {
  goToIndex(state.currentIndex + 1);
}

function goPrev() {
  goToIndex(state.currentIndex - 1);
}

function toggleFit() {
  state.fitMode = !state.fitMode;
  renderCurrentFrame();
}

async function toggleFullscreen() {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }

  document.body.classList.add('fullscreen-active');
  await document.getElementById('viewerStage').requestFullscreen();
}

function initSelect() {
  const fragment = document.createDocumentFragment();

  for (const [index, id] of orderedIds.entries()) {
    const frame = frameById.get(id);
    const option = document.createElement('option');
    option.value = id;
    option.textContent = `${String(index + 1).padStart(2, '0')} - ${titleFromName(frame.name)}`;
    fragment.appendChild(option);
  }

  els.frameSelect.appendChild(fragment);
}

function attachEvents() {
  els.prevBtn.addEventListener('click', goPrev);
  els.nextBtn.addEventListener('click', goNext);
  els.leftArrow.addEventListener('click', goPrev);
  els.rightArrow.addEventListener('click', goNext);

  els.fitBtn.addEventListener('click', toggleFit);
  els.fullscreenBtn.addEventListener('click', toggleFullscreen);

  els.frameSelect.addEventListener('change', (event) => {
    const id = event.target.value;
    const idx = orderedIds.indexOf(id);
    if (idx >= 0) {
      goToIndex(idx);
    }
  });

  window.addEventListener('resize', () => {
    const frame = frameById.get(orderedIds[state.currentIndex]);
    if (frame) {
      updateScale(frame);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLSelectElement
    ) {
      return;
    }

    if (event.key === 'ArrowRight') {
      goNext();
    }

    if (event.key === 'ArrowLeft') {
      goPrev();
    }

    if (event.key.toLowerCase() === 'f') {
      toggleFullscreen().catch(() => {});
    }
  });

  document.addEventListener('fullscreenchange', () => {
    const isFullscreen = Boolean(document.fullscreenElement);
    document.body.classList.toggle('fullscreen-active', isFullscreen);
    els.fullscreenBtn.textContent = isFullscreen
      ? 'Exit Full Screen'
      : 'Full Screen';

    const frame = frameById.get(orderedIds[state.currentIndex]);
    if (frame) {
      updateScale(frame);
    }
  });
}

function boot() {
  if (orderedIds.length === 0) {
    throw new Error('No frames found for presentation.');
  }

  initSelect();
  attachEvents();

  const queryFrame = frameFromQuery();
  if (queryFrame) {
    const idx = orderedIds.indexOf(queryFrame);
    if (idx >= 0) {
      state.currentIndex = idx;
    }
  }

  renderCurrentFrame();
}

boot();
