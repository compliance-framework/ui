import { ref, toValue } from 'vue';
import type { Property } from '@/oscal';
import type { MaybeRefOrGetter } from '@vueuse/core';

export const useProps = (properties: Property[] | undefined | null = null) => {
  const props = ref<Property[]>(properties || []);

  function firstOf(...names: string[]): Property | null | undefined {
    for (const name of names) {
      for (const prop of props.value) {
        if (prop.name === name) {
          return prop;
        }
      }
    }
  }

  function firstOfProps(
    properties: MaybeRefOrGetter<Property[]> = [],
    ...names: string[]
  ): Property | null | undefined {
    for (const name of names) {
      for (const prop of toValue(properties)) {
        if (prop.name === name) {
          return prop;
        }
      }
    }
  }

  return {
    props,
    firstOf,
    firstOfProps,
  };
};
