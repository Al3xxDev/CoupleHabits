'use client';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { services } from '@/services/container';
import { User, Couple, Goal } from '@/core/domain/schema';
import { X, User as UserIcon, Users, CheckCircle, Hash, Calendar, Trash2 } from 'lucide-react';

interface GoalFormProps {
    currentUser: User;
    currentCouple: Couple;
    initialGoal?: Goal; // If present, we are editing
    onClose: () => void;
    onSuccess: () => void;
}

export function GoalForm({ currentUser, currentCouple, initialGoal, onClose, onSuccess }: GoalFormProps) {
    const t = useTranslations('GoalForm');
    const isEditing = !!initialGoal;

    const [title, setTitle] = useState(initialGoal?.title || '');
    const [description, setDescription] = useState(initialGoal?.description || '');
    const [scope, setScope] = useState<'personal' | 'couple'>(initialGoal?.scope || 'personal');
    const [trackingType, setTrackingType] = useState<'boolean' | 'count'>(initialGoal?.trackingType || 'boolean');
    const [frequency, setFrequency] = useState(initialGoal?.frequency || 'daily');
    const [targetValue, setTargetValue] = useState(initialGoal?.targetValue || 1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (initialGoal) {
            setTitle(initialGoal.title);
            setDescription(initialGoal.description || '');
            setScope(initialGoal.scope);
            setTrackingType(initialGoal.trackingType);
            setFrequency(initialGoal.frequency);
            setTargetValue(initialGoal.targetValue);
        } else {
            // Reset if switching to create mode (optional, depends on usage pattern)
            setTitle('');
            setDescription('');
            setScope('personal');
            setTrackingType('boolean');
            setFrequency('daily');
            setTargetValue(1);
        }
    }, [initialGoal]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (isEditing && initialGoal) {
                await services.updateGoal.execute({
                    goalId: initialGoal.id,
                    userId: currentUser.id,
                    updates: {
                        title,
                        description,
                        frequency,
                        targetValue,
                        trackingType,
                    }
                });
            } else {
                await services.createGoal.execute({
                    title,
                    description,
                    scope,
                    frequency,
                    trackingType,
                    targetValue: trackingType === 'boolean' ? 1 : targetValue,
                    ownerUserId: scope === 'personal' ? currentUser.id : null,
                    coupleId: scope === 'couple' ? currentCouple.id : null,
                });
            }
            onSuccess();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div>
                        <h3 className="font-bold text-xl text-gray-900">{isEditing ? t('editTitle') : t('newTitle')}</h3>
                        <p className="text-sm text-gray-400">{isEditing ? t('editSubtitle') : t('newSubtitle')}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition"
                    >
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-8 overflow-y-auto">

                    {/* Title & Description */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('titleLabel')}</label>
                            <input
                                className="w-full p-4 text-lg border-2 border-gray-100 rounded-xl outline-none focus:border-black transition placeholder:text-gray-300"
                                placeholder={t('titlePlaceholder')}
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>
                        <div>
                            <input
                                className="w-full p-3 text-sm border border-gray-100 rounded-xl outline-none focus:border-gray-400 transition placeholder:text-gray-400"
                                placeholder={t('descriptionPlaceholder')}
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Scope Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">{t('scopeLabel')}</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setScope('personal')}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition duration-200 ${scope === 'personal'
                                    ? 'border-black bg-gray-50'
                                    : 'border-transparent bg-gray-50 hover:bg-gray-100/50 text-gray-500'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${scope === 'personal' ? 'bg-black text-white' : 'bg-white text-gray-400'}`}>
                                    <UserIcon size={20} />
                                </div>
                                <span className={`font-medium ${scope === 'personal' ? 'text-black' : 'text-gray-500'}`}>{t('scopePersonal')}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setScope('couple')}
                                disabled={!currentCouple}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition duration-200 ${scope === 'couple'
                                    ? 'border-pink-500 bg-pink-50/30'
                                    : 'border-transparent bg-gray-50 hover:bg-gray-100/50 text-gray-500'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${scope === 'couple' ? 'bg-pink-500 text-white' : 'bg-white text-gray-400'}`}>
                                    <Users size={20} />
                                </div>
                                <span className={`font-medium ${scope === 'couple' ? 'text-pink-600' : 'text-gray-500'}`}>{t('scopeCouple')}</span>
                            </button>
                        </div>
                    </div>

                    {/* Frequency */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">{t('frequencyLabel')}</label>
                        <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <select
                                value={frequency}
                                onChange={(e) => setFrequency(e.target.value)}
                                className="w-full pl-11 p-3 bg-gray-50 border-none rounded-xl text-gray-700 font-medium outline-none focus:ring-2 focus:ring-black appearance-none cursor-pointer"
                            >
                                <option value="daily">{t('frequencyDaily')}</option>
                                <option value="weekly">{t('frequencyWeekly')}</option>
                            </select>
                        </div>
                    </div>

                    {/* Tracking Type */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">{t('trackingTypeLabel')}</label>
                        <div className="space-y-3">
                            <button
                                type="button"
                                onClick={() => setTrackingType('boolean')}
                                className={`w-full flex items-center p-3 rounded-xl border-2 transition text-left ${trackingType === 'boolean'
                                    ? 'border-black bg-white shadow-sm'
                                    : 'border-gray-100 bg-white hover:border-gray-200'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${trackingType === 'boolean' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                    <CheckCircle size={20} />
                                </div>
                                <div>
                                    <div className="font-semibold text-gray-900">{t('typeBoolean')}</div>
                                    <div className="text-xs text-gray-500">{t('typeBooleanDesc')}</div>
                                </div>
                                {trackingType === 'boolean' && <div className="ml-auto w-3 h-3 rounded-full bg-black"></div>}
                            </button>

                            <button
                                type="button"
                                onClick={() => setTrackingType('count')}
                                className={`w-full flex items-center p-3 rounded-xl border-2 transition text-left ${trackingType === 'count'
                                    ? 'border-black bg-white shadow-sm'
                                    : 'border-gray-100 bg-white hover:border-gray-200'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${trackingType === 'count' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                                    <Hash size={20} />
                                </div>
                                <div>
                                    <div className="font-semibold text-gray-900">{t('typeCount')}</div>
                                    <div className="text-xs text-gray-500">{t('typeCountDesc')}</div>
                                </div>
                                {trackingType === 'count' && <div className="ml-auto w-3 h-3 rounded-full bg-black"></div>}
                            </button>
                        </div>
                    </div>

                    {/* Target Value (Conditional) */}
                    {trackingType === 'count' && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-200 bg-gray-50 p-4 rounded-xl">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('targetValueLabel')}</label>
                            <input
                                type="number"
                                min="1"
                                value={targetValue}
                                onChange={e => setTargetValue(Number(e.target.value))}
                                className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-black"
                            />
                        </div>
                    )}
                </form>

                {/* Footer */}
                <div className="p-5 border-t border-gray-100 bg-white sticky bottom-0 z-10">
                    <button
                        onClick={handleSubmit}
                        disabled={!title || isSubmitting}
                        className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gray-200"
                    >
                        {isSubmitting ? t('submitSaving') : (isEditing ? t('submitEdit') : t('submitCreate'))}
                    </button>
                </div>
            </div>
        </div>
    );
}
