// RFC 7396 JSON Merge Patch, used for display only (effective-config previews, provenance,
// client-side diffs). The API and the agent own the real merge.

export type PlainObject = Record<string, unknown>;

export function isPlainObject(value: unknown): value is PlainObject {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}

/**
 * Assigns `obj[key] = value` as an own data property. A plain assignment of "__proto__"
 * (a legal JSON/YAML key) would change the object's prototype instead of storing the key.
 */
export function setOwn(obj: PlainObject, key: string, value: unknown): void {
  if (key === '__proto__') {
    Object.defineProperty(obj, key, {
      value,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  } else {
    obj[key] = value;
  }
}

/** Own property (never inherited, e.g. Object.prototype via "__proto__"). */
export function getOwn(obj: PlainObject, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : undefined;
}

/** Deep clone of a JSON value. */
export function clone<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => clone(v)) as unknown as T;
  if (isPlainObject(value)) {
    const out: PlainObject = {};
    for (const [k, v] of Object.entries(value)) setOwn(out, k, clone(v));
    return out as T;
  }
  return value;
}

/** Structural equality of two JSON values (object key order is ignored). */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return false;
    }
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every(
      (k) =>
        Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]),
    );
  }
  return false;
}

/**
 * RFC 7396: objects merge recursively, arrays and scalars replace, `null` deletes. Never
 * mutates its inputs.
 */
export function mergePatch<T = unknown>(target: unknown, patch: unknown): T {
  if (!isPlainObject(patch)) return clone(patch) as T;
  const result: PlainObject = isPlainObject(target) ? clone(target) : {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete result[key];
    } else {
      setOwn(result, key, mergePatch(getOwn(result, key), value));
    }
  }
  return result as T;
}
