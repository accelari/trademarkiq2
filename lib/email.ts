import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendVerificationEmailParams {
  email: string;
  name: string;
  token: string;
}

export async function sendVerificationEmail({ email, name, token }: SendVerificationEmailParams) {
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000';
  const verificationUrl = `${baseUrl}/verify-email?token=${token}`;

  const { data, error } = await resend.emails.send({
    from: 'TrademarkIQ <noreply@mail.accelari.com>',
    to: [email],
    subject: 'Bestätigen Sie Ihre E-Mail-Adresse - TrademarkIQ',
    html: `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px 40px; text-align: center;">
              <div style="display: inline-flex; align-items: center; gap: 8px;">
                <div style="width: 40px; height: 40px; background-color: white; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                  <span style="color: #6366f1; font-weight: bold; font-size: 18px;">TM</span>
                </div>
                <span style="color: white; font-size: 24px; font-weight: 600;">TrademarkIQ</span>
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #1f2937;">
                Willkommen bei TrademarkIQ${name ? `, ${name}` : ''}!
              </h1>
              
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 24px; color: #4b5563;">
                Vielen Dank für Ihre Registrierung. Um Ihr Konto zu aktivieren und alle Funktionen nutzen zu können, bestätigen Sie bitte Ihre E-Mail-Adresse.
              </p>

              <!-- Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding: 16px 0;">
                    <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      E-Mail-Adresse bestätigen
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 20px; color: #6b7280;">
                Oder kopieren Sie diesen Link in Ihren Browser:
              </p>
              <p style="margin: 8px 0 0 0; font-size: 14px; line-height: 20px; color: #6366f1; word-break: break-all;">
                ${verificationUrl}
              </p>

              <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;">

              <p style="margin: 0; font-size: 14px; line-height: 20px; color: #9ca3af;">
                Dieser Link ist 24 Stunden gültig. Falls Sie sich nicht bei TrademarkIQ registriert haben, können Sie diese E-Mail ignorieren.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                © ${new Date().getFullYear()} TrademarkIQ. Alle Rechte vorbehalten.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  });

  if (error) {
    console.error('Email send error:', error);
    throw new Error('Failed to send verification email');
  }

  return data;
}

export function generateVerificationToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

interface SendPasswordResetEmailParams {
  email: string;
  name: string;
  token: string;
}

export async function sendPasswordResetEmail({ email, name, token }: SendPasswordResetEmailParams) {
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000';
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  const { data, error } = await resend.emails.send({
    from: 'TrademarkIQ <noreply@mail.accelari.com>',
    to: [email],
    subject: 'Passwort zurücksetzen - TrademarkIQ',
    html: `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0D9488 0%, #0f766e 100%); padding: 32px 40px; text-align: center;">
              <div style="display: inline-flex; align-items: center; gap: 8px;">
                <div style="width: 40px; height: 40px; background-color: white; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                  <span style="color: #0D9488; font-weight: bold; font-size: 18px;">TM</span>
                </div>
                <span style="color: white; font-size: 24px; font-weight: 600;">TrademarkIQ</span>
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #1f2937;">
                Passwort zurücksetzen
              </h1>
              
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 24px; color: #4b5563;">
                Hallo${name ? ` ${name}` : ''}, wir haben eine Anfrage zum Zurücksetzen Ihres Passworts erhalten. Klicken Sie auf den Button unten, um ein neues Passwort zu erstellen.
              </p>

              <!-- Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding: 16px 0;">
                    <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #0D9488 0%, #0f766e 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      Neues Passwort erstellen
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 20px; color: #6b7280;">
                Oder kopieren Sie diesen Link in Ihren Browser:
              </p>
              <p style="margin: 8px 0 0 0; font-size: 14px; line-height: 20px; color: #0D9488; word-break: break-all;">
                ${resetUrl}
              </p>

              <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;">

              <p style="margin: 0; font-size: 14px; line-height: 20px; color: #9ca3af;">
                Dieser Link ist 1 Stunde gültig. Falls Sie kein Passwort-Reset angefordert haben, können Sie diese E-Mail ignorieren.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                © ${new Date().getFullYear()} TrademarkIQ. Alle Rechte vorbehalten.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  });

  if (error) {
    console.error('Password reset email send error:', error);
    throw new Error('Failed to send password reset email');
  }

  return data;
}
