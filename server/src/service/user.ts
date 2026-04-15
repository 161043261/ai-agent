import { Code } from "../code";
import { logger } from "../config";
import {
  register as daoRegister,
  isUserExistByEmail,
  isUserExistByUsername,
} from "../dao/user";
import { jwtToken } from "../utils/jwt";
import { md5 } from "../utils/md5";

async function login(
  username: string,
  password: string,
): Promise<[string, Code]> {
  const [user, exists] = await isUserExistByUsername(username);
  if (!exists || !user) {
    return ["", Code.UserNotExist];
  }
  if (user.password !== md5(password)) {
    return ["", Code.PasswordError];
  }
  try {
    const token = jwtToken(user.id, user.username);
    return [token, Code.OK];
  } catch (err) {
    logger.error({ err }, "Generate jwt token error");
    return ["", Code.ServerError];
  }
}

async function register(
  email: string,
  password: string,
): Promise<[string, string, Code]> {
  const [, exists] = await isUserExistByEmail(email);
  if (exists) {
    return ["", "", Code.UserExist];
  }
  const username = email;
  const [user, ok] = await daoRegister(username, email, password);
  if (!ok || !user) {
    return ["", "", Code.ServerError];
  }
  try {
    const token = jwtToken(user.id, user.username);
    return [token, username, Code.OK];
  } catch (err) {
    logger.error({ err }, "Generate jwt token error");
    return ["", "", Code.ServerError];
  }
}

const userService = {
  login,
  register,
};

export default userService;
