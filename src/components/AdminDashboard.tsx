import React, { useState } from 'react';
import {
  Shield,
  Layers,
  Star,
  CheckCircle2,
  Clock,
  AlertOctagon,
  Search,
  Filter,
  ArrowUpDown,
  Mail,
  User,
  Building,
  Phone,
  Calendar,
  Sparkles,
  ChevronRight,
  Eye,
  Check,
  Ban
} from 'lucide-react';
import { Grievance, PriorityLevel } from '../types';

interface AdminDashboardProps {
  grievances: Grievance[];
  onUpdatePriority: (id: string, priority: PriorityLevel) => void;
  onMarkDone: (id: string, customResolutionNote?: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  grievances,
  onUpdatePriority,
  onMarkDone,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'active' | 'important' | 'resolved' | 'spam'>('active');
  const [selectedComplaint, setSelectedComplaint] = useState<Grievance | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Group complaints by category & calculate counts
  const categoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    grievances.forEach((g) => {
      // Exclude spam from active counts
      if (!g.isSpam) {
        counts[g.category] = (counts[g.category] || 0) + 1;
      }
    });
    return counts;
  }, [grievances]);

  // Important complaints
  const importantComplaints = grievances.filter(
    (g) => !g.isSpam && g.priority === 'urgent' && g.status !== 'resolved'
  );

  // Filter complaints according to active view
  const displayedComplaints = grievances
    .filter((g) => {
      // Tab filter
      if (activeTab === 'spam') {
        if (!g.isSpam) return false;
      } else if (activeTab === 'important') {
        if (g.isSpam || g.priority !== 'urgent' || g.status === 'resolved') return false;
      } else if (activeTab === 'resolved') {
        if (g.isSpam || g.status !== 'resolved') return false;
      } else {
        // 'active' tab shows pending/in_progress non-spam
        if (g.isSpam || g.status === 'resolved') return false;
      }

      // Category filter
      if (selectedCategory !== 'All' && g.category !== selectedCategory) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesText =
          g.description.toLowerCase().includes(q) ||
          g.ticketNo.toLowerCase().includes(q) ||
          g.studentName.toLowerCase().includes(q) ||
          g.studentRegNo.toLowerCase().includes(q) ||
          (g.roomNo && g.roomNo.toLowerCase().includes(q));
        if (!matchesText) return false;
      }

      return true;
    })
    // Sort Newest to Oldest as requested
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handlePriorityChange = (id: string, priority: PriorityLevel) => {
    onUpdatePriority(id, priority);
    if (selectedComplaint && selectedComplaint.id === id) {
      setSelectedComplaint((prev) => (prev ? { ...prev, priority } : null));
    }
  };

  const handleResolveClick = async (complaint: Grievance) => {
    setProcessingId(complaint.id);
    await onMarkDone(complaint.id, resolutionNote);
    setProcessingId(null);
    setResolutionNote('');
    // Keep modal open with updated status
    setSelectedComplaint((prev) => (prev ? { ...prev, status: 'resolved' } : null));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Top Welcome & KPI Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-sm border border-slate-700">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-300 uppercase tracking-wider mb-1">
            <Shield className="w-3.5 h-3.5" /> College Administrative Grievance Console
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Administrative Redressal Dashboard</h1>
          <p className="text-xs text-slate-300 mt-1">
            Monitor, prioritize, and resolve student grievances across hostels, campus facilities, and anti-ragging.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-white/10 px-4 py-2 rounded-xl text-center border border-white/10">
            <div className="text-xl font-bold font-mono">
              {grievances.filter((g) => !g.isSpam && g.status !== 'resolved').length}
            </div>
            <div className="text-[10px] text-slate-300 uppercase tracking-wider">Active Tickets</div>
          </div>
          <div className="bg-red-500/20 text-red-200 px-4 py-2 rounded-xl text-center border border-red-500/30">
            <div className="text-xl font-bold font-mono text-white">{importantComplaints.length}</div>
            <div className="text-[10px] uppercase tracking-wider text-red-200">Urgent Marked</div>
          </div>
          <div className="bg-emerald-500/20 text-emerald-200 px-4 py-2 rounded-xl text-center border border-emerald-500/30">
            <div className="text-xl font-bold font-mono text-white">
              {grievances.filter((g) => g.status === 'resolved').length}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-emerald-200">Resolved</div>
          </div>
        </div>
      </div>

      {/* CATEGORY SELECTOR / COUNTS SECTION */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-blue-600" /> Category Breakdown & Live Ticket Counts
          </h2>
          {selectedCategory !== 'All' && (
            <button
              id="clear-category-filter"
              onClick={() => setSelectedCategory('All')}
              className="text-xs text-blue-600 hover:underline font-medium cursor-pointer"
            >
              Reset to All Categories
            </button>
          )}
        </div>

        {/* Category Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* All Cards */}
          <button
            id="cat-card-all"
            onClick={() => setSelectedCategory('All')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              selectedCategory === 'All'
                ? 'bg-blue-50/80 border-blue-500 shadow-xs ring-1 ring-blue-500/30'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="text-[11px] font-semibold text-slate-500">All Categories</div>
            <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
              {grievances.filter((g) => !g.isSpam).length}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Total tickets</div>
          </button>

          {Object.entries(categoryCounts).map(([catName, count]) => {
            const isSelected = selectedCategory === catName;
            return (
              <button
                key={catName}
                id={`cat-card-${catName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                onClick={() => setSelectedCategory(catName)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/80 border-blue-500 shadow-xs ring-1 ring-blue-500/30'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-[11px] font-semibold text-slate-700 truncate" title={catName}>
                  {catName}
                </div>
                <div className="text-xl font-bold text-slate-900 mt-1 font-mono">{count}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">open complaints</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* IMPORTANT SECTION - PROMINENTLY DISPLAYED BELOW CATEGORIES */}
      {importantComplaints.length > 0 && activeTab !== 'spam' && (
        <div id="urgent-complaints-section" className="bg-red-50/60 border border-red-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-red-600 text-white">
                <Star className="w-4 h-4 fill-white" />
              </span>
              <h3 className="text-sm font-bold text-red-950 uppercase tracking-wide">
                High Priority / Urgent Complaints ({importantComplaints.length})
              </h3>
            </div>
            <span className="text-xs text-red-700 font-medium">Requires Immediate Action</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {importantComplaints.map((item) => (
              <div
                key={item.id}
                id={`important-item-${item.id}`}
                onClick={() => setSelectedComplaint(item)}
                className="bg-white p-4 rounded-xl border border-red-200 hover:shadow-md transition-all cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-red-700">{item.ticketNo}</span>
                  <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded font-semibold text-[10px] uppercase">
                    Urgent
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-900">{item.category}</div>
                <p className="text-xs text-slate-600 line-clamp-2">{item.description}</p>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{item.studentName} {item.roomNo ? `(${item.roomNo})` : ''}</span>
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FILTER TABS & SEARCH BAR */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          {/* View Mode Tabs */}
          <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
            <button
              id="admin-tab-active"
              onClick={() => setActiveTab('active')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'active' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active Queue ({grievances.filter((g) => !g.isSpam && g.status !== 'resolved').length})
            </button>
            <button
              id="admin-tab-important"
              onClick={() => setActiveTab('important')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
                activeTab === 'important' ? 'bg-white text-red-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Star className="w-3.5 h-3.5 fill-red-500 text-red-500" /> Urgent ({importantComplaints.length})
            </button>
            <button
              id="admin-tab-resolved"
              onClick={() => setActiveTab('resolved')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'resolved' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Resolved ({grievances.filter((g) => g.status === 'resolved').length})
            </button>
            <button
              id="admin-tab-spam"
              onClick={() => setActiveTab('spam')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
                activeTab === 'spam' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" /> AI Spam Quarantine ({grievances.filter((g) => g.isSpam).length})
            </button>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="admin-search-input"
              type="text"
              placeholder="Search by ticket, name, room, or issue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* ORDER NOTICE: New Complaints to Old Complaints */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
          <span className="flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" /> Showing complaints in order from <strong>Newest to Oldest</strong>
          </span>
          <span>{displayedComplaints.length} tickets found</span>
        </div>

        {/* MAIN COMPLAINTS TABLE / LIST */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          {displayedComplaints.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 mx-auto text-slate-300" />
              <div className="text-sm font-medium text-slate-600">No grievances found in this filter view.</div>
              <div className="text-xs text-slate-400">Try changing the category or clearing the search query.</div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {displayedComplaints.map((item) => {
                const isSelected = selectedComplaint?.id === item.id;
                const isUrgent = item.priority === 'urgent';

                return (
                  <div
                    key={item.id}
                    id={`complaint-row-${item.id}`}
                    className={`p-4 transition-colors hover:bg-slate-50/80 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isSelected ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    {/* Left: Ticket info, Category, Student */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          {item.ticketNo}
                        </span>
                        <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          {item.category}
                        </span>

                        {/* Priority Selector Badge */}
                        <select
                          id={`priority-select-${item.id}`}
                          value={item.priority || 'medium'}
                          onChange={(e) => handlePriorityChange(item.id, e.target.value as PriorityLevel)}
                          onClick={(e) => e.stopPropagation()}
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded cursor-pointer border-0 ring-1 focus:ring-2 focus:outline-hidden ${
                            item.priority === 'urgent'
                              ? 'bg-red-100 text-red-800 ring-red-200'
                              : item.priority === 'medium'
                              ? 'bg-amber-100 text-amber-800 ring-amber-200'
                              : 'bg-slate-100 text-slate-700 ring-slate-200'
                          }`}
                        >
                          <option value="urgent">🔴 Urgent</option>
                          <option value="medium">🟡 Medium</option>
                          <option value="less_important">⚪ Less Important</option>
                        </select>

                        {/* Spam Flag */}
                        {item.isSpam && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-purple-100 text-purple-800 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Flagged Spam: {item.spamReason || 'Gibberish'}
                          </span>
                        )}

                        {/* Status Badge */}
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            item.status === 'resolved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>

                      {/* Complaint Preview */}
                      <p className="text-xs text-slate-700 leading-relaxed font-sans line-clamp-2">
                        {item.description}
                      </p>

                      {/* Student & Date metadata */}
                      <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" /> {item.studentName} ({item.studentRegNo})
                        </span>
                        {item.studentType === 'hosteller' && item.roomNo && (
                          <span className="flex items-center gap-1">
                            <Building className="w-3 h-3 text-slate-400" /> {item.hostelBlock} - Room {item.roomNo}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" /> {new Date(item.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      <button
                        id={`view-details-btn-${item.id}`}
                        onClick={() => setSelectedComplaint(item)}
                        className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" /> Read & Manage
                      </button>

                      {item.status !== 'resolved' && (
                        <button
                          id={`quick-done-btn-${item.id}`}
                          onClick={() => handleResolveClick(item)}
                          disabled={processingId === item.id}
                          className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-60"
                        >
                          <Check className="w-3.5 h-3.5" /> Done
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* DETAILED COMPLAINT INSPECTION & ACTION MODAL */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-sm font-bold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded">
                  {selectedComplaint.ticketNo}
                </span>
                <span className="text-xs font-semibold text-blue-700 bg-blue-100/60 px-2.5 py-0.5 rounded-full">
                  {selectedComplaint.category}
                </span>
              </div>
              <button
                id="close-detail-modal-btn"
                onClick={() => setSelectedComplaint(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/50"
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Student Details Card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Student Name</span>
                  <span className="font-semibold text-slate-800">{selectedComplaint.studentName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Register No</span>
                  <span className="font-mono font-semibold text-slate-800">{selectedComplaint.studentRegNo}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Phone Number</span>
                  <span className="text-slate-800">{selectedComplaint.studentPhone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Email Address</span>
                  <span className="text-slate-800">{selectedComplaint.studentEmail}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Type / Residence</span>
                  <span className="text-slate-800 capitalize">{selectedComplaint.studentType}</span>
                </div>
                {selectedComplaint.hostelBlock && (
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Hostel & Room</span>
                    <span className="font-semibold text-slate-800">{selectedComplaint.hostelBlock} - Rm {selectedComplaint.roomNo}</span>
                  </div>
                )}
              </div>

              {/* AI Spam Assessment Banner */}
              {selectedComplaint.isSpam ? (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                  <AlertOctagon className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Flagged as Spam / Gibberish by AI Classifier</div>
                    <div className="text-amber-800 mt-0.5">{selectedComplaint.spamReason || 'Keyboard smash or non-actionable message'}</div>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>AI Verified: Legitimate student complaint. Confidence: 95%</span>
                </div>
              )}

              {/* Complaint Text */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Student Complaint Description
                </label>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm whitespace-pre-wrap leading-relaxed font-sans">
                  {selectedComplaint.description}
                </div>
              </div>

              {/* Priority Tagging Action */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Triage Priority Level
                </label>
                <div className="flex gap-2">
                  <button
                    id="set-priority-urgent"
                    onClick={() => handlePriorityChange(selectedComplaint.id, 'urgent')}
                    className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer ${
                      selectedComplaint.priority === 'urgent'
                        ? 'bg-red-600 text-white border-red-600 shadow-xs'
                        : 'bg-white border-slate-200 text-red-700 hover:bg-red-50'
                    }`}
                  >
                    <Star className="w-3.5 h-3.5 fill-current" /> Urgent (Important)
                  </button>
                  <button
                    id="set-priority-medium"
                    onClick={() => handlePriorityChange(selectedComplaint.id, 'medium')}
                    className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer ${
                      selectedComplaint.priority === 'medium'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                        : 'bg-white border-slate-200 text-amber-700 hover:bg-amber-50'
                    }`}
                  >
                    Medium
                  </button>
                  <button
                    id="set-priority-low"
                    onClick={() => handlePriorityChange(selectedComplaint.id, 'less_important')}
                    className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer ${
                      selectedComplaint.priority === 'less_important'
                        ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Less Important
                  </button>
                </div>
              </div>

              {/* Resolution Note */}
              {selectedComplaint.status !== 'resolved' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Resolution Note (Will be dispatched in the automated email to student)
                  </label>
                  <textarea
                    id="admin-resolution-note-textarea"
                    rows={2}
                    placeholder="e.g., 'Maintenance staff replaced the faucet gasket at 11:30 AM. Water supply tested successfully.'"
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer: Work Done Button with Automated Email Dispatch */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                <span>Automated resolution email will be sent immediately to {selectedComplaint.studentEmail}</span>
              </div>

              {selectedComplaint.status === 'resolved' ? (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-lg">
                  <CheckCircle2 className="w-4 h-4" /> Work Marked Done
                </div>
              ) : (
                <button
                  id="admin-mark-done-submit-btn"
                  onClick={() => handleResolveClick(selectedComplaint)}
                  disabled={processingId === selectedComplaint.id}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {processingId === selectedComplaint.id ? 'Resolving & Notifying...' : 'Work Done (Mark Done)'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
