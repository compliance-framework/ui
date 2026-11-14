import { describe, expect, it } from 'vitest';
import type { LeveragedAuthorization, SystemUser } from '@/oscal';
import { SSP_LEVERAGED_AUTHORIZATIONS, SSP_USERS } from '../sspCollections';

describe('SSP collections', () => {
  const user: SystemUser = {
    uuid: 'u-1',
    title: 'System Operator',
    shortName: 'ops',
    roleIds: ['operator', 'on-call'],
    authorizedPrivileges: [
      { title: 'Deploy', functionsPerformed: ['release', 'rollback'] },
      { title: 'Read logs', functionsPerformed: [] },
    ],
  };

  it('titles users with their short name, tags their roles and lists privileges', () => {
    expect(SSP_USERS.title!(user as never)).toBe('System Operator (ops)');
    expect(SSP_USERS.tags(user as never)).toEqual(['operator', 'on-call']);
    const privileges = SSP_USERS.facts(user as never).find(
      (f) => f.key === 'privileges',
    );
    expect(privileges?.value).toBe('Deploy (release, rollback); Read logs');
  });

  it('tags leveraged authorizations with their authorization date', () => {
    const auth: LeveragedAuthorization = {
      uuid: 'la-1',
      title: 'Cloud platform ATO',
      partyUuid: 'p-1',
      dateAuthorized: '2026-03-01',
    };
    expect(SSP_LEVERAGED_AUTHORIZATIONS.tags(auth as never)).toEqual([
      'Authorized 1 Mar 2026',
    ]);
  });
});
