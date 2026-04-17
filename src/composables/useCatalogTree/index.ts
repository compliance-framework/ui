import { ref, toValue } from 'vue';
import type { MaybeRefOrGetter } from '@vueuse/core';
import type { Catalog, Control, Group } from '@/oscal';

function sortNodes(nodes: Array<TreeNode>): Array<TreeNode> {
  return nodes.sort((a, b) =>
    a.key.localeCompare(b.key, undefined, {
      numeric: true,
      sensitivity: 'base',
    }),
  );
}

type TreeNodeSource =
  | Catalog
  | Group
  | { groups?: Group[]; controls?: Control[] };

function buildGroupNode(group: Group, keyPrefix: string): TreeNode {
  const key = `${keyPrefix}:group:${group.id}`;
  return {
    key,
    label: group.title,
    type: 'group',
    data: group,
    children: buildTreeNodes(group, key),
  };
}

function buildControlNode(control: Control, keyPrefix: string): TreeNode {
  const key = `${keyPrefix}:control:${control.id}`;
  return {
    key,
    label: control.title,
    type: 'control',
    data: control,
    children: buildTreeNodes({ controls: control.controls }, key),
  };
}

function buildTreeNodes(
  node: TreeNodeSource,
  keyPrefix: string,
): Array<TreeNode> {
  return [
    ...sortNodes((node.groups ?? []).map((g) => buildGroupNode(g, keyPrefix))),
    ...sortNodes(
      (node.controls ?? []).map((c) => buildControlNode(c, keyPrefix)),
    ),
  ];
}

export function buildTreeNodesWithPrefix(
  node: TreeNodeSource,
  keyPrefix: string,
): Array<TreeNode> {
  return buildTreeNodes(node, keyPrefix);
}

export interface TreeNode {
  key: string;
  label: string;
  type: string;
  data: Control | Group;
  children?: Array<TreeNode>;
}

export const useCatalogTree = () => {
  const nodes = ref<Array<TreeNode>>([]);
  const expandedKeys = ref<{ [key: string]: boolean }>({});

  function build(catalog: MaybeRefOrGetter<Catalog>) {
    nodes.value = buildChildren(toValue(catalog));
  }

  function buildChildren(node: Group | Catalog): Array<TreeNode> {
    return [
      ...buildGroups(...(node.groups ?? [])),
      ...buildControls(...(node.controls ?? [])),
    ];
  }

  function buildControlChildren(node: Control): Array<TreeNode> {
    return [...buildControls(...(node.controls ?? []))];
  }

  function buildControls(...controls: Array<Control>): Array<TreeNode> {
    let result = [] as Array<TreeNode>;
    controls.forEach((control) => {
      result.push({
        key: control.id,
        label: control.title,
        type: 'control',
        data: control,
        children: buildControlChildren(control),
      });
    });
    result = result.sort((a, b) =>
      a.key.localeCompare(b.key, undefined, {
        numeric: true,
        sensitivity: 'base',
      }),
    );
    return result;
  }

  function buildGroups(...groups: Array<Group>): Array<TreeNode> {
    let result = [] as Array<TreeNode>;
    groups.forEach((group) => {
      result.push({
        key: group.id,
        label: group.title,
        type: 'group',
        data: group,
        children: buildChildren(group),
      });
    });
    result = result.sort((a, b) =>
      a.key.localeCompare(b.key, undefined, {
        numeric: true,
        sensitivity: 'base',
      }),
    );
    return result;
  }

  function expandAll() {
    for (const node of nodes.value) {
      expandNode(node);
    }

    expandedKeys.value = { ...expandedKeys.value };
  }

  function collapseAll() {
    expandedKeys.value = {};
  }

  function expandNode(node: TreeNode) {
    if (node.children && node.children.length) {
      expandedKeys.value[node.key] = true;

      for (const child of node.children) {
        expandNode(child);
      }
    }
  }

  return {
    nodes,
    build,

    expandedKeys,
    expandAll,
    collapseAll,
    expandNode,
  };
};
