# Error Handling Guidelines

## Overview

The CCF UI exposes a consistent set of utilities for surfacing errors. These helpers separate transport concerns (Axios responses) from application-level failures and give developers the choice of presenting feedback as a toast or a modal dialog.

## Available Utilities

### `formatAxiosError`

**Location:** `src/utils/error-formatting.ts`

Converts an `AxiosError` into `{ summary, detail, statusCode }`, pulling useful information from the HTTP response.

### `formatError`

**Location:** `src/utils/error-formatting.ts`

Normalizes any thrown value (plain `Error`, string, custom object) into the same structure as `formatAxiosError`. Use this when the failure is not an Axios response.

### `useErrorToast`

**Location:** `src/composables/useErrorToast.ts`

Watches a reactive Axios error ref (e.g., from `useDataApi`) and automatically emits a PrimeVue toast with formatted details. Returns a `showErrorToast` helper for manual invocation.

### `useAxiosErrorDialog`

**Location:** `src/composables/useAxiosErrorDialog.ts`

Watches an Axios error ref and opens the shared error dialog when a failure occurs. Also exposes `showAxiosErrorDialog` for manual use.

### `errorDialog` service

**Location:** `src/services/error-dialog.ts`

Service-style API with methods:

- `errorDialog.show({...})` – display a dialog given explicit summary/detail.
- `errorDialog.showAxiosError(error, options)` – convenience wrapper around `formatAxiosError`.
- `errorDialog.showError(error, options)` – convenience wrapper around `formatError`.
- `errorDialog.hide()` – close the dialog programmatically.

### `ErrorDialogHost` component

**Location:** `src/components/notifications/ErrorDialogHost.vue`

Renders a global dialog surface driven by the service above. It is already mounted in `src/App.vue`.

---

## Choosing a Tool

- Use **`useErrorToast`** for straightforward Axios error refs (list/detail views, data tables) when a toast is sufficient.
- Use **`useAxiosErrorDialog`** when the user must acknowledge a failure before continuing.
- Call **`errorDialog.showAxiosError`** inside `catch` blocks for manual flows (e.g., form submissions, CRUD actions).
- Use **`formatError`** for non-Axios failures before calling `toast.add` or `errorDialog.showError`.

---

## Usage Examples

### 1. Toast on List Fetch Failure

```vue
<script setup lang="ts">
import { useDataApi } from '@/composables/axios';
import { useErrorToast } from '@/composables/useErrorToast';
import type { CCFUser } from '@/stores/types';

const {
  data: users,
  isLoading,
  error,
} = useDataApi<CCFUser[]>('/api/users', {}, { immediate: false });

useErrorToast(error, {
  summary: 'Error loading users',
  life: 3000,
});
</script>
```

### 2. Dialog on Critical Fetch Failure

```vue
<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { useDataApi } from '@/composables/axios';
import { useAxiosErrorDialog } from '@/composables/useAxiosErrorDialog';
import type { CCFUser } from '@/stores/types';

const route = useRoute();
const router = useRouter();

const { data: user, error } = useDataApi<CCFUser>(
  `/api/users/${route.params.id}`,
);

useAxiosErrorDialog(error, {
  summary: 'Error loading user',
  onClose: () => router.push({ name: 'users-list' }),
});
</script>
```

### 3. Form Submission with Toast

```ts
import { useToast } from 'primevue/usetoast';
import { formatAxiosError } from '@/utils/error-formatting';
import type { AxiosError } from 'axios';
import type { ErrorBody, ErrorResponse } from '@/stores/types';

const toast = useToast();

async function saveUser() {
  try {
    await apiCall();
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'User updated successfully.',
      life: 3000,
    });
  } catch (err) {
    const formatted = formatAxiosError(
      err as AxiosError<ErrorResponse<ErrorBody>>,
    );
    toast.add({
      severity: 'error',
      summary: `Error updating user: ${formatted.summary}`,
      detail: formatted.detail,
      life: 4000,
    });
  }
}
```

### 4. Manual Dialog from Catch Block

```ts
import { errorDialog } from '@/services/error-dialog';

try {
  await deleteThing();
} catch (err) {
  errorDialog.showError(err, {
    summary: 'Delete failed',
    onClose: () => console.log('Dialog dismissed'),
  });
}
```

---

## Checklist Before Shipping

- [ ] Decide between toast or dialog based on UX (non-blocking vs requiring acknowledgment).
- [ ] Use `useErrorToast` or `useAxiosErrorDialog` when working with `useDataApi` error refs.
- [ ] In manual `try/catch` blocks:
  - [ ] Call `formatAxiosError` for Axios failures.
  - [ ] Call `formatError` for non-Axios failures.
  - [ ] Pass the formatted output to `toast.add` **or** `errorDialog.show`.
- [ ] Ensure any navigation or recovery logic runs after the toast/dialog logic so the user sees the feedback.
