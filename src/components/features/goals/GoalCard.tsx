import { Goal, Progress, User } from '@/core/domain/schema';
import { services } from '@/services/container';
import { Check, Flame, Users, User as UserIcon, Minus, Plus } from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

interface GoalCardProps {
    goal: Goal;
    currentUser: User;
    partnerUser: User | null;
    todayProgress: Progress[];
    onTrack: () => void;
    onEdit: (goal: Goal) => void;
}

export function GoalCard({ goal, currentUser, partnerUser, todayProgress, onTrack, onEdit }: GoalCardProps) {
    const t = useTranslations('GoalCard');
    const [streak, setStreak] = useState(0);

    // Find my progress
    const myProgress = todayProgress.find(p => p.recordedByUserId === currentUser.id);
    // Find partner progress (if partner exists)
    const partnerProgress = partnerUser ? todayProgress.find(p => p.recordedByUserId === partnerUser.id) : null;

    const isMyCompleted = myProgress?.status === 'completed';
    const isPartnerCompleted = partnerProgress?.status === 'completed';
    const currentVal = myProgress?.value || 0;

    // For Couple Goals: Both must complete to be "fully done" visually
    const isCouple = goal.scope === 'couple';
    const isFullyCompleted = isCouple ? (isMyCompleted && isPartnerCompleted) : isMyCompleted;

    useEffect(() => {
        calculateStreak();
    }, [goal.id, currentUser.id]);

    const calculateStreak = async () => {
        // Simple streak calculation: fetch last 30 days and count backwards
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);

        try {
            const history = await services.progress.getHistoryByGoal(goal.id, start.toISOString().split('T')[0], end.toISOString().split('T')[0]);
            // Filter my progress only
            const myHistory = history.filter(p => p.recordedByUserId === currentUser.id);

            let currentStreak = 0;
            // Check yesterday, then day before...

            let dateCursor = new Date();
            const todayStr = dateCursor.toISOString().split('T')[0];

            // If today is completed, streak starts at 1.
            const todayDone = myHistory.find(p => p.dateKey === todayStr && p.status === 'completed');
            if (todayDone) currentStreak++;

            // Go back
            while (true) {
                dateCursor.setDate(dateCursor.getDate() - 1);
                const dateKey = dateCursor.toISOString().split('T')[0];
                const done = myHistory.find(p => p.dateKey === dateKey && p.status === 'completed');
                if (done) {
                    currentStreak++;
                } else {
                    break;
                }
            }
            setStreak(currentStreak);
        } catch (e) {
            console.error('Failed to calc streak', e);
        }
    };

    const [localValue, setLocalValue] = useState(myProgress?.value || 0);
    const lastInteractionRef = useRef(0);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Sync local state with props, but ignore if user recently interacted (prevents jitter/reset)
    useEffect(() => {
        const timeSinceInteraction = Date.now() - lastInteractionRef.current;
        if (timeSinceInteraction > 2000) {
            setLocalValue(myProgress?.value || 0);
        }
    }, [myProgress?.value]);

    const handleTrack = async (overrideValue?: number) => {
        lastInteractionRef.current = Date.now();
        let newValue = 0;

        if (overrideValue !== undefined) {
            newValue = overrideValue;
        } else {
            if (goal.trackingType === 'boolean') {
                newValue = isMyCompleted ? 0 : 1;
            } else {
                newValue = localValue + 1;
            }
        }

        // Prevent negative values
        if (newValue < 0) newValue = 0;

        // Optimistic Update
        setLocalValue(newValue);

        // Clear existing timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Debounce persistence (500ms)
        debounceTimerRef.current = setTimeout(async () => {
            try {
                await services.trackProgress.execute({
                    goalId: goal.id,
                    userId: currentUser.id,
                    dateKey: new Date().toISOString().split('T')[0],
                    value: newValue,
                });

                // Trigger confetti if completion happened (and wasn't already done)
                const isNowDone = goal.trackingType === 'boolean' ? newValue > 0 : newValue >= goal.targetValue;
                if (isNowDone && !isMyCompleted) {
                    triggerConfetti();
                }

                onTrack(); // Refresh parent
                calculateStreak(); // Refresh streak
            } catch (e) {
                console.error('Tracking failed', e);
            }
        }, 500);
    };

    const triggerConfetti = () => {
        const colors = isCouple ? ['#ff007f', '#ffffff'] : ['#3b82f6', '#ffffff'];
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: colors
        });
    };

    const getInitials = (user: User) => (user.displayName || user.fullName || '?').charAt(0).toUpperCase();

    // Card Styles
    const cardBaseClasses = "relative overflow-hidden rounded-3xl p-6 mb-4 transition-all duration-300 shadow-sm hover:shadow-md border border-gray-100 bg-white";
    const coupleClasses = "bg-gradient-to-br from-white to-pink-50/50 border-pink-100/50";

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${cardBaseClasses} ${isCouple ? coupleClasses : ''}`}
        >
            <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                    {/* Header: Frequency + Scope */}
                    <div className="flex items-center gap-2 mb-2">
                        {isCouple && (
                            <div className="flex items-center gap-1 bg-pink-100 text-pink-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full tracking-wider">
                                <Users size={10} />
                                <span>{t('together')}</span>
                            </div>
                        )}
                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                            {t(goal.frequency?.toLowerCase() || 'daily')}
                        </span>
                        {/* Streak Badge */}
                        {streak > 0 && (
                            <div className="flex items-center gap-1 text-orange-500 text-[10px] font-bold px-2 py-0.5 bg-orange-50 rounded-full">
                                <Flame size={10} fill="currentColor" />
                                <span>{t('streak', { count: streak })}</span>
                            </div>
                        )}
                    </div>

                    {/* Title, Description & Edit */}
                    <div className="group relative">
                        <div className="absolute right-0 top-0">
                            <button
                                onClick={(e) => { e.stopPropagation(); onEdit(goal); }}
                                className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition"
                                title="Edit Goal"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                            </button>
                        </div>

                        <h3 className={`font-bold text-xl leading-tight mb-1 text-gray-800 pr-8 ${isFullyCompleted ? 'text-gray-400 line-through decoration-2 decoration-gray-200' : ''}`}>
                            {goal.title}
                        </h3>
                    </div>
                    {goal.description && (
                        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{goal.description}</p>
                    )}

                    {/* Status Text (Who Completed) */}
                    {isCouple && !isFullyCompleted && (isMyCompleted || isPartnerCompleted) && (
                        <div className="flex items-center gap-2 mt-2 text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded-lg w-fit">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            {isMyCompleted ? t('youCompleted') : t('partnerCompleted', { name: partnerUser?.displayName || 'Partner' })}
                        </div>
                    )}

                    {/* Count Status with Controls */}
                    {goal.trackingType === 'count' && (
                        <div className="flex items-center gap-3 mt-3">
                            <div className="flex items-center gap-1 text-sm font-medium text-gray-600 bg-gray-50 px-3 py-1 rounded-xl">
                                <span className={localValue > 0 ? 'text-black' : ''}>{localValue}</span>
                                <span className="text-gray-300">/</span>
                                <span>{goal.targetValue}</span>
                            </div>

                            {/* Decrement Button */}
                            <button
                                onClick={(e) => { e.stopPropagation(); handleTrack(Math.max(0, localValue - 1)); }}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 active:scale-95 transition"
                                disabled={localValue <= 0}
                            >
                                <Minus size={16} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Left Side: Interaction */}
                <div className="flex flex-col items-center gap-3">
                    {/* Main Action Button */}
                    <button
                        onClick={() => handleTrack()}
                        className={`
                            w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm
                            ${isMyCompleted
                                ? (isCouple ? 'bg-pink-500 text-white scale-100 shadow-pink-200' : 'bg-black text-white scale-100 shadow-gray-200')
                                : 'bg-gray-50 border-2 border-gray-100 text-gray-300 hover:border-gray-200 hover:text-gray-400 hover:scale-105'}
                        `}
                    >
                        <AnimatePresence mode="wait">
                            {isMyCompleted ? (
                                <motion.div
                                    key="check"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                >
                                    <Check size={32} strokeWidth={3} />
                                </motion.div>
                            ) : (
                                goal.trackingType === 'count' ? <div className="font-bold text-black text-xl">{localValue > 0 ? '+' : '+'}</div> : <div className="w-6 h-6 rounded-full border-2 border-gray-200"></div>
                            )}
                        </AnimatePresence>
                    </button>

                    {/* Couple Avatars Status */}
                    {isCouple && partnerUser && (
                        <div className="flex -space-x-2">
                            {/* Me */}
                            <div className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold ${isMyCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                {isMyCompleted ? <Check size={12} /> : getInitials(currentUser)}
                            </div>
                            {/* Partner */}
                            <div className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold ${isPartnerCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                {isPartnerCompleted ? <Check size={12} /> : getInitials(partnerUser)}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Progress Bar for Count Types */}
            {goal.trackingType === 'count' && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-100/50">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(Math.min(localValue, goal.targetValue) / goal.targetValue) * 100}%` }}
                        className={`h-full ${isCouple ? 'bg-gradient-to-r from-purple-400 to-pink-500' : 'bg-black'}`}
                    />
                </div>
            )}
        </motion.div>
    );
}
