import { useState, FormEvent } from 'react';
import { useNavigate }         from 'react-router-dom';
import { AppLogo }             from '@/components/AppLogo';
import { useAuth }             from '@/contexts/AuthContext';
import { Eye, EyeOff }         from 'lucide-react';

export function Auth() {
    const { login, signup } = useAuth();
    const navigate          = useNavigate();

    const [mode,     setMode]     = useState<'login' | 'signup'>('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirm,  setConfirm]  = useState('');
    const [showPw,   setShowPw]   = useState(false);
    const [error,    setError]    = useState('');
    const [busy,     setBusy]     = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError('');
        if (mode === 'signup' && password !== confirm) {
            setError('Passwords do not match.');
            return;
        }
        setBusy(true);
        try {
            if (mode === 'login') await login(username, password);
            else                  await signup(username, password);
            navigate('/');
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="min-h-screen bg-ep-bg flex items-center justify-center p-4 relative overflow-hidden">
            {/* Ambient glows */}
            <div className="auth-glow w-96 h-96 bg-ep-rose opacity-10 -top-32 -left-32 absolute" />
            <div className="auth-glow w-80 h-80 bg-ep-plum opacity-10 bottom-0 right-0 absolute" />
            <div className="auth-glow w-64 h-64 bg-ep-champagne opacity-5 top-1/2 left-1/2 absolute -translate-x-1/2 -translate-y-1/2" />

            <div className="relative z-10 w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <AppLogo size="lg" />
                    <p className="mt-3 text-ep-text-dim text-sm font-body tracking-wide">
                        Your manuscript. Your world. Your story.
                    </p>
                </div>

                {/* Card */}
                <div className="bg-ep-surface border border-ep-border rounded-2xl p-8 shadow-ep-glow">
                    {/* Mode tabs */}
                    <div className="flex rounded-xl bg-ep-bg border border-ep-border p-1 mb-7">
                        {(['login', 'signup'] as const).map(m => (
                            <button
                                key={m}
                                onClick={() => { setMode(m); setError(''); }}
                                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                                    mode === m
                                        ? 'bg-ep-surface-2 text-ep-rose shadow'
                                        : 'text-ep-muted hover:text-ep-text'
                                }`}
                            >
                                {m === 'login' ? 'Sign In' : 'Create Account'}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-ep-text-dim uppercase tracking-widest mb-1.5">
                                Username
                            </label>
                            <input
                                className="input-base"
                                type="text"
                                autoComplete="username"
                                placeholder="your_pen_name"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-ep-text-dim uppercase tracking-widest mb-1.5">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    className="input-base pr-10"
                                    type={showPw ? 'text' : 'password'}
                                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                                    placeholder="min. 8 characters"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ep-muted hover:text-ep-text"
                                    tabIndex={-1}
                                >
                                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {mode === 'signup' && (
                            <div>
                                <label className="block text-xs font-semibold text-ep-text-dim uppercase tracking-widest mb-1.5">
                                    Confirm Password
                                </label>
                                <input
                                    className="input-base"
                                    type={showPw ? 'text' : 'password'}
                                    autoComplete="new-password"
                                    placeholder="repeat password"
                                    value={confirm}
                                    onChange={e => setConfirm(e.target.value)}
                                    required
                                />
                            </div>
                        )}

                        {error && (
                            <p className="text-ep-danger text-sm bg-ep-danger/10 border border-ep-danger/25 rounded-lg px-3 py-2">
                                {error}
                            </p>
                        )}

                        <button type="submit" className="btn-primary w-full mt-2" disabled={busy}>
                            {busy
                                ? 'One moment…'
                                : mode === 'login' ? 'Enter EPITOME' : 'Begin Your Story'}
                        </button>
                    </form>

                    {/* Ornamental divider */}
                    <div className="mt-6 flex items-center gap-3">
                        <div className="flex-1 h-px bg-ep-border" />
                        <span className="text-ep-muted text-xs">✦</span>
                        <div className="flex-1 h-px bg-ep-border" />
                    </div>

                    <p className="text-center text-ep-muted text-xs mt-4">
                        {mode === 'login'
                            ? "New here? "
                            : "Already a member? "}
                        <button
                            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
                            className="text-ep-rose hover:text-ep-champagne transition-colors underline-offset-2 underline"
                        >
                            {mode === 'login' ? 'Create an account' : 'Sign in'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
