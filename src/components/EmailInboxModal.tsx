import React, { useState } from 'react';
import { Mail, RefreshCw, CheckCircle2, AlertCircle, X, ExternalLink } from 'lucide-react';
import { MockEmailNotification } from '../types';

interface EmailInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
}

export const EmailInboxModal: React.FC<EmailInboxModalProps> = ({ isOpen, onClose, userEmail }) => {
  const [emails, setEmails] = useState<MockEmailNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeEmail, setActiveEmail] = useState<MockEmailNotification | null>(null);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications/outbox?email=${encodeURIComponent(userEmail)}`);
      const data = await res.json();
      if (data.outbox) {
        setEmails(data.outbox);
        if (data.outbox.length > 0 && !activeEmail) {
          setActiveEmail(data.outbox[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load email inbox:', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      fetchEmails();
    }
  }, [isOpen, userEmail]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800">Student Email Simulator</h3>
              <p className="text-xs text-slate-500">Live incoming notifications sent to: <span className="font-mono text-slate-700 font-medium">{userEmail}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="refresh-emails-btn"
              onClick={fetchEmails}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors"
              title="Refresh inbox"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              id="close-email-modal-btn"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden">
          {/* Email List */}
          <div className="md:col-span-5 border-r border-slate-100 overflow-y-auto max-h-[55vh] p-2 divide-y divide-slate-100">
            {emails.length === 0 ? (
              <div className="text-center py-12 px-4 text-slate-400 text-sm">
                <Mail className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No emails received yet for this account.
              </div>
            ) : (
              emails.map((em) => {
                const isSelected = activeEmail?.id === em.id;
                return (
                  <button
                    key={em.id}
                    id={`email-item-${em.id}`}
                    onClick={() => setActiveEmail(em)}
                    className={`w-full text-left p-3 rounded-xl transition-all ${
                      isSelected
                        ? 'bg-blue-50/80 border border-blue-200'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className={`text-[11px] font-semibold uppercase px-1.5 py-0.5 rounded tracking-wide ${
                        em.type === 'otp'
                          ? 'bg-amber-100 text-amber-800'
                          : em.type === 'confirmation'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {em.type}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(em.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-800 truncate mb-0.5">
                      {em.subject}
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {em.body}
                    </p>
                  </button>
                );
              })
            )}
          </div>

          {/* Email Viewer */}
          <div className="md:col-span-7 p-6 overflow-y-auto max-h-[55vh] bg-white flex flex-col">
            {activeEmail ? (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    {activeEmail.type === 'resolution' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Problem Resolved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                        <AlertCircle className="w-3.5 h-3.5" /> Official Automated Dispatch
                      </span>
                    )}
                  </div>
                  <h4 className="text-base font-bold text-slate-900 mt-1">
                    {activeEmail.subject}
                  </h4>
                  <div className="text-xs text-slate-500 mt-2 flex flex-col gap-0.5">
                    <div>From: <span className="text-slate-700 font-medium">College Grievance Cell &lt;grievance-noreply@college.edu&gt;</span></div>
                    <div>To: <span className="text-slate-700 font-medium">{activeEmail.to}</span></div>
                    <div>Date: <span className="text-slate-700">{new Date(activeEmail.timestamp).toLocaleString()}</span></div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50/70 border border-slate-200/70 rounded-xl text-slate-800 text-sm whitespace-pre-line leading-relaxed font-sans">
                  {activeEmail.body}
                </div>

                <div className="text-[11px] text-slate-400 italic pt-2">
                  * Note: In a live production system with an SMTP relay (SendGrid/Resend), this email is received in your personal college email inbox.
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                Select an email from the left pane to read.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Automated College Dispatch Server</span>
          <button
            id="dismiss-email-modal"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
