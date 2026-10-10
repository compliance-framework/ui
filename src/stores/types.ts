export interface Parent {
  id: string;
  class: string;
  type: string;
}

export interface DataResponse<T> {
  data: T;
}

export interface PaginatedListResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ErrorResponse<T> {
  errors: T;
}

export interface ErrorBody {
  body: string;
}

export interface CCFUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  authMethod?: string;
  authProvider?: string;
  userAttributes?: string;

  lastLogin?: Date;
  isActive?: boolean;
  isLocked?: boolean;
  failedLogins: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export interface CCFUserCreate {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

export interface CCFGroup {
  id: string;
  name: string;
  description?: string;
  memberCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CCFGroupCreate {
  name: string;
  description?: string;
}

export interface CCFGroupMember {
  userId: string;
  displayName: string;
  // The members endpoint does not currently return these; they are enriched
  // client-side (email) or reserved for when the API provides them (inherited).
  inherited?: boolean;
}

export interface CCFUserGroup {
  groupId: string;
  groupName: string;
  inherited: boolean;
}

// System-level role assignment (BCH-1333). A grant binds one manifest role to a user
// (assigneeId = email) or a group (assigneeId = group name), system-wide. `source`
// distinguishes config-locked grants (managed by the boot reconcile, immutable through the
// API) from manual ad-hoc admin grants (the only ones the API may delete).
export type RoleAssigneeType = 'user' | 'group';
export type RoleAssignmentSource = 'config' | 'manual';

export interface CCFRoleAssignment {
  id: string;
  roleName: string;
  assigneeType: RoleAssigneeType;
  assigneeId: string;
  source: RoleAssignmentSource;
  createdAt?: string;
  updatedAt?: string;
}

// One entry in a user's effective-role view (GET /admin/users/:id/roles): a direct grant
// (`inherited: false`) or a role inherited from a native group (`inherited: true`, with
// `viaGroup` naming the granting group). `assignmentId` is the deletable grant's id when
// `source === 'manual'`.
export interface EffectiveRole {
  assignmentId: string;
  roleName: string;
  source: RoleAssignmentSource;
  inherited: boolean;
  viaGroup?: string;
}
