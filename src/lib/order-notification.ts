import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { lookup } from "node:dns/promises";
import { prisma } from "@/lib/prisma";
import { getStoreSettings } from "@/lib/store-settings";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ?? character);
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export async function sendNewOrderNotification(orderId: string, currency = "VND") {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    console.warn("[ORDER_EMAIL] SMTP is not fully configured; notification skipped");
    return;
  }

  try {
    const [order, settings] = await Promise.all([
      prisma.order.findUnique({ where: { id: orderId }, include: { items: { orderBy: { id: "asc" } } } }),
      getStoreSettings(),
    ]);
    if (!order) return;
    if (!settings.orderNotificationEnabled) return;
    const storedRecipients: string[] = Array.isArray(settings.orderNotificationEmails)
      ? (settings.orderNotificationEmails as unknown[]).filter((email: unknown): email is string => typeof email === "string")
      : [];
    const fallbackRecipients: string[] = (settings.orderNotificationEmail || process.env.ORDER_NOTIFICATION_EMAIL || user)
      .split(",")
      .map((email: string) => email.trim())
      .filter(Boolean);
    const recipients: string[] = Array.from(new Set(storedRecipients.length > 0 ? storedRecipients : fallbackRecipients));
    if (recipients.length === 0) return;

    const rows = order.items.map((item) => `<tr><td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(item.productName)}${item.variantName ? `<br><small>${escapeHtml(item.variantName)}</small>` : ""}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${money(Number(item.price) * item.quantity, currency)}</td></tr>`).join("");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
    const adminUrl = appUrl ? `${appUrl}/vi/admin/orders/${order.id}` : "";
    const textItems = order.items.map((item) => `- ${item.productName}${item.variantName ? ` (${item.variantName})` : ""} × ${item.quantity}: ${money(Number(item.price) * item.quantity, currency)}`).join("\n");

    const smtpHost = process.env.SMTP_PREFER_IPV4 === "true" ? (await lookup(host, { family: 4 })).address : host;
    const transportOptions: SMTPTransport.Options = {
      host: smtpHost,
      port: Number(process.env.SMTP_PORT || 465),
      secure: process.env.SMTP_SECURE !== "false",
      auth: { user, pass },
      ...(smtpHost !== host ? { tls: { servername: host } } : {}),
    };
    const transporter = nodemailer.createTransport(transportOptions);

    await transporter.sendMail({
      from: process.env.SMTP_FROM || user,
      to: recipients,
      subject: `New order ${order.orderNumber} · ${money(Number(order.totalAmount), currency)}`,
      text: `New order ${order.orderNumber}\n\nCustomer: ${order.customerName}\nPhone: ${order.customerPhone}\nAddress: ${order.address}\nPayment: ${order.paymentMethod} (${order.paymentStatus})\n\n${textItems}\n\nTotal: ${money(Number(order.totalAmount), currency)}${adminUrl ? `\n\nView order: ${adminUrl}` : ""}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:640px;color:#292524"><h2 style="color:#b51f30">New order ${escapeHtml(order.orderNumber)}</h2><p><strong>${escapeHtml(order.customerName)}</strong><br>${escapeHtml(order.customerPhone)}${order.customerEmail ? `<br>${escapeHtml(order.customerEmail)}` : ""}<br>${escapeHtml(order.address)}</p><table style="width:100%;border-collapse:collapse"><thead><tr><th style="padding:8px;text-align:left;border-bottom:2px solid #b51f30">Item</th><th style="padding:8px;border-bottom:2px solid #b51f30">Qty</th><th style="padding:8px;text-align:right;border-bottom:2px solid #b51f30">Amount</th></tr></thead><tbody>${rows}</tbody></table><p style="font-size:18px;text-align:right"><strong>Total: ${money(Number(order.totalAmount), currency)}</strong></p><p>Payment: ${escapeHtml(order.paymentMethod)} · ${escapeHtml(order.paymentStatus)}</p>${adminUrl ? `<p><a href="${adminUrl}" style="display:inline-block;background:#b51f30;color:white;padding:10px 16px;text-decoration:none">View order</a></p>` : ""}</div>`,
    });
  } catch (error) {
    console.error("[ORDER_EMAIL] Notification failed", error instanceof Error ? error.message : "Unknown SMTP error");
  }
}
