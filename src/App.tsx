import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  User,
  LogOut,
  Mail,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building,
  ShieldAlert,
  Sparkles,
  ChevronRight,
  Inbox,
  Filter
} from 'lucide-react';
import { UserProfile, Grievance, PriorityLevel } from './types';
import { INITIAL_GRIEVANCES } from './data/initialData';
import { AuthModal } from './components/AuthModal';
import { StudentComplaintForm } from './components/StudentComplaintForm';
import { AdminDashboard } from './components/AdminDashboard';
import { FAQSection } from './components/FAQSection';
import { EmailInboxModal } from './components/EmailInboxModal';
import { db } from './firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, setDoc } from 'firebase/firestore';

export default function App() {
  // Current user state (defaults to Rahul Sharma student for quick demonstration)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>({
    id: '2023CS042',
    regNo: '2023CS042',
    name: 'Rahul Sharma',
    gender: 'Male',
    studentType: 'hosteller',
    phone: '9876543210',
    email: 'rahul.cs23@college.edu',
    hostelBlock: 'Block A (Boys Hostel)',
    roomNo: 'A-304',
    role: 'student',
    isEmailVerified: true,
    createdAt: new Date().toISOString(),
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<'home' | 'new_complaint'>('home');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Live complaints list
  const [grievances, setGrievances] = useState<Grievance[]>(INITIAL_GRIEVANCES);

  // Connect to Firestore real-time snapshot listener
  useEffect(() => {
    try {
      const q = query(collection(db, 'grievances'));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const initialMap = new Map(INITIAL_GRIEVANCES.map((g) => [g.id, g]));

          if (!snapshot.empty) {
            const firestoreList: Grievance[] = [];
            snapshot.forEach((d) => {
              const data = d.data() as Partial<Grievance>;
              const initial = initialMap.get(d.id);

              // Merge initial default values with Firestore document data to ensure no missing fields
              const fullDoc: Grievance = {
                id: d.id,
                ticketNo: data.ticketNo || initial?.ticketNo || `GRV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
                studentRegNo: data.studentRegNo || initial?.studentRegNo || '2023CS042',
                studentName: data.studentName || initial?.studentName || 'Student',
                studentEmail: data.studentEmail || initial?.studentEmail || 'student@college.edu',
                studentPhone: data.studentPhone || initial?.studentPhone || '9876543210',
                studentType: data.studentType || initial?.studentType || 'hosteller',
                hostelBlock: data.hostelBlock || initial?.hostelBlock,
                roomNo: data.roomNo || initial?.roomNo,
                category: data.category || initial?.category || 'Others',
                description: data.description || initial?.description || '(No description content)',
                status: data.status || initial?.status || 'pending',
                priority: data.priority || initial?.priority || 'medium',
                isSpam: typeof data.isSpam === 'boolean' ? data.isSpam : (initial?.isSpam ?? false),
                spamReason: data.spamReason || initial?.spamReason,
                aiClassification: data.aiClassification || initial?.aiClassification,
                createdAt: data.createdAt || initial?.createdAt || new Date().toISOString(),
                resolvedAt: data.resolvedAt || initial?.resolvedAt,
                adminNotes: data.adminNotes || initial?.adminNotes
              };

              firestoreList.push(fullDoc);
            });

            // Include any initial sample grievances that haven't been modified or created in Firestore yet
            const firestoreIds = new Set(firestoreList.map((g) => g.id));
            const remainingInitials = INITIAL_GRIEVANCES.filter((g) => !firestoreIds.has(g.id));

            setGrievances([...firestoreList, ...remainingInitials]);
          } else {
            setGrievances(INITIAL_GRIEVANCES);
          }
        },
        (error) => {
          console.warn('Firestore snapshot error (using local buffer):', error);
        }
      );
      return () => unsubscribe();
    } catch (err) {
      console.warn('Firestore subscription failed, running locally:', err);
    }
  }, []);

  // Handle student submitted complaint
  const handleGrievanceSubmitted = (newTicket: Grievance) => {
    setGrievances((prev) => [newTicket, ...prev]);
    setActiveView('home');
    setSuccessBanner(
      `Grievance ticket #${newTicket.ticketNo} registered successfully! An automated confirmation email has been dispatched to ${newTicket.studentEmail}.`
    );
    // Auto-dismiss banner after 8s
    setTimeout(() => {
      setSuccessBanner(null);
    }, 8000);
  };

  // Admin marks complaint priority
  const handleUpdatePriority = async (id: string, priority: PriorityLevel) => {
    let targetGrievance: Grievance | undefined;

    setGrievances((prev) =>
      prev.map((g) => {
        if (g.id === id) {
          targetGrievance = { ...g, priority };
          return targetGrievance;
        }
        return g;
      })
    );

    if (targetGrievance) {
      try {
        await setDoc(doc(db, 'grievances', id), targetGrievance, { merge: true });
      } catch (err) {
        console.warn('Firestore priority update fallback:', err);
      }
    }
  };

  // Admin marks complaint "Done" and dispatches automated email
  const handleMarkDone = async (id: string, customResolutionNote?: string) => {
    const target = grievances.find((g) => g.id === id);
    if (!target) return;

    const resolvedAt = new Date().toISOString();
    const updatedTicket: Grievance = {
      ...target,
      status: 'resolved',
      resolvedAt,
      adminNotes: customResolutionNote || 'Resolved by administration.'
    };

    setGrievances((prev) =>
      prev.map((g) => (g.id === id ? updatedTicket : g))
    );

    // Update Firestore with complete object
    try {
      await setDoc(doc(db, 'grievances', id), updatedTicket, { merge: true });
    } catch (err) {
      console.warn('Firestore mark done update fallback:', err);
    }

    // Trigger automated resolution email
    try {
      await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: target.studentEmail,
          type: 'resolution',
          ticketNo: target.ticketNo,
          studentName: target.studentName,
          category: target.category,
          customMessage: customResolutionNote,
        }),
      });
    } catch (err) {
      console.warn('Failed to send resolution email:', err);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAuthModalOpen(true);
    setActiveView('home');
  };

  // Filter complaints for current student
  const studentGrievances = grievances.filter(
    (g) => currentUser && (g.studentRegNo === currentUser.regNo || g.studentEmail === currentUser.email)
  );

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* ========================================================================= */}
      {/* 1. HEADER SECTION (Student Grievance name top-left, Profile UI top-right) */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Top Left: Student Grievance Brand */}
          <div className="flex items-center gap-3">
            <button
              id="brand-logo-btn"
              onClick={() => setActiveView('home')}
              className="flex items-center gap-2.5 text-left group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-700 to-indigo-800 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900 group-hover:text-blue-700 transition-colors block leading-tight">
                  Student Grievance System
                </span>
                <span className="text-[11px] font-medium text-slate-500 block">
                  AI-Powered College Redressal Cell
                </span>
              </div>
            </button>
          </div>

          {/* Top Right: Profile UI / Login Controls */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Live Simulated Inbox Button */}
                <button
                  id="open-inbox-modal-btn"
                  onClick={() => setIsEmailModalOpen(true)}
                  className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                  title="View your automated college emails"
                >
                  <Mail className="w-4 h-4" />
                  <span className="sr-only">Notifications</span>
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-600 rounded-full ring-2 ring-white"></span>
                </button>

                {/* Profile Widget */}
                <div
                  id="user-profile-header-widget"
                  className="flex items-center gap-2.5 pl-2 pr-3 py-1 bg-slate-100/80 border border-slate-200 rounded-xl"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    {currentUser.name.charAt(0)}
                  </div>
                  <div className="hidden sm:block text-left text-xs">
                    <div className="font-semibold text-slate-900 leading-tight">
                      {currentUser.name}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {currentUser.role === 'admin' ? 'Administrator' : currentUser.regNo}
                    </div>
                  </div>
                  <button
                    id="header-logout-btn"
                    onClick={handleLogout}
                    title="Sign Out"
                    className="p-1 text-slate-400 hover:text-red-600 rounded-md transition-colors ml-1 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                id="header-login-btn"
                onClick={() => setIsAuthModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Login / Sign Up
              </button>
            )}
          </div>
        </div>
      </header>

      {/* SUCCESS CONFIRMATION BANNER */}
      {successBanner && (
        <div
          id="system-success-banner"
          className="bg-emerald-600 text-white py-3 px-4 shadow-sm transition-all"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 text-xs font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successBanner}</span>
            </div>
            <button
              onClick={() => setSuccessBanner(null)}
              className="text-white/80 hover:text-white font-bold p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MAIN BODY CONTENT */}
      {/* ========================================================================= */}
      <main className="flex-1">
        {/* CASE 1: Student is in "New Complaint" Page */}
        {activeView === 'new_complaint' && currentUser && (
          <StudentComplaintForm
            user={currentUser}
            onBack={() => setActiveView('home')}
            onSubmitSuccess={handleGrievanceSubmitted}
          />
        )}

        {/* CASE 2: Admin Dashboard View */}
        {activeView === 'home' && currentUser?.role === 'admin' && (
          <AdminDashboard
            grievances={grievances}
            onUpdatePriority={handleUpdatePriority}
            onMarkDone={handleMarkDone}
          />
        )}

        {/* CASE 3: Student Perspective Homepage */}
        {activeView === 'home' && currentUser?.role !== 'admin' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
            {/* Student Hero Banner with Action Button */}
            <div className="relative overflow-hidden bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-8 md:p-10 shadow-lg">
              <div className="relative z-10 max-w-2xl space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-medium text-blue-200 border border-white/10">
                  <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                  <span>College Grievance Redressal & Anti-Ragging Portal</span>
                </div>
                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                  Have a problem on campus or in your hostel?
                </h1>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                  Lodge complaints regarding hostel damages, water leakage, Wi-Fi, mess food, bus routes, or any college trouble. Our automated AI triage prioritizes authentic issues directly with management.
                </p>

                {/* THE MANDATED STUDENT COMPLAINT BUTTON */}
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    id="lodge-complaint-hero-btn"
                    onClick={() => {
                      if (!currentUser) {
                        setIsAuthModalOpen(true);
                      } else {
                        setActiveView('new_complaint');
                      }
                    }}
                    className="px-6 py-3.5 bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2.5 cursor-pointer transform hover:-translate-y-0.5"
                  >
                    <PlusCircle className="w-5 h-5" />
                    <span>Student Complaint Button</span>
                  </button>

                  <button
                    id="check-emails-btn"
                    onClick={() => setIsEmailModalOpen(true)}
                    className="px-4 py-3.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl backdrop-blur-xs border border-white/20 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Mail className="w-4 h-4 text-blue-300" />
                    <span>Check Confirmation Emails</span>
                  </button>
                </div>
              </div>

              {/* Decorative graphic element */}
              <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-12 translate-y-12">
                <GraduationCap className="w-96 h-96 text-white" />
              </div>
            </div>

            {/* Student's Past Submitted Complaints Tracking */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                    Your Lodged Grievances
                  </h2>
                  <p className="text-xs text-slate-500">
                    Track real-time status and resolution from the hostel and college authorities
                  </p>
                </div>

                <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                  {studentGrievances.length} Tickets Registered
                </span>
              </div>

              {studentGrievances.length === 0 ? (
                <div className="p-8 text-center bg-white border border-slate-200/80 rounded-2xl space-y-3 shadow-xs">
                  <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
                  <div className="text-sm font-semibold text-slate-700">No complaints registered yet</div>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Facing hostel water leaks, mess food issues, or transport troubles? Click the Student Complaint button above to file a ticket.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {studentGrievances.map((item) => (
                    <div
                      key={item.id}
                      id={`student-ticket-card-${item.id}`}
                      className="bg-white p-5 rounded-2xl border border-slate-200 hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                            {item.ticketNo}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              item.status === 'resolved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {item.status === 'resolved' ? 'Work Done / Resolved' : 'Under Review'}
                          </span>
                        </div>

                        <div className="text-xs font-semibold text-blue-700">{item.category}</div>
                        <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      {item.adminNotes && (
                        <div className="p-2.5 bg-emerald-50/70 border border-emerald-100 rounded-xl text-[11px] text-emerald-900">
                          <span className="font-semibold block mb-0.5">Admin Action Note:</span>
                          {item.adminNotes}
                        </div>
                      )}

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Submitted {new Date(item.createdAt).toLocaleDateString()}</span>
                        {item.roomNo && <span>Room {item.roomNo}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* MANDATED REQUIREMENT 2: FAQs at the end of the page */}
            <FAQSection />
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 3. MODALS & SUB-COMPONENTS */}
      {/* ========================================================================= */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthModalOpen(false);
          setActiveView('home');
        }}
      />

      {currentUser && (
        <EmailInboxModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          userEmail={currentUser.email}
        />
      )}

      {/* ========================================================================= */}
      {/* 4. FOOTER */}
      {/* ========================================================================= */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-slate-700">AI Student Grievance Redressal System</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
