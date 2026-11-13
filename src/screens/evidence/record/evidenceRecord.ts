import { inject, provide, ref, type InjectionKey, type Ref } from 'vue';
import type { AxiosInstance } from 'axios';
import type { BackMatterResource, Link, Property } from '@/oscal';
import type { Evidence, SignatureDetail } from '@/stores/evidence';
import type { DataResponse } from '@/stores/types';
import { POLICY_BUNDLE_DIGEST_PROP } from '@/types/evidence-playback';
import { getErrorStatus } from '@/utils/httpErrors';
import type { QueryStatus } from '@/ds/query';

/**
 * The evidence record shared by the record screen and its tabs. The screen loads it once per
 * record (with its signature and the stream's latest record) and provides it; each tab injects it.
 */
export interface EvidenceRecord {
  status: Ref<QueryStatus | 'missing'>;
  evidence: Ref<Evidence | undefined>;
  /** Undefined while loading; null when the signature can't be read. */
  signature: Ref<SignatureDetail | null | undefined>;
  /** The newest record in this evidence stream, when it isn't this one. */
  latestId: Ref<string | undefined>;
  reload: () => Promise<void>;
}

const key: InjectionKey<EvidenceRecord> = Symbol('evidence-record');

export const ZERO_UUID = '00000000-0000-0000-0000-000000000000';

export function useEvidenceLoader(
  api: AxiosInstance,
  evidenceId: () => string,
): EvidenceRecord {
  const status = ref<QueryStatus | 'missing'>('loading');
  const evidence = ref<Evidence>();
  const signature = ref<SignatureDetail | null>();
  const latestId = ref<string>();
  let latest = 0;

  async function reload(): Promise<void> {
    const request = ++latest;
    const id = evidenceId();
    status.value = 'loading';
    evidence.value = undefined;
    signature.value = undefined;
    latestId.value = undefined;
    try {
      const response = await api.get<DataResponse<Evidence>>(
        `/api/evidence/${id}`,
      );
      if (request !== latest) return;
      evidence.value = response.data.data;
      status.value = 'ready';
    } catch (error) {
      if (request !== latest) return;
      const code = getErrorStatus(error);
      // As with systems, a record the user can't read is shown as not found.
      status.value =
        code === 400 || code === 403 || code === 404 ? 'missing' : 'error';
      return;
    }
    const uuid = evidence.value?.uuid;
    const [signed, newest] = await Promise.allSettled([
      api.get<DataResponse<SignatureDetail>>(`/api/evidence/${id}/signature`),
      uuid && uuid !== ZERO_UUID
        ? api.get<DataResponse<Evidence>>(`/api/evidence/latest/${uuid}`)
        : Promise.reject(new Error('no stream')),
    ]);
    if (request !== latest) return;
    signature.value =
      signed.status === 'fulfilled' ? (signed.value.data.data ?? null) : null;
    const newestId =
      newest.status === 'fulfilled' ? newest.value.data.data?.id : undefined;
    latestId.value = newestId && newestId !== id ? newestId : undefined;
  }

  return { status, evidence, signature, latestId, reload };
}

export function provideEvidenceRecord(record: EvidenceRecord): void {
  provide(key, record);
}

export function useEvidenceRecord(): EvidenceRecord {
  const record = inject(key);
  if (!record) throw new Error('useEvidenceRecord needs EvidenceRecordScreen');
  return record;
}

// Derived facts ------------------------------------------------------------------------------

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** The record's expiry, as the classic page judges it: none, expired, within a week, or later. */
export function expiry(
  expires: string | undefined,
  now = Date.now(),
): 'none' | 'expired' | 'soon' | 'valid' {
  if (!expires) return 'none';
  const at = Date.parse(expires);
  if (Number.isNaN(at)) return 'none';
  if (at < now) return 'expired';
  return at - now <= WEEK_MS ? 'soon' : 'valid';
}

export function canPlayBack(props: Property[] | undefined): boolean {
  return (props ?? []).some((prop) => prop.name === POLICY_BUNDLE_DIGEST_PROP);
}

/** Back-matter resources the record's links point at (`#<uuid>`), in link order. */
export function linkedMedia(
  links: Link[] | undefined,
  resources: BackMatterResource[] | undefined,
): BackMatterResource[] {
  const byId = new Map((resources ?? []).map((r) => [r.uuid, r]));
  return (links ?? [])
    .filter(
      (link) => typeof link.href === 'string' && link.href.startsWith('#'),
    )
    .map((link) => byId.get(link.href.substring(1)))
    .filter((r): r is BackMatterResource => Boolean(r));
}

export function mediaType(resource: BackMatterResource): string {
  return resource.base64?.mediaType?.split(';')[0]?.trim().toLowerCase() ?? '';
}

export function mediaHref(resource: BackMatterResource): string | undefined {
  return resource.base64?.mediaType && resource.base64.value
    ? `data:${resource.base64.mediaType};base64,${resource.base64.value}`
    : undefined;
}

export function isTextMedia(resource: BackMatterResource): boolean {
  if (!resource.base64?.value) return false;
  const type = mediaType(resource);
  return (
    type.startsWith('text/') ||
    type === 'application/json' ||
    type.endsWith('+json') ||
    type === 'application/yaml' ||
    type === 'application/x-yaml' ||
    type.endsWith('+yaml')
  );
}

export function isImageMedia(resource: BackMatterResource): boolean {
  return (
    Boolean(resource.base64?.value) && mediaType(resource).startsWith('image/')
  );
}

/** The resource's text, decoded from base64 (as UTF-8), with JSON pretty-printed. */
export function mediaText(resource: BackMatterResource): string {
  const raw = resource.base64?.value ?? '';
  let text = raw;
  try {
    text = new TextDecoder().decode(
      Uint8Array.from(atob(raw), (c) => c.charCodeAt(0)),
    );
  } catch {
    // Not base64: show it as stored.
  }
  const type = mediaType(resource);
  if (type === 'application/json' || type.endsWith('+json')) {
    try {
      return JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      return text;
    }
  }
  return text;
}
