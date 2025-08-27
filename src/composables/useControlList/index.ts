import { ref, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue';
import { useDataApi } from '@/composables/axios';
import type { Catalog, Control } from '@/oscal';
import type { ErrorBody, ErrorResponse } from '@/stores/types';
import type { AxiosError } from 'axios';

export interface ControlOption {
  label: string;
  value: string;
}

export interface SelectControl {
  label: string;
  code: string;
  items: ControlOption[];
}

export interface ControlListResponse {
  controls: Ref<SelectControl[]>;
  error: Ref<string | ErrorResponse<unknown> | null>;
}

const createControlList = (
  catalogUUIDs: MaybeRefOrGetter<string[]>,
): ControlListResponse => {
  const { execute: fetchFullCatalog } = useDataApi<Catalog>(null, null, {
    abortPrevious: false,
  });
  const controls = ref<SelectControl[]>([]);
  const catalogIDs = toValue(catalogUUIDs);
  const errorRef = ref<string | ErrorResponse<unknown> | null>(null);

  watch(catalogUUIDs, buildControlList, { immediate: true });

  async function buildControlList() {
    catalogIDs.forEach(async (catalogUUID) => {
      try {
        const response = await fetchFullCatalog(
          `/api/oscal/catalogs/${catalogUUID}/full`,
        );
        const results = [] as SelectControl[];
        response.data.value?.data.groups.forEach((group) => {
          let controlList = [] as ControlOption[];
          if (group.controls) {
            group.controls.forEach((control) => {
              controlList = [...controlList, ...getControlSelectList(control)];
            });

            results.push({
              label: group.title,
              code: group.id,
              items: controlList,
            });
          }
        });
        controls.value = [...controls.value, ...results];
      } catch (error) {
        const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
        console.error('Error fetching full catalog:', errorResponse);
        errorRef.value =
          errorResponse.response?.data || 'An unknown error occurred';
      }
    });
  }

  function getControlSelectList(control: Control): ControlOption[] {
    let results = [] as ControlOption[];

    if (control.controls) {
      control.controls.forEach((cont) => {
        let subResults = [] as ControlOption[];
        if (cont.controls && cont.controls.length > 0) {
          subResults = getControlSelectList(cont);
        }
        results.push({
          label: cont.id + ' ' + cont.title,
          value: cont.id,
        });
        results = [...results, ...subResults];
      });
    } else {
      results.push({
        label: control.id + ' ' + control.title,
        value: control.id,
      });
    }

    return results;
  }

  return { controls, error: errorRef };
};

export { createControlList };
