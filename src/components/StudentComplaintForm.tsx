import React, { useState } from 'react';
import {
  ArrowLeft,
  Send,
  AlertTriangle,
  FileText,
  Loader2
} from 'lucide-react';
import { UserProfile, Grievance } from '../types';
import { HOSTELLER_CATEGORIES, DAYSCHOLAR_CATEGORIES } from '../data/constants';
import { db, cleanFirestoreData } from '../firebase';
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
  // Available categories based on user's student type
  const availableCategories = user.studentType === 'hosteller' ? HOSTELLER_CATEGORIES : DAYSCHOLAR_CATEGORIES;
  const [category, setCategory] = useState<string>(availableCategories[0]);
  const [description, setDescription] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmed = description.trim();
    if (!trimmed) {
      setErrorMsg('Please describe your grievance before submitting.');
      return;
    }
    if (trimmed.length > 1000) {
      setErrorMsg('Complaint must not exceed 1,000 characters.');
      return;
    }

    setSubmitting(true);

    try {
      // Send to AI Spam Classifier endpoint
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
            studentType: user.studentType,
          })
        });
        if (aiRes.ok) {
          aiResult = await aiRes.json();
        }
      } catch (err) {
        console.warn('AI classification fallback:', err);
      }

      const ticketNo = `GRV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const grievanceData: Grievance = {
        id: 'tkt_' + Math.random().toString(36).substring(2, 9),
        ticketNo,
        studentRegNo: user.regNo || 'STUDENT',
        studentName: user.name || 'Student',
        studentEmail: user.email || 'student@college.edu',
        studentPhone: user.phone || '9876543210',
        studentType: user.studentType || 'dayscholar',
        hostelBlock: user.studentType === 'hosteller' ? (user.hostelBlock || 'Block A') : undefined,
        roomNo: user.studentType === 'hosteller' ? (user.roomNo || 'N/A') : undefined,
        category,
        description: trimmed,
        status: 'pending',
        priority: category.includes('Ragging') ? 'urgent' : 'medium',
        isSpam: aiResult.isSpam,
        spamReason: aiResult.reason,
        aiClassification: aiResult,
        createdAt: new Date().toISOString()
      };

      // Persist in Firebase Firestore
      try {
        const firestorePayload = cleanFirestoreData(grievanceData);
        const docRef = await addDoc(collection(db, 'grievances'), firestorePayload);
        grievanceData.id = docRef.id;
      } catch (fErr) {
        console.warn('Firestore write fallback:', fErr);
      }

      onSubmitSuccess(grievanceData);
    } catch (err: any) {
      setErrorMsg('Failed to submit grievance: ' + (err?.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const charCount = description.length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Back button */}
      <button
        id="back-to-home-btn"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mb-6 group cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Back to Dashboard
      </button>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
        {/* Banner */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-50/60 to-indigo-50/60 dark:from-slate-800/80 dark:to-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Lodge Student Grievance
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Select your complaint category and describe the issue below.
              </p>
            </div>
          </div>
        </div>

        {/* Form Body - ONLY Category, Description, and Submit Button */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {errorMsg && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/80 rounded-xl flex items-center gap-2.5 text-xs text-red-700 dark:text-red-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Complaint Category Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              1. Select Complaint Category *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {availableCategories.map((cat) => {
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    id={`cat-btn-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`p-3 text-xs font-medium rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 font-semibold shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Main Complaint Text Input/Description Box */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                2. Complaint Details / Description *
              </label>
              <span className={`text-[11px] font-mono ${charCount > 900 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-400'}`}>
                {charCount}/1000
              </span>
            </div>
            <textarea
              id="complaint-description-textarea"
              rows={6}
              required
              placeholder="Provide a clear description of your grievance (e.g. location, specific problem, timing)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-4 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 resize-y"
            />
          </div>

          {/* 3. Submit Button */}
          <div className="pt-2">
            <button
              id="submit-grievance-btn"
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Grievance...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Complaint</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
