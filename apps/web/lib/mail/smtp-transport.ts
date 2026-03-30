import "server-only";

import nodemailer from "nodemailer";

function envBool(value: string | undefined, defaultTrue: boolean): boolean {
  if (value === undefined || value === "") return defaultTrue;
  return value.toLowerCase() === "true" || value === "1";
}

export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS !== undefined,
  );
}

export function createSmtpTransport() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS ?? "";

  if (!host || !user) {
    throw new Error("[mail] SMTP_HOST / SMTP_USER fehlen");
  }

  const secure = envBool(process.env.SMTP_SSL, false);
  const requireTLS = envBool(process.env.SMTP_STARTTLS, true);
  const useAuth = envBool(process.env.SMTP_AUTH, true);

  return nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: secure ? false : requireTLS,
    auth: useAuth ? { user, pass } : undefined,
  });
}
