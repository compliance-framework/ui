import type { LeveragedAuthorization, SystemUser } from '@/oscal';
import { RESOURCES } from '@/constants/permissions';
import { formatDate } from '@/ds/format';
import type { CollectionKind } from '../collectionKind';

/** The SSP system-implementation collections shown as Configure System sections. */
export const SSP_USERS: CollectionKind = {
  noun: 'user',
  plural: 'users',
  resource: RESOURCES.SSP,
  emptyBody:
    'System users are the types of people and services that use the system, with their roles and privileges.',
  editProp: 'user',
  title: (user: SystemUser) =>
    user.title && user.shortName
      ? `${user.title} (${user.shortName})`
      : user.title,
  tags: (user: SystemUser) => user.roleIds ?? [],
  facts: (user: SystemUser) => [
    { key: 'description', label: 'Description', value: user.description },
    {
      key: 'privileges',
      label: 'Authorized privileges',
      value: (user.authorizedPrivileges ?? [])
        .map((p) =>
          p.functionsPerformed?.length
            ? `${p.title} (${p.functionsPerformed.join(', ')})`
            : p.title,
        )
        .join('; '),
    },
    { key: 'remarks', label: 'Remarks', value: user.remarks },
    { key: 'uuid', label: 'UUID', value: user.uuid },
  ],
  createForm: () => import('./SystemUserForm.vue'),
  editForm: () => import('./SystemUserForm.vue'),
  designSystemForms: true,
  download: true,
};

export const SSP_LEVERAGED_AUTHORIZATIONS: CollectionKind = {
  noun: 'leveraged authorization',
  plural: 'leveraged authorizations',
  resource: RESOURCES.SSP,
  emptyBody:
    'Leveraged authorizations record other authorized systems this one inherits controls from. Subscribing to an export offering creates them.',
  editProp: 'auth',
  tags: (auth: LeveragedAuthorization) =>
    auth.dateAuthorized
      ? [`Authorized ${formatDate(auth.dateAuthorized)}`]
      : [],
  facts: (auth: LeveragedAuthorization) => [
    { key: 'party', label: 'Party', value: auth.partyUuid },
    { key: 'remarks', label: 'Remarks', value: auth.remarks },
    { key: 'uuid', label: 'UUID', value: auth.uuid },
  ],
  createForm: () => import('./LeveragedAuthorizationForm.vue'),
  editForm: () => import('./LeveragedAuthorizationForm.vue'),
  designSystemForms: true,
  download: true,
};
