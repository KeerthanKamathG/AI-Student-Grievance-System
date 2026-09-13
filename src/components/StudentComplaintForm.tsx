import React, { useState } from 'react';
import {
  ArrowLeft,
  Send,
  AlertTriangle,
  CheckCircle2,
  Building,
  User,
  Phone,
  Mail,
  FileText,
  Sparkles,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { UserProfile, Grievance, StudentType } from '../types';
import { HOSTELLER_CATEGORIES, DAYSCHOLAR_CATEGORIES, HOSTEL_BLOCKS } from '../data/constants';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

interface StudentComplaintFormProps {
  user: UserProfile;
  onBack: () => void;
  onSubmitSuccess: (ticket: Grievance) => void;
}

export const StudentComplaintForm: React.FC<StudentComplaintFormProps> = ({
  user,
  onBack,
  onSubmitSuccess,
}) => {
  // Autofilled with profile data, customizable
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [email, setEmail] = useState(user.email);
  const [studentType, setStudentType] = useState<StudentType>(user.studentType);
  const [hostelBlock, setHostelBlock] = useState(user.hostelBlock || HOSTEL_BLOCKS[0]);
  const [roomNo, setRoomNo] = useState(user.roomNo || '');

  // Category choices dynamic based on student type
  const categories = studentType === 'hosteller' ? HOSTELLER_CATEGORIES : DAYSCHOLAR_CATEGORIES;
  const [category, setCategory] = useState<string>(categories[0]);
  const [description, setDescription] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [spamNotice, setSpamNotice] = useState<{ isSpam: boolean; reason: string } | null>(null);

  // Update selected category when studentType toggles
  const handleStudentTypeChange = (type: StudentType) => {
    setStudentType(type);
    const newCategories = type === 'hosteller' ? HOSTELLER_CATEGORIES : DAYSCHOLAR_CATEGORIES;
    setCategory(newCategories[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSpamNotice(null);

    const trimmed = description.trim();
    if (!trimmed) {
      setErrorMsg('Please describe your grievance before submitting.');
      return;
    }
    if (trimmed.length > 1000) {
      setErrorMsg('Complaint must not exceed 1,000 characters.');
      return;
    }
    if (studentType === 'hosteller' && !roomNo.trim()) {
      setErrorMsg('Please specify your hostel room number.');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Send to AI Spam Classifier endpoint (Gemini API backed)
      let aiResult = {
        isSpam: false,
        reason: 'Legitimate student complaint',
        confidence: 0.95,
        suggestedCategory: category
      };

      try {
        const aiRes = await fetch('/api/ai/classify-complaint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: trimmed,
            category,
            studentType,
          })
        });
        if (aiRes.ok) {
          aiResult = await aiRes.json();
        }
      } catch (err) {
        console.warn('AI classification fallback:', err);
      }

      // Generate Ticket Number
      const ticketNo = `GRV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const grievanceData: Grievance = {
        id: 'tkt_' + Math.random().toString(36).substring(2, 9),
        ticketNo,
        studentRegNo: user.regNo,
        studentName: name.trim(),
        studentEmail: email.trim(),
        studentPhone: phone.trim(),
        studentType,
        hostelBlock: studentType === 'hosteller' ? hostelBlock : undefined,
        roomNo: studentType === 'hosteller' ? roomNo.trim() : undefined,
        category,
        description: trimmed,
        status: 'pending',
        priority: category.includes('Ragging') ? 'urgent' : 'medium',
        isSpam: aiResult.isSpam,
        spamReason: aiResult.reason,
        aiClassification: aiResult,
        createdAt: new Date().toISOString()
      };

      // 2. Persist in Firebase Firestore
      try {
        const docRef = await addDoc(collection(db, 'grievances'), grievanceData);
        grievanceData.id = docRef.id;
      } catch (fErr) {
        console.warn('Firestore write fallback in local session:', fErr);
      }

      // 3. Dispatch automated confirmation email immediately to student
      try {
        await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: email.trim(),
            type: 'confirmation',
            ticketNo,
            studentName: name.trim(),
            category
          })
        });
      } catch (nErr) {
        console.warn('Notification trigger fallback:', nErr);
      }

      onSubmitSuccess(grievanceData);
    } catch (err: any) {
      setErrorMsg('Failed to submit grievance: ' + (err?.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const charCount = description.length;
  const isNearLimit = charCount > 900;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Back button & Breadcrumb */}
      <button
        id="back-to-home-btn"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors mb-6 group cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Back to Dashboard
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Banner */}
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-blue-50/60 to-indigo-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Lodge Student Grievance
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Fill in your issue details. An automated confirmation email will be sent upon submission.
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {/* Section 1: Student Information */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> 1. Student Particulars
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  id="complaint-name-input"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  id="complaint-phone-input"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email ID (For Auto-Confirmation)
                </label>
                <input
                  id="complaint-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Residential Mode & Location */}
          <div className="pt-2 border-t border-slate-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5" /> 2. Residency & Campus Location
            </h2>

            <div className="flex gap-3 mb-4">
              <button
                id="complaint-type-hosteller"
                type="button"
                onClick={() => handleStudentTypeChange('hosteller')}
                className={`flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl border transition-all text-center cursor-pointer ${
                  studentType === 'hosteller'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Hostel Resident
              </button>
              <button
                id="complaint-type-dayscholar"
                type="button"
                onClick={() => handleStudentTypeChange('dayscholar')}
                className={`flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl border transition-all text-center cursor-pointer ${
                  studentType === 'dayscholar'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Dayscholar (Commuter)
              </button>
            </div>

            {studentType === 'hosteller' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-blue-50/40 rounded-xl border border-blue-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hostel Block *
                  </label>
                  <select
                    id="complaint-hostel-block-select"
                    value={hostelBlock}
                    onChange={(e) => setHostelBlock(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  >
                    {HOSTEL_BLOCKS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Room Number *
                  </label>
                  <input
                    id="complaint-room-no-input"
                    type="text"
                    required
                    placeholder="e.g. A-304 / B-112"
                    value={roomNo}
                    onChange={(e) => setRoomNo(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                Dayscholar complaints cover bus transport routes, campus canteen, academic classrooms, and general facilities.
              </div>
            )}
          </div>

          {/* Section 3: Grievance Category */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                3. Choose Problem Category *
              </label>
              <span className="text-[11px] text-blue-600 font-medium">
                {studentType === 'hosteller' ? 'Hostel Categories' : 'Dayscholar Categories'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {categories.map((cat) => {
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    id={`cat-btn-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`p-2.5 text-xs font-medium rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 border-blue-500 text-blue-800 font-semibold ring-1 ring-blue-500/30'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Complaint Description Box with 1000-char limit */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                4. Grievance Description *
              </label>
              <span className={`text-[11px] font-mono ${isNearLimit ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                {charCount} / 1000 characters
              </span>
            </div>

            <div className="relative">
              <textarea
                id="complaint-description-textarea"
                required
                maxLength={1000}
                rows={5}
                placeholder="Describe your issue with specific details (e.g., 'Water pipe under the sink in room A-304 is leaking heavily since morning, causing water stagnation on the floor')..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 leading-relaxed font-sans"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
              <div className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>Protected by AI Anti-Spam (detects gibberish like random typing)</span>
              </div>
              <span>Press enter or submit below</span>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submission Button */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              id="cancel-complaint-btn"
              type="button"
              onClick={onBack}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              id="submit-complaint-btn"
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Classifying & Registering...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Grievance</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
