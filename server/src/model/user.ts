export interface User {
  id: number;
  name: string;
  email: string;
  username: string;
  password: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date;
}

export interface UserVo {
  id: number;
  name: string;
  email: string;
  username: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserWithPassword extends UserVo {
  password: string;
}

export interface UserInsertDto {
  name: string;
  email: string;
  username: string;
  password: string;
}
