# Error Handling Guidelines

## Overview

This document describes the standardized approach for handling errors from Axios HTTP requests in the CCF UI application. We provide two complementary utilities to ensure consistent, user-friendly error messages across the application.

## Available Utilities

### 1. `formatAxiosError` (Utility Function)

**Location:** `src/utils/error-formatting.ts`

A utility function that formats `AxiosError` objects into user-friendly messages with HTTP status codes and API error details.

### 2. `useErrorToast` (Composable)

**Location:** `src/composables/useErrorToast.ts`

A Vue composable that automatically watches error refs and displays toast notifications. Built on top of `formatAxiosError`.

---

## When to Use Each Approach

### Use `useErrorToast` Composable For:

✅ **Simple list/detail views** - When you just need to show an error toast  
✅ **Reactive error refs** - Errors from `useDataApi` or `useGuestApi`  
✅ **Automatic error handling** - When no additional logic is needed  
✅ **Loading/error states** - Simple data fetching scenarios

**Example use cases:**

- User list views
- Data tables
- Simple detail pages
- Read-only displays

### Use `formatAxiosError` Utility Directly For:

✅ **Try-catch blocks** - Errors caught in async functions  
✅ **Complex error handling** - When you need additional logic  
✅ **Form submissions** - Create/update/delete operations  
✅ **Custom error messages** - When you need full control  
✅ **Multiple error scenarios** - Different handling for different errors

**Example use cases:**

- Form submissions
- Multi-step operations
- Error handling with redirects
- Conditional error responses

---

## Usage Examples

### Pattern 1: Simple List View (useErrorToast)

**Before:**

```vue
<template>
  <template v-else-if="error">
    <tr>
      <td colspan="4" class="text-center text-red-500">Error loading users</td>
    </tr>
  </template>
</template>

<script setup lang="ts">
const { data: users, isLoading, error } = useDataApi<User[]>('/api/users');
</script>
```

**After:**

```vue
<template>
  <template v-else-if="error">
    <tr>
      <td colspan="4" class="text-center text-red-500">Error loading users</td>
    </tr>
  </template>
</template>

<script setup lang="ts">
import { useErrorToast } from '@/composables/useErrorToast';

const { data: users, isLoading, error } = useDataApi<User[]>('/api/users');

// Automatically show toast when error occurs
useErrorToast(error, {
  summary: 'Error loading users',
  life: 3000,
});
</script>
```

**Benefits:**

- ✅ Users get a toast notification (won't miss the error)
- ✅ Toast includes HTTP status code (e.g., "Error loading users: 404 Not Found")
- ✅ Detailed API error message shown
- ✅ Only 1 line of code added

---

### Pattern 2: Try-Catch in Form Submission (formatAxiosError)

**Before:**

```typescript
try {
  await executeCreate({ data: assessmentResults });
  toast.add({
    severity: 'success',
    summary: 'Success',
    detail: 'Assessment Results created successfully',
  });
} catch (err) {
  const errorMessage = err instanceof Error ? err.message : 'Unknown error';
  toast.add({
    severity: 'error',
    summary: 'Error',
    detail: `Failed to create Assessment Results: ${errorMessage}`,
    life: 5000,
  });
}
```

**After:**

```typescript
import { formatAxiosError } from '@/utils/error-formatting';
import type { AxiosError } from 'axios';
import type { ErrorResponse, ErrorBody } from '@/stores/types';

try {
  await executeCreate({ data: assessmentResults });
  toast.add({
    severity: 'success',
    summary: 'Success',
    detail: 'Assessment Results created successfully',
  });
} catch (err) {
  const error = err as AxiosError<ErrorResponse<ErrorBody>>;
  const formatted = formatAxiosError(error);

  toast.add({
    severity: 'error',
    summary: `Failed to create Assessment Results: ${formatted.summary}`,
    detail: formatted.detail,
    life: 5000,
  });
}
```

**Benefits:**

- ✅ Shows HTTP status code in summary
- ✅ Extracts API error message from response
- ✅ Handles network errors gracefully
- ✅ Consistent error formatting

---

### Pattern 3: Watch Error with Custom Logic (useErrorToast with manual control)

**Before:**

```typescript
watch(error, (err) => {
  if (err) {
    const errorResponse = err as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Error loading user',
      detail:
        errorResponse.response?.data.errors.body ||
        'An error occurred while loading the user data.',
      life: 3000,
    });
    router.push({ name: 'users-list' });
  }
});
```

**After:**

```typescript
import { useErrorToast } from '@/composables/useErrorToast';

const { showErrorToast } = useErrorToast(error, {
  summary: 'Error loading user',
  autoShow: false, // Disable automatic toast
});

watch(error, (err) => {
  if (err) {
    showErrorToast(err);
    router.push({ name: 'users-list' });
  }
});
```

**Benefits:**

- ✅ Simplified error formatting
- ✅ Consistent with other error handling
- ✅ Still allows custom logic (redirect)

---

## Advanced Usage

### Custom Error Message Extraction

When you need different error messages based on status codes or other conditions:

```typescript
import { useErrorToast } from '@/composables/useErrorToast';

const { data, error } = useDataApi<AssessmentResult>('/api/assessment-results');

useErrorToast(error, {
  summary: 'Assessment Error',
  extractMessage: (err) => {
    // Custom logic based on status code
    if (err.response?.status === 404) {
      return 'Assessment result not found. It may have been deleted.';
    }
    if (err.response?.status === 403) {
      return 'You do not have permission to view this assessment.';
    }
    // Fallback to API error message
    return (
      err.response?.data?.errors?.body || 'Failed to load assessment results'
    );
  },
});
```

### Configuring Toast Lifetime

```typescript
useErrorToast(error, {
  summary: 'Critical Error',
  life: 10000, // Show for 10 seconds instead of default 5
});
```

---

## Error Message Priority

The utilities extract error messages in this order of preference:

1. **API Error Body** - `response.data.errors.body` (most specific)
2. **Axios Error Message** - `error.message` (general error)
3. **Network Error Message** - Special message for connection issues
4. **Generic Fallback** - "An unexpected error occurred. Please try again."

---

## HTTP Status Code Mapping

The utilities automatically map status codes to user-friendly titles:

| Status Code | Title               |
| ----------- | ------------------- |
| 400         | Bad Request         |
| 401         | Unauthorized        |
| 403         | Forbidden           |
| 404         | Not Found           |
| 409         | Conflict            |
| 422         | Validation Error    |
| 429         | Too Many Requests   |
| 500         | Server Error        |
| 502         | Bad Gateway         |
| 503         | Service Unavailable |
| 504         | Gateway Timeout     |
| Other       | Error {code}        |

---

## Best Practices

### ✅ Do This:

1. **Always provide a summary** - Helps users understand what operation failed

   ```typescript
   useErrorToast(error, { summary: 'Error loading users' });
   ```

2. **Keep inline error displays** - For accessibility (screen readers, visual cues)

   ```vue
   <template v-else-if="error">
     <td class="text-red-500">Error loading data</td>
   </template>
   ```

3. **Use appropriate toast lifetime** - 3-5 seconds for info, 5-10 for errors

   ```typescript
   useErrorToast(error, { life: 5000 });
   ```

4. **Cast errors properly in try-catch** - Ensures type safety
   ```typescript
   const error = err as AxiosError<ErrorResponse<ErrorBody>>;
   ```

### ❌ Avoid This:

1. **Don't remove inline error displays** - Some users may miss toasts
2. **Don't use generic summaries** - "Error" is less helpful than "Error loading users"
3. **Don't ignore status codes** - They provide valuable context
4. **Don't skip error handling** - All API calls should handle errors

---

## Migration Checklist

When updating a component to use the new utilities:

- [ ] Import the appropriate utility (`useErrorToast` or `formatAxiosError`)
- [ ] Import required types (`AxiosError`, `ErrorResponse`, `ErrorBody`)
- [ ] Add error toast handling (composable call or try-catch formatting)
- [ ] Provide a descriptive summary for the error context
- [ ] Test with different error scenarios (404, 500, network error)
- [ ] Keep any existing inline error displays for accessibility
- [ ] Update any custom error watchers to use the new utilities

---

## Testing Error Scenarios

To properly test error handling:

1. **404 Not Found** - Request non-existent resource
2. **500 Server Error** - Backend error
3. **422 Validation Error** - Invalid form data
4. **Network Error** - Disconnect network/stop API server
5. **Timeout** - Slow network conditions

---

## Examples by Feature Area

### Users Management

```typescript
// UsersListView.vue
useErrorToast(error, { summary: 'Error loading users' });

// UserView.vue
useErrorToast(error, { summary: 'Error loading user' });

// UserCreateView.vue (in try-catch)
const formatted = formatAxiosError(error);
toast.add({
  severity: 'error',
  summary: `Error creating user: ${formatted.summary}`,
  detail: formatted.detail,
});
```

### Assessment Results

```typescript
// AssessmentResultsListView.vue
useErrorToast(error, { summary: 'Error loading assessment results' });

// AssessmentResultsCreateView.vue (in try-catch)
const formatted = formatAxiosError(error);
toast.add({
  severity: 'error',
  summary: `Failed to create assessment: ${formatted.summary}`,
  detail: formatted.detail,
});
```

---

## Summary

- **Two utilities:** `formatAxiosError` (function) and `useErrorToast` (composable)
- **Choose based on context:** Composable for reactive refs, function for try-catch
- **Consistent error messages:** HTTP status codes + API error details
- **Better UX:** Users always see informative error notifications
- **Easy to use:** Minimal code changes required

For questions or issues, please consult the team or create a GitHub issue.
