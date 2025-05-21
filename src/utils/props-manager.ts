import type { Property } from '@/stores/types.ts';

class PropertyManager {
  props: Property[];

  constructor(props: Property[]) {
    this.props = props;
  }

  getValueByName(name: string, defaultValue: string = ''): string {
    for (const prop of this.props) {
      if (prop.name === name) {
        return prop?.value || '';
      }
    }
    return defaultValue;
  }
}

export function usePropertyManager(props: Property[]) {
  const manager = new PropertyManager(props)

  return { manager }
}
