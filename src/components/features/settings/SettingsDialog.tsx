import { useState, useRef } from 'react';
import { User } from '@/core/domain/schema';
import { Camera, X, LogOut, Loader, User as UserIcon } from 'lucide-react';
import { supabase } from '@/services/db/supabase';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';

interface SettingsDialogProps {
    currentUser: User;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedUser: User) => Promise<void>;
    onLogout: () => void;
}

export function SettingsDialog({ currentUser, isOpen, onClose, onSave, onLogout }: SettingsDialogProps) {
    const t = useTranslations('Settings');
    const tCommon = useTranslations('Common');
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();

    const [fullName, setFullName] = useState(currentUser.fullName);
    const [displayName, setDisplayName] = useState(currentUser.displayName || '');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(currentUser.avatarUrl || null);

    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const uploadAvatar = async (userId: string): Promise<string | null> => {
        if (!avatarFile) return currentUser.avatarUrl || null;
        try {
            const fileExt = avatarFile.name.split('.').pop();
            const fileName = `${userId}-${Date.now()}.${fileExt}`; // New filename to burst cache
            const { error } = await supabase.storage.from('avatars').upload(fileName, avatarFile, { upsert: true });
            if (error) throw error;
            const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
            return data.publicUrl;
        } catch (e) {
            console.error('Upload failed', e);
            return null;
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            let userAvatarUrl = currentUser.avatarUrl;
            if (avatarFile) {
                const url = await uploadAvatar(currentUser.id);
                if (url) userAvatarUrl = url;
            }

            const updatedUser: User = {
                ...currentUser,
                fullName,
                displayName: displayName || null,
                avatarUrl: userAvatarUrl,
            };

            await onSave(updatedUser);
            onClose();
        } catch (e) {
            console.error('Save settings failed', e);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <h2 className="text-lg font-bold text-gray-800">{t('title')}</h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                    <form onSubmit={handleSave} className="space-y-6">
                        {/* Avatar */}
                        <div className="flex flex-col items-center">
                            <div
                                className="relative w-28 h-28 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer overflow-hidden border-2 border-dashed border-gray-300 hover:border-blue-500 transition group"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {avatarPreview ? (
                                    <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <UserIcon size={40} className="text-gray-300" />
                                )}
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                    <Camera className="text-white" size={24} />
                                </div>
                            </div>
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-2 text-sm text-blue-600 font-medium hover:underline">
                                {t('editPhoto')}
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                        </div>

                        {/* Fields */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('fullName')}</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('displayName')}</label>
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition"
                                    placeholder="Nickname"
                                />
                            </div>

                            {/* Language Switcher */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('language')}</label>
                                <select
                                    value={locale}
                                    onChange={(e) => {
                                        router.replace(pathname, { locale: e.target.value as any });
                                    }}
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition cursor-pointer"
                                >
                                    <option value="en">English</option>
                                    <option value="es">Español</option>
                                    <option value="it">Italiano</option>
                                </select>
                            </div>
                        </div>

                        {/* Save Button */}
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="w-full bg-black text-white py-3 rounded-xl font-semibold hover:opacity-90 transition flex items-center justify-center gap-2"
                        >
                            {isSaving ? <Loader className="animate-spin" size={20} /> : tCommon('save')}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <button
                            onClick={onLogout}
                            className="w-full flex items-center justify-center gap-2 text-red-500 font-medium py-3 hover:bg-red-50 rounded-xl transition"
                        >
                            <LogOut size={18} />
                            {t('logout')}
                        </button>
                        <p className="text-center text-xs text-gray-300 mt-4">v0.1.0 (Beta)</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
