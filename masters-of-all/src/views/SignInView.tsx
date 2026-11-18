import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  AlertCircle,
  Shield,
  UserPlus,
  User as UserIcon,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';
import { User, InviteVerifyResponse } from '../types';

interface SignInViewProps {
  onSignInSuccess: (user: User) => void;
  onNavigate: (path: string) => void;
  logoUrl?: string;
  minPasswordLength?: number;
}

type AuthScreen = 'signin' | 'forgot' | 'reset-password' | 'accept-invite';

export const SignInView: React.FC<SignInViewProps> = ({
  onSignInSuccess,
  onNavigate,
  logoUrl = '/drawing1.png',
  minPasswordLength = 12
}) => {
  const [screen, setScreen] = useState<AuthScreen>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoBanner, setInfoBanner] = useState<string | null>(null);
  const [needs2FA, setNeeds2FA] = useState(false);

  // Forced password change & founder profile completion state
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [founderName, setFounderName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);
  const [changeLoading, setChangeLoading] = useState(false);

  // Mandatory 2FA enrollment state
  const [setup2FAUser, setSetup2FAUser] = useState<User | null>(null);
  const [setup2FAData, setSetup2FAData] = useState<{
    secret: string;
    qrDataUrl: string;
    recoveryCodes: string[];
  } | null>(null);
  const [setup2FACode, setSetup2FACode] = useState('');
  const [setup2FAError, setSetup2FAError] = useState<string | null>(null);
  const [setup2FALoading, setSetup2FALoading] = useState(false);

  // Invitation Acceptance state
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteInfo, setInviteInfo] = useState<InviteVerifyResponse | null>(null);
  const [inviteVerifyLoading, setInviteVerifyLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteName, setInviteName] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteConfirmPassword, setInviteConfirmPassword] = useState('');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  // Forgot & Reset Password state
  const [smtpConfigured, setSmtpConfigured] = useState<boolean | null>(null);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);

  const [resetToken, setResetToken] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const requiredMinLen = Math.max(12, minPasswordLength || 12);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('expired') === '1') {
      setInfoBanner('Your session has expired or was invalidated. Please sign in again.');
    }

    const resetParam = params.get('reset');
    if (resetParam && resetParam.trim()) {
      const trimmedReset = resetParam.trim();
      if (trimmedReset === '1') {
        setInfoBanner(
          'Your session was ended because your account credentials, status, or permissions changed. Please sign in again.'
        );
      } else {
        setResetToken(trimmedReset);
        setScreen('reset-password');
        return;
      }
    }

    const tokenParam = params.get('token') || params.get('invite');
    if (tokenParam && tokenParam.trim()) {
      const cleanToken = tokenParam.trim();
      setInviteToken(cleanToken);
      setScreen('accept-invite');
      setInviteVerifyLoading(true);
      setInviteError(null);
      api
        .verifyInvitation(cleanToken)
        .then(info => {
          setInviteInfo(info);
          if (info.name) setInviteName(info.name);
        })
        .catch((err: unknown) => {
          setInviteError(err instanceof Error ? err.message : 'Invitation link is invalid or expired.');
        })
        .finally(() => {
          setInviteVerifyLoading(false);
        });
    }
  }, []);

  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= requiredMinLen) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const beginMandatory2FASetup = async (user: User) => {
    setSetup2FAUser(user);
    setSetup2FAError(null);
    setSetup2FALoading(true);
    try {
      const data = await api.setup2FA();
      const qrDataUrl = await QRCode.toDataURL(data.otpauthUri, { width: 200, margin: 1 });
      setSetup2FAData({
        secret: data.secret,
        qrDataUrl,
        recoveryCodes: data.recoveryCodes
      });
    } catch (err: unknown) {
      setSetup2FAError(err instanceof Error ? err.message : 'Failed to initialize two-factor authentication.');
    } finally {
      setSetup2FALoading(false);
    }
  };

  const handleOpenForgot = async () => {
    setError(null);
    setForgotError(null);
    setForgotMessage(null);
    setScreen('forgot');
    try {
      const res = await api.getSmtpStatus();
      setSmtpConfigured(res.smtpConfigured);
    } catch {
      setSmtpConfigured(false);
    }
  };

  const handleSendForgotEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotError('Please enter your account email address.');
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    setForgotMessage(null);
    try {
      const res = await api.forgotPassword(forgotEmail);
      setSmtpConfigured(res.smtpConfigured);
      if (res.sent) {
        setForgotMessage(res.message);
      } else {
        setForgotError(res.error || res.message);
      }
    } catch (err: unknown) {
      setForgotError(err instanceof Error ? err.message : 'Could not send reset email.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetNewPassword.length < requiredMinLen) {
      setResetError(`Password must be at least ${requiredMinLen} characters long.`);
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }
    setResetLoading(true);
    setResetError(null);
    try {
      const res = await api.resetPassword(resetToken, resetNewPassword);
      setInfoBanner(res.message || 'Password reset successfully. You may now sign in.');
      window.history.replaceState({}, '', '/login');
      setScreen('signin');
    } catch (err: unknown) {
      setResetError(err instanceof Error ? err.message : 'Password reset failed.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      if (!res.user) {
        setError('Sign-in failed. Please try again.');
        setLoading(false);
        return;
      }

      if (res.user.mustChangePassword) {
        setPendingUser(res.user);
        setFounderName(res.user.name || '');
        setLoading(false);
        return;
      }

      if (res.requires2FASetup || res.user.requires2FASetup) {
        await beginMandatory2FASetup(res.user);
        setLoading(false);
        return;
      }

      onSignInSuccess(res.user);
      onNavigate('/portal');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Incorrect credentials. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = founderName.trim();
    if (!trimmedName) {
      setChangeError('Please enter your display name.');
      return;
    }
    if (newPassword.length < requiredMinLen) {
      setChangeError(`Password must be at least ${requiredMinLen} characters long.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangeError('Passwords do not match.');
      return;
    }

    setChangeLoading(true);
    setChangeError(null);

    try {
      const res = await api.changePassword(newPassword);
      let updatedUser: User | undefined =
        res.user || (pendingUser ? { ...pendingUser, mustChangePassword: false } : undefined);
      if (pendingUser && trimmedName !== (pendingUser.name || '').trim()) {
        const profRes = await api.updateProfile({ name: trimmedName });
        updatedUser = profRes.user;
      }
      if (pendingUser && updatedUser) {
        setPendingUser(null);
        if (updatedUser.requires2FASetup && !updatedUser.twoFactorEnabled) {
          await beginMandatory2FASetup(updatedUser);
          return;
        }
        onSignInSuccess(updatedUser);
        onNavigate('/portal');
      }
    } catch (err: unknown) {
      setChangeError(err instanceof Error ? err.message : 'Failed to update credentials.');
    } finally {
      setChangeLoading(false);
    }
  };

  const handleVerifyMandatory2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setup2FACode.trim()) {
      setSetup2FAError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setSetup2FALoading(true);
    setSetup2FAError(null);
    try {
      const res = await api.verify2FA(setup2FACode.trim());
      setSetup2FAUser(null);
      setSetup2FAData(null);
      onSignInSuccess(res.user);
      onNavigate('/portal');
    } catch (err: unknown) {
      setSetup2FAError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setSetup2FALoading(false);
    }
  };

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteToken) return;
    if (!inviteName.trim()) {
      setInviteError('Please enter your full name.');
      return;
    }
    if (invitePassword.length < requiredMinLen) {
      setInviteError(`Password must be at least ${requiredMinLen} characters long.`);
      return;
    }
    if (invitePassword !== inviteConfirmPassword) {
      setInviteError('Passwords do not match.');
      return;
    }

    setInviteSubmitting(true);
    setInviteError(null);
    try {
      const res = await api.acceptInvitation({
        token: inviteToken,
        name: inviteName.trim(),
        password: invitePassword
      });
      if (res.requires2FASetup || res.user.requires2FASetup) {
        await beginMandatory2FASetup(res.user);
        return;
      }
      onSignInSuccess(res.user);
      onNavigate('/portal');
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : 'Could not complete invitation.');
    } finally {
      setInviteSubmitting(false);
    }
  };

  const activePw =
    screen === 'accept-invite'
      ? invitePassword
      : screen === 'reset-password'
        ? resetNewPassword
        : newPassword;
  const strength = getPasswordStrength(activePw);

  return (
    <div className="min-h-screen bg-[#06302F] text-[#EDE9E0] flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-block w-20 h-20 rounded-full overflow-hidden shadow-2xl mb-4 ring-2 ring-[#25CDB6]/30 bg-[#06302F]">
            <img
              src={logoUrl || '/drawing1.png'}
              alt="Masters Of All Emblem"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#EDE9E0]">
            MoA Control Room
          </h1>
          <p className="mt-1 text-xs text-[#EDE9E0]/60">
            {screen === 'accept-invite'
              ? 'Accept invitation and activate your workspace credentials'
              : screen === 'reset-password'
                ? 'Choose a new strong password for your account'
                : screen === 'forgot'
                  ? 'Account credential recovery'
                  : 'Sign in to access your administrative workspace'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {pendingUser ? (
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
                    Set a new password (at least {requiredMinLen} characters) before entering the Control Room.
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
                    Your Display Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#EDE9E0]/40">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={founderName}
                      onChange={e => setFounderName(e.target.value)}
                      required
                      placeholder="Full name or handle"
                      className="w-full bg-[#06302F]/90 border border-[#EDE9E0]/20 rounded-xl pl-10 pr-4 py-3 text-sm text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6]"
                    />
                  </div>
                </div>

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
                      placeholder={`Minimum ${requiredMinLen} characters`}
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

                  <div className="mt-2 space-y-1.5">
                    <div className="flex gap-1 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-300 ${strength >= 1 ? 'w-1/4 bg-red-500' : ''}`} />
                      <div className={`h-full transition-all duration-300 ${strength >= 2 ? 'w-1/4 bg-amber-500' : ''}`} />
                      <div className={`h-full transition-all duration-300 ${strength >= 3 ? 'w-1/4 bg-[#17A491]' : ''}`} />
                      <div className={`h-full transition-all duration-300 ${strength >= 4 ? 'w-1/4 bg-[#25CDB6]' : ''}`} />
                    </div>
                    <p className="text-[10px] text-[#EDE9E0]/50">
                      Use at least {requiredMinLen} characters including uppercase letters, numbers, and symbols.
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
                      <span>Set Password &amp; Continue</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          ) : setup2FAUser ? (
            <motion.div
              key="mandatory-2fa-setup"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="bg-[#0A3D3C]/80 backdrop-blur-md border border-[#25CDB6]/30 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5"
            >
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#17A491]/15 border border-[#17A491]/30">
                <Shield className="w-5 h-5 text-[#25CDB6] shrink-0" />
                <div className="text-xs text-[#EDE9E0]/90">
                  <p className="font-bold text-[#EDE9E0]">Two-Factor Authentication Required</p>
                  <p className="text-[#EDE9E0]/70 mt-0.5">
                    Administrators must enroll an authenticator app before accessing the Control Room.
                  </p>
                </div>
              </div>

              {setup2FAError && (
                <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{setup2FAError}</span>
                </div>
              )}

              {setup2FAData && (
                <form onSubmit={handleVerifyMandatory2FA} className="space-y-4">
                  <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-[#06302F] border border-white/10">
                    <img
                      src={setup2FAData.qrDataUrl}
                      alt="TOTP Authenticator QR Code"
                      className="w-40 h-40 rounded-lg bg-white p-2"
                    />
                    <div className="text-center">
                      <span className="text-[10px] uppercase tracking-wider text-[#EDE9E0]/50 block">Manual Setup Key</span>
                      <code className="text-xs font-mono text-[#25CDB6] break-all select-all">{setup2FAData.secret}</code>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#06302F]/80 border border-amber-500/30 space-y-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-amber-300 font-bold block">
                      Save Recovery Codes (single-use)
                    </span>
                    <div className="grid grid-cols-2 gap-1 text-[11px] font-mono text-[#EDE9E0]/85 select-all">
                      {setup2FAData.recoveryCodes.map(rc => (
                        <span key={rc}>{rc}</span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[#EDE9E0]/70 font-semibold mb-2">
                      Verify 6-Digit Code
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={setup2FACode}
                      onChange={e => setSetup2FACode(e.target.value)}
                      required
                      placeholder="123456"
                      className="w-full bg-[#06302F]/90 border border-[#EDE9E0]/20 rounded-xl px-4 py-3 text-sm text-[#EDE9E0] font-mono tracking-widest focus:outline-none focus:border-[#25CDB6]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={setup2FALoading}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
                  >
                    {setup2FALoading ? 'Verifying...' : 'Enable 2FA & Enter Control Room'}
                  </button>
                </form>
              )}
            </motion.div>
          ) : screen === 'accept-invite' ? (
            <motion.div
              key="accept-invite-screen"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="bg-[#0A3D3C]/80 backdrop-blur-md border border-[#25CDB6]/30 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5"
            >
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#17A491]/15 border border-[#17A491]/30">
                <UserPlus className="w-5 h-5 text-[#25CDB6] shrink-0" />
                <div className="text-xs text-[#EDE9E0]/90">
                  <p className="font-bold text-[#EDE9E0]">Activate Account</p>
                  <p className="text-[#EDE9E0]/70 mt-0.5">
                    {inviteInfo
                      ? `Invited by ${inviteInfo.invitedByName} as ${inviteInfo.role.toUpperCase()}`
                      : 'Verifying your invitation link...'}
                  </p>
                </div>
              </div>

              {inviteVerifyLoading && (
                <div className="py-10 flex flex-col items-center gap-3 text-xs text-[#EDE9E0]/70">
                  <div className="w-6 h-6 border-2 border-[#25CDB6] border-t-transparent rounded-full animate-spin" />
                  <span>Verifying invitation link...</span>
                </div>
              )}

              {inviteError && !inviteInfo && !inviteVerifyLoading && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{inviteError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      window.history.replaceState({}, '', '/login');
                      setScreen('signin');
                    }}
                    className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer"
                  >
                    Return to Sign In
                  </button>
                </div>
              )}

              {inviteInfo && (
                <form onSubmit={handleAcceptInvite} className="space-y-4">
                  {inviteError && (
                    <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <span>{inviteError}</span>
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-[#06302F]/80 border border-white/10 text-xs flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#EDE9E0]/50 block">Account Email</span>
                      <span className="font-mono font-bold text-[#25CDB6]">{inviteInfo.email}</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#25CDB6]/15 text-[#25CDB6] border border-[#25CDB6]/30">
                      {inviteInfo.role}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[#EDE9E0]/70 font-semibold mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#EDE9E0]/40">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={inviteName}
                        onChange={e => setInviteName(e.target.value)}
                        placeholder="Full name"
                        className="w-full bg-[#06302F]/90 border border-[#EDE9E0]/20 rounded-xl pl-10 pr-4 py-3 text-sm text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[#EDE9E0]/70 font-semibold mb-2">
                      Create Password
                    </label>
                    <input
                      type="password"
                      required
                      value={invitePassword}
                      onChange={e => setInvitePassword(e.target.value)}
                      placeholder={`Minimum ${requiredMinLen} characters`}
                      className="w-full bg-[#06302F]/90 border border-[#EDE9E0]/20 rounded-xl px-4 py-3 text-sm text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6]"
                    />
                    <div className="flex gap-1 h-1 w-full bg-white/10 rounded-full overflow-hidden mt-2">
                      <div className={`h-full transition-all duration-300 ${strength >= 1 ? 'w-1/4 bg-red-500' : ''}`} />
                      <div className={`h-full transition-all duration-300 ${strength >= 2 ? 'w-1/4 bg-amber-500' : ''}`} />
                      <div className={`h-full transition-all duration-300 ${strength >= 3 ? 'w-1/4 bg-[#17A491]' : ''}`} />
                      <div className={`h-full transition-all duration-300 ${strength >= 4 ? 'w-1/4 bg-[#25CDB6]' : ''}`} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[#EDE9E0]/70 font-semibold mb-2">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      required
                      value={inviteConfirmPassword}
                      onChange={e => setInviteConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full bg-[#06302F]/90 border border-[#EDE9E0]/20 rounded-xl px-4 py-3 text-sm text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={inviteSubmitting}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
                  >
                    {inviteSubmitting ? 'Activating Account...' : 'Activate Account & Sign In'}
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        window.history.replaceState({}, '', '/login');
                        setScreen('signin');
                      }}
                      className="text-xs text-[#EDE9E0]/60 hover:text-white cursor-pointer"
                    >
                      Already have an account? Sign in
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          ) : screen === 'reset-password' ? (
            <motion.div
              key="reset-password-screen"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="bg-[#0A3D3C]/80 backdrop-blur-md border border-[#25CDB6]/30 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5"
            >
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#17A491]/15 border border-[#17A491]/30">
                <KeyRound className="w-5 h-5 text-[#25CDB6] shrink-0" />
                <div className="text-xs text-[#EDE9E0]/90">
                  <p className="font-bold text-[#EDE9E0]">Reset Password</p>
                  <p className="text-[#EDE9E0]/70 mt-0.5">
                    Enter a new password (at least {requiredMinLen} characters).
                  </p>
                </div>
              </div>

              {resetError && (
                <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{resetError}</span>
                </div>
              )}

              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#EDE9E0]/70 font-semibold mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={resetNewPassword}
                    onChange={e => setResetNewPassword(e.target.value)}
                    placeholder={`Minimum ${requiredMinLen} characters`}
                    className="w-full bg-[#06302F]/90 border border-[#EDE9E0]/20 rounded-xl px-4 py-3 text-sm text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6]"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#EDE9E0]/70 font-semibold mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={resetConfirmPassword}
                    onChange={e => setResetConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full bg-[#06302F]/90 border border-[#EDE9E0]/20 rounded-xl px-4 py-3 text-sm text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] font-semibold text-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {resetLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            </motion.div>
          ) : screen === 'forgot' ? (
            <motion.div
              key="forgot-screen"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="bg-[#0A3D3C]/70 backdrop-blur-md border border-[#EDE9E0]/15 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5"
            >
              {smtpConfigured === null ? (
                <div className="py-8 text-center text-xs text-[#EDE9E0]/70">Checking recovery availability...</div>
              ) : smtpConfigured ? (
                <form onSubmit={handleSendForgotEmail} className="space-y-4">
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#17A491]/15 border border-[#17A491]/30">
                    <Mail className="w-5 h-5 text-[#25CDB6] shrink-0" />
                    <div className="text-xs text-[#EDE9E0]/90">
                      <p className="font-bold text-[#EDE9E0]">Email Password Reset</p>
                      <p className="text-[#EDE9E0]/70 mt-0.5">
                        Enter your account email to receive a single-use password reset link.
                      </p>
                    </div>
                  </div>

                  {forgotError && (
                    <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <span>{forgotError}</span>
                    </div>
                  )}

                  {forgotMessage && (
                    <div className="p-3.5 rounded-xl bg-[#17A491]/15 border border-[#25CDB6]/40 text-[#EDE9E0] text-xs flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#25CDB6] shrink-0 mt-0.5" />
                      <span>{forgotMessage}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[#EDE9E0]/70 font-semibold mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      placeholder="name@mastersofall.org"
                      className="w-full bg-[#06302F]/90 border border-[#EDE9E0]/20 rounded-xl px-4 py-3 text-sm text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full py-3 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] font-bold text-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {forgotLoading ? 'Sending Reset Link...' : 'Send Reset Link'}
                  </button>
                </form>
              ) : (
                <>
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <KeyRound className="w-5 h-5 text-amber-300 shrink-0" />
                    <div className="text-xs text-[#EDE9E0]/90">
                      <p className="font-bold text-[#EDE9E0]">Contact an Administrator</p>
                      <p className="text-[#EDE9E0]/70 mt-0.5">
                        Automated email recovery is not configured on this server. Contact an administrator to reset your password.
                      </p>
                    </div>
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setScreen('signin');
                }}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-[#EDE9E0] font-semibold text-xs transition-colors cursor-pointer"
              >
                &larr; Return to Sign In
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="signin-form"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="bg-[#0A3D3C]/70 backdrop-blur-md border border-[#EDE9E0]/15 rounded-2xl p-6 sm:p-8 shadow-2xl"
            >
              {infoBanner && (
                <div className="mb-5 p-3.5 rounded-xl bg-[#17A491]/15 border border-[#25CDB6]/40 text-[#EDE9E0] text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#25CDB6] shrink-0 mt-0.5" />
                  <span>{infoBanner}</span>
                </div>
              )}

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
                      onClick={handleOpenForgot}
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
                      placeholder="6-digit TOTP or recovery code"
                      className="w-full bg-[#06302F]/90 border border-[#25CDB6]/40 rounded-xl px-4 py-3 text-sm text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6]"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
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
