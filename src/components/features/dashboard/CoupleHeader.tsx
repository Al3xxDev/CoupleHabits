import { User, Couple } from '@/core/domain/schema';
import { Settings, Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface CoupleHeaderProps {
    currentUser: User;
    partnerUser: User | null;
    couple: Couple;
    onOpenSettings: () => void;
}

export function CoupleHeader({ currentUser, partnerUser, couple, onOpenSettings }: CoupleHeaderProps) {
    const t = useTranslations('Dashboard');

    const getDaysTogether = () => {
        if (!couple.createdAt) return 0;
        const diff = Date.now() - couple.createdAt;
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    };

    const days = getDaysTogether();

    return (
        <div className="flex flex-col items-center mb-8 relative">
            <button
                onClick={onOpenSettings}
                className="absolute top-0 right-0 p-2 text-gray-400 hover:text-gray-600 transition"
            >
                <Settings size={20} />
            </button>

            <div className="flex items-center justify-center space-x-[-15px] mb-3">
                {/* ID Card 1 (Me) */}
                <div className="relative group">
                    <div className="w-16 h-16 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gray-100 z-10 relative">
                        {currentUser.avatarUrl ? (
                            <img src={currentUser.avatarUrl} alt="Me" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl font-bold text-gray-400">
                                {currentUser.fullName?.charAt(0).toUpperCase() || '?'}
                            </div>
                        )}
                    </div>
                    {/* Tooltip/Name could go here or below */}
                </div>

                {/* Heart Icon/Badge in middle */}
                <div className="w-8 h-8 rounded-full bg-white shadow-md z-20 flex items-center justify-center text-pink-500 relative -mt-6 border-2 border-white">
                    <Heart size={14} fill="currentColor" />
                </div>

                {/* ID Card 2 (Partner) */}
                <div className="relative group">
                    <div className="w-16 h-16 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gray-100 z-0 relative">
                        {partnerUser ? (
                            partnerUser.avatarUrl ? (
                                <img src={partnerUser.avatarUrl} alt="Partner" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-xl font-bold text-gray-400">
                                    {partnerUser.fullName?.charAt(0).toUpperCase() || '?'}
                                </div>
                            )
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-50 border-dashed border-2 border-gray-200">
                                <span className="text-xs text-gray-300">?</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="text-center">
                {/* Names */}
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600 font-medium tracking-wide">
                    <span>{currentUser.displayName || currentUser.fullName?.split(' ')[0]}</span>
                    <span className="text-gray-300">&</span>
                    <span>{partnerUser ? (partnerUser.displayName || partnerUser.fullName?.split(' ')[0]) : t('waitingForPartner')}</span>
                </div>

                {/* Days Counter */}
                <div className="mt-1">
                    <span className="text-xs font-bold text-pink-500 bg-pink-50 px-3 py-1 rounded-full uppercase tracking-wider">
                        {t('daysTogether', { count: days })}
                    </span>
                </div>
            </div>
        </div>
    );
}
