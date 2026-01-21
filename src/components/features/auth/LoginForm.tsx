import { useState } from 'react';
import { Mail, KeyRound, ArrowRight, Loader } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface LoginFormProps {
    onLoginSuccess: (user: any) => void;
    onCancel: () => void;
}

export function LoginForm({ onLoginSuccess, onCancel }: LoginFormProps) {
    const t = useTranslations('Auth');
    const [step, setStep] = useState<'email' | 'code'>('email');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to send code');

            setStep('code');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Invalid code');

            // Success!
            onLoginSuccess(data.user);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative overflow-hidden">
                <button onClick={onCancel} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    ✕
                </button>

                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">{t('loginTitle')}</h2>
                    <p className="text-gray-500 text-sm">{t('loginSubtitle')}</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm mb-4 text-center">
                        {error}
                    </div>
                )}

                {step === 'email' ? (
                    <form onSubmit={handleSendOtp} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('emailLabel')}</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition"
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-black text-white py-3 rounded-xl font-semibold hover:opacity-90 transition flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader className="animate-spin" size={20} /> : <>{t('continue')} <ArrowRight size={20} /></>}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('codeLabel')}</label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-3 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    className="w-full pl-10 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition tracking-widest text-lg font-mono"
                                    placeholder="123456"
                                    required
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-2 text-center">
                                {t('sentTo', { email })} <button type="button" onClick={() => setStep('email')} className="text-blue-500 hover:underline">{t('change')}</button>
                            </p>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-black text-white py-3 rounded-xl font-semibold hover:opacity-90 transition flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader className="animate-spin" size={20} /> : t('verify')}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
