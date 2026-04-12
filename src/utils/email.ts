import nodemailer from "nodemailer";
import { envVars } from "../config/env";
// import path from "path";
// import fs from "fs";

const transporter = nodemailer.createTransport({
  host: envVars.EMAIL_SENDER.SMTP_HOST,
  port: parseInt(envVars.EMAIL_SENDER.SMTP_PORT),
  secure: envVars.EMAIL_SENDER.SMTP_PORT === "465", // true for 465, false for other ports
  auth: {
    user: envVars.EMAIL_SENDER.SMTP_USER,
    pass: envVars.EMAIL_SENDER.SMTP_PASS,
  },
});

export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  attachments?: any[]
) => {
  try {
    const mailOptions = {
      from: envVars.EMAIL_SENDER.SMTP_FROM,
      to,
      subject,
      html,
      attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

export const sendWelcomeEmail = async (to: string, name: string, role: string) => {
  const subject = `Welcome to LuxeLiving - Your ${role} Account is Ready!`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome to LuxeLiving, ${name}!</h2>
      <p>Your ${role.toLowerCase()} account has been successfully created.</p>
      <p>You can now access all the features available to ${role.toLowerCase()}s on our platform.</p>
      <p>If you have any questions, feel free to contact our support team.</p>
      <br>
      <p>Best regards,<br>The LuxeLiving Team</p>
    </div>
  `;

  return sendEmail(to, subject, html);
};

export const sendViewingConfirmationEmail = async (
  to: string,
  buyerName: string,
  propertyTitle: string,
  viewingDate: Date,
  agentName: string,
  agentContact: string
) => {
  const subject = `Viewing Confirmed - ${propertyTitle}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Viewing Confirmation</h2>
      <p>Dear ${buyerName},</p>
      <p>Your viewing request has been confirmed!</p>
      <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px;">
        <h3>Viewing Details:</h3>
        <p><strong>Property:</strong> ${propertyTitle}</p>
        <p><strong>Date & Time:</strong> ${viewingDate.toLocaleString()}</p>
        <p><strong>Agent:</strong> ${agentName}</p>
        <p><strong>Contact:</strong> ${agentContact}</p>
      </div>
      <p>Please arrive on time and bring any necessary documents.</p>
      <p>If you need to reschedule or cancel, please contact us as soon as possible.</p>
      <br>
      <p>Best regards,<br>The LuxeLiving Team</p>
    </div>
  `;

  return sendEmail(to, subject, html);
};

export const sendPaymentConfirmationEmail = async (
  to: string,
  buyerName: string,
  propertyTitle: string,
  amount: number,
  transactionId: string
) => {
  const subject = `Payment Confirmed - ${propertyTitle} Viewing`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Payment Confirmation</h2>
      <p>Dear ${buyerName},</p>
      <p>Your payment has been successfully processed!</p>
      <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px;">
        <h3>Payment Details:</h3>
        <p><strong>Property:</strong> ${propertyTitle}</p>
        <p><strong>Amount:</strong> $${amount}</p>
        <p><strong>Transaction ID:</strong> ${transactionId}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
      </div>
      <p>Your viewing is now confirmed. You will receive additional details via email.</p>
      <br>
      <p>Best regards,<br>The LuxeLiving Team</p>
    </div>
  `;

  return sendEmail(to, subject, html);
};

export const sendReviewNotificationEmail = async (
  to: string,
  reviewerName: string,
  propertyTitle: string,
  rating: number,
  comment: string
) => {
  const subject = `New Review for ${propertyTitle}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>New Review Received</h2>
      <p>You have received a new review for <strong>${propertyTitle}</strong>.</p>
      <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px;">
        <p><strong>Reviewer:</strong> ${reviewerName}</p>
        <p><strong>Rating:</strong> ${rating}/5 stars</p>
        <p><strong>Comment:</strong></p>
        <p style="font-style: italic;">"${comment}"</p>
      </div>
      <br>
      <p>Best regards,<br>The LuxeLiving Team</p>
    </div>
  `;

  return sendEmail(to, subject, html);
};