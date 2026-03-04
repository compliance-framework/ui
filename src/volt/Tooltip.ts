import type { TooltipContext } from 'primevue/tooltip';
export default {
  directives: {
    tooltip: {
      root: ({ context }: { context?: TooltipContext }) => ({
        class: [
          'absolute max-w-[24rem]',
          {
            'py-0 px-1':
              context?.right ||
              context?.left ||
              (!context?.right &&
                !context?.left &&
                !context?.top &&
                !context?.bottom),
            'py-1 px-0': context?.top || context?.bottom,
          },
        ],
      }),
      arrow: ({ context }: { context?: TooltipContext }) => ({
        class: [
          'absolute w-0 h-0 border-transparent border-solid',
          {
            '-mt-1 border-y-[0.25rem] border-r-[0.25rem] border-l-0 border-r-[var(--ui-v2-card)]':
              context?.right ||
              (!context?.right &&
                !context?.left &&
                !context?.top &&
                !context?.bottom),
            '-mt-1 border-y-[0.25rem] border-l-[0.25rem] border-r-0 border-l-[var(--ui-v2-card)]':
              context?.left,
            '-ml-1 border-x-[0.25rem] border-t-[0.25rem] border-b-0 border-t-[var(--ui-v2-card)]':
              context?.top,
            '-ml-1 border-x-[0.25rem] border-b-[0.25rem] border-t-0 border-b-[var(--ui-v2-card)]':
              context?.bottom,
          },
        ],
      }),
      text: {
        class:
          'whitespace-pre-line break-words border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-3 text-sm text-[var(--ui-v2-foreground)] shadow-md',
      },
    },
  },
};
