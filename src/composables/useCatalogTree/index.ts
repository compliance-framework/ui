import type { Catalog, Control, Group } from '@/oscal'
import { ref, toValue } from 'vue'
import type { MaybeRefOrGetter } from '@vueuse/core'

export interface TreeNode {
  key: string
  label: string
  type: string;
  data: Control | Group;
  children?: Array<TreeNode>
}

export const useCatalogTree = () => {
  const nodes = ref<Array<TreeNode>>([])
  const expandedKeys = ref<{[key: string]: boolean}>({})

  function build(catalog: MaybeRefOrGetter<Catalog>) {
    nodes.value = buildChildren(toValue(catalog))
  }

  function buildChildren(node: Group | Catalog): Array<TreeNode> {
    return [...buildGroups(...node.groups??[]), ...buildControls(...node.controls??[])]
  }

  function buildControlChildren(node: Control): Array<TreeNode> {
    return [...buildControls(...node.controls??[])]
  }

  function buildControls(...controls: Array<Control>): Array<TreeNode> {
    const result = [] as Array<TreeNode>
    controls.forEach(control => {
      result.push({
        key: control.id,
        label: control.title,
        type: 'control',
        data: control,
        children: buildControlChildren(control),
      })
    })
    return result
  }

  function buildGroups(...groups: Array<Group>): Array<TreeNode> {
    const result = [] as Array<TreeNode>
    groups.forEach(group => {
      result.push({
        key: group.id,
        label: group.title,
        type: 'group',
        data: group,
        children: buildChildren(group),
      })
    })
    return result
  }

  function expandAll() {
    for (const node of nodes.value) {
      expandNode(node);
    }

    expandedKeys.value = { ...expandedKeys.value };
  };

  function collapseAll() {
    expandedKeys.value = {};
  };

  function expandNode(node: TreeNode) {
    if (node.children && node.children.length) {
      expandedKeys.value[node.key] = true;

      for (const child of node.children) {
        expandNode(child);
      }
    }
  };

  return {
    nodes,
    build,

    expandedKeys,
    expandAll,
    collapseAll,
    expandNode,
  };
};
