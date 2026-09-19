import { FAQItem } from '../types';

export const FAQ_DATA: FAQItem[] = [
  {
    id: 'faq-1',
    category: 'Hostel',
    question: 'How quickly are hostel damages, water leakage, or plumbing issues addressed?',
    answer: 'Hostel maintenance requests (plumbing, water leaks, electrical repairs) are typically evaluated by the hostel warden and assigned to the estate maintenance crew within 4 to 24 hours depending on urgency.'
  },
  {
    id: 'faq-2',
    category: 'Hostel',
    question: 'What should I do if the hostel Wi-Fi or LAN port is not working in my room?',
    answer: 'Submit a complaint under the "Hostel Wi-Fi & Internet" category specifying your hostel block and room number. The campus IT infrastructure department conducts routine port and access-point troubleshooting daily between 10:00 AM and 5:00 PM.'
  },
  {
    id: 'faq-3',
    category: 'Academic & Ragging',
    question: 'Is ragging reported through this portal strictly confidential and zero-tolerance?',
    answer: 'Yes. All complaints classified under "Ragging & Harassment" bypass standard queues and are immediately dispatched to the College Anti-Ragging Committee and Chief Warden. The student\'s identity is kept strictly confidential.'
  },
  {
    id: 'faq-4',
    category: 'Transport & Canteen',
    question: 'How can dayscholars report bus route delays or canteen food quality problems?',
    answer: 'Dayscholars can select the "Bus & Transport" category (specifying the bus route number) or the "Canteen & Cafeteria" category. These reports are directly forwarded to the Transport In-Charge and Canteen Sanitation Inspector.'
  },
  {
    id: 'faq-5',
    category: 'General',
    question: 'How will I be notified when my grievance is resolved?',
    answer: 'Upon submission, you receive an automated confirmation email with your ticket number. Once the college management or maintenance team resolves the issue, the admin marks it "Done", and an automatic email alert confirms the resolution.'
  },
  {
    id: 'faq-6',
    category: 'General',
    question: 'Why does the system filter out spam and gibberish messages?',
    answer: 'An automated AI assistant reviews incoming text for meaningless keyboard smash (e.g., "cbhhcbhbdhcdbhd") or spam to ensure that genuine student emergencies receive top priority from administrators without delay.'
  }
];

export const HOSTELLER_CATEGORIES = [
  'Food & Mess',
  'Damages & Repairs',
  'Plumbing & Water',
  'Electrical & AC',
  'Hostel Wi-Fi & Internet',
  'Cleanliness & Sanitation',
  'Ragging & Harassment',
  'Others'
];

export const DAYSCHOLAR_CATEGORIES = [
  'Bus & Transport',
  'Canteen & Cafeteria',
  'Classroom & Lab Facilities',
  'Library & Wi-Fi',
  'Campus Cleanliness',
  'Ragging & Harassment',
  'Administrative & Fees',
  'Others'
];

export const HOSTEL_BLOCKS = [
  'Block A (Boys Hostel)',
  'Block B (Boys Hostel)',
  'Block C (Girls Hostel)',
  'Block D (Girls Hostel)',
  'PG & International Block'
];

export const DEPARTMENT_OPTIONS = [
  'CSE (Computer Science & Engineering)',
  'AIML (Artificial Intelligence & Machine Learning)',
  'CSD (Computer Science & Design)',
  'IT (Information Technology)',
  'ADS (Artificial Intelligence & Data Science)',
  'ECE (Electronics & Communication Engineering)',
  'EEE (Electrical & Electronics Engineering)',
  'MCT (Mechatronics Engineering)',
  'MECH (Mechanical Engineering)',
  'FT (Fashion Technology)',
  'BME (Biomedical Engineering)',
  'CIVIL (Civil Engineering)',
];
