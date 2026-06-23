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
  email: string;
  firstName: string;
  lastName: string;
  inherited: boolean;
}

export interface CCFUserGroup {
  groupId: string;
  groupName: string;
  inherited: boolean;
}
