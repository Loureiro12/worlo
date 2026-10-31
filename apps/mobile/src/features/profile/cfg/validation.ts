/** Form rules of the account sub-screens (04_INTERACTIONS → Validações). Order matters. */

export const USERNAME = /^[a-z0-9._]{3,}$/;
const EMAIL = /.+@.+\..+/;

/** Lowercase, no spaces, as the user types. */
export function normalizeUser(text: string): string {
  return text.toLowerCase().replace(/\s/g, '');
}

export function accountError(form: { name: string; user: string }): 'name' | 'user' | null {
  if (!form.name.trim()) return 'name';
  if (!USERNAME.test(form.user)) return 'user';
  return null;
}

export function emailError(
  form: { newEmail: string; password: string },
  current: string,
): 'email' | 'same' | 'password' | null {
  if (!EMAIL.test(form.newEmail)) return 'email';
  if (form.newEmail.trim().toLowerCase() === current.toLowerCase()) return 'same';
  if (!form.password) return 'password';
  return null;
}

export function passwordError(form: {
  current: string;
  newPassword: string;
  confirm: string;
}): 'current' | 'newPassword' | 'confirm' | null {
  if (!form.current) return 'current';
  if (form.newPassword.length < 8) return 'newPassword';
  if (form.newPassword !== form.confirm) return 'confirm';
  return null;
}

/** "EXCLUIR" (or the word of the current language), case-insensitive. */
export function deleteConfirmed(input: string, word: string): boolean {
  return input.trim().toUpperCase() === word.toUpperCase();
}
