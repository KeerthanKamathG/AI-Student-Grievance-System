import emailjs from '@emailjs/browser';

export const SERVICE_ID = 'service_dawood';
export const TEMPLATE_ID = 'template_mnmezmk';
export const PUBLIC_KEY = 'bkVwf-8PyNRA5qiUP';

// Initialize EmailJS public key
try {
  emailjs.init({ publicKey: PUBLIC_KEY });
} catch (e) {
  console.warn('EmailJS init notice:', e);
}

/**
 * Dispatches a 6-digit OTP verification email to the user using EmailJS.
 * Maps all standard EmailJS recipient parameter aliases to guarantee recipient address delivery.
 *
 * @param userEmail - Recipient email address
 * @param userName - Recipient full name
 * @param otpCode - Generated 6-digit OTP code
 */
export const sendOTPEmail = async (userEmail: string, userName: string, otpCode: string) => {
  const cleanEmail = (userEmail || '').trim();
  const cleanName = (userName || '').trim() || 'Student';
  const cleanCode = (otpCode || '').trim();

  if (!cleanEmail) {
    throw new Error('EmailJS Error (422): Recipient email address is empty.');
  }

  // Populate all standard EmailJS template variable aliases for recipient email address
  const templateParams = {
    to_email: cleanEmail,
    email: cleanEmail,
    user_email: cleanEmail,
    to: cleanEmail,
    reply_to: cleanEmail,
    recipient: cleanEmail,
    recipient_email: cleanEmail,
    email_to: cleanEmail,
    to_email_address: cleanEmail,

    to_name: cleanName,
    user_name: cleanName,
    name: cleanName,

    otp_code: cleanCode,
    otp: cleanCode,
    code: cleanCode,
    message: `Your verification OTP code is ${cleanCode}`,
  };

  try {
    const response = await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      templateParams,
      PUBLIC_KEY
    );
    console.log('SUCCESS! Email sent via EmailJS:', response.status, response.text);
    return response;
  } catch (error: any) {
    const errText = error?.text || error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
    const status = error?.status || 400;
    console.error('FAILED to send email via EmailJS:', status, errText);
    throw new Error(`EmailJS Error (${status}): ${errText}`);
  }
};
