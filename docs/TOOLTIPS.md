# Tooltip System Documentation

## Overview

CCF uses a centralized tooltip system that makes it easy to add contextual help throughout the application. All tooltip text is defined in one place, making it simple to add, update, or translate tooltips without searching through component files.

## How It Works

### 1. Centralized Configuration

All tooltip text is defined in `/Users/gusfcarvalho/Documents/repos/cs/ccf/ui/src/config/tooltips.ts`:

```typescript
export const TOOLTIPS = {
  'control.implementation.statement': 'Control Statement is how you...',
  'system.users': 'Users who have access to...',
  // Add more here
} as const;
```

### 2. TooltipTitle Component

The `TooltipTitle` component (`/src/components/TooltipTitle.vue`) automatically:

- Looks up tooltip text from the centralized config using a `tooltip-key`
- Shows an underlined, dotted title when a tooltip exists
- Shows a plain title when no tooltip is defined
- Supports custom styling via `underline-class` prop

## Adding a New Tooltip

### Step 1: Add the tooltip text to the config

Edit `/src/config/tooltips.ts` and add your tooltip:

```typescript
export const TOOLTIPS = {
  // Existing tooltips...

  // Your new tooltip
  'my.feature.title': 'This is the helpful explanation for my feature',
} as const;
```

**Naming Convention:**

- Use dot notation: `category.subcategory.name`
- Be descriptive but concise
- Examples:
  - `control.implementation.components`
  - `system.users`
  - `evidence.dashboard.linking`

### Step 2: Use TooltipTitle in your component

```vue
<template>
  <TooltipTitle
    text="My Feature Title"
    tooltip-key="my.feature.title"
    position="bottom"
  />
</template>

<script setup lang="ts">
import TooltipTitle from '@/components/TooltipTitle.vue';
</script>
```

That's it! The component will automatically:

- Show the underlined title with tooltip on hover
- If you later remove the tooltip from the config, it will show as plain text

## Component Props

### TooltipTitle Props

| Prop              | Type                                     | Required | Default                                     | Description                           |
| ----------------- | ---------------------------------------- | -------- | ------------------------------------------- | ------------------------------------- |
| `text`            | `string`                                 | Yes      | -                                           | The title text to display             |
| `tooltip-key`     | `string`                                 | No       | -                                           | Key to lookup tooltip from config     |
| `tooltip-text`    | `string`                                 | No       | -                                           | Direct tooltip text (bypasses config) |
| `position`        | `'top' \| 'bottom' \| 'left' \| 'right'` | No       | `'bottom'`                                  | Tooltip position                      |
| `underline-class` | `string`                                 | No       | `'underline decoration-dotted cursor-help'` | CSS classes for styling               |

**Note:** Use either `tooltip-key` (recommended) or `tooltip-text`, not both. `tooltip-key` takes precedence.

## Examples

### Basic Usage (Recommended)

```vue
<TooltipTitle
  text="Components"
  tooltip-key="control.implementation.components"
/>
```

### Custom Styling

```vue
<TooltipTitle
  text="System Users"
  tooltip-key="system.users"
  underline-class="text-lg font-semibold underline decoration-dotted cursor-help"
/>
```

### Direct Text (Not Recommended)

```vue
<TooltipTitle
  text="Quick Tooltip"
  tooltip-text="This bypasses the centralized config"
/>
```

### No Tooltip (Shows Plain Text)

```vue
<!-- If 'nonexistent.key' is not in config, shows plain text without underline -->
<TooltipTitle text="Plain Title" tooltip-key="nonexistent.key" />
```

## Current Tooltips

See `/src/config/tooltips.ts` for the complete list of available tooltip keys.

## Best Practices

1. **Always use `tooltip-key`** instead of `tooltip-text` for consistency
2. **Keep tooltip text concise** - 1-2 sentences max
3. **Use descriptive keys** - `control.implementation.statement` not `cis`
4. **Group related tooltips** - Use dot notation to organize by feature area
5. **Update the config file** - Don't scatter tooltip text across components

## Benefits

✅ **Easy to add tooltips** - Just add to one file  
✅ **Easy to update** - Change in one place, updates everywhere  
✅ **Easy to translate** - All text in one location  
✅ **Easy to audit** - See all tooltips at a glance  
✅ **Automatic fallback** - Missing tooltips show plain text, no errors  
✅ **Type-safe** - TypeScript ensures valid keys

## Migration

To convert an existing title to use tooltips:

**Before:**

```vue
<h3>My Title</h3>
```

**After:**

```vue
<TooltipTitle
  text="My Title"
  tooltip-key="my.title.key"
  underline-class="text-lg font-semibold underline decoration-dotted cursor-help"
/>
```

Then add to `/src/config/tooltips.ts`:

```typescript
'my.title.key': 'Helpful explanation here',
```
