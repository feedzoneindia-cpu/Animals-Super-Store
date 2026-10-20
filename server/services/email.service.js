
import { env } from '../config/env.js';

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) =>
    ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[char],
  );

/**
 * Sends a password reset email using the SendGrid Web API.
 */
export async function sendPasswordResetEmail({ to, name, resetUrl }) {
  if (!env.sendgridApiKey) {
    throw new Error('Email is not configured. Set SENDGRID_API_KEY.');
  }

  if (!env.smtp.from) {
    throw new Error('SendGrid sender email is not configured. Set SMTP_FROM.');
  }

  const minutes = env.passwordResetExpiresMin;
  const subject = 'Reset your Animals Super Store password';

  const safeName = escapeHtml(name || 'Customer');
  const safeResetUrl = escapeHtml(resetUrl);

  const text = `Hi ${name || 'Customer'},

Use this link to set a new password. The link is valid for ${minutes} minutes:

${resetUrl}

If you did not request this, you can ignore this email.`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Reset your password</title>
      </head>
      <body style="margin:0;padding:24px;background:#f5f7f4;font-family:Arial,sans-serif;color:#333;">
        <div style="max-width:520px;margin:0 auto;padding:32px;background:#ffffff;border-radius:12px;">
          <h2 style="color:#234d32;margin-top:0;">Animals Super Store</h2>

          <p>Hi ${safeName},</p>

          <p>
            We received a request to reset your password.
            Click the button below to set a new password.
            This link is valid for ${minutes} minutes.
          </p>

          <p style="margin:28px 0;">
            <a
              href="${safeResetUrl}"
              style="display:inline-block;padding:12px 22px;background:#2f6b3f;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:bold;"
            >
              Reset Password
            </a>
          </p>

          <p style="font-size:13px;color:#666;">
            If the button doesn't work, copy and paste this link into your browser:
          </p>

          <p style="font-size:13px;overflow-wrap:anywhere;">
            <a href="${safeResetUrl}" style="color:#2f6b3f;">
              ${safeResetUrl}
            </a>
          </p>

          <hr style="border:0;border-top:1px solid #eee;margin:24px 0;" />

          <p style="font-size:13px;color:#777;">
            If you did not request this password reset, you can safely ignore this email.
          </p>
        </div>
      </body>
    </html>
  `;

  const response = await fetch(
    'https://api.sendgrid.com/v3/mail/send',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.sendgridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: to }],
          },
        ],
        from: {
          email: env.smtp.from,
          name: 'Animals Super Store',
        },
        subject,
        content: [
          {
            type: 'text/plain',
            value: text,
          },
          {
            type: 'text/html',
            value: html,
          },
        ],
      }),
    },
  );

  // SendGrid normally returns HTTP 202 when the email is accepted.
  if (response.status !== 202) {
    const errorDetails = await response.text();

    throw new Error(
      `SendGrid error ${response.status}: ${errorDetails.slice(0, 300)}`,
    );
  }
}
