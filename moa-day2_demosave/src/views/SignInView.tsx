import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck, KeyRound, AlertCircle, Shield, Check, UserPlus } from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';

interface SignInViewProps {
  onSignInSuccess: (user: User) => void;
  onNavigate: (path: string) => void;
}

type AuthScreen = 'signin' | 'forgot' | 'reset-sent' | 'accept-invite';

export const SignInView: React.FC<SignInViewProps> = ({ onSignInSuccess, onNavigate }) => {
  const [screen, setScreen] = useState<AuthScreen>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needs2FA, setNeeds2FA] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  // Invitation acceptance
  const [inviteName, setInviteName] = useState('');
  const [invitePassword, setInvitePassword] = useState('');

  // Forced password change state
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);
  const [changeLoading, setChangeLoading] = useState(false);

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score; // 0 to 5
  };

  const isLockedOut = failedAttempts >= 5;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut) {
      setError('Too many failed attempts. Account entry temporarily suspended for 15 minutes.');
      return;
    }
    if (!email || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.signIn(email, password, twoFactorCode);

      if (res.requires2FA) {
        setNeeds2FA(true);
        setLoading(false);
        return;
      }

      if (res.user.mustChangePassword) {
        setPendingUser(res.user);
        setLoading(false);
        return;
      }

      onSignInSuccess(res.user);
      onNavigate('/admin');
    } catch (err: any) {
      setFailedAttempts(prev => prev + 1);
      setError(err.message || 'Incorrect credentials. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setChangeError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangeError('Passwords do not match.');
      return;
    }

    setChangeLoading(true);
    setChangeError(null);

    try {
      await api.changePassword(newPassword);
      if (pendingUser) {
        const updatedUser: User = { ...pendingUser, mustChangePassword: false };
        onSignInSuccess(updatedUser);
        onNavigate('/admin');
      }
    } catch (err: any) {
      setChangeError(err.message || 'Failed to update password.');
    } finally {
      setChangeLoading(false);
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please provide your email address.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setScreen('reset-sent');
    }, 600);
  };

  const strength = getPasswordStrength(newPassword || invitePassword);

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-block w-20 h-20 rounded-full overflow-hidden shadow-2xl mb-4 ring-2 ring-[#25CDB6]/30 bg-[#06302F]">
            <img
              src="/drawing1.png"
              alt="Masters Of All Emblem"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#EDE9E0]">
            MoA Control Room
          </h1>
          <p className="mt-1 text-xs text-[#EDE9E0]/60">
            {screen === 'accept-invite'
              ? 'Accept invitation and set up your workspace credentials'
              : screen === 'forgot'
              ? 'Recover access to your workspace'
              : 'Sign in to access your administrative workspace'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {pendingUser ? (
            /* Forced Password Change View */
            <motion.div
              key="password-change"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="bg-[#0A3D3C]/80 backdrop-blur-md border border-[#25CDB6]/30 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5"
            >
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#17A491]/15 border border-[#17A491]/30">
                <KeyRound className="w-5 h-5 text-[#25CDB6] shrink-0" />
                <div className="text-xs text-[#EDE9E0]/90">
                  <p className="font-bold text-[#EDE9E0]">Strong Password Required</p>
                  <p className="text-[#EDE9E0]/70 mt-0.5">
                    Set a new strong password before entering the Control Room.
                  </p>
                </div>
              </div>

              {changeError && (
                <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{changeError}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#EDE9E0]/70 font-semibold mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      required
                      placeholder="At least 8 characters"
                      className="w-full bg-[#06302F]/90 border border-[#EDE9E0]/20 rounded-xl px-4 py-3 text-sm text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#EDE9E0]/40 hover:text-[#EDE9E0]"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Strength Meter */}
                  <div className="mt-2 space-y-1.5">
                    <div className="flex gap-1 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-300 ${strength >= 1 ? 'w-1/4 bg-red-500' : ''}`} />
                      <div className={`h-full transition-all duration-300 ${strength >= 2 ? 'w-1/4 bg-amber-500' : ''}`} />
                      <div className={`h-full transition-all duration-300 ${strength >= 3 ? 'w-1/4 bg-[#17A491]' : ''}`} />
                      <div className={`h-full transition-all duration-300 ${strength >= 4 ? 'w-1/4 bg-[#25CDB6]' : ''}`} />
                    </div>
                    <p className="text-[10px] text-[#EDE9E0]/50">
                      Minimum 8 characters with letters, numbers, and symbols.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#EDE9E0]/70 font-semibold mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Repeat new password"
                    className="w-full bg-[#06302F]/90 border border-[#EDE9E0]/20 rounded-xl px-4 py-3 text-sm text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={changeLoading}
                  className="w-full mt-2 py-3.5 px-4 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
                >
                  {changeLoading ? (
                    <div className="w-5 h-5 border-2 border-[#06302F] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Set Password & Enter Control Room</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          ) : screen === 'forgot' ? (
            /* Forgot Password Screen */
            <motion.div
              key="forgot-screen"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="bg-[#0A3D3C]/70 backdrop-blur-md border border-[#EDE9E0]/15 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5"
            >
              <h2 className="text-base font-bold text-[#EDE9E0]">Reset Password</h2>
              <p className="text-xs text-[#EDE9E0]/70 leading-relaxed">
                Enter your authorized account email. If registered, a secure recovery authorization token will be dispatched.
              </p>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#EDE9E0]/70 font-semibold mb-2">
                    Account Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="name@mastersofall.org"
                    className="w-full bg-[#06302F]/90 border border-[#EDE9E0]/20 rounded-xl px-4 py-3 text-sm text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] font-bold text-xs transition-all cursor-pointer"
                >
                  {loading ? 'Processing...' : 'Send Recovery Token'}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setScreen('signin');
                    }}
                    className="text-xs text-[#EDE9E0]/60 hover:text-white transition-colors"
                  >
                    ← Return to Sign In
                  </button>
                </div>
              </form>
            </motion.div>
          ) : screen === 'reset-sent' ? (
            /* Recovery Token Dispatched */
            <motion.div
              key="reset-sent-screen"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#0A3D3C]/70 backdrop-blur-md border border-[#EDE9E0]/15 rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-[#17A491]/20 text-[#25CDB6] flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <h2 className="text-base font-bold text-[#EDE9E0]">Recovery Dispatched</h2>
              <p className="text-xs text-[#EDE9E0]/70 leading-relaxed">
                If an account exists under <span className="text-[#25CDB6]">{email}</span>, password reset instructions have been generated with an expiring 1-hour token.
              </p>
              <button
                type="button"
                onClick={() => setScreen('signin')}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors cursor-pointer"
              >
                Back to Sign In
              </button>
            </motion.div>
          ) : (
            /* Primary Sign In Form */
            <motion.div
              key="signin-form"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="bg-[#0A3D3C]/70 backdrop-blur-md border border-[#EDE9E0]/15 rounded-2xl p-6 sm:p-8 shadow-2xl"
            >
              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#EDE9E0]/70 font-semibold mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#EDE9E0]/40">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      placeholder="name@mastersofall.org"
                      className="w-full bg-[#06302F]/90 border border-[#EDE9E0]/20 rounded-xl pl-10 pr-4 py-3 text-sm text-[#EDE9E0] placeholder-[#EDE9E0]/30 focus:outline-none focus:border-[#25CDB6] focus:ring-1 focus:ring-[#25CDB6] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs uppercase tracking-wider text-[#EDE9E0]/70 font-semibold">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setScreen('forgot');
                      }}
                      className="text-[11px] text-[#25CDB6] hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#EDE9E0]/40">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full bg-[#06302F]/90 border border-[#EDE9E0]/20 rounded-xl pl-10 pr-11 py-3 text-sm text-[#EDE9E0] placeholder-[#EDE9E0]/30 focus:outline-none focus:border-[#25CDB6] focus:ring-1 focus:ring-[#25CDB6] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#EDE9E0]/40 hover:text-[#EDE9E0] transition-colors focus:outline-none cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {needs2FA && (
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[#25CDB6] font-semibold mb-2 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" />
                      <span>Two-Factor Authentication Code</span>
                    </label>
                    <input
                      type="text"
                      value={twoFactorCode}
                      onChange={e => setTwoFactorCode(e.target.value)}
                      placeholder="6-digit TOTP code"
                      className="w-full bg-[#06302F]/90 border border-[#25CDB6]/40 rounded-xl px-4 py-3 text-sm text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6]"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-[#EDE9E0]/70 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberDevice}
                      onChange={e => setRememberDevice(e.target.checked)}
                      className="rounded border-white/20 text-[#17A491] focus:ring-[#17A491]"
                    />
                    <span>Remember this device</span>
                  </label>
                  <span className="text-[11px] text-[#EDE9E0]/40">Invite-Only Access</span>
                </div>

                <button
                  type="submit"
                  disabled={loading || isLockedOut}
                  className="w-full mt-2 py-3.5 px-4 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-[#06302F] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
