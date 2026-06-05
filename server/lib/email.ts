import nodemailer from "nodemailer";

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

export async function testConnection(config: EmailConfig): Promise<{ ok: boolean; error?: string }> {
  try {
    const t = nodemailer.createTransport({ host: config.host, port: config.port, secure: config.secure, auth: { user: config.user, pass: config.pass } });
    await t.verify();
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export async function sendEmail(config: EmailConfig, to: string, subject: string, html: string): Promise<{ success: boolean; error?: string }> {
  try {
    const t = nodemailer.createTransport({ host: config.host, port: config.port, secure: config.secure, auth: { user: config.user, pass: config.pass } });
    const from = config.fromEmail ? `"${config.fromName}" <${config.fromEmail}>` : config.user;
    await t.sendMail({ from, to, subject, html });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export function buildHtml(subject: string, body: string, recipientName: string): string {
  const escaped = body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0f0f12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:600px;margin:40px auto;background:#1a1a2e;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,.1)">
    <div style="padding:24px 32px;background:linear-gradient(135deg,#ef4444,#14b8a6)">
      <span style="color:#fff;font-size:20px;font-weight:800">GlobalReach</span>
    </div>
    <div style="padding:32px">
      <p style="color:#e2e8f0;font-size:16px;margin:0 0 8px">Hi ${recipientName},</p>
      <div style="color:#cbd5e1;font-size:15px;line-height:1.7">${escaped}</div>
    </div>
    <div style="padding:16px 32px;border-top:1px solid rgba(255,255,255,.08)">
      <p style="color:#475569;font-size:12px;margin:0">Sent via GlobalReach · <a href="#" style="color:#475569">Unsubscribe</a></p>
    </div>
  </div>
</body></html>`;
}
