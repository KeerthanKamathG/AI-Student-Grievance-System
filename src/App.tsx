import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  User,
  LogOut,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building,
  ShieldAlert,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Inbox,
  Filter,
  Sun,
  Moon
} from 'lucide-react';
import { UserProfile, Grievance, PriorityLevel, StudentType } from './types';
import { INITIAL_GRIEVANCES } from './data/initialData';
import { DAYSCHOLAR_CATEGORIES } from './data/constants';
import { AuthModal } from './components/AuthModal';
import { StudentComplaintForm } from './components/StudentComplaintForm';
import { AdminDashboard } from './components/AdminDashboard';
import { FAQSection } from './components/FAQSection';
import { ProfileModal } from './components/ProfileModal';
import { db, cleanFirestoreData } from './firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, setDoc } from 'firebase/firestore';

export default function App() {
  // Current user state (persisted across page reloads via localStorage)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const savedUser = localStorage.getItem('grievance_portal_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('grievance_portal_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('grievance_portal_user');
    }
  }, [currentUser]);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [activeView, setActiveView] = useState<'home' | 'new_complaint'>('home');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Dark Mode state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Live complaints list
  const [grievances, setGrievances] = useState<Grievance[]>(INITIAL_GRIEVANCES);

  // Connect to Firestore real-time snapshot listener with complete deduplication & cleanup
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

              const inferredStudentType: StudentType =
                (data.studentType as StudentType) ||
                (data.category && DAYSCHOLAR_CATEGORIES.includes(data.category)
                  ? 'dayscholar'
                  : initial?.studentType || 'dayscholar');

              // Merge initial default values with Firestore document data
              const fullDoc: Grievance = {
                id: d.id,
                ticketNo: data.ticketNo || initial?.ticketNo || `GRV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
                studentRegNo: data.studentRegNo || initial?.studentRegNo || '2026DS' + d.id.substring(0, 4).toUpperCase(),
                studentName: data.studentName || initial?.studentName || 'Student',
                studentEmail: data.studentEmail || initial?.studentEmail || 'student@college.edu',
                studentPhone: data.studentPhone || initial?.studentPhone || '9876543210',
                studentType: inferredStudentType,
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
                adminNotes: data.adminNotes || initial?.adminNotes,
              };

              firestoreList.push(fullDoc);
            });

            // Map for deduplication keyed by ticketNo & id
            const ticketMap = new Map<string, Grievance>();

            // 1. Add Firestore items first (highest precedence)
            firestoreList.forEach((g) => {
              const ticketKey = g.ticketNo ? g.ticketNo.trim().toUpperCase() : g.id;
              ticketMap.set(ticketKey, g);
              ticketMap.set(g.id, g);
            });

            // 2. Add INITIAL_GRIEVANCES only if neither ticketNo nor id exists in ticketMap
            INITIAL_GRIEVANCES.forEach((initG) => {
              const ticketKey = initG.ticketNo ? initG.ticketNo.trim().toUpperCase() : initG.id;
              if (!ticketMap.has(initG.id) && !ticketMap.has(ticketKey)) {
                ticketMap.set(initG.id, initG);
                ticketMap.set(ticketKey, initG);
              }
            });

            // Extract unique grievance objects
            const dedupedList = Array.from(new Set(ticketMap.values()));

            setGrievances(dedupedList);
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

  // Handle student submitted complaint with deduplication
  const handleGrievanceSubmitted = (newTicket: Grievance) => {
    setGrievances((prev) => {
      const existingKeys = new Set(
        prev.map((g) => (g.ticketNo || g.id).trim().toUpperCase())
      );
      const newKey = (newTicket.ticketNo || newTicket.id).trim().toUpperCase();
      if (existingKeys.has(newKey)) {
        return prev;
      }
      return [newTicket, ...prev];
    });
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
        await setDoc(doc(db, 'grievances', id), cleanFirestoreData(targetGrievance), { merge: true });
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
      await setDoc(doc(db, 'grievances', id), cleanFirestoreData(updatedTicket), { merge: true });
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
    localStorage.removeItem('grievance_portal_user');
    setIsAuthModalOpen(true);
    setActiveView('home');
  };

  // Filter and reverse-chronologically sort complaints for current student (newest / most recently resolved first)
  const studentGrievances = grievances
    .filter(
      (g) => currentUser && (g.studentRegNo === currentUser.regNo || g.studentEmail === currentUser.email)
    )
    .sort((a, b) => {
      const timeA = new Date(a.resolvedAt || a.createdAt).getTime();
      const timeB = new Date(b.resolvedAt || b.createdAt).getTime();
      return timeB - timeA;
    });

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-blue-100 dark:selection:bg-blue-900 selection:text-blue-900 dark:selection:text-blue-100 transition-colors">
      {/* ========================================================================= */}
      {/* 1. HEADER SECTION (Student Grievance name top-left, Profile UI top-right) */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
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
                <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors block leading-tight">
                  Student Grievance System
                </span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                  AI-Powered College Redressal Cell
                </span>
              </div>
            </button>
          </div>

          {/* Top Right: Dark Mode Toggle + Profile UI / Login Controls */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* DARK MODE TOGGLE BUTTON */}
            <button
              id="dark-mode-toggle-btn"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer border border-slate-200/60 dark:border-slate-700"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
              <span className="sr-only">Toggle Theme</span>
            </button>

            {currentUser ? (
              <div className="relative">
                {/* Profile Interactive Dropdown Trigger */}
                <button
                  id="user-profile-dropdown-btn"
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="flex items-center gap-2 pl-2.5 pr-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer shadow-2xs"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left text-xs">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                      {currentUser.name}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      {currentUser.role === 'admin' ? 'Administrator' : currentUser.regNo}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1 shrink-0" />
                </button>

                {/* Profile Dropdown Dialogue Box */}
                {isUserDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsUserDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50">
                      <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{currentUser.name}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{currentUser.email}</p>
                      </div>

                      <button
                        id="dropdown-profile-option"
                        onClick={() => {
                          setIsUserDropdownOpen(false);
                          setIsProfileModalOpen(true);
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>Profile</span>
                      </button>

                      <button
                        id="dropdown-logout-option"
                        onClick={() => {
                          setIsUserDropdownOpen(false);
                          setIsLogoutConfirmOpen(true);
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2.5 transition-colors cursor-pointer border-t border-slate-100 dark:border-slate-800"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </>
                )}
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
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    Your Lodged Grievances
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Track real-time status and resolution from the hostel and college authorities
                  </p>
                </div>

                <span className="text-xs font-mono font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-100 dark:border-blue-900">
                  {studentGrievances.length} Tickets Registered
                </span>
              </div>

              {studentGrievances.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-3 shadow-xs">
                  <Inbox className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">No complaints registered yet</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    Facing hostel water leaks, mess food issues, or transport troubles? Click the Student Complaint button above to file a ticket.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {studentGrievances.map((item) => (
                    <div
                      key={item.id}
                      id={`student-ticket-card-${item.id}`}
                      className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            {item.ticketNo}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              item.status === 'resolved'
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                                : 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300'
                            }`}
                          >
                            {item.status === 'resolved' ? 'Work Done / Resolved' : 'Under Review'}
                          </span>
                        </div>

                        <div className="text-xs font-semibold text-blue-700 dark:text-blue-400">{item.category}</div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      {item.adminNotes && (
                        <div className="p-2.5 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 rounded-xl text-[11px] text-emerald-900 dark:text-emerald-300">
                          <span className="font-semibold block mb-0.5">Admin Action Note:</span>
                          {item.adminNotes}
                        </div>
                      )}

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
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
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthModalOpen(false);
          setActiveView('home');
        }}
      />

      {currentUser && (
        <ProfileModal
          isOpen={isProfileModalOpen}
          user={currentUser}
          onClose={() => setIsProfileModalOpen(false)}
          onSave={async (updatedUser) => {
            setCurrentUser(updatedUser);
            localStorage.setItem('grievance_portal_user', JSON.stringify(updatedUser));
            try {
              if (updatedUser.regNo) {
                await setDoc(doc(db, 'users', updatedUser.regNo), cleanFirestoreData(updatedUser), { merge: true });
              }
            } catch (err) {
              console.warn('Firestore profile update fallback:', err);
            }
            setSuccessBanner('Profile information updated successfully!');
            setTimeout(() => setSuccessBanner(null), 4000);
          }}
        />
      )}

      {/* Logout Confirmation Dialogue Box */}
      {isLogoutConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Confirm Logout</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Are you sure you want to log out of the Student Grievance System?
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                id="cancel-logout-modal-btn"
                onClick={() => setIsLogoutConfirmOpen(false)}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="confirm-logout-modal-btn"
                onClick={() => {
                  setIsLogoutConfirmOpen(false);
                  handleLogout();
                }}
                className="flex-1 py-2.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Campus Outbox Modal */}
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
