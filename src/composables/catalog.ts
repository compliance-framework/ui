import { useDeleteConfirmationDialog } from '@/utils/delete-dialog';
import { useToast } from 'primevue/usetoast';
import { useDataApi } from '@/composables/axios';
import type { AxiosRequestConfig } from 'axios';
import type { Catalog } from '@/oscal';

/** Namespace under which the CCF backend stamps catalog metadata props. */
export const CATALOG_TYPE_NS = 'https://compliance-framework.github.io/ns';

/**
 * Prop the backend stamps to mark a catalog inactive. Mirroring `catalog-type`,
 * it is only emitted when the catalog deviates from the default (active), so an
 * absent prop means the catalog is active.
 */
export const CATALOG_ACTIVE_PROP = 'catalog-active';

export type CatalogType =
  | 'standard'
  | 'policy'
  | 'procedure'
  | 'internal'
  | 'other';

/**
 * Resolve a catalog's type from its OSCAL metadata props. The backend only
 * emits the `catalog-type` prop when the type deviates from the default, so an
 * absent prop means `standard`.
 */
export function catalogType(catalog: Catalog): CatalogType {
  const prop = catalog.metadata?.props?.find(
    (p) => p.name === 'catalog-type' && p.ns === CATALOG_TYPE_NS,
  );
  return (prop?.value as CatalogType | undefined) ?? 'standard';
}

/**
 * Whether a catalog is active. The backend only emits the `catalog-active`
 * prop (value `"false"`) when the catalog is inactive, so an absent prop — or
 * any value other than `"false"` — means active.
 */
export function isCatalogActive(catalog: Catalog): boolean {
  const prop = catalog.metadata?.props?.find(
    (p) => p.name === CATALOG_ACTIVE_PROP && p.ns === CATALOG_TYPE_NS,
  );
  return prop?.value !== 'false';
}

/**
 * Return a copy of `catalog` with its active state applied, mirroring how the
 * backend stamps the `catalog-active` prop (present with value `"false"` when
 * inactive, absent when active). Used to reflect a toggle locally without a
 * refetch.
 */
export function withCatalogActive(catalog: Catalog, active: boolean): Catalog {
  const props = (catalog.metadata?.props ?? []).filter(
    (p) => !(p.name === CATALOG_ACTIVE_PROP && p.ns === CATALOG_TYPE_NS),
  );
  if (!active) {
    props.push({
      name: CATALOG_ACTIVE_PROP,
      ns: CATALOG_TYPE_NS,
      value: 'false',
    });
  }
  return {
    ...catalog,
    metadata: { ...catalog.metadata, props },
  };
}

/**
 * Toggle a catalog's active flag via `PUT /oscal/catalogs/:id/active`. The
 * backend echoes the updated catalog; `onSuccess` receives the new active state
 * so callers can reflect it locally (see {@link withCatalogActive}).
 */
export function useCatalogActiveToggle() {
  const toast = useToast();
  const { execute } = useDataApi<Catalog>(
    '/api/oscal/catalogs',
    { method: 'PUT', headers: { 'Content-Type': 'application/json' } },
    { immediate: false },
  );

  async function setCatalogActive(
    uuid: string,
    title: string,
    active: boolean,
    onSuccess?: () => void,
  ) {
    try {
      await execute(`/api/oscal/catalogs/${uuid}/active`, {
        method: 'PUT',
        data: { active },
      });
      toast.add({
        severity: 'success',
        summary: active ? 'Catalog activated' : 'Catalog deactivated',
        detail: `Catalog "${title}" ${
          active ? 'activated' : 'deactivated'
        } successfully`,
        life: 3000,
      });
      onSuccess?.();
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Update failed',
        detail:
          error instanceof Error
            ? error.message
            : `Failed to ${active ? 'activate' : 'deactivate'} catalog.`,
        life: 3000,
      });
    }
  }

  return { setCatalogActive };
}

export function useCatalogDelete() {
  const toast = useToast();
  const { confirmDeleteDialog } = useDeleteConfirmationDialog();
  const { execute: del } = useDataApi<void>(
    '/api/oscal/catalogs',
    {},
    { immediate: false },
  );

  async function deleteCatalog(
    uuid: string,
    title: string,
    onSuccess?: () => void,
    requestConfig?: AxiosRequestConfig,
  ) {
    await confirmDeleteDialog(
      async () => {
        try {
          await del(`/api/oscal/catalogs/${uuid}`, {
            method: 'DELETE',
            ...(requestConfig || {}),
          });
          toast.add({
            severity: 'success',
            summary: 'Catalog deleted',
            detail: `Catalog "${title}" deleted successfully`,
            life: 3000,
          });
          onSuccess?.();
        } catch (error) {
          toast.add({
            severity: 'error',
            summary: 'Delete Failed',
            detail:
              error instanceof Error
                ? error.message
                : 'Failed to delete catalog.',
            life: 3000,
          });
        }
      },
      { itemName: title, itemType: 'catalog' },
    );
  }

  return { deleteCatalog };
}
