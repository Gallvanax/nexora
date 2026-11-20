import nodemailer from "nodemailer";
import { env, isSmtpConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";

export interface EmailSendResult {
  delivered: boolean;
  mode: "smtp" | "dev_preview" | "unconfigured";
  previewUrl?: string;
}

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  actionUrl?: string;
}

export async function sendTransactionalEmail(input: SendEmailInput): Promise<EmailSendResult> {
  if (!isSmtpConfigured()) {
    logger.info("email.not_configured", {
      to: input.to,
      subject: input.subject,
      hasActionUrl: Boolean(input.actionUrl),
    });

    if (!env.isProduction && input.actionUrl) {
      return {
        delivered: false,
        mode: "dev_preview",
        previewUrl: input.actionUrl,
      };
    }

    return {
      delivered: false,
      mode: "unconfigured",
    };
  }

  const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });

  await transporter.sendMail({
    from: env.smtpFrom,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });

  logger.info("email.sent", { to: input.to, subject: input.subject });
  return { delivered: true, mode: "smtp" };
}

export function buildVerificationEmail(name: string, verifyUrl: string) {
  return {
    subject: "Vérifiez votre adresse e-mail — NEXORA",
    text: `Bonjour ${name},\n\nConfirmez votre adresse e-mail NEXORA en ouvrant ce lien (valable 24h) : ${verifyUrl}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
    html: `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #080B12; color: #F8FAFC; padding: 32px; border-radius: 16px; border: 1px solid #1E293B;">
        <h1 style="margin: 0 0 12px; font-size: 20px; color: #F8FAFC;">Bienvenue sur NEXORA, ${escapeHtml(name)}</h1>
        <p style="color: #94A3B8; line-height: 1.6;">Cliquez sur le bouton ci-dessous pour confirmer votre adresse e-mail. Ce lien expire dans 24 heures.</p>
        <p style="margin: 24px 0;">
          <a href="${escapeHtml(verifyUrl)}" style="display: inline-block; background: linear-gradient(135deg, #7C3AED, #3B82F6); color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 600;">Vérifier mon e-mail</a>
        </p>
        <p style="color: #64748B; font-size: 12px;">Si le bouton ne fonctionne pas, copiez ce lien : ${escapeHtml(verifyUrl)}</p>
      </div>
    `,
    actionUrl: verifyUrl,
  };
}

export function buildPasswordResetEmail(name: string, resetUrl: string) {
  return {
    subject: "Réinitialisation de votre mot de passe — NEXORA",
    text: `Bonjour ${name},\n\nRéinitialisez votre mot de passe NEXORA via ce lien (valable 1 heure) : ${resetUrl}\n\nSi vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet e-mail.`,
    html: `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #080B12; color: #F8FAFC; padding: 32px; border-radius: 16px; border: 1px solid #1E293B;">
        <h1 style="margin: 0 0 12px; font-size: 20px;">Réinitialisation du mot de passe</h1>
        <p style="color: #94A3B8; line-height: 1.6;">Bonjour ${escapeHtml(name)}, cliquez ci-dessous pour définir un nouveau mot de passe (lien valable 1 heure).</p>
        <p style="margin: 24px 0;">
          <a href="${escapeHtml(resetUrl)}" style="display: inline-block; background: #7C3AED; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 600;">Choisir un nouveau mot de passe</a>
        </p>
        <p style="color: #64748B; font-size: 12px;">Lien direct : ${escapeHtml(resetUrl)}</p>
      </div>
    `,
    actionUrl: resetUrl,
  };
}

export function buildInvitationEmail(
  workspaceName: string,
  inviterName: string,
  acceptUrl: string
) {
  return {
    subject: `Invitation à rejoindre ${workspaceName} sur NEXORA`,
    text: `${inviterName} vous invite à rejoindre l'espace "${workspaceName}" sur NEXORA. Ouvrez ce lien pour accepter ou refuser : ${acceptUrl}`,
    html: `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #080B12; color: #F8FAFC; padding: 32px; border-radius: 16px; border: 1px solid #1E293B;">
        <h1 style="margin: 0 0 12px; font-size: 20px;">Invitation NEXORA</h1>
        <p style="color: #94A3B8; line-height: 1.6;"><strong>${escapeHtml(inviterName)}</strong> vous invite à collaborer dans l'espace <strong>${escapeHtml(workspaceName)}</strong>.</p>
        <p style="margin: 24px 0;">
          <a href="${escapeHtml(acceptUrl)}" style="display: inline-block; background: linear-gradient(135deg, #7C3AED, #3B82F6); color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 600;">Voir l'invitation</a>
        </p>
      </div>
    `,
    actionUrl: acceptUrl,
  };
}

function escapeHtml(str: string): string {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
