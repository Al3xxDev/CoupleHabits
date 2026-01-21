'use client';
import { useEffect, useState, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { AppShell } from '@/components/layout/AppShell';
import { UserOnboarding } from '@/components/features/onboarding/UserOnboarding';
import { CoupleOnboarding } from '@/components/features/onboarding/CoupleOnboarding';
import { GoalForm } from '@/components/features/goals/GoalForm';
import { GoalCard } from '@/components/features/goals/GoalCard';
import { User, UserId, Couple, Goal, Progress } from '@/core/domain/schema';
import { services } from '@/services/container';
import { Plus } from 'lucide-react';

import { InviteCodeCard } from '@/components/features/couples/InviteCodeCard';
import { CoupleHeader } from '@/components/features/dashboard/CoupleHeader';
import { SettingsDialog } from '@/components/features/settings/SettingsDialog';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [partner, setPartner] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Dashboard State
  const [goals, setGoals] = useState<Goal[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, Progress[]>>({});
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;

    // 1. Fetch Goals (Personal + Couple)
    const personalGoals = await services.goals.getAllByUserId(user.id);
    let coupleGoals: Goal[] = [];
    const targetCoupleId = couple?.id || user.coupleId;

    if (targetCoupleId) {
      coupleGoals = await services.goals.getAllByCoupleId(targetCoupleId);
    }

    // Merge and Dedupe (if any overlap, shouldn't be by schema logic)
    // Note: IDB getAllFromIndex returns arrays.
    const allGoals = [...personalGoals, ...coupleGoals];
    // Sort?

    setGoals(allGoals);

    // 2. Fetch Progress for Today
    const today = new Date().toISOString().split('T')[0];
    const map: Record<string, Progress[]> = {};

    for (const goal of allGoals) {
      const p = await services.progress.getByGoalAndDate(goal.id, today);
      if (p && p.length > 0) map[goal.id] = p;
    }
    setProgressMap(map);

  }, [user, couple]);

  useEffect(() => {
    const checkAuth = async () => {
      const storedUserId = localStorage.getItem('couple_habits_uid');


      if (storedUserId) {
        const foundUser = await services.users.getById(storedUserId as UserId);


        if (foundUser) {
          setUser(foundUser);
          // Try to find couple (either via direct ID or searching by User ID)
          let foundCouple = null;

          if (foundUser.coupleId) {
            foundCouple = await services.couples.getById(foundUser.coupleId);
          }

          if (!foundCouple) {
            // Fallback: search by user ID
            foundCouple = await services.couples.getByUserId(foundUser.id);
          }

          if (foundCouple) {

            setCouple(foundCouple || null);

            // Fetch Partner
            const partnerId = foundCouple.userAId === foundUser.id ? foundCouple.userBId : foundCouple.userAId;
            if (partnerId) {
              const foundPartner = await services.users.getById(partnerId);
              setPartner(foundPartner || null);
            }
          } else {
            setCouple(null);
          }
          // Initialize Sync Context
          services.syncEngine.setContext(foundUser.id, foundUser.coupleId || null);
        } else {
          console.warn('[Auth] Stored ID exists but user not found in IDB.');
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchDashboardData();

      const onDataChanged = async () => {

        fetchDashboardData();

        // Also refresh Couple status (e.g. if partner joined)
        if (user) {
          // Re-fetch couple from IDB to check for status/partner changes
          let foundCouple = null;
          if (user.coupleId) foundCouple = await services.couples.getById(user.coupleId);
          if (!foundCouple) foundCouple = await services.couples.getByUserId(user.id);

          if (foundCouple) {
            setCouple(foundCouple);
            const partnerId = foundCouple.userAId === user.id ? foundCouple.userBId : foundCouple.userAId;
            if (partnerId) {
              const foundPartner = await services.users.getById(partnerId);
              setPartner(foundPartner || null);
            }
          }
        }
      };

      window.addEventListener('couple-habits-data-changed', onDataChanged);
      return () => {
        window.removeEventListener('couple-habits-data-changed', onDataChanged);
      };
    }
  }, [user, fetchDashboardData]);

  const handleUserComplete = async (newUser: User) => {


    // 1. Persist Session
    localStorage.setItem('couple_habits_uid', newUser.id);

    // 2. Persist User Object to IDB immediately

    await services.users.create(newUser);


    setUser(newUser);

    // 3. Initialize Sync (triggers pull in background, but we await it below)

    services.syncEngine.setContext(newUser.id, newUser.coupleId || null);

    // 4. If User has a couple, Try to recover it immediately so they don't see "Join Couple" screen
    if (newUser.coupleId) {
      setLoading(true); // Show loading while we restore
      try {

        // FORCE Wait for pull to complete so DB is populated
        await services.syncEngine.pullFromRemote();

        // Now it should be in local DB
        const foundCouple = await services.couples.getById(newUser.coupleId);
        if (foundCouple) {

          setCouple(foundCouple);

          // Partner logic
          const partnerId = foundCouple.userAId === newUser.id ? foundCouple.userBId : foundCouple.userAId;
          if (partnerId) {
            // We might need to pull partner specific info if not in sync yet,
            // but pullFromRemote already tries to fetch partner.
            // Let's try to get from IDB.
            const foundPartner = await services.users.getById(partnerId);
            setPartner(foundPartner || null);
          }
        } else {
          console.warn('[Login] Couple ID present on user, but not found after sync.');
        }
      } catch (e) {
        console.error('Failed to restore couple', e);
      } finally {
        setLoading(false);
      }
    } else {
      // No couple, ready to render Onboarding
      setLoading(false);
    }
  };

  const handleCoupleComplete = async (newCouple: Couple) => {
    setCouple(newCouple);
    // Fetch Partner immediately if available (unlikely on create, but on join yes)
    const partnerId = newCouple.userAId === user!.id ? newCouple.userBId : newCouple.userAId;
    if (partnerId) {
      const foundPartner = await services.users.getById(partnerId);
      setPartner(foundPartner || null);
    }
    fetchDashboardData();
  };

  const handleUpdateProfile = async (updatedUser: User) => {
    try {
      await services.users.create(updatedUser); // Update local
      await services.syncEngine.enqueueAction('CREATE_USER_PROFILE', updatedUser); // Sync to remote (Reuse create action for upsert)
      setUser(updatedUser);
    } catch (e) {
      console.error('Failed to update profile', e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('couple_habits_uid');
    setUser(null);
    setCouple(null);
    setGoals([]);
    window.location.reload();
  };

  const t = useTranslations('Dashboard');
  const tCommon = useTranslations('Common');
  const locale = useLocale();

  if (loading) return <div className="flex h-screen items-center justify-center">{tCommon('loading')}</div>;

  return (
    <AppShell>
      {!user ? (
        <UserOnboarding onComplete={handleUserComplete} />
      ) : !couple ? (
        <CoupleOnboarding currentUser={user} onComplete={handleCoupleComplete} />
      ) : (

        <div className="p-6 relative min-h-screen pb-20 bg-gray-50/50">
          {/* New Premium Header */}
          <CoupleHeader
            currentUser={user}
            partnerUser={partner}
            couple={couple}
            onOpenSettings={() => setShowSettings(true)}
          />

          <SettingsDialog
            currentUser={user}
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            onSave={handleUpdateProfile}
            onLogout={handleLogout}
          />

          {/* Date Header (Subtle) */}
          <div className="mb-6 px-1">
            <h1 className="text-3xl font-bold text-gray-800">{t('goalsTitle')}</h1>
            <p className="text-gray-400 font-medium">{new Date().toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>


          {couple.status === 'pending' && couple.code && !partner && (
            <InviteCodeCard code={couple.code} />
          )}

          <div className="space-y-4">
            {goals.length === 0 ? (
              <div className="text-center py-20">
                <div className="bg-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <span className="text-2xl">✨</span>
                </div>
                <p className="text-gray-900 font-semibold mb-1">{t('noGoals')}</p>
                <p className="text-sm text-gray-500">{t('createGoal')}</p>
              </div>
            ) : (
              (() => {
                const onTrack = async () => {
                  setTimeout(fetchDashboardData, 100);
                };

                return (
                  <div className="space-y-4">
                    {goals.map(goal => (
                      <GoalCard
                        key={goal.id}
                        goal={goal}
                        currentUser={user}
                        partnerUser={partner}
                        todayProgress={progressMap[goal.id] || []}
                        onTrack={onTrack}
                        onEdit={setEditingGoal}
                      />
                    ))}
                  </div>
                );
              })()
            )}
          </div>

          {/* Fab to Add Goal */}
          <button
            onClick={() => setShowGoalForm(true)}
            className="fixed bottom-8 right-6 w-14 h-14 bg-black text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-105 transition active:scale-95 z-40"
          >
            <Plus size={24} />
          </button>

          {(showGoalForm || editingGoal) && (
            <GoalForm
              currentUser={user}
              currentCouple={couple}
              initialGoal={editingGoal || undefined}
              onClose={() => {
                setShowGoalForm(false);
                setEditingGoal(null);
              }}
              onSuccess={() => {
                setShowGoalForm(false);
                setEditingGoal(null);
                fetchDashboardData();
              }}
            />
          )}
        </div>
      )}
    </AppShell>
  );
}
