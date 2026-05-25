// jsdom does not implement the URL.createObjectURL / revokeObjectURL APIs.
// Tests that spy on them (e.g. CSV export) need the methods to exist first.
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = () => 'blob:mock-url';
}

if (typeof URL.revokeObjectURL !== 'function') {
  URL.revokeObjectURL = () => {};
}
