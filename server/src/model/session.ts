export interface Session {
  id: string;
  username: string;
  title: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date;
}

export interface SessionDto {
  id: string;
  title: string;
}
