export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || typeof email !== "string") {
    return { valid: false, error: "E-Mail ist erforderlich" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: "Ungültige E-Mail-Adresse" };
  }

  if (email.length > 254) {
    return { valid: false, error: "E-Mail-Adresse ist zu lang" };
  }

  return { valid: true };
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== "string") {
    return { valid: false, error: "Passwort ist erforderlich" };
  }

  if (password.length < 8) {
    return { valid: false, error: "Passwort muss mindestens 8 Zeichen lang sein" };
  }

  if (password.length > 128) {
    return { valid: false, error: "Passwort ist zu lang" };
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasLetter || !hasNumber) {
    return { valid: false, error: "Passwort muss Buchstaben und Zahlen enthalten" };
  }

  const commonPasswords = [
    "password", "12345678", "password1", "qwertyui", "passwort",
    "hallo123", "admin123", "letmein1", "welcome1", "monkey12"
  ];

  if (commonPasswords.includes(password.toLowerCase())) {
    return { valid: false, error: "Dieses Passwort ist zu häufig verwendet" };
  }

  return { valid: true };
}

export function validateName(name: string): { valid: boolean; error?: string } {
  if (!name || typeof name !== "string") {
    return { valid: true };
  }

  if (name.length > 100) {
    return { valid: false, error: "Name ist zu lang" };
  }

  const nameRegex = /^[a-zA-ZäöüÄÖÜß\s\-']+$/;
  if (!nameRegex.test(name)) {
    return { valid: false, error: "Name enthält ungültige Zeichen" };
  }

  return { valid: true };
}
