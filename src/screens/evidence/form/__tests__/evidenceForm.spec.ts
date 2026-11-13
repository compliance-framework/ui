import { describe, expect, it } from 'vitest';
import {
  attach,
  dateError,
  draftFrom,
  fromDateInput,
  payload,
  toDateInput,
  validate,
} from '../evidenceForm';

const fresh = () => draftFrom(undefined, () => 'new-uuid');

describe('evidenceForm', () => {
  it('starts a new draft with a fresh stream UUID', () => {
    expect(fresh()).toEqual(
      expect.objectContaining({ uuid: 'new-uuid', title: '', state: '' }),
    );
  });

  it('keeps the stream UUID and copies (not aliases) a record being re-submitted', () => {
    const labels = [{ name: 'provider', value: 'aws' }];
    const draft = draftFrom(
      {
        uuid: 'stream-1',
        title: 'Backups',
        status: { state: 'satisfied', reason: 'ok' },
        labels,
        start: '2026-11-01T00:00:00.000Z',
      },
      () => 'unused',
    );
    expect(draft.uuid).toBe('stream-1');
    expect(draft.state).toBe('satisfied');
    expect(draft.start).toBe(toDateInput('2026-11-01T00:00:00.000Z'));
    draft.labels[0]!.value = 'gcp';
    expect(labels[0]!.value).toBe('aws');
  });

  it('round-trips calendar dates through local midnight', () => {
    expect(toDateInput(fromDateInput('2026-11-13'))).toBe('2026-11-13');
    expect(fromDateInput('')).toBeUndefined();
  });

  it('checks the collection window like the classic form', () => {
    const draft = { ...fresh(), start: '2026-11-10', end: '2026-11-12' };
    expect(dateError(draft, '2026-11-13')).toBeUndefined();
    expect(dateError({ ...draft, end: '2026-11-14' }, '2026-11-13')).toMatch(
      /future/,
    );
    expect(
      dateError(
        { ...draft, start: '2026-11-12', end: '2026-11-10' },
        '2026-11-13',
      ),
    ).toMatch(/on or after the start/);
    expect(
      dateError({ ...draft, expires: '2026-11-11' }, '2026-11-13'),
    ).toMatch(/expiry/);
  });

  it('requires a title, status, dates and (when configured) a subject', () => {
    const errors = validate(fresh(), {
      subjectRequired: true,
      today: '2026-11-13',
    });
    expect(Object.keys(errors).sort()).toEqual(
      ['end', 'start', 'state', 'subjects', 'title'].sort(),
    );
    expect(
      validate(
        {
          ...fresh(),
          title: 'x',
          state: 'satisfied',
          start: '2026-11-10',
          end: '2026-11-10',
        },
        { subjectRequired: false, today: '2026-11-13' },
      ),
    ).toEqual({});
  });

  it('builds the API body: flat labels, trimmed empties, linked attachments', () => {
    const draft = {
      ...fresh(),
      title: '  Backups ',
      state: 'satisfied',
      start: '2026-11-10',
      end: '2026-11-11',
      labels: [
        { name: 'provider', value: 'aws' },
        { name: ' ', value: 'ignored' },
      ],
      props: [{ name: '', value: '' }],
      subjects: [{ subjectUuid: 's1', title: 'db' }],
    };
    const file = new File(['x'], 'restore.log', { type: 'text/plain' });
    const { resource, link } = attach(
      file,
      { filename: 'restore.log', mediaType: 'text/plain', value: 'eA==' },
      'r1',
    );
    draft.resources.push(resource);
    draft.links.push(link);

    const body = payload(draft);
    expect(body).toEqual(
      expect.objectContaining({
        title: 'Backups',
        labels: { provider: 'aws' },
        props: [],
        links: [{ href: '#r1', rel: 'reference', text: 'restore.log' }],
        subjects: [{ subjectUuid: 's1' }],
        status: { state: 'satisfied', reason: '' },
      }),
    );
    expect(
      (body.backMatter as { resources: unknown[] }).resources,
    ).toHaveLength(1);
  });
});
