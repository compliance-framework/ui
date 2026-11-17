import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import BrandMark from '../components/BrandMark/BrandMark.vue';

describe('BrandMark', () => {
  it('is a decorative mark drawn in the text colour', () => {
    const svg = mount(BrandMark).find('svg');
    expect(svg.attributes('aria-hidden')).toBe('true');
    expect(svg.attributes('fill')).toBe('currentColor');
    expect(svg.classes()).toContain('brand-mark--md');
  });

  it('takes a larger size', () => {
    const svg = mount(BrandMark, { props: { size: 'lg' } }).find('svg');
    expect(svg.classes()).toContain('brand-mark--lg');
  });
});
