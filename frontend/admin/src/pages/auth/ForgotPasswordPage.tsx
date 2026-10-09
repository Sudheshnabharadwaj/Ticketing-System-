import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { supabase } from '../../services/supabaseClient';

export const ForgotPasswordPage: React.FC = () => {
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
      setError('Enter a valid email address');
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
        setError('No registered account found with this email address.');
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
          name: dbUser.name || 'Admin',
          reset_code: resetCode,
          reset_url: resetUrl,
          portal: 'Admin Portal'
        })
      });

      setIsSubmitted(true);
    } catch (err: any) {
      console.warn('Password reset request error:', err);
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="w-12 h-12 rounded-xl bg-[#0284C7] flex items-center justify-center text-white mx-auto shadow-sm">
          <Ticket className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Forgot Password
        </h2>
        <p className="text-xs text-slate-500">
          Enter your registered admin email to receive a password recovery link.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 sm:rounded-xl sm:px-10">
          {isSubmitted ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Recovery Email Sent!</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                We sent password reset instructions to <strong className="text-slate-900">{email}</strong>. Please check your inbox.
              </p>
              <div className="pt-2">
                <Link to={`/admin/auth/reset-password?email=${encodeURIComponent(email.trim())}`}>
                  <Button variant="outline" className="w-full justify-center">
                    Proceed to Reset Password
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <Input
                label="Admin Email Address"
                type="email"
                placeholder="admin@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                error={error}
                icon={<Mail className="w-4 h-4" />}
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full justify-center py-2.5 font-semibold mt-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending Link...' : 'Send Reset Link'}
              </Button>
            </form>
          )}

          <div className="mt-6 border-t border-slate-100 pt-4 text-center">
            <Link to="/login" className="text-xs text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 font-medium">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
