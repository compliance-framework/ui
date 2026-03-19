<template>
  <div
    class="border rounded-lg bg-gray-50 dark:bg-slate-800 p-4 overflow-x-auto"
  >
    <div v-if="steps.length === 0" class="text-center py-8 text-gray-400">
      <i class="pi pi-sitemap text-4xl"></i>
      <p class="mt-2">No steps to visualize</p>
    </div>

    <svg v-else :width="svgWidth" :height="svgHeight" class="mx-auto">
      <!-- Arrows (connections) -->
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="currentColor"
            class="text-gray-400 dark:text-slate-500"
          />
        </marker>
      </defs>

      <!-- Connection lines -->
      <g>
        <path
          v-for="(connection, idx) in connections"
          :key="`conn-${idx}`"
          :d="connection.path"
          fill="none"
          stroke="currentColor"
          :stroke-width="connection.highlighted ? 3 : 2"
          marker-end="url(#arrowhead)"
          :class="[
            connection.highlighted
              ? 'text-blue-500 dark:text-blue-400'
              : 'text-gray-400 dark:text-slate-500',
          ]"
        />
      </g>

      <!-- Step nodes -->
      <g
        v-for="node in nodes"
        :key="node.id"
        :transform="`translate(${node.x}, ${node.y})`"
        :class="[
          'cursor-pointer transition-opacity',
          hasFocusedSelection && !isNodeInFocus(node.id) ? 'opacity-60' : '',
        ]"
        @click="emit('stepClick', node.id)"
      >
        <!-- Node background -->
        <rect
          :width="nodeWidth"
          :height="nodeHeight"
          rx="8"
          ry="8"
          :class="[
            node.id === selectedStepId
              ? 'fill-blue-100 stroke-blue-500 dark:fill-blue-900 dark:stroke-blue-400'
              : highlightedDependencyIds.has(node.id)
                ? 'fill-blue-50 stroke-blue-300 dark:fill-blue-900/40 dark:stroke-blue-500'
                : hasFocusedSelection
                  ? 'fill-gray-100 stroke-gray-200 dark:fill-slate-800 dark:stroke-slate-700 opacity-60'
                  : 'fill-white stroke-gray-300 dark:fill-slate-700 dark:stroke-slate-600',
          ]"
          stroke-width="2"
        />

        <!-- Step number -->
        <circle
          :cx="16"
          :cy="16"
          r="12"
          class="fill-gray-200 dark:fill-slate-600"
        />
        <text
          x="16"
          y="20"
          text-anchor="middle"
          class="text-xs font-medium fill-gray-600 dark:fill-slate-300"
        >
          {{ node.order }}
        </text>

        <!-- Step name -->
        <text
          :x="36"
          y="20"
          class="text-sm font-medium fill-gray-900 dark:fill-slate-200"
        >
          {{ truncateText(node.name, 20) }}
        </text>

        <!-- Step role (if any) -->
        <text
          v-if="node.role"
          :x="36"
          y="38"
          class="text-xs fill-gray-500 dark:fill-slate-400"
        >
          {{ truncateText(node.role, 25) }}
        </text>

        <!-- Indicators -->
        <g :transform="`translate(${nodeWidth - 40}, 8)`">
          <circle
            v-if="node.evidenceRequired"
            cx="8"
            cy="8"
            r="6"
            class="fill-amber-400"
            title="Evidence Required"
          />
          <circle
            v-if="node.hasDependencies"
            cx="24"
            cy="8"
            r="6"
            class="fill-blue-400"
            title="Has Dependencies"
          />
        </g>
      </g>
    </svg>

    <!-- Legend -->
    <div
      class="flex gap-4 justify-center mt-4 text-xs text-gray-500 dark:text-slate-400"
    >
      <div class="flex items-center gap-1">
        <span class="w-3 h-3 rounded-full bg-amber-400"></span>
        Evidence Required
      </div>
      <div class="flex items-center gap-1">
        <span class="w-3 h-3 rounded-full bg-blue-400"></span>
        Has Dependencies
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { hasEvidenceRequirement } from '@/utils/workflows';
import type { StepDefinition } from '@/types/workflows';

const props = defineProps<{
  steps: StepDefinition[];
  selectedStepId?: string | null;
}>();

const emit = defineEmits<{
  stepClick: [stepId: string];
}>();

// DAG Layout Constants
const DAG_CONFIG = {
  NODE_WIDTH: 200,
  NODE_HEIGHT: 50,
  HORIZONTAL_GAP: 120,
  VERTICAL_GAP: 40,
  PADDING: 20,
  SORT_THRESHOLD: 0.001,
} as const;

const nodeWidth = DAG_CONFIG.NODE_WIDTH;
const nodeHeight = DAG_CONFIG.NODE_HEIGHT;
const horizontalGap = DAG_CONFIG.HORIZONTAL_GAP;
const verticalGap = DAG_CONFIG.VERTICAL_GAP;

const selectedStep = computed(() => {
  if (!props.selectedStepId) return null;
  return props.steps.find((step) => step.id === props.selectedStepId) ?? null;
});

const highlightedDependencyIds = computed(() => {
  const step = selectedStep.value;
  if (!step || !step.dependsOn) {
    return new Set<string>();
  }
  return new Set(
    step.dependsOn
      .map((dep) => dep?.dependsOnStepId)
      .filter((id): id is string => typeof id === 'string' && id.length > 0),
  );
});

const hasFocusedSelection = computed(() => !!props.selectedStepId);

const isNodeInFocus = (nodeId: string): boolean => {
  if (!hasFocusedSelection.value) return true;
  if (props.selectedStepId === nodeId) return true;
  return highlightedDependencyIds.value.has(nodeId);
};

interface NodePosition {
  id: string;
  name: string;
  order: number;
  role?: string;
  evidenceRequired: boolean;
  hasDependencies: boolean;
  x: number;
  y: number;
  level: number;
}

interface Connection {
  from: string;
  to: string;
  path: string;
  highlighted: boolean;
}

function getParentIds(step: StepDefinition): string[] {
  return (step.dependsOn ?? [])
    .map((dep) => dep?.dependsOnStepId)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
}

function getAnchorY(node: NodePosition, index: number, total: number): number {
  if (total <= 1) {
    return node.y + nodeHeight / 2;
  }
  const spacing = nodeHeight / (total + 1);
  return node.y + spacing * (index + 1);
}

function buildDependencyMaps(steps: StepDefinition[]) {
  const dependencyMap = new Map<string, string[]>();
  const dependentMap = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();

  steps.forEach((step) => {
    const parentIds = getParentIds(step);
    dependencyMap.set(step.id, parentIds);
    inDegree.set(step.id, parentIds.length);

    parentIds.forEach((parentId) => {
      if (!dependentMap.has(parentId)) {
        dependentMap.set(parentId, new Set());
      }
      dependentMap.get(parentId)!.add(step.id);
    });

    if (!dependentMap.has(step.id)) {
      dependentMap.set(step.id, new Set());
    }
  });

  return { dependencyMap, dependentMap, inDegree };
}

function computeDownstreamLevels(
  steps: StepDefinition[],
  dependentMap: Map<string, Set<string>>,
): Map<string, number> {
  const downstreamLevels = new Map<string, number>();

  const computeDepth = (stepId: string, visited: Set<string>): number => {
    if (downstreamLevels.has(stepId)) {
      return downstreamLevels.get(stepId)!;
    }
    if (visited.has(stepId)) {
      return 0;
    }
    visited.add(stepId);

    const children = Array.from(dependentMap.get(stepId) ?? []);
    if (children.length === 0) {
      downstreamLevels.set(stepId, 0);
      visited.delete(stepId);
      return 0;
    }

    const depth =
      Math.max(...children.map((childId) => computeDepth(childId, visited))) +
      1;
    downstreamLevels.set(stepId, depth);
    visited.delete(stepId);
    return depth;
  };

  let maxDepth = 0;
  steps.forEach((step) => {
    const depth = computeDepth(step.id, new Set());
    if (depth > maxDepth) {
      maxDepth = depth;
    }
  });

  return downstreamLevels;
}

function assignLevelsToSteps(
  steps: StepDefinition[],
  downstreamLevels: Map<string, number>,
  dependencyMap: Map<string, string[]>,
  dependentMap: Map<string, Set<string>>,
): Map<string, number> {
  const maxDepth = Math.max(...Array.from(downstreamLevels.values()));
  const levelMap = new Map<string, number>();

  steps.forEach((step) => {
    const depth = downstreamLevels.get(step.id) ?? 0;
    levelMap.set(step.id, maxDepth - depth);
  });

  steps.forEach((step) => {
    const children = dependentMap.get(step.id) ?? new Set();
    const parents = dependencyMap.get(step.id) ?? [];
    if (children.size === 0 && parents.length > 0) {
      const parentLevels = parents
        .map((parentId) => levelMap.get(parentId))
        .filter((value): value is number => typeof value === 'number');
      if (parentLevels.length > 0) {
        const candidate = Math.max(...parentLevels) + 1;
        const currentLevel = levelMap.get(step.id) ?? candidate;
        levelMap.set(step.id, Math.min(currentLevel, candidate));
      }
    }
  });

  return levelMap;
}

function groupStepsByLevel(
  steps: StepDefinition[],
  levelMap: Map<string, number>,
): Map<number, StepDefinition[]> {
  const levelGroups = new Map<number, StepDefinition[]>();
  steps.forEach((step) => {
    const level = levelMap.get(step.id) ?? 0;
    if (!levelGroups.has(level)) {
      levelGroups.set(level, []);
    }
    levelGroups.get(level)!.push(step);
  });
  return levelGroups;
}

function calculateNodePositions(
  levelGroups: Map<number, StepDefinition[]>,
  dependencyMap: Map<string, string[]>,
): NodePosition[] {
  const maxStepsInLevel = Math.max(
    ...Array.from(levelGroups.values()).map((group) => group.length),
    1,
  );

  const positions: NodePosition[] = [];
  const positionsMap = new Map<string, NodePosition>();
  const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => a - b);

  const getSortKey = (step: StepDefinition): number => {
    const parents = dependencyMap.get(step.id) ?? [];
    if (parents.length === 0) {
      return step.order;
    }

    const parentPositions = parents
      .map((parentId) => positionsMap.get(parentId)?.y)
      .filter((value): value is number => typeof value === 'number');

    if (parentPositions.length === 0) {
      return step.order;
    }

    return (
      parentPositions.reduce((sum, value) => sum + value, 0) /
      parentPositions.length
    );
  };

  sortedLevels.forEach((level) => {
    const stepsInLevel = levelGroups.get(level)!;
    const sorted = stepsInLevel.slice().sort((a, b) => {
      const keyDiff = getSortKey(a) - getSortKey(b);
      if (Math.abs(keyDiff) > DAG_CONFIG.SORT_THRESHOLD) {
        return keyDiff;
      }
      return a.order - b.order;
    });

    const levelX = level * (nodeWidth + horizontalGap) + DAG_CONFIG.PADDING;
    const totalHeight =
      sorted.length * (nodeHeight + verticalGap) - verticalGap;
    const startY =
      (maxStepsInLevel * (nodeHeight + verticalGap) - totalHeight) / 2 +
      DAG_CONFIG.PADDING;

    sorted.forEach((step, idx) => {
      const evidenceRequired = hasEvidenceRequirement(step.evidenceRequired);
      const node: NodePosition = {
        id: step.id,
        name: step.name,
        order: step.order,
        role: step.responsibleRole,
        evidenceRequired,
        hasDependencies: (step.dependsOn?.length || 0) > 0,
        x: levelX,
        y: startY + idx * (nodeHeight + verticalGap),
        level,
      };

      positions.push(node);
      positionsMap.set(step.id, node);
    });
  });

  return positions;
}

// Build a dependency graph and compute levels using topological layering
const nodes = computed<NodePosition[]>(() => {
  if (props.steps.length === 0) return [];

  const { dependencyMap, dependentMap } = buildDependencyMaps(props.steps);
  const downstreamLevels = computeDownstreamLevels(props.steps, dependentMap);
  const levelMap = assignLevelsToSteps(
    props.steps,
    downstreamLevels,
    dependencyMap,
    dependentMap,
  );
  const levelGroups = groupStepsByLevel(props.steps, levelMap);
  return calculateNodePositions(levelGroups, dependencyMap);
});

const connections = computed<Connection[]>(() => {
  const conns: Connection[] = [];
  const nodeMap = new Map(nodes.value.map((n) => [n.id, n]));

  const incomingCounts = new Map<string, number>();
  const outgoingCounts = new Map<string, number>();

  props.steps.forEach((step) => {
    const parents = getParentIds(step);
    incomingCounts.set(step.id, parents.length);
    parents.forEach((parentId) => {
      outgoingCounts.set(parentId, (outgoingCounts.get(parentId) ?? 0) + 1);
    });
  });

  // Ensure nodes with no dependencies have count entries
  nodes.value.forEach((node) => {
    if (!incomingCounts.has(node.id)) {
      incomingCounts.set(node.id, 0);
    }
    if (!outgoingCounts.has(node.id)) {
      outgoingCounts.set(node.id, 0);
    }
  });

  const outgoingUsage = new Map<string, number>();
  const incomingUsage = new Map<string, number>();

  props.steps.forEach((step) => {
    getParentIds(step).forEach((parentId) => {
      const fromNode = nodeMap.get(parentId);
      const toNode = nodeMap.get(step.id);

      if (!fromNode || !toNode) {
        return;
      }

      const startIndex = outgoingUsage.get(parentId) ?? 0;
      outgoingUsage.set(parentId, startIndex + 1);
      const endIndex = incomingUsage.get(step.id) ?? 0;
      incomingUsage.set(step.id, endIndex + 1);

      const totalOutgoing = outgoingCounts.get(parentId) ?? 1;
      const totalIncoming = incomingCounts.get(step.id) ?? 1;

      const startX = fromNode.x + nodeWidth;
      const startY = getAnchorY(
        fromNode,
        startIndex,
        Math.max(1, totalOutgoing),
      );
      const endX = toNode.x;
      const endY = getAnchorY(toNode, endIndex, Math.max(1, totalIncoming));

      const path = `M ${startX} ${startY} L ${endX} ${endY}`;

      conns.push({
        from: parentId,
        to: step.id,
        path,
        highlighted: !!props.selectedStepId && props.selectedStepId === step.id,
      });
    });
  });

  return conns;
});

const svgWidth = computed(() => {
  if (nodes.value.length === 0) return 400;
  const maxX = Math.max(...nodes.value.map((n) => n.x + nodeWidth));
  return maxX + DAG_CONFIG.PADDING * 2;
});

const svgHeight = computed(() => {
  if (nodes.value.length === 0) return 200;
  const maxY = Math.max(...nodes.value.map((n) => n.y + nodeHeight));
  return maxY + DAG_CONFIG.PADDING * 2;
});

function truncateText(text: string | undefined, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}
</script>
