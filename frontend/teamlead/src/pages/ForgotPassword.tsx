import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Email address is required');
      return;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Enter a valid corporate email address');
      return;
    }

    setIsSubmitting(true);
    const cleanEmail = email.trim().toLowerCase();

    try {
      const { data: dbUser, error: queryErr } = await supabase
        .from('users')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (queryErr || !dbUser) {
        setError('No registered Team Lead account found with this email.');
        setIsSubmitting(false);
        return;
      }

      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      await supabase
        .from('users')
        .update({ invite_token: `reset-${resetCode}` })
        .eq('email', cleanEmail);

      const baseUrl = window.location.href.split('#')[0].replace(/\/+$/, '');
      const resetUrl = `${baseUrl}/#/admin/auth/reset-password?email=${encodeURIComponent(cleanEmail)}&code=${resetCode}`;
      await fetch('http://localhost:8000/api/v1/notifications/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          name: dbUser.name || 'Team Lead',
          reset_code: resetCode,
          reset_url: resetUrl,
          portal: 'Team Lead Portal'
        })
      });

      setIsSubmitted(true);
    } catch (err: any) {
      console.warn('Password reset error:', err);
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12 font-sans">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sky-600 text-white shadow-md mb-3">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Reset Team Lead Password
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Enter your registered Team Lead email to receive a verification reset code.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          {isSubmitted ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Recovery Email Sent!</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                We sent password reset verification instructions to <strong className="text-slate-900">{email}</strong>. Please check your inbox.
              </p>
              <div className="pt-2">
                <Link
                  to={`/reset-password?email=${encodeURIComponent(email.trim())}`}
                  className="w-full inline-flex justify-center items-center py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 shadow-sm transition-all"
                >
                  Proceed to Reset Password
                </Link>
              </div>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              {error && (
                <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-medium">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Work Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="teamlead@company.com"
                    className="block w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 disabled:opacity-50 transition-all cursor-pointer shadow-sm mt-2"
              >
                {isSubmitting ? 'Sending Instructions...' : 'Send Reset Code'}
              </button>
            </form>
          )}

          <div className="mt-6 border-t border-slate-100 pt-4 text-center">
            <Link
              to="/login"
              className="text-xs text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Return to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
