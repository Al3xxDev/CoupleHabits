'use client';
import { useState, useRef } from 'react';
import { services } from '@/services/container';
import { User, UserSchema } from '@/core/domain/schema';
import { supabase } from '@/services/db/supabase';
import { v4 as uuidv4 } from 'uuid';
import { Camera, User as UserIcon } from 'lucide-react';
import { LoginForm } from '../auth/LoginForm';
import { useTranslations } from 'next-intl';

interface UserOnboardingProps {
    onComplete: (user: User) => void;
}

export function UserOnboarding({ onComplete }: UserOnboardingProps) {
    const [view, setView] = useState<'signup' | 'login'>('signup');

    // ... existing state ...
    const [fullName, setFullName] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [gender, setGender] = useState<string>('');
    const [dateOfBirth, setDateOfBirth] = useState('');

    // ... existing avatar state ...
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

    // ... existing UI state ...
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ... handleFileChange ...
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    // ... uploadAvatar ...
    const uploadAvatar = async (userId: string): Promise<string | null> => {
        if (!avatarFile) return null;
        try {
            const fileExt = avatarFile.name.split('.').pop();
            const fileName = `${userId}.${fileExt}`;
            const { error } = await supabase.storage.from('avatars').upload(fileName, avatarFile, { upsert: true });
            if (error) return null;
            const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
            return data.publicUrl;
        } catch { return null; }
    };

    // ... handleSubmit ...
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        try {
            const id = uuidv4();
            let avatarUrl = null;
            if (avatarFile) avatarUrl = await uploadAvatar(id);

            const newUser: User = {
                id: id as any,
                fullName,
                displayName: displayName || null,
                email,
                avatarUrl,
                gender: gender ? (gender as any) : null,
                dateOfBirth: dateOfBirth || null,
                onboardingCompleted: true,
                coupleId: null,
                createdAt: Date.now(),
            };

            UserSchema.parse(newUser);
            await services.users.create(newUser);
            // await services.syncEngine.enqueueAction('CREATE_USER_PROFILE', newUser); // Replaced by immediate sync or careful queue
            // Note: Ideally we check if email exists remotely first to prevent duplicates via Sync?
            // Since we have an API route now, we "could" use it, but for now stick to SyncEngine push.
            // But let's check duplicates? The SyncEngine might fail if unique constrained.

            await services.syncEngine.enqueueAction('CREATE_USER_PROFILE', newUser);
            onComplete(newUser);
        } catch (err: any) {
            setError(err.message || 'Failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const t = useTranslations('Onboarding');

    // ... existing variable declarations ...

    if (view === 'login') {
        return (
            <LoginForm
                onLoginSuccess={onComplete}
                onCancel={() => setView('signup')}
            />
        );
    }

    return (
        <div className="p-6 flex flex-col justify-center h-full max-w-md mx-auto w-full overflow-y-auto">
            <h1 className="text-2xl font-bold mb-2">{t('welcome')}</h1>
            <p className="text-neutral-500 mb-8">{t('subtitle')}</p>

            <form onSubmit={handleSubmit} className="space-y-5 pb-10">
                {/* ... Avatar code ... */}
                <div className="flex flex-col items-center mb-6">
                    <div
                        className="relative w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer overflow-hidden border-2 border-dashed border-gray-300 hover:border-blue-500 transition group"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {avatarPreview ? (
                            <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <div className="text-gray-400 group-hover:text-blue-500">
                                {fullName ? (
                                    <span className="text-3xl font-bold text-gray-300 group-hover:text-blue-300">{fullName.charAt(0).toUpperCase()}</span>
                                ) : (
                                    <UserIcon size={32} />
                                )}
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                            <Camera className="text-white" size={24} />
                        </div>
                    </div>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-2 text-sm text-blue-600 font-medium">
                        {avatarPreview ? t('changePhoto') : t('addPhoto')}
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                </div>

                {/* ... Inputs ... */}
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">{t('fullName')}</label>
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full p-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Alex Johnson" required disabled={isSubmitting} />
                </div>

                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">{t('displayName')}</label>
                    <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full p-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Alex" disabled={isSubmitting} />
                </div>

                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">{t('email')}</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="you@example.com" required disabled={isSubmitting} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">{t('gender')}</label>
                        <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full p-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white" disabled={isSubmitting}>
                            <option value="">{t('select')}</option>
                            <option value="female">{t('female')}</option>
                            <option value="male">{t('male')}</option>
                            <option value="non_binary">{t('non_binary')}</option>
                            <option value="prefer_not_to_say">{t('prefer_not_to_say')}</option>
                            <option value="other">{t('other')}</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">{t('dob')}</label>
                        <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="w-full p-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" disabled={isSubmitting} />
                    </div>
                </div>

                {error && <p className="text-red-500 text-sm">{error}</p>}

                <button
                    type="submit"
                    className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 mt-4"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? t('creating') : t('createProfile')}
                </button>
            </form>

            <div className="text-center pb-8">
                <p className="text-sm text-gray-500">
                    {t('haveAccount')} <button onClick={() => setView('login')} className="text-blue-600 font-semibold hover:underline">{t('login')}</button>
                </p>
            </div>
        </div>
    );
}
