import { describe, expect, it } from 'vitest';
import type { BackMatterResource } from '@/oscal';
import {
  canPlayBack,
  expiry,
  isImageMedia,
  isTextMedia,
  linkedMedia,
  mediaHref,
  mediaText,
} from '../evidenceRecord';

const resource = (
  uuid: string,
  mediaType?: string,
  value?: string,
): BackMatterResource =>
  ({
    uuid,
    title: uuid,
    ...(mediaType ? { base64: { mediaType, value: value ?? '' } } : {}),
  }) as BackMatterResource;

describe('evidenceRecord', () => {
  it('judges expiry like the classic page', () => {
    const now = Date.parse('2026-11-13T12:00:00Z');
    expect(expiry(undefined, now)).toBe('none');
    expect(expiry('2026-11-12T12:00:00Z', now)).toBe('expired');
    expect(expiry('2026-11-16T12:00:00Z', now)).toBe('soon');
    expect(expiry('2026-12-30T12:00:00Z', now)).toBe('valid');
  });

  it('offers playback only when the policy bundle was stored', () => {
    expect(canPlayBack([{ name: '_policy_bundle_digest', value: 'sha' }])).toBe(
      true,
    );
    expect(canPlayBack([{ name: 'other', value: 'x' }])).toBe(false);
    expect(canPlayBack(undefined)).toBe(false);
  });

  it('lists the back-matter resources the links point at, in link order', () => {
    const media = linkedMedia(
      [
        { href: '#b' },
        { href: 'https://example.com' },
        { href: '#a' },
        { href: '#missing' },
      ],
      [resource('a'), resource('b')],
    );
    expect(media.map((m) => m.uuid)).toEqual(['b', 'a']);
  });

  it('decodes text media and pretty-prints JSON', () => {
    const json = resource(
      'j',
      'application/json; charset=utf-8',
      btoa('{"a":1}'),
    );
    expect(isTextMedia(json)).toBe(true);
    expect(mediaText(json)).toBe('{\n  "a": 1\n}');
    expect(mediaHref(json)).toMatch(/^data:application\/json/);

    const image = resource('i', 'image/png', 'iVBOR');
    expect(isTextMedia(image)).toBe(false);
    expect(isImageMedia(image)).toBe(true);

    expect(mediaHref(resource('none'))).toBeUndefined();
  });
});
