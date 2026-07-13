// jsdom does not implement the URL.createObjectURL / revokeObjectURL APIs.
// Tests that spy on them (e.g. CSV export) need the methods to exist first.
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = () => 'blob:mock-url';
}

if (typeof URL.revokeObjectURL !== 'function') {
  URL.revokeObjectURL = () => {};
}

// Some Node/jsdom version combinations leave globalThis.localStorage missing or
// non-functional — e.g. Node's own experimental native localStorage resolves to undefined
// without a --localstorage-file flag, and that flag can't reliably reach jsdom's per-test
// sandboxed global scope across Node versions/CI. Providing our own minimal, always-working
// in-memory Storage here avoids depending on host Node version behavior entirely.
if (
  typeof globalThis.localStorage === 'undefined' ||
  typeof globalThis.localStorage.clear !== 'function'
) {
  class MemoryStorage implements Storage {
    private store = new Map<string, string>();

    get length() {
      return this.store.size;
    }

    clear(): void {
      this.store.clear();
    }

    getItem(key: string): string | null {
      return this.store.has(key) ? this.store.get(key)! : null;
    }

    key(index: number): string | null {
      return Array.from(this.store.keys())[index] ?? null;
    }

    removeItem(key: string): void {
      this.store.delete(key);
    }

    setItem(key: string, value: string): void {
      this.store.set(key, String(value));
    }
  }

  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    writable: true,
    configurable: true,
  });
}
