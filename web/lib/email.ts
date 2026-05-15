import nodemailer from "nodemailer";

const REQUIRED_SMTP_VARS = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"] as const;

/**
 * Check whether SMTP is configured. Returns the list of missing env var names
 * (empty array means ready to send). Use this when an admin action depends on
 * email actually going out — we want a real error, not a silent no-op.
 */
export function smtpMissingVars(): string[] {
  return REQUIRED_SMTP_VARS.filter((name) => !process.env[name]);
}

export function isEmailConfigured(): boolean {
  return smtpMissingVars().length === 0;
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!process.env.SMTP_HOST) {
    console.log(`[Email – no SMTP configured] To: ${to} | Subject: ${subject}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || "AthletixOS <no-reply@clubos.app>",
    to,
    subject,
    html,
  });
}

// ── Email templates ──────────────────────────────────────────────────────────

function baseLayout(content: string): string {
  return `
    <div style="font-family:Inter,sans-serif;max-width:540px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #E7E5E4">
      <div style="background:#1C1917;padding:20px 28px;display:flex;align-items:center;gap:10px">
        <div style="width:28px;height:28px;border-radius:8px;background:#534AB7;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:13px">C</div>
        <span style="color:#fff;font-weight:600;font-size:15px">AthletixOS</span>
      </div>
      <div style="padding:28px">${content}</div>
      <div style="padding:16px 28px;border-top:1px solid #E7E5E4;background:#F5F3EE">
        <p style="color:#a8a29e;font-size:12px;margin:0">Sent via AthletixOS · <a href="https://clubos.app" style="color:#78716C">clubos.app</a></p>
      </div>
    </div>
  `;
}

export async function sendWelcomeEmail({
  to,
  firstName,
  clubName,
  loginUrl,
}: {
  to: string;
  firstName: string;
  clubName: string;
  loginUrl: string;
}) {
  await sendEmail({
    to,
    subject: `Welcome to ${clubName}!`,
    html: baseLayout(`
      <h2 style="color:#1c1917;margin:0 0 8px">Welcome, ${firstName}!</h2>
      <p style="color:#57534e;line-height:1.6;margin:0 0 20px">
        You've been added to <strong>${clubName}</strong> on AthletixOS.
        You can log in to view your schedule, documents, and more.
      </p>
      <a href="${loginUrl}" style="display:inline-block;background:#534AB7;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
        Access your member portal
      </a>
      <p style="color:#a8a29e;font-size:13px;margin:20px 0 0">
        If you have any questions, contact your club directly.
      </p>
    `),
  });
}

export async function sendPasswordResetEmail({
  to,
  firstName,
  clubName,
  resetUrl,
}: {
  to: string;
  firstName: string;
  clubName: string;
  resetUrl: string;
}) {
  await sendEmail({
    to,
    subject: "Reset your AthletixOS password",
    html: baseLayout(`
      <h2 style="color:#1c1917;margin:0 0 8px">Reset your password</h2>
      <p style="color:#57534e;line-height:1.6;margin:0 0 4px">Hi ${firstName},</p>
      <p style="color:#57534e;line-height:1.6;margin:0 0 20px">
        We received a request to reset your password for <strong>${clubName}</strong> on AthletixOS.
      </p>
      <a href="${resetUrl}" style="display:inline-block;background:#534AB7;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
        Reset password
      </a>
      <p style="color:#a8a29e;font-size:13px;margin:20px 0 0">
        This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
      </p>
    `),
  });
}

export async function sendStaffInviteEmail({
  to,
  firstName,
  clubName,
  inviterName,
  loginUrl,
  tempPassword,
}: {
  to: string;
  firstName: string;
  clubName: string;
  inviterName: string;
  loginUrl: string;
  tempPassword?: string;
}) {
  await sendEmail({
    to,
    subject: `You've been added as staff at ${clubName}`,
    html: baseLayout(`
      <h2 style="color:#1c1917;margin:0 0 8px">Welcome to the team, ${firstName}!</h2>
      <p style="color:#57534e;line-height:1.6;margin:0 0 12px">
        ${inviterName} added you as staff at <strong>${clubName}</strong> on AthletixOS.
        You can now sign in to manage members, classes, and more.
      </p>
      ${tempPassword ? `
        <div style="background:#F5F3EE;border-radius:8px;padding:14px;margin:0 0 16px">
          <p style="color:#57534e;margin:0 0 4px;font-size:13px">Your temporary password:</p>
          <p style="font-family:monospace;font-size:15px;color:#1c1917;margin:0">${tempPassword}</p>
          <p style="color:#a8a29e;font-size:12px;margin:8px 0 0">Change it after your first login from Settings.</p>
        </div>
      ` : ""}
      <a href="${loginUrl}" style="display:inline-block;background:#534AB7;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
        Sign in
      </a>
    `),
  });
}

export async function sendBookingConfirmationEmail({
  to,
  firstName,
  clubName,
  eventName,
  startsAt,
  endsAt,
  location,
  coveredByMembership,
  amountPaid,
  portalUrl,
}: {
  to: string;
  firstName: string;
  clubName: string;
  eventName: string;
  startsAt: Date;
  endsAt?: Date | null;
  location?: string | null;
  coveredByMembership?: boolean;
  amountPaid?: string;
  portalUrl: string;
}) {
  const fmtDate = startsAt.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const fmtTime = startsAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const endTime = endsAt ? ` – ${endsAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : "";

  await sendEmail({
    to,
    subject: `Booking confirmed: ${eventName}`,
    html: baseLayout(`
      <h2 style="color:#1c1917;margin:0 0 8px">You're confirmed, ${firstName}!</h2>
      <p style="color:#57534e;line-height:1.6;margin:0 0 16px">
        Your spot at <strong>${eventName}</strong> with ${clubName} is locked in.
      </p>
      <div style="background:#F5F3EE;border-radius:8px;padding:16px;margin:0 0 16px">
        <p style="color:#1c1917;margin:0 0 4px;font-weight:600">${eventName}</p>
        <p style="color:#57534e;margin:0;font-size:14px">${fmtDate}</p>
        <p style="color:#57534e;margin:0;font-size:14px">${fmtTime}${endTime}</p>
        ${location ? `<p style="color:#a8a29e;margin:6px 0 0;font-size:13px">${location}</p>` : ""}
        ${coveredByMembership
          ? `<p style="color:#65A30D;margin:8px 0 0;font-size:13px;font-weight:500">Covered by your membership</p>`
          : amountPaid
            ? `<p style="color:#57534e;margin:8px 0 0;font-size:13px">Paid: <strong>${amountPaid}</strong></p>`
            : ""}
      </div>
      <a href="${portalUrl}" style="display:inline-block;background:#534AB7;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
        View in your portal
      </a>
    `),
  });
}

export async function sendMembershipActivatedEmail({
  to,
  firstName,
  clubName,
  membershipName,
  amountPaid,
  endDate,
  portalUrl,
}: {
  to: string;
  firstName: string;
  clubName: string;
  membershipName: string;
  amountPaid?: string;
  endDate?: Date | null;
  portalUrl: string;
}) {
  await sendEmail({
    to,
    subject: `Welcome to ${membershipName} at ${clubName}`,
    html: baseLayout(`
      <h2 style="color:#1c1917;margin:0 0 8px">You're in, ${firstName}!</h2>
      <p style="color:#57534e;line-height:1.6;margin:0 0 16px">
        Your <strong>${membershipName}</strong> membership at ${clubName} is now active.
      </p>
      <div style="background:#F5F3EE;border-radius:8px;padding:16px;margin:0 0 16px">
        <p style="color:#1c1917;margin:0 0 4px;font-weight:600">${membershipName}</p>
        ${amountPaid ? `<p style="color:#57534e;margin:0;font-size:14px">Paid: <strong>${amountPaid}</strong></p>` : ""}
        ${endDate ? `<p style="color:#57534e;margin:4px 0 0;font-size:14px">Renews ${endDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>` : ""}
      </div>
      <a href="${portalUrl}" style="display:inline-block;background:#534AB7;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
        Go to your portal
      </a>
      <p style="color:#a8a29e;font-size:13px;margin:20px 0 0">
        You can manage your membership and payment method any time from the portal.
      </p>
    `),
  });
}

export async function sendPaymentFailedEmail({
  to,
  firstName,
  clubName,
  amount,
  loginUrl,
}: {
  to: string;
  firstName: string;
  clubName: string;
  amount: string;
  loginUrl: string;
}) {
  await sendEmail({
    to,
    subject: `Payment issue with your ${clubName} membership`,
    html: baseLayout(`
      <h2 style="color:#A32D2D;margin:0 0 8px">Payment failed</h2>
      <p style="color:#57534e;line-height:1.6;margin:0 0 4px">Hi ${firstName},</p>
      <p style="color:#57534e;line-height:1.6;margin:0 0 20px">
        We weren't able to process your payment of <strong>${amount}</strong> for your membership at
        <strong>${clubName}</strong>. Please update your payment method to keep your membership active.
      </p>
      <a href="${loginUrl}" style="display:inline-block;background:#A32D2D;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
        Update payment method
      </a>
      <p style="color:#a8a29e;font-size:13px;margin:20px 0 0">
        If you need help, reply to this email or contact ${clubName} directly.
      </p>
    `),
  });
}
