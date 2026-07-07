import { describe, expect, it } from 'vitest';
import {
  CATALOG_ACTIVE_PROP,
  CATALOG_TYPE_NS,
  isCatalogActive,
  withCatalogActive,
} from '@/composables/catalog';
import type { Catalog } from '@/oscal';

function catalogWithProps(props: Catalog['metadata']['props']): Catalog {
  return { uuid: 'c1', metadata: { title: 'C1', props } } as Catalog;
}

describe('isCatalogActive', () => {
  it('treats an absent catalog-active prop as active', () => {
    expect(isCatalogActive(catalogWithProps(undefined))).toBe(true);
    expect(isCatalogActive(catalogWithProps([]))).toBe(true);
  });

  it('is inactive only when the prop value is exactly "false"', () => {
    expect(
      isCatalogActive(
        catalogWithProps([
          { name: CATALOG_ACTIVE_PROP, ns: CATALOG_TYPE_NS, value: 'false' },
        ]),
      ),
    ).toBe(false);
    expect(
      isCatalogActive(
        catalogWithProps([
          { name: CATALOG_ACTIVE_PROP, ns: CATALOG_TYPE_NS, value: 'true' },
        ]),
      ),
    ).toBe(true);
  });

  it('ignores a same-named prop in a different namespace', () => {
    expect(
      isCatalogActive(
        catalogWithProps([
          { name: CATALOG_ACTIVE_PROP, ns: 'other-ns', value: 'false' },
        ]),
      ),
    ).toBe(true);
  });
});

describe('withCatalogActive', () => {
  it('stamps the prop when deactivating and drops it when activating', () => {
    const active = catalogWithProps(undefined);
    const deactivated = withCatalogActive(active, false);
    expect(isCatalogActive(deactivated)).toBe(false);
    expect(
      deactivated.metadata.props?.some(
        (p) => p.name === CATALOG_ACTIVE_PROP && p.value === 'false',
      ),
    ).toBe(true);

    const reactivated = withCatalogActive(deactivated, true);
    expect(isCatalogActive(reactivated)).toBe(true);
    expect(
      reactivated.metadata.props?.some((p) => p.name === CATALOG_ACTIVE_PROP),
    ).toBe(false);
  });

  it('preserves unrelated props and never mutates the input', () => {
    const original = catalogWithProps([
      { name: 'catalog-type', ns: CATALOG_TYPE_NS, value: 'policy' },
    ]);
    const deactivated = withCatalogActive(original, false);

    expect(
      deactivated.metadata.props?.some((p) => p.name === 'catalog-type'),
    ).toBe(true);
    // input untouched
    expect(original.metadata.props).toHaveLength(1);
  });

  it('does not duplicate the prop when toggled repeatedly', () => {
    const once = withCatalogActive(catalogWithProps(undefined), false);
    const twice = withCatalogActive(once, false);
    expect(
      twice.metadata.props?.filter((p) => p.name === CATALOG_ACTIVE_PROP),
    ).toHaveLength(1);
  });
});
