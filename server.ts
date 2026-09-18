import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import nodemailer, { Transporter } from 'nodemailer';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini AI client
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Lazy-initialized Nodemailer Gmail Transporter
let mailTransporter: Transporter | null = null;
function getMailTransporter(): Transporter | null {
  const user = process.env.GMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS || process.env.SMTP_PASS;
  if (!mailTransporter && user && pass) {
    mailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
    });
  }
  return mailTransporter;
}

// Helper to send real emails via Gmail (with fallback logging)
async function sendGmailNotification(to: string, subject: string, body: string, html?: string) {
  const transporter = getMailTransporter();
  if (transporter) {
    try {
      const fromUser = process.env.GMAIL_USER || 'noreply@college.edu';
      const info = await transporter.sendMail({
        from: `"AI Student Grievance Portal" <${fromUser}>`,
        to,
        subject,
        text: body,
        html: html || body.replace(/\n/g, '<br/>'),
      });
      console.log('Gmail dispatched successfully via Nodemailer. Message ID:', info.messageId);
      return { sent: true, messageId: info.messageId };
    } catch (err: any) {
      console.error('Nodemailer Gmail dispatch error:', err?.message || err);
      return { sent: false, error: err?.message || String(err) };
    }
  }
  return {
    sent: false,
    reason: 'GMAIL_USER and GMAIL_APP_PASSWORD are not configured in environment settings.',
  };
}

// In-memory OTP storage for rapid demonstration & verification
// key: email/regNo, value: { otp: string, expiresAt: number }
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

// In-memory simulated Outbox / Email log so users can inspect outgoing emails
interface SentEmail {
  id: string;
  to: string;
  subject: string;
  body: string;
  type: 'otp' | 'confirmation' | 'resolution';
  timestamp: string;
}
const outbox: SentEmail[] = [];

// Helper: send simulated email
function sendSimulatedEmail(to: string, subject: string, body: string, type: 'otp' | 'confirmation' | 'resolution') {
  const emailItem: SentEmail = {
    id: 'eml_' + Math.random().toString(36).substring(2, 9),
    to,
    subject,
    body,
    type,
    timestamp: new Date().toISOString(),
  };
  outbox.unshift(emailItem);
  if (outbox.length > 50) outbox.pop();
  return emailItem;
}

// ---------------------- API ROUTES ----------------------

// 1. Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 2. Request OTP for Signup / Verification (Connected with Gmail)
app.post('/api/auth/send-otp', async (req: Request, res: Response) => {
  const { email, regNo, name } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email address is required' });
  }

  // Generate 6 digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins
  otpStore.set(email.toLowerCase(), { otp, expiresAt });

  const subject = 'Verification Code (OTP) - AI Student Grievance Portal';
  const textBody = `Hello ${name || 'Student'},\n\nYour 6-digit One-Time Password (OTP) for verification and registration at the AI Student Grievance Portal is: ${otp}\n\nThis code is valid for 5 minutes. Please do not share this OTP with anyone.\n\nWarm regards,\nCollege Student Grievance Redressal Cell`;
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b; max-width: 520px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <div style="background: linear-gradient(135deg, #1e3a8a, #312e81); padding: 16px 20px; border-radius: 12px; margin-bottom: 20px; text-align: center;">
        <h2 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 700;">AI Student Grievance Portal</h2>
        <p style="color: #93c5fd; margin: 4px 0 0 0; font-size: 12px;">Student Signup Verification</p>
      </div>
      <p style="font-size: 14px; margin-bottom: 12px;">Hello <strong>${name || 'Student'}</strong>,</p>
      <p style="font-size: 13px; color: #475569; margin-bottom: 16px;">Use the following 6-digit One-Time Password (OTP) to complete your student registration:</p>
      <div style="background-color: #f8fafc; border: 1px border-dashed #cbd5e1; padding: 18px; text-align: center; border-radius: 12px; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #2563eb; font-family: monospace;">${otp}</span>
      </div>
      <p style="font-size: 12px; color: #64748b; margin-top: 16px;">This OTP is valid for <strong>5 minutes</strong>. If you did not initiate this request, please ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0 16px 0;" />
      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">Campus Redressal & Anti-Ragging Cell &bull; Confidential & Automated Notice</p>
    </div>
  `;

  // 1. Record in outbox for live in-app email modal inspection
  const sentSimulated = sendSimulatedEmail(email, subject, textBody, 'otp');

  // 2. Dispatch real email via Gmail Nodemailer if credentials exist
  const gmailResult = await sendGmailNotification(email, subject, textBody, htmlBody);

  res.json({
    success: true,
    message: gmailResult.sent
      ? `OTP code sent directly to ${email} via Gmail.`
      : `OTP generated for ${email}. Check your email box or the in-app inbox.`,
    email,
    sentViaGmail: gmailResult.sent,
    previewOtp: otp, // Retained for immediate evaluation fallback
    sentEmail: sentSimulated,
  });
});

// 3. Verify OTP
app.post('/api/auth/verify-otp', (req: Request, res: Response) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }

  const record = otpStore.get(email.toLowerCase());
  if (!record) {
    return res.status(400).json({ error: 'No OTP found or expired. Please request a new one.' });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
  }

  if (record.otp !== otp.trim()) {
    return res.status(400).json({ error: 'Invalid OTP. Please check the code and try again.' });
  }

  // OTP is valid
  otpStore.delete(email.toLowerCase());
  res.json({ success: true, message: 'OTP verified successfully' });
});

// 4. AI Spam & Gibberish Classification Endpoint
app.post('/api/ai/classify-complaint', async (req: Request, res: Response) => {
  const { text, category, studentType } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Complaint text is required' });
  }

  const trimmed = text.trim();

  // Basic deterministic heuristic checks for fast response & fallback
  const isTooShort = trimmed.length < 2;
  const isRepetitive = /(.)\1{7,}/i.test(trimmed); // e.g. aaaaaaaa, xxxxxxxx
  const consonantsOnly = /^[^aeiou\s]{10,}$/i.test(trimmed); // e.g. cbhhcbhbdhcdbhd

  if (isTooShort || isRepetitive || consonantsOnly) {
    return res.json({
      isSpam: true,
      reason: 'Gibberish or repetitive keystroke pattern detected',
      confidence: 0.95,
      suggestedCategory: category || 'Others'
    });
  }

  try {
    const ai = getAI();
    if (ai) {
      const prompt = `You are an AI spam and authenticity classifier for a College Student Grievance Redressal System.
Analyze the following student complaint:
"""${trimmed}"""
Selected Category: ${category || 'Unknown'}
Student Type: ${studentType || 'Unknown'}

Determine if this complaint is SPAM / GIBBERISH (e.g. keyboard smash like 'cbhhcbhbdhcdbhd', meaningless noise, prank, abusive trolling without grievance, or non-actionable gibberish) or a LEGITIMATE student complaint.

Respond ONLY with valid JSON conforming to this schema:
{
  "isSpam": boolean,
  "reason": "short explanation (under 15 words) of why it is spam or legitimate",
  "confidence": number between 0 and 1,
  "suggestedCategory": "Food" | "Damages & Repairs" | "Hostel Wi-Fi" | "Plumbing & Water" | "Electrical & AC" | "Ragging & Harassment" | "Bus & Transport" | "Canteen" | "Classroom & Lab" | "Others"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });

      const responseText = response.text || '{}';
      try {
        const parsed = JSON.parse(responseText);
        return res.json({
          isSpam: Boolean(parsed.isSpam),
          reason: parsed.reason || (parsed.isSpam ? 'Flagged as spam by AI model' : 'Legitimate grievance'),
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.9,
          suggestedCategory: parsed.suggestedCategory || category || 'Others'
        });
      } catch (parseErr) {
        console.warn('Failed to parse AI response JSON, falling back:', responseText);
      }
    }
  } catch (err: any) {
    console.error('Gemini AI classification error:', err?.message || err);
  }

  // Safe fallback if Gemini is unreachable or key not configured
  // Check random character ratio / dictionary heuristics
  const words = trimmed.split(/\s+/);
  const avgWordLen = trimmed.length / (words.length || 1);
  const looksLikeSpam = avgWordLen > 25 || trimmed.toLowerCase().includes('cbhhcbhbdhcdbhd');

  res.json({
    isSpam: looksLikeSpam,
    reason: looksLikeSpam ? 'Suspicious keyword or formatting detected' : 'Standard grievance text structure',
    confidence: 0.8,
    suggestedCategory: category || 'Others'
  });
});

// 5. Trigger Automated Email Notifications (Grievance Confirmation & Resolution Done)
app.post('/api/notifications/send', async (req: Request, res: Response) => {
  const { to, type, ticketNo, studentName, category, customMessage } = req.body;
  if (!to || !type) {
    return res.status(400).json({ error: 'Recipient and notification type are required' });
  }

  let subject = '';
  let body = '';

  if (type === 'confirmation') {
    subject = `Grievance Registered - Ticket #${ticketNo || 'NEW'}`;
    body = `Dear ${studentName || 'Student'},\n\nWe got your complaint (Ticket: #${ticketNo || 'NEW'}, Category: ${category || 'General'}).\n\nOnce the problem been taken care of we will notify you. Thank you.\n\nCollege Grievance Redressal Cell.`;
  } else if (type === 'resolution') {
    subject = `Grievance Resolved - Ticket #${ticketNo || 'TKT'}`;
    body = `Dear ${studentName || 'Student'},\n\nThis is to notify you that your complaint (Ticket: #${ticketNo || 'TKT'}, Category: ${category || 'General'}) has been taken care of and marked as Done.\n\n${customMessage ? 'Admin Note: ' + customMessage + '\n\n' : ''}Thanks for notifying the College management about the issue.\n\nWarm regards,\nCollege Grievance & Hostel Welfare Team.`;
  } else {
    subject = `Notice from College Grievance Cell`;
    body = customMessage || 'Update regarding your grievance submission.';
  }

  const sentSimulated = sendSimulatedEmail(to, subject, body, type);
  await sendGmailNotification(to, subject, body);

  res.json({ success: true, email: sentSimulated });
});

// 6. Get Outbox (Email simulation viewer so student/admin can see received emails)
app.get('/api/notifications/outbox', (req: Request, res: Response) => {
  const { email } = req.query;
  if (email && typeof email === 'string') {
    const filtered = outbox.filter(e => e.to.toLowerCase() === email.toLowerCase());
    return res.json({ outbox: filtered });
  }
  res.json({ outbox });
});

// ---------------------- VITE / STATIC SERVING ----------------------
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

start();
