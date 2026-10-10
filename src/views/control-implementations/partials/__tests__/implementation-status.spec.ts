import { describe, expect, it } from 'vitest';
import type { ByComponent } from '@/oscal';
import {
  implementationStatusLabel,
  implementationStatusOptions,
  normalizeByComponentImplementationStatus,
  statementInheritedCount,
  uniformImplementationStatusCue,
} from '@/views/control-implementations/partials/implementation-status';

function byComponent(state?: string): ByComponent {
  return {
    uuid: '11111111-1111-4111-8111-111111111111',
    componentUuid: '22222222-2222-4222-8222-222222222222',
    description: 'implementation',
    implementationStatus: state
      ? {
          state,
          remarks: `${state} remarks`,
        }
      : undefined,
  };
}

describe('implementation-status helpers', () => {
  it('exposes the BCH-1255 supported status options', () => {
    expect(implementationStatusOptions.map((option) => option.value)).toEqual([
      'implemented',
      'partial',
      'planned',
      'alternative',
      'not-applicable',
    ]);
  });

  it('returns a cue when every by-component has the same supported status', () => {
    const cue = uniformImplementationStatusCue([
      byComponent('implemented'),
      byComponent('implemented'),
    ]);

    expect(cue?.label).toBe('Implemented');
  });

  it('does not return a cue for mixed, missing, or unsupported statuses', () => {
    expect(
      uniformImplementationStatusCue([
        byComponent('implemented'),
        byComponent('planned'),
      ]),
    ).toBeNull();
    expect(uniformImplementationStatusCue([byComponent(undefined)])).toBeNull();
    expect(
      uniformImplementationStatusCue([
        byComponent('implemented'),
        byComponent(undefined),
      ]),
    ).toBeNull();
    expect(uniformImplementationStatusCue([byComponent('custom')])).toBeNull();
  });

  it('removes empty or whitespace-only implementation status before persistence', () => {
    const normalized = normalizeByComponentImplementationStatus({
      ...byComponent(),
      implementationStatus: {
        state: '',
        remarks: 'will be discarded',
      },
    });

    expect(normalized.implementationStatus).toBeUndefined();

    const whitespaceNormalized = normalizeByComponentImplementationStatus({
      ...byComponent(),
      implementationStatus: {
        state: '   ',
        remarks: 'will also be discarded',
      },
    });

    expect(whitespaceNormalized.implementationStatus).toBeUndefined();
  });

  it('keeps valid implementation status before persistence', () => {
    const normalized = normalizeByComponentImplementationStatus(
      byComponent('not-applicable'),
    );

    expect(normalized.implementationStatus).toEqual({
      state: 'not-applicable',
      remarks: 'not-applicable remarks',
    });
    expect(implementationStatusLabel('not-applicable')).toBe('Not Applicable');
    expect(implementationStatusLabel(' Implemented ')).toBe('Implemented');
    expect(implementationStatusLabel(' custom-status ')).toBe('custom-status');
  });

  it('canonicalizes persisted status casing and trims whitespace', () => {
    const normalized = normalizeByComponentImplementationStatus(
      byComponent(' Implemented '),
    );

    expect(normalized.implementationStatus?.state).toBe('implemented');

    const locallyDefined = normalizeByComponentImplementationStatus(
      byComponent(' custom-status '),
    );

    expect(locallyDefined.implementationStatus?.state).toBe('custom-status');
  });

  it('counts inherited entries across by-components, independent of any status', () => {
    expect(statementInheritedCount(undefined)).toBe(0);
    expect(statementInheritedCount([])).toBe(0);
    expect(statementInheritedCount([byComponent('implemented')])).toBe(0);

    // Subscribe materializes by-components with NO implementationStatus — the count
    // must still see their inherited entries.
    const inheritedOnly: ByComponent = {
      ...byComponent(undefined),
      inherited: [
        { uuid: 'i-1', description: 'Inherited from offering' },
        { uuid: 'i-2', description: 'Another' },
      ],
    };
    const withStatus: ByComponent = {
      ...byComponent('implemented'),
      inherited: [{ uuid: 'i-3', description: 'Third' }],
    };
    expect(statementInheritedCount([inheritedOnly, withStatus])).toBe(3);
  });
});
