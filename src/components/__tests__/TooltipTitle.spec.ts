import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import TooltipTitle from '../TooltipTitle.vue';

// Mock the tooltips config
vi.mock('@/config/tooltips', () => ({
  getTooltipText: (key: string) => {
    const mockTooltips: Record<string, string> = {
      'test.key': 'This is a test tooltip',
      'another.key': 'Another tooltip text',
      'empty.key': '',
    };
    return mockTooltips[key];
  },
}));

describe('TooltipTitle', () => {
  describe('Basic Rendering', () => {
    it('renders the title text', () => {
      const wrapper = mount(TooltipTitle, {
        props: {
          text: 'Test Title',
          tooltipKey: 'test.key',
        },
      });
      expect(wrapper.text()).toBe('Test Title');
    });

    it('renders as a span element', () => {
      const wrapper = mount(TooltipTitle, {
        props: {
          text: 'Test Title',
          tooltipKey: 'test.key',
        },
      });
      const span = wrapper.find('span');
      expect(span.exists()).toBe(true);
      expect(span.element.tagName).toBe('SPAN');
    });
  });

  describe('Tooltip Key Behavior', () => {
    it('applies underline class when tooltip exists via tooltip-key', () => {
      const wrapper = mount(TooltipTitle, {
        props: {
          text: 'Test Title',
          tooltipKey: 'test.key',
        },
      });
      const span = wrapper.find('span');
      expect(span.classes()).toContain('underline');
      expect(span.classes()).toContain('decoration-dotted');
      expect(span.classes()).toContain('cursor-help');
    });

    it('does not apply underline when tooltip-key has empty value', () => {
      const wrapper = mount(TooltipTitle, {
        props: {
          text: 'Test Title',
          tooltipKey: 'empty.key',
        },
      });
      const span = wrapper.find('span');
      expect(span.classes()).not.toContain('underline');
      expect(span.classes()).not.toContain('decoration-dotted');
      expect(span.classes()).not.toContain('cursor-help');
    });

    it('does not apply underline when tooltip-key does not exist', () => {
      const wrapper = mount(TooltipTitle, {
        props: {
          text: 'Test Title',
          tooltipKey: 'nonexistent.key',
        },
      });
      const span = wrapper.find('span');
      expect(span.classes()).not.toContain('underline');
      expect(span.classes()).not.toContain('decoration-dotted');
      expect(span.classes()).not.toContain('cursor-help');
    });
  });

  describe('Tooltip Text Behavior', () => {
    it('applies underline class when tooltip exists via tooltip-text', () => {
      const wrapper = mount(TooltipTitle, {
        props: {
          text: 'Test Title',
          tooltipText: 'Direct tooltip text',
        },
      });
      const span = wrapper.find('span');
      expect(span.classes()).toContain('underline');
      expect(span.classes()).toContain('decoration-dotted');
      expect(span.classes()).toContain('cursor-help');
    });

    it('does not apply underline when tooltip-text is empty', () => {
      const wrapper = mount(TooltipTitle, {
        props: {
          text: 'Test Title',
          tooltipText: '',
        },
      });
      const span = wrapper.find('span');
      expect(span.classes()).not.toContain('underline');
      expect(span.classes()).not.toContain('decoration-dotted');
      expect(span.classes()).not.toContain('cursor-help');
    });

    it('prioritizes tooltip-key over tooltip-text when both provided', () => {
      const wrapper = mount(TooltipTitle, {
        props: {
          text: 'Test Title',
          tooltipKey: 'test.key',
          tooltipText: 'This should be ignored',
        },
      });
      // Should use tooltip-key, which exists, so should have underline
      const span = wrapper.find('span');
      expect(span.classes()).toContain('underline');
    });
  });

  describe('Position Prop', () => {
    it('defaults to bottom position', () => {
      const wrapper = mount(TooltipTitle, {
        props: {
          text: 'Test Title',
          tooltipText: 'Test tooltip',
        },
      });
      // Component should render (position is used internally for v-tooltip directive)
      expect(wrapper.exists()).toBe(true);
    });

    it('accepts top position', () => {
      const wrapper = mount(TooltipTitle, {
        props: {
          text: 'Test Title',
          tooltipText: 'Test tooltip',
          position: 'top',
        },
      });
      expect(wrapper.exists()).toBe(true);
    });

    it('accepts left position', () => {
      const wrapper = mount(TooltipTitle, {
        props: {
          text: 'Test Title',
          tooltipText: 'Test tooltip',
          position: 'left',
        },
      });
      expect(wrapper.exists()).toBe(true);
    });

    it('accepts right position', () => {
      const wrapper = mount(TooltipTitle, {
        props: {
          text: 'Test Title',
          tooltipText: 'Test tooltip',
          position: 'right',
        },
      });
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe('Custom Underline Class', () => {
    it('applies custom underline class when provided', () => {
      const wrapper = mount(TooltipTitle, {
        props: {
          text: 'Test Title',
          tooltipText: 'Test tooltip',
          underlineClass:
            'text-xl font-bold underline decoration-dotted cursor-help',
        },
      });
      const span = wrapper.find('span');
      expect(span.classes()).toContain('text-xl');
      expect(span.classes()).toContain('font-bold');
      expect(span.classes()).toContain('underline');
    });

    it('removes underline-related classes when no tooltip', () => {
      const wrapper = mount(TooltipTitle, {
        props: {
          text: 'Test Title',
          tooltipKey: 'empty.key',
          underlineClass:
            'text-xl font-bold underline decoration-dotted cursor-help',
        },
      });
      // Should keep text-xl and font-bold but remove underline classes
      const span = wrapper.find('span');
      expect(span.classes()).toContain('text-xl');
      expect(span.classes()).toContain('font-bold');
      expect(span.classes()).not.toContain('underline');
      expect(span.classes()).not.toContain('cursor-help');
    });
  });

  describe('No Tooltip Scenario', () => {
    it('renders plain text without any tooltip props', () => {
      const wrapper = mount(TooltipTitle, {
        props: {
          text: 'Plain Title',
        },
      });
      expect(wrapper.text()).toBe('Plain Title');
      const span = wrapper.find('span');
      expect(span.classes()).not.toContain('underline');
    });

    it('renders plain text when both tooltip-key and tooltip-text are undefined', () => {
      const wrapper = mount(TooltipTitle, {
        props: {
          text: 'Plain Title',
          tooltipKey: undefined,
          tooltipText: undefined,
        },
      });
      expect(wrapper.text()).toBe('Plain Title');
      const span = wrapper.find('span');
      expect(span.classes()).not.toContain('underline');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty text prop', () => {
      const wrapper = mount(TooltipTitle, {
        props: {
          text: '',
          tooltipText: 'Test tooltip',
        },
      });
      expect(wrapper.text()).toBe('');
      expect(wrapper.exists()).toBe(true);
    });

    it('handles very long tooltip text', () => {
      const longTooltip = 'A'.repeat(500);
      const wrapper = mount(TooltipTitle, {
        props: {
          text: 'Test Title',
          tooltipText: longTooltip,
        },
      });
      expect(wrapper.exists()).toBe(true);
      const span = wrapper.find('span');
      expect(span.classes()).toContain('underline');
    });

    it('handles special characters in text', () => {
      const wrapper = mount(TooltipTitle, {
        props: {
          text: 'Test & Title <with> "special" \'chars\'',
          tooltipText: 'Test tooltip',
        },
      });
      expect(wrapper.text()).toBe('Test & Title <with> "special" \'chars\'');
    });
  });
});
