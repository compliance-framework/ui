/**
 * Generate an RFC 4122 v4 UUID.
 *
 * Prefers the native Web Crypto `crypto.randomUUID()`, which is only available
 * in a secure context (HTTPS, or `http://localhost`). When the app is served
 * over plain HTTP from a non-localhost origin (e.g. behind a reverse proxy
 * without TLS), `crypto.randomUUID` is `undefined`, so we fall back to a
 * `Math.random()`-based generator.
 *
 * NOTE: the fallback is NOT cryptographically secure. It is only used to mint
 * unique identifiers for OSCAL elements created in the browser, which do not
 * require unpredictability. Do not use this for anything security-sensitive.
 */
export function uuid(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
