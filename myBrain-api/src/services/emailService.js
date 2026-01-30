/**
 * =============================================================================
 * EMAILSERVICE.JS - Email Sending Service
 * =============================================================================
 *
 * This service handles sending emails from the myBrain application.
 * Currently used for password reset functionality.
 *
 * WHAT THIS SERVICE DOES:
 * -----------------------
 * - Configures email transport (SMTP or console logging for dev)
 * - Sends password reset emails with secure links
 * - Provides verification of email configuration
 *
 * MODES:
 * ------
 * - Development: Logs email content to console (no actual sending)
 * - Production: Uses SMTP to send real emails
 *
 * ENVIRONMENT VARIABLES REQUIRED FOR PRODUCTION:
 * ----------------------------------------------
 * - SMTP_HOST: SMTP server hostname
 * - SMTP_PORT: SMTP server port (usually 587)
 * - SMTP_SECURE: Whether to use TLS (true/false)
 * - SMTP_USER: SMTP authentication username
 * - SMTP_PASS: SMTP authentication password
 * - EMAIL_FROM: Sender email address
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * Nodemailer is the standard library for sending emails from Node.js.
 * It supports SMTP, SendGrid, Mailgun, and many other transports.
 *
 * Note: For production, install nodemailer:
 * npm install nodemailer
 */
let nodemailer;
try {
  nodemailer = (await import('nodemailer')).default;
} catch {
  // Nodemailer not installed - will use console logging
  nodemailer = null;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Check if we're in development mode.
 * In development, we log emails to console instead of sending them.
 */
const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Check if SMTP is configured.
 * If not, we'll use console logging as a fallback.
 */
const isSmtpConfigured = !!(
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS
);

/**
 * Create the email transporter.
 * In production with SMTP: Uses nodemailer SMTP transport
 * Otherwise: Uses console logging (development fallback)
 */
let transporter = null;

if (nodemailer && isSmtpConfigured && !isDevelopment) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================

/**
 * Generate HTML email template for password reset.
 *
 * WHY HTML EMAILS?
 * ----------------
 * HTML emails look professional and allow for:
 * - Styled buttons that are easy to click
 * - Branding consistency
 * - Better readability
 *
 * @param {string} resetUrl - The full URL to reset password
 * @returns {string} HTML email content
 */
function getPasswordResetHtml(resetUrl) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td>
        <div style="background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
          <!-- Logo/Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #6366f1; font-size: 28px; margin: 0;">myBrain</h1>
          </div>

          <!-- Main Content -->
          <h2 style="color: #18181b; font-size: 22px; margin: 0 0 16px 0;">Reset Your Password</h2>

          <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
            You requested to reset your password. Click the button below to create a new password:
          </p>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}"
               style="display: inline-block; background-color: #6366f1; color: #ffffff;
                      padding: 14px 32px; font-size: 16px; font-weight: 600;
                      text-decoration: none; border-radius: 8px;
                      box-shadow: 0 2px 4px rgba(99, 102, 241, 0.3);">
              Reset Password
            </a>
          </div>

          <!-- Alternative Link -->
          <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
            Or copy and paste this link into your browser:
          </p>
          <p style="color: #6366f1; font-size: 14px; word-break: break-all; margin: 8px 0 24px 0;">
            ${resetUrl}
          </p>

          <!-- Footer -->
          <div style="border-top: 1px solid #e4e4e7; padding-top: 24px; margin-top: 24px;">
            <p style="color: #a1a1aa; font-size: 13px; line-height: 1.5; margin: 0;">
              This link will expire in <strong>1 hour</strong>. If you didn't request this reset,
              you can safely ignore this email - your password will remain unchanged.
            </p>
          </div>
        </div>

        <!-- Email Footer -->
        <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin: 24px 0 0 0;">
          &copy; ${new Date().getFullYear()} myBrain. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Generate plain text email for password reset.
 * Plain text is important for email clients that don't support HTML.
 *
 * @param {string} resetUrl - The full URL to reset password
 * @returns {string} Plain text email content
 */
function getPasswordResetText(resetUrl) {
  return `
Password Reset Request

You requested to reset your myBrain password.

Visit this link to create a new password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this reset, you can safely ignore this email - your password will remain unchanged.

---
myBrain
`.trim();
}

// =============================================================================
// EMAIL SENDING FUNCTIONS
// =============================================================================

/**
 * sendPasswordResetEmail(email, resetToken, resetUrl)
 * ====================================================
 * Sends a password reset email to the specified address.
 *
 * WHAT THIS FUNCTION DOES:
 * ------------------------
 * 1. In development: Logs the reset URL to console
 * 2. In production: Sends an actual email via SMTP
 *
 * SECURITY NOTES:
 * ---------------
 * - The resetToken is included in the URL, not the email body
 * - URLs are generated server-side (not by this function)
 * - This function just delivers the email
 *
 * @param {string} email - Recipient's email address
 * @param {string} resetToken - The password reset token (for logging only)
 * @param {string} resetUrl - The full URL to reset password (includes token)
 *
 * @throws {Error} If email sending fails in production
 *
 * EXAMPLE USAGE:
 * ```javascript
 * await sendPasswordResetEmail(
 *   'user@example.com',
 *   'abc123token',
 *   'https://mybrain.app/reset-password?token=abc123token'
 * );
 * ```
 */
export async function sendPasswordResetEmail(email, resetToken, resetUrl) {
  // ===========================================================================
  // DEVELOPMENT MODE: Log to console
  // ===========================================================================
  if (isDevelopment || !transporter) {
    console.log('\n' + '='.repeat(70));
    console.log('📧 PASSWORD RESET EMAIL (Development Mode)');
    console.log('='.repeat(70));
    console.log(`To:        ${email}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log(`Token:     ${resetToken}`);
    console.log('='.repeat(70) + '\n');

    // In development, we don't actually send the email
    return;
  }

  // ===========================================================================
  // PRODUCTION MODE: Send real email via SMTP
  // ===========================================================================
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@mybrain.app',
    to: email,
    subject: 'Reset Your myBrain Password',
    html: getPasswordResetHtml(resetUrl),
    text: getPasswordResetText(resetUrl),
  };

  await transporter.sendMail(mailOptions);
}

/**
 * verifyEmailConfig()
 * ===================
 * Verifies that the email service is properly configured.
 *
 * WHAT THIS FUNCTION DOES:
 * ------------------------
 * 1. In development: Always returns true (console logging works)
 * 2. In production: Attempts to connect to SMTP server
 *
 * @returns {Promise<boolean>} True if email service is ready
 *
 * EXAMPLE USAGE:
 * ```javascript
 * const isReady = await verifyEmailConfig();
 * if (!isReady) {
 *   console.warn('Email service not configured');
 * }
 * ```
 */
export async function verifyEmailConfig() {
  if (isDevelopment || !transporter) {
    console.log('📧 Email service: Development mode (console logging)');
    return true;
  }

  try {
    await transporter.verify();
    console.log('📧 Email service: SMTP configured and ready');
    return true;
  } catch (error) {
    console.error('📧 Email service configuration error:', error.message);
    return false;
  }
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default {
  sendPasswordResetEmail,
  verifyEmailConfig,
};
