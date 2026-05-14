import { getDb } from "../db/mysql";
import type {
  User,
  UserInsertDto,
  UserVo,
  UserWithPassword,
} from "../model/user";
import { md5 } from "../utils/md5";

function users() {
  return getDb()<User>("users");
}

export async function insertUser(
  user: UserInsertDto,
): Promise<UserWithPassword> {
  const [id] = await users().insert(user);
  return { ...user, id, created_at: new Date(), updated_at: new Date() };
}

export async function getUserByUsername(
  username: string,
): Promise<UserVo | null> {
  const row = await users()
    .select("id", "name", "email", "username", "created_at", "updated_at")
    .where({ username })
    .whereNull("deleted_at")
    .first();
  return row ?? null;
}

export async function getUserByUsernameWithPassword(
  username: string,
): Promise<UserWithPassword | null> {
  const row = await users().where({ username }).whereNull("deleted_at").first();
  return row ?? null;
}

export async function getUserByEmail(email: string): Promise<UserVo | null> {
  const row = await users()
    .select("id", "name", "email", "username", "created_at", "updated_at")
    .where({ email })
    .whereNull("deleted_at")
    .first();
  return row ?? null;
}

export async function getUserByEmailWithPassword(
  email: string,
): Promise<UserWithPassword | null> {
  const row = await users().where({ email }).whereNull("deleted_at").first();
  return row ?? null;
}

export async function isUserExistByUsername(
  username: string,
): Promise<[UserWithPassword | null, boolean]> {
  const user = await getUserByUsernameWithPassword(username);
  return [user, !!user];
}

export async function isUserExistByEmail(
  email: string,
): Promise<[UserVo | null, boolean]> {
  const user = await getUserByEmail(email);
  return [user, !!user];
}

export async function register(
  username: string,
  email: string,
  password: string,
): Promise<[UserWithPassword | null, boolean]> {
  try {
    const user = await insertUser({
      email,
      name: username,
      username,
      password: md5(password),
    });
    return [user, true];
  } catch {
    return [null, false];
  }
}
