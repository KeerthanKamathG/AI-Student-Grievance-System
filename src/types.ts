export type UserRole = 'student' | 'admin';

export type StudentType = 'hosteller' | 'dayscholar';

export type Department =
  | 'CSE (Computer Science & Engineering)'
  | 'AIML (Artificial Intelligence & Machine Learning)'
  | 'CSD (Computer Science & Design)'
  | 'IT (Information Technology)'
  | 'ADS (Artificial Intelligence & Data Science)'
  | 'ECE (Electronics & Communication Engineering)'
  | 'EEE (Electrical & Electronics Engineering)'
  | 'MCT (Mechatronics Engineering)'
  | 'MECH (Mechanical Engineering)'
  | 'FT (Fashion Technology)'
  | 'BME (Biomedical Engineering)'
  | 'CIVIL (Civil Engineering)';

export interface UserProfile {
  id: string;
  regNo: string;
  name: string;
  department?: string;
  gender: 'Male' | 'Female' | 'Other';
  studentType: StudentType;
  phone: string;
  email: string;
  hostelBlock?: string;
  roomNo?: string;
  role: UserRole;
  isEmailVerified: boolean;
  createdAt: string;
}

export type PriorityLevel = 'urgent' | 'medium' | 'less_important';

export type GrievanceStatus = 'pending' | 'in_progress' | 'resolved';

export interface Grievance {
  id: string;
  ticketNo: string;
  studentRegNo: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  studentType: StudentType;
  hostelBlock?: string;
  roomNo?: string;
  category: string;
  description: string;
  status: GrievanceStatus;
  priority?: PriorityLevel;
  isSpam: boolean;
  spamReason?: string;
  aiClassification?: {
    isSpam: boolean;
    reason: string;
    confidence: number;
    suggestedCategory?: string;
  };
  createdAt: string;
  resolvedAt?: string;
  adminNotes?: string;
}

export interface MockEmailNotification {
  id: string;
  to: string;
  subject: string;
  body: string;
  type: 'otp' | 'confirmation' | 'resolution';
  timestamp: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'Hostel' | 'Academic & Ragging' | 'Transport & Canteen' | 'General';
}
