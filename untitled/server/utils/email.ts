import nodemailer from 'nodemailer';

export interface EmailSendResult {
  configured: boolean;
  sent: boolean;
  error?: string;
}

export function getSmtpConfig() {
  const host = (process.env.SMTP_HOST || '').trim();
  const port = Number(process.env.SMTP_PORT || '587');
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = (process.env.SMTP_USER || '').trim();
  const pass = process.env.SMTP_PASS || '';
  const from = (process.env.SMTP_FROM || user || 'noreply@mastersofall.org').trim();
  const notifyEmail = (process.env.NOTIFY_EMAIL || '').trim();

  return {
    configured: Boolean(host && from),
    host,
    port: Number.isFinite(port) && port > 0 ? port : 587,
    secure,
    user,
    pass,
    from,
    notifyEmail
  };
}

export function isSmtpConfigured(): boolean {
  return getSmtpConfig().configured;
}

async function sendMailInternal(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<EmailSendResult> {
  const cfg = getSmtpConfig();
  if (!cfg.configured) {
    return {
      configured: false,
      sent: false,
      error: 'SMTP is not configured on this server.'
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined
    });

    await transporter.sendMail({
      from: cfg.from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html
    });

    return { configured: true, sent: true };
  } catch (err) {
    return {
      configured: true,
      sent: false,
      error: err instanceof Error ? err.message : 'SMTP delivery failed'
    };
  }
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendInvitationEmail(params: {
  to: string;
  inviteUrl: string;
  invitedByName: string;
  roleName: string;
  siteName: string;
}): Promise<EmailSendResult> {
  const subject = `You have been invited to ${params.siteName} Control Room`;
  const text = [
    `Hello,`,
    ``,
    `${params.invitedByName} invited you to join ${params.siteName} with the role: ${params.roleName}.`,
    ``,
    `Accept your invitation here (valid for 7 days, single-use):`,
    params.inviteUrl,
    ``,
    `If you did not expect this invitation, you can ignore this message.`
  ].join('\n');

  const html = `
    <div style="font-family: sans-serif; line-height: 1.6; color: #06302F; max-width: 560px; margin: 0 auto;">
      <h2>Invitation to ${escapeHtml(params.siteName)}</h2>
      <p>${escapeHtml(params.invitedByName)} invited you to join the ${escapeHtml(params.siteName)} Control Room with the role <strong>${escapeHtml(params.roleName)}</strong>.</p>
      <p style="margin: 24px 0;">
        <a href="${escapeHtml(params.inviteUrl)}" style="background: #17A491; color: #06302F; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">Accept Invitation</a>
      </p>
      <p style="font-size: 12px; color: #555;">This single-use link expires in 7 days. Or copy this URL: ${escapeHtml(params.inviteUrl)}</p>
    </div>
  `;

  return sendMailInternal({ to: params.to, subject, text, html });
}

export async function sendPasswordResetEmail(params: {
  to: string;
  name: string;
  resetUrl: string;
  siteName: string;
}): Promise<EmailSendResult> {
  const subject = `${params.siteName} Password Reset`;
  const text = [
    `Hello ${params.name},`,
    ``,
    `A password reset was requested for your ${params.siteName} Control Room account.`,
    ``,
    `Reset your password here (valid for 1 hour, single-use):`,
    params.resetUrl,
    ``,
    `If you did not request this, you can safely ignore this message.`
  ].join('\n');

  const html = `
    <div style="font-family: sans-serif; line-height: 1.6; color: #06302F; max-width: 560px; margin: 0 auto;">
      <h2>Reset your ${escapeHtml(params.siteName)} password</h2>
      <p>Hello ${escapeHtml(params.name)},</p>
      <p>A password reset was requested for your account. Click below to choose a new password:</p>
      <p style="margin: 24px 0;">
        <a href="${escapeHtml(params.resetUrl)}" style="background: #17A491; color: #06302F; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">Reset Password</a>
      </p>
      <p style="font-size: 12px; color: #555;">This single-use link expires in 1 hour. URL: ${escapeHtml(params.resetUrl)}</p>
    </div>
  `;

  return sendMailInternal({ to: params.to, subject, text, html });
}

export async function sendSubmissionNotificationEmail(params: {
  siteName: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
}): Promise<EmailSendResult> {
  const cfg = getSmtpConfig();
  if (!cfg.configured || !cfg.notifyEmail) {
    return {
      configured: cfg.configured && Boolean(cfg.notifyEmail),
      sent: false
    };
  }

  const mailSubject = `[${params.siteName} Contact] ${params.subject}`;
  const text = [
    `New contact form submission from ${params.senderName} <${params.senderEmail}>`,
    `Subject: ${params.subject}`,
    ``,
    params.message
  ].join('\n');

  const html = `
    <div style="font-family: sans-serif; line-height: 1.6; color: #06302F; max-width: 560px; margin: 0 auto;">
      <h3>New Contact Inquiry — ${escapeHtml(params.siteName)}</h3>
      <p><strong>From:</strong> ${escapeHtml(params.senderName)} (${escapeHtml(params.senderEmail)})</p>
      <p><strong>Subject:</strong> ${escapeHtml(params.subject)}</p>
      <hr />
      <p style="white-space: pre-wrap;">${escapeHtml(params.message)}</p>
    </div>
  `;

  return sendMailInternal({ to: cfg.notifyEmail, subject: mailSubject, text, html });
}
