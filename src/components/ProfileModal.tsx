import React, { useState } from 'react';
import { User, Phone, Mail, Hash, Save, X, Check, Lock, GraduationCap } from 'lucide-react';
import { UserProfile, StudentType } from '../types';
import { HOSTEL_BLOCKS } from '../data/constants';

interface ProfileModalProps {
  isOpen: boolean;
  user: UserProfile;
  onClose: () => void;
  onSave: (updatedUser: UserProfile) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  user,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(user.name);
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>(user.gender || 'Male');
  const [studentType, setStudentType] = useState<StudentType>(user.studentType || 'dayscholar');
  const [hostelBlock, setHostelBlock] = useState(user.hostelBlock || HOSTEL_BLOCKS[0]);
  const [roomNo, setRoomNo] = useState(user.roomNo || '');
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const isAdmin = user.role === 'admin';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserProfile = {
      ...user,
      name: name.trim(),
      gender,
      studentType: isAdmin ? user.studentType : studentType,
      hostelBlock: !isAdmin && studentType === 'hosteller' ? hostelBlock : undefined,
      roomNo: !isAdmin && studentType === 'hosteller' ? roomNo.trim() : undefined,
    };
    onSave(updated);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 w-full max-w-lg overflow-hidden my-6 transition-all">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 relative">
          <button
            id="close-profile-modal-btn"
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg border border-white/20 shadow-xs">
              {name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                {isAdmin ? 'Administrator Profile' : 'Student Profile'}
              </h2>
              <p className="text-xs text-blue-200/90 mt-0.5">
                {isAdmin ? 'System Administrator' : `Reg No: ${user.regNo}`}
              </p>
            </div>
          </div>
        </div>

        {/* Notice for locked verification fields */}
        <div className="px-6 pt-4">
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              {isAdmin
                ? 'Administrator ID, Email, and Phone are verified credentials and cannot be modified.'
                : 'Registration Number, Email, Phone, and Department are verified identification fields and cannot be modified.'}
            </span>
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. EDITABLE: Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name (Editable)
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  id="profile-name-input"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:bg-white dark:focus:bg-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 font-medium"
                />
              </div>
            </div>

            {/* 2. READ-ONLY: Register Number or Admin ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                <Lock className="w-3 h-3" /> {isAdmin ? 'Admin ID' : 'Register Number'} (Read-Only)
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  id="profile-regno-input-disabled"
                  type="text"
                  disabled
                  readOnly
                  value={user.regNo}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-lg cursor-not-allowed opacity-90 font-mono"
                />
              </div>
            </div>

            {/* 3. READ-ONLY: Phone Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Phone Number (Read-Only)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  id="profile-phone-input-disabled"
                  type="tel"
                  disabled
                  readOnly
                  value={user.phone}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-lg cursor-not-allowed opacity-90"
                />
              </div>
            </div>

            {/* 4. READ-ONLY: Email Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Email Address (Read-Only)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  id="profile-email-input-disabled"
                  type="email"
                  disabled
                  readOnly
                  value={user.email}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-lg cursor-not-allowed opacity-90"
                />
              </div>
            </div>

            {/* 5. READ-ONLY: Department (Students Only) */}
            {!isAdmin && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Department (Read-Only)
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    id="profile-department-input-disabled"
                    type="text"
                    disabled
                    readOnly
                    value={user.department || 'CSE (Computer Science & Engineering)'}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-lg cursor-not-allowed opacity-90 font-medium"
                  />
                </div>
              </div>
            )}

            {/* 6. EDITABLE: Gender */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Gender
              </label>
              <select
                id="profile-gender-select"
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* 7. EDITABLE: Student Type (Students Only) */}
            {!isAdmin && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Student Type
                </label>
                <select
                  id="profile-studenttype-select"
                  value={studentType}
                  onChange={(e) => setStudentType(e.target.value as StudentType)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="dayscholar">Dayscholar (Commuter)</option>
                  <option value="hosteller">Hostel Resident</option>
                </select>
              </div>
            )}
          </div>

          {/* 8. HOSTEL BLOCK & ROOM (Students Only) */}
          {!isAdmin && studentType === 'hosteller' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-blue-50/50 dark:bg-slate-800/60 rounded-xl border border-blue-100 dark:border-slate-700 mt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Hostel Block
                </label>
                <select
                  id="profile-hostelblock-select"
                  value={hostelBlock}
                  onChange={(e) => setHostelBlock(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                >
                  {HOSTEL_BLOCKS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Room Number
                </label>
                <input
                  id="profile-roomno-input"
                  type="text"
                  placeholder="e.g. A-304"
                  value={roomNo}
                  onChange={(e) => setRoomNo(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          )}

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="save-profile-btn"
              type="submit"
              className={`px-5 py-2 text-xs font-semibold text-white rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer ${
                isSaved ? 'bg-emerald-600' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Saved Successfully!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
