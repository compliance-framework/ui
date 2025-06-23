export default {
  directives: {
      tooltip: {
        root: ({ context }) => ({
                class: [
                    'absolute max-w-[24rem]',
                    {
                        'py-0 px-1': context?.right || context?.left || (!context?.right && !context?.left && !context?.top && !context?.bottom),
                        'py-1 px-0': context?.top || context?.bottom
                    }
                ]
            }),
            arrow: ({ context }) => ({
                class: [
                    'absolute w-0 h-0 border-transparent border-solid',
                    {
                        '-mt-1 border-y-[0.25rem] border-r-[0.25rem] border-l-0 border-r-slate-900 dark:border-r-slate-700': context?.right || (!context?.right && !context?.left && !context?.top && !context?.bottom),
                        '-mt-1 border-y-[0.25rem] border-l-[0.25rem] border-r-0 border-l-slate-900 dark:border-l-slate-700': context?.left,
                        '-ml-1 border-x-[0.25rem] border-t-[0.25rem] border-b-0 border-t-slate-900 dark:border-t-slate-700': context?.top,
                        '-ml-1 border-x-[0.25rem] border-b-[0.25rem] border-t-0 border-b-slate-900 dark:border-b-slate-700': context?.bottom
                    }
                ]
            }),
            text: {
                class: 'p-3 bg-slate-900 dark:bg-slate-700 text-sm text-white rounded-md shadow-md whitespace-pre-line break-words'
            }
      }
    }
}
