export interface Parent {
  id: string;
  class: string;
  type: string;
}

export interface DataResponse<T> {
  data: T;
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
