export interface Message {
  id?: number;
  session_id: string;
  username: string;
  content: string;
  is_user: boolean;
  created_at?: Date;
}

export interface History {
  is_user: boolean;
  content: string;
}
