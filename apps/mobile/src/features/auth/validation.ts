/** Auth form rules (04_INTERACTIONS → Validações). Only the first invalid field is reported. */

export type AuthField = 'name' | 'email' | 'password';

const EMAIL = /.+@.+\..+/;

export const isEmail = (value: string) => EMAIL.test(value.trim());

export const MIN_PASSWORD = 8;

export function signupError(v: {
  name: string;
  email: string;
  password: string;
}): AuthField | null {
  if (!v.name.trim()) return 'name';
  if (!isEmail(v.email)) return 'email';
  if (v.password.length < MIN_PASSWORD) return 'password';
  return null;
}

export function loginError(v: { email: string; password: string }): AuthField | null {
  if (!isEmail(v.email)) return 'email';
  if (!v.password) return 'password';
  return null;
}

export function forgotError(v: { email: string }): AuthField | null {
  return isEmail(v.email) ? null : 'email';
}
