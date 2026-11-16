# Tooltips

Shared help text lives in one place, `src/config/tooltips.ts`, keyed by dotted names:

```typescript
export const TOOLTIPS = {
  'agents.config.instance.oneShot': 'A one-shot run …',
} as const;
```

Show it with the design system's `InfoTip`, a focusable button that opens the text on hover,
focus or tap, so keyboard and touch users can reach it:

```vue
<script setup lang="ts">
import InfoTip from '@/ds/components/InfoTip/InfoTip.vue';
import { TOOLTIPS } from '@/config/tooltips';
</script>

<template>
  <InfoTip :text="TOOLTIPS['agents.config.instance.oneShot']" />
</template>
```

For a button that can't be used right now, don't add a tip: give `Button` or `IconButton` a
`disabled-reason` (a sentence saying why), which the design system shows and announces.

Keep the text short and plain, in sentence case, and say what the thing is or does. Add a key
here when the same help appears in more than one place; one-off text can sit in the component.
