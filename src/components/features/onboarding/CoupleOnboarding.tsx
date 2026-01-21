import { useState } from 'react';
import { services } from '@/services/container';
import { Couple, User } from '@/core/domain/schema';
import { useTranslations } from 'next-intl';

import { v4 as uuidv4 } from 'uuid';

interface CoupleOnboardingProps {
    currentUser: User;
    onComplete: (couple: Couple) => void;
}

export function CoupleOnboarding({ currentUser, onComplete }: CoupleOnboardingProps) {
    const t = useTranslations('Onboarding');
    const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
    const [inviteCode, setInviteCode] = useState('');
    // ... existing state ...
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // New Couple Creation Logic
    const handleCreate = async () => {
        setIsSubmitting(true);
        try {
            // ... Logic ...
            const id = uuidv4();
            const code = Math.random().toString(36).substring(2, 8).toUpperCase();

            const newCouple: Couple = {
                id: id as any,
                userAId: currentUser.id,
                userBId: null,
                status: 'pending',
                code,
                createdAt: Date.now()
            };

            await services.couples.create(newCouple);
            const updatedUser = { ...currentUser, coupleId: newCouple.id };
            await services.users.create(updatedUser);
            await services.syncEngine.enqueueAction('JOIN_COUPLE', newCouple);
            await services.syncEngine.enqueueAction('CREATE_USER_PROFILE', updatedUser);

            onComplete(newCouple);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            const couple = await services.joinCouple.execute(currentUser.id, inviteCode);
            onComplete(couple);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (mode === 'select') {
        return (
            <div className="p-6 flex flex-col justify-center h-full space-y-4">
                <h2 className="text-xl font-bold mb-4">{t('connectPartner')}</h2>

                <button
                    onClick={() => handleCreate()}
                    className="w-full bg-indigo-600 text-white py-4 rounded-xl font-semibold shadow-md"
                >
                    {t('createInvite')}
                </button>

                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-gray-200"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-400">{t('or')}</span>
                    <div className="flex-grow border-t border-gray-200"></div>
                </div>

                <button
                    onClick={() => setMode('join')}
                    className="w-full bg-white border-2 border-indigo-100 text-indigo-600 py-4 rounded-xl font-semibold hover:bg-indigo-50"
                >
                    {t('haveCode')}
                </button>
            </div>
        );
    }

    if (mode === 'join') {
        return (
            <div className="p-6">
                <button onClick={() => setMode('select')} className="text-sm text-gray-500 mb-4">← {t('back')}</button>
                <h2 className="text-xl font-bold mb-4">{t('enterCode')}</h2>

                <form onSubmit={handleJoin} className="space-y-4">
                    <input
                        type="text"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                        placeholder="CODE123"
                        className="w-full text-center text-3xl tracking-widest p-4 border-2 border-neutral-200 rounded-xl uppercase font-mono focus:border-indigo-500 outline-none"
                    />
                    {error && <p className="text-red-500 text-center">{error}</p>}
                    <button
                        type="submit"
                        className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
                        disabled={!inviteCode || isSubmitting}
                    >
                        {isSubmitting ? t('joining') : t('join')}
                    </button>
                </form>
            </div>
        );
    }

    return null;
}
