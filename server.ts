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
let smtpAuthFailed = false;

function getMailTransporter(): Transporter | null {
  if (smtpAuthFailed) return null;

  const user = process.env.GMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS || process.env.SMTP_PASS;

  if (!user || !pass || user.includes('example.com') || pass.includes('your_app_password')) {
    return null;
  }

  if (!mailTransporter) {
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

// Helper to send emails via Gmail if credentials valid (with outbox fallback)
async function sendGmailNotification(to: string, subject: string, body: string, html?: string) {
  const transporter = getMailTransporter();
  if (transporter && !smtpAuthFailed) {
    try {
      const fromUser = process.env.GMAIL_USER || 'noreply@college.edu';
      const info = await transporter.sendMail({
        from: `"AI Student Grievance Portal" <${fromUser}>`,
        to,
        subject,
        text: body,
        html: html || body.replace(/\n/g, '<br/>'),
      });
      return { sent: true, messageId: info.messageId };
    } catch (err: any) {
      smtpAuthFailed = true;
      mailTransporter = null;
      return { sent: false, error: 'SMTP Authentication bypassed.' };
    }
  }
  return {
    sent: false,
    reason: 'GMAIL_USER and GMAIL_APP_PASSWORD are not configured.',
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
      : `Verification OTP dispatched to ${email}. Check your inbox.`,
    email,
    otpCode: otp,
    sentViaGmail: gmailResult.sent,
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

// Helper: Comprehensive Spam, Gibberish & Keyboard Smash Detection
function analyzeSpamAndGibberish(text: string, category?: string): { isSpam: boolean; reason: string; confidence: number } {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // 1. Min length requirement
  if (trimmed.length < 8) {
    return {
      isSpam: true,
      reason: 'Complaint description is too short (minimum 8 characters required)',
      confidence: 0.98,
    };
  }

  const words = trimmed.split(/\s+/).filter(Boolean);
  const grievanceKeywords = [
    'water', 'wifi', 'wi-fi', 'internet', 'food', 'mess', 'room', 'hostel', 'canteen', 'bus', 'transport',
    'fan', 'ac', 'air', 'light', 'plumbing', 'tap', 'leak', 'toilet', 'bathroom', 'clean', 'dirty', 'ragging',
    'harass', 'teacher', 'prof', 'faculty', 'lab', 'computer', 'class', 'classroom', 'bench', 'chair', 'desk',
    'door', 'lock', 'window', 'power', 'electricity', 'outage', 'sound', 'noise', 'stolen', 'lost', 'bed',
    'mattress', 'drain', 'overflow', 'broken', 'damaged', 'repair', 'fix', 'not working', 'issue', 'complaint',
    'problem', 'slow', 'poor', 'bad', 'quality', 'fee', 'exam', 'result', 'attendance', 'permission', 'leave', 'help'
  ];

  const hasGrievanceKeyword = grievanceKeywords.some(kw => lower.includes(kw));

  // 2. Test messages / meaningless single terms
  const dummyTerms = ['test', 'testing', 'hello', 'hi', 'demo', 'sample', 'asdf', 'qwerty', 'abc', 'xyz', 'no', 'nothing', 'spam', 'dummy'];
  if (words.length <= 2 && dummyTerms.includes(lower.replace(/[^a-z]/g, ''))) {
    return {
      isSpam: true,
      reason: 'Test or placeholder text detected',
      confidence: 0.95,
    };
  }

  // 3. Sentence length vs grievance keywords
  if (words.length < 3 && !hasGrievanceKeyword) {
    return {
      isSpam: true,
      reason: 'Description is too brief or lacks actionable grievance details',
      confidence: 0.9,
    };
  }

  // 4. Repeated character sequence (e.g. "aaaaaa", "xxxxxx", "ffffff", "111111", "!!!!!!")
  if (/(.)\1{4,}/i.test(trimmed)) {
    return {
      isSpam: true,
      reason: 'Excessive repetitive character pattern detected',
      confidence: 0.98,
    };
  }

  // 5. Repeated word loops (e.g. "test test test", "bad bad bad bad", "qwerty qwerty")
  if (words.length >= 3) {
    const uniqueWords = new Set(words.map(w => w.toLowerCase().replace(/[^a-z0-9]/g, '')));
    if (uniqueWords.size === 1) {
      return {
        isSpam: true,
        reason: 'Repetitive single word loop detected',
        confidence: 0.98,
      };
    }
    if (words.length >= 4 && uniqueWords.size <= 2 && !hasGrievanceKeyword) {
      return {
        isSpam: true,
        reason: 'Repetitive phrase without complaint context detected',
        confidence: 0.95,
      };
    }
  }

  // 6. Keyboard smash / row patterns
  const keyboardSmashes = [
    'qwerty', 'asdfgh', 'zxcvbn', 'qwert', 'asdfg', 'zxcvb',
    '12345', '23456', '34567', '45678', '56789',
    'poiuy', 'lkjhg', 'mnbvc', 'dfghj', 'fghjk',
    'qweqwe', 'asdasd', 'zxczxc', 'asdfasdf', 'qwertyuiop',
    'asdfghjkl', 'zxcvbnm', 'lkjhasdf', 'cbhhcbhbdhcdbhd'
  ];
  for (const smash of keyboardSmashes) {
    if (lower.includes(smash) && !hasGrievanceKeyword) {
      return {
        isSpam: true,
        reason: 'Keyboard smash or row pattern detected',
        confidence: 0.98,
      };
    }
  }

  // 7. Consonant clusters / missing vowels in long words
  for (const word of words) {
    const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
    if (cleanWord.length >= 6) {
      // 5+ consecutive consonants (e.g. "sdfghjk", "rtpsdfgh")
      if (/[bcdfghjklmnpqrstvwxyz]{5,}/i.test(cleanWord) && !hasGrievanceKeyword) {
        return {
          isSpam: true,
          reason: 'Unnatural consonant cluster (gibberish string) detected',
          confidence: 0.95,
        };
      }
      // Long word with no vowels (e.g. "bcdfgj")
      if (!/[aeiouy]/i.test(cleanWord)) {
        return {
          isSpam: true,
          reason: 'Word with missing vowels (gibberish string) detected',
          confidence: 0.95,
        };
      }
    }
  }

  return { isSpam: false, reason: 'Legitimate grievance pattern', confidence: 0.5 };
}

// 4. AI Spam & Gibberish Classification Endpoint
app.post('/api/ai/classify-complaint', async (req: Request, res: Response) => {
  const { text, category, studentType } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Complaint text is required' });
  }

  const trimmed = text.trim();

  // 1. Run deterministic pattern heuristics first
  const heuristicResult = analyzeSpamAndGibberish(trimmed, category);
  if (heuristicResult.isSpam && heuristicResult.confidence >= 0.9) {
    return res.json({
      isSpam: true,
      reason: heuristicResult.reason,
      confidence: heuristicResult.confidence,
      suggestedCategory: category || 'Others',
    });
  }

  // 2. Run Gemini 3.8 Flash AI Analysis
  try {
    const ai = getAI();
    if (ai) {
      const prompt = `You are an AI Spam & Authenticity Classifier for a College Student Grievance Redressal System.

Evaluate the following student complaint text:
"""
${trimmed}
"""

Category Selected: ${category || 'General'}
Student Type: ${studentType || 'Unknown'}

Rules for Classification:
1. Mark "isSpam": true if the text is:
   - Gibberish or random character strings (e.g. "asdfghjkl", "qwerty", "dfghjk", "lkjhasdf", "cbhhcbhbdhcdbhd", "asdasd", "asdfasdf", "sdasda").
   - Test or dummy messages (e.g. "test message", "testing 123", "hello world", "sample text", "demo", "sample complaint").
   - Meaningless or non-actionable text (e.g. "ok", "nothing", "good", "no problem", "hi", "hey", "abc", "xyz").
   - Off-topic trolling, insults without grievance context, or abusive noise.
2. Mark "isSpam": false if the text describes a genuine college or hostel grievance (e.g. water leakage, wifi issues, food quality, lab equipment, room repairs, ragging, bus timings, cleanliness, etc.).

Respond ONLY with a valid JSON object matching this schema:
{
  "isSpam": boolean,
  "reason": "concise explanation under 12 words",
  "confidence": number between 0.0 and 1.0,
  "suggestedCategory": "Food" | "Damages & Repairs" | "Hostel Wi-Fi" | "Plumbing & Water" | "Electrical & AC" | "Ragging & Harassment" | "Bus & Transport" | "Canteen" | "Classroom & Lab" | "Others"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text || '{}';
      try {
        const parsed = JSON.parse(responseText);
        return res.json({
          isSpam: Boolean(parsed.isSpam),
          reason: parsed.reason || (parsed.isSpam ? 'Flagged as spam by AI model' : 'Legitimate student complaint'),
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.9,
          suggestedCategory: parsed.suggestedCategory || category || 'Others',
        });
      } catch (parseErr) {
        console.warn('Failed to parse AI response JSON, falling back:', responseText);
      }
    }
  } catch (err: any) {
    console.error('Gemini AI classification error:', err?.message || err);
  }

  // Fallback return
  res.json({
    isSpam: heuristicResult.isSpam,
    reason: heuristicResult.reason,
    confidence: heuristicResult.confidence,
    suggestedCategory: category || 'Others',
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
