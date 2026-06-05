const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

const sendEmail = async ({ to, subject, html, text }) => {
  const transporter = createTransporter();
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'SentinelX <noreply@sentinelx.com>',
    to,
    subject,
    html,
    text
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
};

const passwordResetTemplate = (name, resetUrl) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Inter', Arial, sans-serif; background: #070b12; color: #e2e8f0; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #111827; border-radius: 12px; overflow: hidden; border: 1px solid #1f2937; }
    .header { background: linear-gradient(135deg, #070b12, #0d1117); padding: 40px; text-align: center; border-bottom: 2px solid #00f5ff; }
    .logo { font-size: 28px; font-weight: 900; color: #00f5ff; letter-spacing: 3px; }
    .tagline { color: #7c3aed; font-size: 13px; margin-top: 4px; }
    .body { padding: 40px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #00f5ff, #7c3aed); color: #070b12; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; margin: 24px 0; }
    .footer { background: #0d1117; padding: 20px 40px; text-align: center; color: #6b7280; font-size: 12px; }
    p { color: #94a3b8; line-height: 1.6; }
    .warning { color: #f59e0b; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">⬡ SENTINEL<span style="color:#7c3aed">X</span></div>
      <div class="tagline">Detect. Report. Resolve.</div>
    </div>
    <div class="body">
      <h2 style="color:#00f5ff">Password Reset Request</h2>
      <p>Hello <strong style="color:#e2e8f0">${name}</strong>,</p>
      <p>We received a request to reset your SentinelX account password. Click the button below to proceed:</p>
      <div style="text-align:center">
        <a href="${resetUrl}" class="btn">Reset My Password</a>
      </div>
      <p class="warning">⚠️ This link expires in 1 hour. If you didn't request this, please ignore this email and secure your account.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} SentinelX — Cyber Security Platform</p>
    </div>
  </div>
</body>
</html>
`;

module.exports = { sendEmail, passwordResetTemplate };
