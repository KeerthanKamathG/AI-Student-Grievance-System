import { sendOTPEmail as sendEmailJSOtp } from '../utils/sendOTP';

export interface SendOtpParams {
  email: string;
  name: string;
  regNo?: string;
}

export interface SendOtpResult {
  success: boolean;
  message: string;
  errorDetails?: string;
}

/**
 * Service helper to dispatch 6-digit OTP to user's email address using EmailJS and server endpoints.
 * Pre-validates form parameters, requests OTP generation from backend, and sends via EmailJS.
 */
export async function sendOTPEmail({ email, name, regNo }: SendOtpParams): Promise<SendOtpResult> {
  const trimmedEmail = email.trim();
  const trimmedName = name.trim();

  // 1. Pre-validation of target email string format
  if (!trimmedEmail) {
    return { success: false, message: 'Email address is required.' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return { success: false, message: 'Please enter a valid email address (e.g. name@domain.com).' };
  }

  try {
    // 2. Request OTP generation and session creation from server
    const backendRes = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: trimmedEmail, name: trimmedName, regNo: regNo?.trim() }),
    });

    const backendData = await backendRes.json();
    if (!backendData.success || !backendData.otpCode) {
      return {
        success: false,
        message: backendData.error || 'Failed to generate OTP code on server.',
      };
    }

    const generatedOtp = String(backendData.otpCode);

    // 3. Trigger EmailJS dispatch
    try {
      await sendEmailJSOtp(trimmedEmail, trimmedName, generatedOtp);
      return {
        success: true,
        message: `Verification code sent to ${trimmedEmail}.`,
      };
    } catch (emailjsErr: any) {
      console.warn('EmailJS delivery error:', emailjsErr?.message || emailjsErr);
      const errMsg = emailjsErr?.message || String(emailjsErr);
      
      // If server sent directly via Gmail SMTP/Nodemailer, consider it successful
      if (backendData.sentViaGmail) {
        return {
          success: true,
          message: `Verification code sent directly to ${trimmedEmail} via Gmail.`,
        };
      }

      // Otherwise report the EmailJS error so user knows to reconnect Gmail in EmailJS
      if (errMsg.includes('412') || errMsg.includes('insufficient authentication scopes')) {
        return {
          success: false,
          message: 'EmailJS Error (412): Gmail API missing authentication scopes. Please reconnect your Gmail account in EmailJS dashboard.',
          errorDetails: errMsg,
        };
      }

      return {
        success: false,
        message: `Failed to send email: ${errMsg}`,
        errorDetails: errMsg,
      };
    }
  } catch (error: any) {
    console.error('Error in sendOTPEmail service:', error);
    return {
      success: false,
      message: error?.message || 'Network error while initiating email OTP.',
    };
  }
}

/**
 * Helper to verify entered 6-digit OTP code against server
 */
export async function verifyOTPEmail(email: string, otp: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
    });
    const data = await res.json();
    if (data.success) {
      return { success: true, message: 'OTP verified successfully.' };
    } else {
      return { success: false, message: data.error || 'Invalid or expired OTP code.' };
    }
  } catch (err: any) {
    return { success: false, message: 'Failed to connect to verification server.' };
  }
}
