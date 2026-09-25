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

  // Populate all standard EmailJS template variable aliases for recipient email address, name, and OTP code
  const templateParams = {
    // Email recipient aliases
    to_email: cleanEmail,
    email: cleanEmail,
    user_email: cleanEmail,
    to: cleanEmail,
    reply_to: cleanEmail,
    recipient: cleanEmail,
    recipient_email: cleanEmail,
    email_to: cleanEmail,
    to_email_address: cleanEmail,
    toEmail: cleanEmail,
    userEmail: cleanEmail,
    recipientEmail: cleanEmail,
    emailTo: cleanEmail,

    // Name aliases
    to_name: cleanName,
    user_name: cleanName,
    name: cleanName,
    toName: cleanName,
    userName: cleanName,
    student_name: cleanName,
    studentName: cleanName,
    NAME: cleanName,

    // OTP / Code aliases (covering camelCase, snake_case, PascalCase, UPPERCASE)
    otp_code: cleanCode,
    otpCode: cleanCode,
    OtpCode: cleanCode,
    OTP_CODE: cleanCode,
    
    otp: cleanCode,
    OTP: cleanCode,
    Otp: cleanCode,
    
    code: cleanCode,
    CODE: cleanCode,
    Code: cleanCode,

    passcode: cleanCode,
    Passcode: cleanCode,
    PASSCODE: cleanCode,
    pass_code: cleanCode,
    passCode: cleanCode,

    pin: cleanCode,
    PIN: cleanCode,
    Pin: cleanCode,

    verification_code: cleanCode,
    verificationCode: cleanCode,
    VerificationCode: cleanCode,
    VERIFICATION_CODE: cleanCode,

    verify_code: cleanCode,
    verifyCode: cleanCode,

    otp_number: cleanCode,
    otpNumber: cleanCode,

    auth_code: cleanCode,
    authCode: cleanCode,

    user_otp: cleanCode,
    userOtp: cleanCode,

    email_otp: cleanCode,
    emailOtp: cleanCode,

    otp_val: cleanCode,
    otpVal: cleanCode,
    otp_value: cleanCode,
    otpValue: cleanCode,

    value: cleanCode,
    VALUE: cleanCode,
    token: cleanCode,
    TOKEN: cleanCode,
    key: cleanCode,
    KEY: cleanCode,

    number: cleanCode,
    NUMBER: cleanCode,
    secret: cleanCode,
    SECRET: cleanCode,

    // Message & Body aliases
    message: `Your 6-digit verification OTP code is ${cleanCode}`,
    Message: `Your 6-digit verification OTP code is ${cleanCode}`,
    MESSAGE: `Your 6-digit verification OTP code is ${cleanCode}`,
    content: `Your 6-digit verification OTP code is ${cleanCode}`,
    Content: `Your 6-digit verification OTP code is ${cleanCode}`,
    body: `Your 6-digit verification OTP code is ${cleanCode}`,
    Body: `Your 6-digit verification OTP code is ${cleanCode}`,
    text: `Your 6-digit verification OTP code is ${cleanCode}`,
    Text: `Your 6-digit verification OTP code is ${cleanCode}`,
    details: `Your 6-digit verification OTP code is ${cleanCode}`,
    Details: `Your 6-digit verification OTP code is ${cleanCode}`,
    otp_message: `Your 6-digit verification OTP code is ${cleanCode}`,
    otpMessage: `Your 6-digit verification OTP code is ${cleanCode}`,
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
