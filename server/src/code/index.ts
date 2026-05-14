export enum Code {
  OK = 1000,
  ParamsInvalid = 2001,
  UserExist = 2002,
  UserNotExist = 2003,
  PasswordError = 2004,
  PasswordNotMatch = 2005,
  TokenInvalid = 2006,
  NotLogin = 2007,
  CaptchaInvalid = 2008,
  RecordNotFound = 2009,
  PasswordIllegal = 2010,
  Forbidden = 3001,
  ServerError = 4001,
  ModelNotFound = 5001,
  ModelNoPermission = 5002,
  ModelError = 5003,
}

const phrases: Record<Code, string> = {
  [Code.OK]: "OK",
  [Code.ParamsInvalid]: "Params Invalid",
  [Code.UserExist]: "User Exist",
  [Code.UserNotExist]: "User Not Exist",
  [Code.PasswordError]: "Password Error",
  [Code.PasswordNotMatch]: "Password Not Match",
  [Code.TokenInvalid]: "Token Invalid",
  [Code.NotLogin]: "Not Login",
  [Code.CaptchaInvalid]: "Captcha Invalid",
  [Code.RecordNotFound]: "Record Not Found",
  [Code.PasswordIllegal]: "Password Illegal",
  [Code.Forbidden]: "Forbidden",
  [Code.ServerError]: "Server Error",
  [Code.ModelNotFound]: "Model Not Found",
  [Code.ModelNoPermission]: "Model No Permission",
  [Code.ModelError]: "Model Error",
};

export function codeMessage(code: Code): string {
  return phrases[code] ?? phrases[Code.ServerError];
}
