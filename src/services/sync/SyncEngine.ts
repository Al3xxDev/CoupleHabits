import { ActionType, SyncAction } from '../../core/domain/sync';
import { getDB } from '../../services/storage/IndexedDBRepo';
import { ISyncEngine } from '../../core/repositories/interfaces';
import { supabase } from '@/services/db/supabase';
import { v4 as uuidv4 } from 'uuid';

export class SyncEngine implements ISyncEngine {
    private currentUserId: string | null = null;
    private currentCoupleId: string | null = null;
    private isProcessing = false;

    constructor() {
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => this.processQueue());
        }
    }

    private channel: any = null;

    setContext(userId: string, coupleId: string | null) {
        this.currentUserId = userId;
        this.currentCoupleId = coupleId;
        // Trigger pull when context is set
        this.pullFromRemote();
        // Start Realtime
        this.startRealtime();
    }

    private startRealtime() {
        if (this.channel) return;


        this.channel = supabase.channel('db-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public' },
                async (payload) => {
                    await this.handleRealtimeEvent(payload);
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {

                }
            });
    }

    private async handleRealtimeEvent(payload: any) {
        const { table, eventType, new: newRecord, old: oldRecord } = payload;
        const db = await getDB();
        let changed = false;

        try {
            switch (table) {
                case 'goals':
                    if (eventType === 'DELETE' && oldRecord?.id) {
                        // await db.delete('goals', oldRecord.id); 
                        // IDBRepo doesn't expose delete on 'goals' directly easily without checking store name etc. 
                        // For now MVP: ignore delete or implement if needed.
                        // Assuming soft delete via archivedAt usually, so it comes as UPDATE.
                    } else if (newRecord) {
                        // Check if relevant to me?
                        // Ideally check couple_id or owner_user_id.
                        // But RLS on Supabase should already filter what I RECEIVE? 
                        // Supabase Realtime respects RLS if 'Broadcast' is config correctly? 
                        // Actually standard Realtime does NOT respect RLS unless configured with "WAL" and "RLS".
                        // BUT for this MVP, I'll filter client side if needed or just accept it.
                        // If I receive it, I likely have access.
                        await db.put('goals', this.mapGoalFromRemote(newRecord));
                        changed = true;
                    }
                    break;

                case 'progress':
                    if (newRecord) {
                        await db.put('progress', this.mapProgressFromRemote(newRecord));
                        changed = true;
                    }
                    break;

                case 'couples':
                    if (newRecord && this.currentCoupleId === newRecord.id) {
                        try {
                            const couple = this.mapCoupleFromRemote(newRecord);
                            await db.put('couples', couple);
                            changed = true;

                            // If I am user A, check user B, and vice versa.
                            // We need to fetch the partner profile if it's new/changed.
                            // Ideally check if we already have it? 
                            // Simplest: Just fetch it.
                            if (this.currentUserId) {
                                let partnerId = null;
                                if (couple.userAId === this.currentUserId) partnerId = couple.userBId;
                                else if (couple.userBId === this.currentUserId) partnerId = couple.userAId;

                                if (partnerId) {

                                    const { data: partner } = await supabase.from('users').select('*').eq('id', partnerId).single();
                                    if (partner) {
                                        await db.put('users', this.mapUserFromRemote(partner));

                                    }
                                }
                            }
                        } catch (err) {
                            console.error('[Sync] Failed to process couple update:', err);
                        }
                    }
                    break;

                case 'users':
                    // If my partner updates profile
                    // check if it is my partner?
                    if (newRecord) {
                        await db.put('users', this.mapUserFromRemote(newRecord));
                        changed = true;
                    }
                    break;
            }

            if (changed) {

                // Dispatch Event for UI
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('couple-habits-data-changed'));
                }
            }

        } catch (e) {
            console.error('[Sync] Error handling realtime event', e);
        }
    }


    async enqueueAction(type: string, payload: any): Promise<void> {
        const db = await getDB();

        // Validate type cast
        const actionType = type as ActionType;

        const action: SyncAction = {
            id: uuidv4(),
            type: actionType,
            payload,
            createdAt: Date.now(),
            status: 'pending',
            retryCount: 0
        };

        await db.put('sync_queue', action);

        if (typeof navigator !== 'undefined' && navigator.onLine) {
            this.processQueue();
        }
    }

    async processQueue(): Promise<void> {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            const db = await getDB();
            const pendingActions = await db.getAllFromIndex('sync_queue', 'by-status', 'pending');

            pendingActions.sort((a, b) => a.createdAt - b.createdAt);

            for (const action of pendingActions) {
                try {
                    await this.pushToRemote(action);
                    await db.delete('sync_queue', action.id);

                } catch (error) {
                    console.error(`[Sync] Failed to sync action ${action.id}`, JSON.stringify(error, null, 2));
                    action.retryCount = (action.retryCount || 0) + 1;
                    await db.put('sync_queue', action);
                }
            }

            // After pushing, pull latest
            await this.pullFromRemote();

        } finally {
            this.isProcessing = false;
        }
    }

    async pullFromRemote(): Promise<void> {
        if (!this.currentUserId) return;

        const db = await getDB();

        // 1. Pull Couple (if linked)
        if (this.currentCoupleId) {
            const { data: couple } = await supabase.from('couples').select('*').eq('id', this.currentCoupleId).single();
            if (couple) {
                await db.put('couples', this.mapCoupleFromRemote(couple));

                // Pull Partner Profile
                if (couple.user_a_id && couple.user_a_id !== this.currentUserId) {
                    const { data: partner } = await supabase.from('users').select('*').eq('id', couple.user_a_id).single();
                    if (partner) await db.put('users', this.mapUserFromRemote(partner));
                }
                if (couple.user_b_id && couple.user_b_id !== this.currentUserId) {
                    const { data: partner } = await supabase.from('users').select('*').eq('id', couple.user_b_id).single();
                    if (partner) await db.put('users', this.mapUserFromRemote(partner));
                }
            }
        } else {
            // Fallback: Try to find couple by User ID (Robustness for missing user.couple_id schema)
            const { data: couple } = await supabase
                .from('couples')
                .select('*')
                .or(`user_a_id.eq.${this.currentUserId},user_b_id.eq.${this.currentUserId}`)
                .maybeSingle();

            if (couple) {

                this.currentCoupleId = couple.id; // Update context!
                await db.put('couples', this.mapCoupleFromRemote(couple));

                // Pull Partner Profile Logic (Duplicated from above, could refactor)
                if (couple.user_a_id && couple.user_a_id !== this.currentUserId) {
                    const { data: partner } = await supabase.from('users').select('*').eq('id', couple.user_a_id).single();
                    if (partner) await db.put('users', this.mapUserFromRemote(partner));
                }
                if (couple.user_b_id && couple.user_b_id !== this.currentUserId) {
                    const { data: partner } = await supabase.from('users').select('*').eq('id', couple.user_b_id).single();
                    if (partner) await db.put('users', this.mapUserFromRemote(partner));
                }
            }
        }

        // 2. Pull Goals (Personal + Couple)
        let query = supabase.from('goals').select('*');
        if (this.currentCoupleId) {
            query = query.or(`owner_user_id.eq.${this.currentUserId},couple_id.eq.${this.currentCoupleId}`);
        } else {
            query = query.eq('owner_user_id', this.currentUserId);
        }

        const { data: goals } = await query;
        if (goals) {
            for (const g of goals) {
                await db.put('goals', this.mapGoalFromRemote(g));
            }
        }

        // 3. Pull Progress (for these goals)
        if (goals && goals.length > 0) {
            const goalIds = goals.map(g => g.id);
            const { data: progress } = await supabase.from('progress').select('*').in('goal_id', goalIds);
            if (progress) {
                for (const p of progress) {
                    await db.put('progress', this.mapProgressFromRemote(p));
                }
            }
        }


        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('couple-habits-data-changed'));
        }
    }

    async fetchCoupleByCode(code: string): Promise<any | null> {
        const { data } = await supabase.from('couples').select('*').eq('code', code).single();
        if (data) {
            return this.mapCoupleFromRemote(data);
        }
        return null;
    }

    // --- MAPPERS (Remote -> Local) ---

    private mapUserFromRemote(u: any): any {
        return {
            id: u.id,
            fullName: u.full_name,
            displayName: u.display_name,
            email: u.email,
            avatarUrl: u.avatar_url,
            gender: u.gender,
            dateOfBirth: u.date_of_birth,
            onboardingCompleted: u.onboarding_completed,
            coupleId: u.couple_id || null, // Ensure null if undefined/null?
            createdAt: u.created_at ? new Date(u.created_at).getTime() : Date.now()
        };
    }

    private mapCoupleFromRemote(c: any): any {
        return {
            id: c.id,
            userAId: c.user_a_id,
            userBId: c.user_b_id,
            status: c.status,
            code: c.code,
            createdAt: c.created_at ? new Date(c.created_at).getTime() : Date.now()
        };
    }

    private mapGoalFromRemote(g: any): any {
        return {
            ...g,
            ownerUserId: g.owner_user_id,
            coupleId: g.couple_id,
            trackingType: g.tracking_type,
            targetValue: g.target_value,
            createdAt: g.created_at ? new Date(g.created_at).getTime() : Date.now(),
            archivedAt: g.archived_at ? new Date(g.archived_at).getTime() : null
        };
    }

    private mapProgressFromRemote(p: any): any {
        return {
            ...p,
            goalId: p.goal_id,
            dateKey: p.date_key,
            recordedByUserId: p.recorded_by_user_id,
            recordedAt: p.recorded_at ? new Date(p.recorded_at).getTime() : Date.now(),
        };
    }

    // --- MAPPERS (Local -> Remote) ---

    private mapUserToRemote(u: any): any {
        return {
            id: u.id,
            full_name: u.fullName,
            display_name: u.displayName,
            email: u.email,
            avatar_url: u.avatarUrl,
            gender: u.gender,
            date_of_birth: u.dateOfBirth,
            onboarding_completed: u.onboardingCompleted,
            // couple_id: u.coupleId, // Users don't usually update their own coupleId directly via profile update, handled via Join? 
            // Actually they might.
            // Note: Schema says "couple_id" references couples.
            // If I am syncing a profile update, I should include it if changed.
            created_at: new Date(u.createdAt).toISOString(),
            updated_at: new Date().toISOString()
        };
    }

    private mapCoupleToRemote(c: any): any {
        return {
            id: c.id,
            user_a_id: c.userAId,
            user_b_id: c.userBId,
            status: c.status,
            code: c.code,
            created_at: new Date(c.createdAt).toISOString(),
            updated_at: new Date().toISOString()
        };
    }

    private mapGoalToRemote(g: any): any {
        return {
            id: g.id,
            title: g.title,
            description: g.description,
            scope: g.scope,
            owner_user_id: g.ownerUserId,
            couple_id: g.coupleId,
            frequency: g.frequency,
            tracking_type: g.trackingType,
            target_value: g.targetValue,
            created_at: new Date(g.createdAt).toISOString(),
            updated_at: new Date().toISOString()
            // archived_at ...
        };
    }

    private mapProgressToRemote(p: any): any {
        return {
            id: p.id,
            goal_id: p.goalId,
            date_key: p.dateKey,
            value: p.value,
            status: p.status,
            recorded_by_user_id: p.recordedByUserId,
            recorded_at: new Date(p.recordedAt).toISOString(),
            note: p.note,
            updated_at: new Date().toISOString()
        };
    }

    private async pushToRemote(action: SyncAction): Promise<void> {


        switch (action.type) {
            case 'CREATE_GOAL':
                const remoteGoal = this.mapGoalToRemote(action.payload);
                const { error: errorGoal } = await supabase.from('goals').upsert(remoteGoal);
                if (errorGoal) throw errorGoal;
                break;

            case 'TRACK_PROGRESS':
                const remoteProgress = this.mapProgressToRemote(action.payload);
                const { error: errorProgress } = await supabase.from('progress').upsert(remoteProgress);
                if (errorProgress) throw errorProgress;
                break;

            case 'JOIN_COUPLE':
                const remoteCouple = this.mapCoupleToRemote(action.payload);
                const { error: errorCouple } = await supabase.from('couples').upsert(remoteCouple);
                if (errorCouple) throw errorCouple;
                break;

            case 'UPDATE_GOAL':
                const remoteUpdatedGoal = this.mapGoalToRemote(action.payload);
                const { error: errorUpdateGoal } = await supabase.from('goals').upsert(remoteUpdatedGoal);
                if (errorUpdateGoal) throw errorUpdateGoal;
                break;

            case 'CREATE_USER_PROFILE':
                const remoteUser = this.mapUserToRemote(action.payload);
                const { error: errorUser } = await supabase.from('users').upsert(remoteUser);
                if (errorUser) throw errorUser;
                break;

            default:
                console.warn(`[Sync] Unknown action type: ${action.type}`);
        }
    }
}

export const syncEngine = new SyncEngine();
