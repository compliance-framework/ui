import { ref, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { useDataApi } from '@/composables/axios';
import type { Catalog, Control, Group } from '@/oscal';

export interface ControlOption {
  label: string;
  value: string; // the control id (unique within its catalog)
}

// Flattens every control in a catalog into a flat option list: root-level
// controls, controls nested in groups at any depth, and control children.
//
// Unlike useControlList (which only walks catalog.groups), this includes
// root-level controls. Policy and procedure catalogs are authored without
// groups — their controls sit directly on catalog.controls — so a group-only
// walk would return nothing for exactly the catalogs control links care about.
export function useControlOptions(
  catalogId: MaybeRefOrGetter<string | null | undefined>,
) {
  const { execute } = useDataApi<Catalog>(null, null, {
    immediate: false,
    abortPrevious: false,
  });
  const options = ref<ControlOption[]>([]);
  const loading = ref(false);

  // Monotonic token guards against out-of-order responses when the catalog is
  // switched faster than a request resolves (abortPrevious is false). A stale
  // load must not overwrite a newer selection's options — mirrors the
  // evidenceRequestKey/sspRequestKey pattern in LineageNodeDrawer.
  let requestToken = 0;

  watch(() => toValue(catalogId), load, { immediate: true });

  async function load() {
    const id = toValue(catalogId);
    const token = ++requestToken;
    options.value = [];
    if (!id) return;
    loading.value = true;
    try {
      const res = await execute(`/api/oscal/catalogs/${id}/full`);
      if (token !== requestToken) return; // superseded by a newer load
      const catalog = res.data.value?.data;
      if (catalog) {
        options.value = flattenCatalog(catalog);
      }
    } catch (error) {
      console.error('[useControlOptions] failed to load catalog', id, error);
    } finally {
      // Only the latest load owns the loading flag.
      if (token === requestToken) loading.value = false;
    }
  }

  return { options, loading };
}

function flattenCatalog(catalog: Catalog): ControlOption[] {
  const out: ControlOption[] = [];
  for (const control of catalog.controls ?? []) collectControl(control, out);
  for (const group of catalog.groups ?? []) collectGroup(group, out);
  return out;
}

function collectGroup(group: Group, out: ControlOption[]) {
  for (const control of group.controls ?? []) collectControl(control, out);
  for (const child of group.groups ?? []) collectGroup(child, out);
}

function collectControl(control: Control, out: ControlOption[]) {
  out.push({
    label: control.title ? `${control.id} · ${control.title}` : control.id,
    value: control.id,
  });
  for (const child of control.controls ?? []) collectControl(child, out);
}
