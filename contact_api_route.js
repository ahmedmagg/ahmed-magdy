// app/api/contact/route.js (Next.js App Router)
// أو: pages/api/contact.js (Next.js Pages Router)

import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

// استخدم Resend (أفضل وأسهل) أو Nodemailer مع SMTP
const USE_RESEND = true;

// Resend API Key — احصل عليه من: https://resend.com
const RESEND_API_KEY = re_TNXm1YB4_7sbo2QMB1spey7xBfbH4NxdV;

// أو إعدادات SMTP (Gmail, Outlook, إلخ)
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

// البريد المستقبل
const RECIPIENT_EMAIL = 'ellmdy2005@gmail.com';

// ═══════════════════════════════════════════════════════════════

export async function POST(request) {
  try {
    const formData = await request.formData();

    const fullName = formData.get('fullName');
    const phone = formData.get('phone');
    const email = formData.get('email');
    const description = formData.get('description');
    const file = formData.get('fileUpload');

    // Validation
    if (!fullName || !phone || !email || !description) {
      return NextResponse.json(
        { success: false, message: 'جميع الحقول المطلوبة يجب ملؤها' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'بريد إلكتروني غير صالح' },
        { status: 400 }
      );
    }

    // Prepare email content
    const subject = `طلب خدمة جديد من ${fullName}`;
    const htmlContent = `
      <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 12px;">
        <h2 style="color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">📋 طلب خدمة جديد</h2>

        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr>
            <td style="padding: 10px; background: #ffffff; border-radius: 8px 0 0 8px; font-weight: bold; color: #374151; width: 30%;">الاسم الكامل</td>
            <td style="padding: 10px; background: #ffffff; border-radius: 0 8px 8px 0; color: #1f2937;">${fullName}</td>
          </tr>
          <tr><td colspan="2" style="height: 8px;"></td></tr>
          <tr>
            <td style="padding: 10px; background: #ffffff; border-radius: 8px 0 0 8px; font-weight: bold; color: #374151;">رقم الهاتف</td>
            <td style="padding: 10px; background: #ffffff; border-radius: 0 8px 8px 0; color: #1f2937; direction: ltr; text-align: right;">${phone}</td>
          </tr>
          <tr><td colspan="2" style="height: 8px;"></td></tr>
          <tr>
            <td style="padding: 10px; background: #ffffff; border-radius: 8px 0 0 8px; font-weight: bold; color: #374151;">البريد الإلكتروني</td>
            <td style="padding: 10px; background: #ffffff; border-radius: 0 8px 8px 0; color: #1f2937; direction: ltr; text-align: right;">${email}</td>
          </tr>
          <tr><td colspan="2" style="height: 8px;"></td></tr>
          <tr>
            <td style="padding: 10px; background: #ffffff; border-radius: 8px 0 0 8px; font-weight: bold; color: #374151; vertical-align: top;">الوصف</td>
            <td style="padding: 10px; background: #ffffff; border-radius: 0 8px 8px 0; color: #1f2937; white-space: pre-wrap;">${description}</td>
          </tr>
        </table>

        <p style="margin-top: 20px; color: #6b7280; font-size: 0.85rem;">
          تم إرسال هذا الطلب من نموذج التواصل على الموقع.
        </p>
      </div>
    `;

    let sendResult;

    if (USE_RESEND) {
      // ═══════════════════════════════════════
      // Send via Resend API
      // ═══════════════════════════════════════
      const attachments = [];

      if (file && file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        attachments.push({
          filename: file.name,
          content: buffer.toString('base64'),
        });
      }

      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'onboarding@resend.dev', // أو domainك المُفعّل
          to: RECIPIENT_EMAIL,
          subject: subject,
          html: htmlContent,
          attachments: attachments,
          reply_to: email,
        }),
      });

      sendResult = await resendResponse.json();

      if (!resendResponse.ok) {
        throw new Error(sendResult.message || 'فشل في الإرسال عبر Resend');
      }

    } else {
      // ═══════════════════════════════════════
      // Send via Nodemailer (SMTP)
      // ═══════════════════════════════════════
      const transporter = nodemailer.createTransport(SMTP_CONFIG);

      const mailOptions = {
        from: `"نموذج التواصل" <${SMTP_CONFIG.auth.user}>`,
        to: RECIPIENT_EMAIL,
        subject: subject,
        html: htmlContent,
        replyTo: email,
      };

      if (file && file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        mailOptions.attachments = [{
          filename: file.name,
          content: buffer,
        }];
      }

      sendResult = await transporter.sendMail(mailOptions);
    }

    return NextResponse.json(
      { success: true, message: 'تم إرسال الطلب بنجاح', id: sendResult?.id },
      { status: 200 }
    );

  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}
