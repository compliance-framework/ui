// Vendor policy sources by artifact digest (R62). Artifacts are content-addressed and
// immutable, so lists and files are cached for the session (the browser also keeps them by
// ETag). Failures are not cached: a retry asks again.

import type {
  ArtifactFileList,
  ArtifactFileSource,
} from '@/types/agent-config';
import { isAgentConfigApiError, type AgentConfigApi } from './api-types';

const lists = new Map<string, Promise<ArtifactFileList>>();
const files = new Map<string, Promise<ArtifactFileSource>>();

export type VendorLoadError = 'not-found' | 'error';

/** 'not-found' for a 404 (unknown digest or path), 'error' otherwise. */
export function vendorLoadError(e: unknown): VendorLoadError {
  return isAgentConfigApiError(e) && e.status === 404 ? 'not-found' : 'error';
}

function cached<T>(
  cache: Map<string, Promise<T>>,
  key: string,
  load: () => Promise<T>,
): Promise<T> {
  let p = cache.get(key);
  if (!p) {
    p = load();
    cache.set(key, p);
    p.catch(() => {
      if (cache.get(key) === p) cache.delete(key);
    });
  }
  return p;
}

export function useVendorSources(api: AgentConfigApi) {
  return {
    listFiles: (digest: string) =>
      cached(lists, digest, () => api.listArtifactFiles(digest)),
    fileSource: (digest: string, path: string) =>
      cached(files, `${digest}\u0000${path}`, () =>
        api.getArtifactFile(digest, path),
      ),
  };
}

export type VendorSources = ReturnType<typeof useVendorSources>;

/** Test hook. */
export function resetVendorSourceCache(): void {
  lists.clear();
  files.clear();
}
