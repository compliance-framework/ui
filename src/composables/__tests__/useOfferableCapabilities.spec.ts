import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { useOfferableCapabilities } from '../useOfferableCapabilities';
import type { ControlImplementation, SystemImplementation } from '@/oscal';

function makeSystemImplementation(): SystemImplementation {
  return {
    users: [],
    components: [
      {
        uuid: 'comp-1',
        type: 'software',
        title: 'API',
        description: '',
        status: { state: 'operational' },
      },
    ],
  };
}

describe('useOfferableCapabilities', () => {
  it('returns an empty list when there is no control implementation', () => {
    const { capabilities } = useOfferableCapabilities(
      ref(undefined),
      ref(undefined),
    );
    expect(capabilities.value).toEqual([]);
  });

  it('flattens a control-level by-component provided entry', () => {
    const controlImplementation: ControlImplementation = {
      description: '',
      implementedRequirements: [
        {
          uuid: 'req-1',
          controlId: 'ac-1',
          byComponents: [
            {
              uuid: 'bc-1',
              componentUuid: 'comp-1',
              description: '',
              export: {
                uuid: 'exp-1',
                description: '',
                provided: [
                  {
                    uuid: 'p-1',
                    description: 'We provide access control',
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const { capabilities } = useOfferableCapabilities(
      ref(controlImplementation),
      ref(makeSystemImplementation()),
    );

    expect(capabilities.value).toEqual([
      {
        controlId: 'ac-1',
        statementId: undefined,
        componentUuid: 'comp-1',
        componentTitle: 'API',
        providedUuid: 'p-1',
        providedDescription: 'We provide access control',
      },
    ]);
  });

  it('flattens a statement-level by-component provided entry with statementId set', () => {
    const controlImplementation: ControlImplementation = {
      description: '',
      implementedRequirements: [
        {
          uuid: 'req-1',
          controlId: 'ac-1',
          statements: [
            {
              uuid: 'stmt-1',
              statementId: 'ac-1_smt.a',
              byComponents: [
                {
                  uuid: 'bc-1',
                  componentUuid: 'comp-1',
                  description: '',
                  export: {
                    uuid: 'exp-1',
                    description: '',
                    provided: [
                      {
                        uuid: 'p-1',
                        description: 'Statement-level capability',
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    const { capabilities } = useOfferableCapabilities(
      ref(controlImplementation),
      ref(makeSystemImplementation()),
    );

    expect(capabilities.value).toEqual([
      {
        controlId: 'ac-1',
        statementId: 'ac-1_smt.a',
        componentUuid: 'comp-1',
        componentTitle: 'API',
        providedUuid: 'p-1',
        providedDescription: 'Statement-level capability',
      },
    ]);
  });

  it('falls back to the component uuid when no matching component title is found', () => {
    const controlImplementation: ControlImplementation = {
      description: '',
      implementedRequirements: [
        {
          uuid: 'req-1',
          controlId: 'ac-1',
          byComponents: [
            {
              uuid: 'bc-1',
              componentUuid: 'unknown-comp',
              description: '',
              export: {
                uuid: 'exp-1',
                description: '',
                provided: [{ uuid: 'p-1', description: '' }],
              },
            },
          ],
        },
      ],
    };

    const { capabilities } = useOfferableCapabilities(
      ref(controlImplementation),
      ref(makeSystemImplementation()),
    );

    expect(capabilities.value[0].componentTitle).toBe('unknown-comp');
    expect(capabilities.value[0].providedDescription).toBe('p-1');
  });
});
