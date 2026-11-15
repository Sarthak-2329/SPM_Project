'use strict';

const nodemailer = require('nodemailer');
const { env } = require('../config/env');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  async initTransporter() {
    try {
      if (env.NODE_ENV === 'test') {
        // Mock transporter in test mode
        this.transporter = {
          sendMail: async (opts) => ({ messageId: `mock-${Date.now()}`, opts }),
        };
        return;
      }

      if (env.SMTP_USE_ETHEREAL) {
        // Create ethereal test account if not explicitly configured
        if (!env.SMTP_USER || env.SMTP_USER.includes('your_ethereal')) {
          const testAccount = await nodemailer.createTestAccount();
          this.transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
              user: testAccount.user,
              pass: testAccount.pass,
            },
          });
          console.info(`📧 Ethereal test SMTP initialized: ${testAccount.user}`);
          return;
        }
      }

      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
    } catch (err) {
      console.warn('⚠️ Could not initialize SMTP transporter:', err.message);
    }
  }

  async sendMail({ to, subject, html, text }) {
    if (!this.transporter) {
      await this.initTransporter();
    }
    if (!this.transporter) {
      console.warn('⚠️ Transporter unavailable. Skipping email dispatch.');
      return null;
    }

    try {
      const info = await this.transporter.sendMail({
        from: env.SMTP_FROM,
        to,
        subject,
        text,
        html,
      });

      if (env.SMTP_USE_ETHEREAL && nodemailer.getTestMessageUrl && info) {
        console.info(`✉️ Email dispatched. Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      }
      return info;
    } catch (err) {
      console.error('❌ Failed to send email:', err.message);
      return null;
    }
  }

  async sendAssignmentEmail(technicianEmail, technicianName, workOrder) {
    const subject = `[CMMS Assignment] Work Order #${workOrder.id.slice(-6)}: ${workOrder.title}`;
    const html = `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #2563eb;">New Maintenance Work Order Assigned</h2>
        <p>Hello <strong>${technicianName}</strong>,</p>
        <p>You have been assigned to the following campus maintenance work order:</p>
        <table style="border-collapse: collapse; width: 100%; margin: 15px 0;">
          <tr><td style="padding: 6px; font-weight: bold; width: 140px;">Title:</td><td style="padding: 6px;">${workOrder.title}</td></tr>
          <tr><td style="padding: 6px; font-weight: bold;">Priority:</td><td style="padding: 6px;">${workOrder.priority}</td></tr>
          <tr><td style="padding: 6px; font-weight: bold;">Due Date:</td><td style="padding: 6px;">${workOrder.dueDate ? new Date(workOrder.dueDate).toLocaleDateString() : 'Immediate'}</td></tr>
          <tr><td style="padding: 6px; font-weight: bold;">Description:</td><td style="padding: 6px;">${workOrder.description}</td></tr>
        </table>
        <p>Please log in to the Campus CMMS portal to review and begin work.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
        <small style="color: #888;">Campus Maintenance Management System - Automated Notification</small>
      </div>
    `;
    return this.sendMail({ to: technicianEmail, subject, html, text: subject });
  }

  async sendStatusChangeEmail(recipientEmail, recipientName, workOrder, previousStatus, newStatus) {
    const subject = `[CMMS Update] Work Order #${workOrder.id.slice(-6)} Status Changed to ${newStatus}`;
    const html = `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #059669;">Work Order Status Update</h2>
        <p>Hello <strong>${recipientName}</strong>,</p>
        <p>The status of work order <strong>${workOrder.title}</strong> has been updated:</p>
        <p style="font-size: 16px; margin: 15px 0;">
          <span style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">${previousStatus || 'INIT'}</span>
          &rarr;
          <strong style="color: #2563eb; background: #eff6ff; padding: 4px 8px; border-radius: 4px;">${newStatus}</strong>
        </p>
        <p>Visit your CMMS portal to track timeline notes and resolution progress.</p>
      </div>
    `;
    return this.sendMail({ to: recipientEmail, subject, html, text: subject });
  }
}

module.exports = new EmailService();
