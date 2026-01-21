import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
    IGoalRepository, IProgressRepository, ICoupleRepository, IUserRepository
} from '../../core/repositories/interfaces';
import {
    Goal, GoalId, Progress, User, UserId, Couple, CoupleId
} from '../../core/domain/schema';

// --- DB Schema Definition ---
interface CoupleHabitsDB extends DBSchema {
    users: {
        key: string;
        value: User;
        indexes: { 'by-email': string };
    };
    couples: {
        key: string;
        value: Couple;
        indexes: { 'by-code': string };
    };
    goals: {
        key: string;
        value: Goal;
        indexes: {
            'by-couple': string;
            'by-owner': string;
        };
    };
    progress: {
        key: string;
        value: Progress;
        indexes: {
            'by-goal': string;
            'by-goal-date': [string, string]; // Composite index
        };
    };
    sync_queue: {
        key: string;
        value: any; // Stored as any, types handled by application layer
        indexes: { 'by-status': string };
    };
}

const DB_NAME = 'couple-habits-db';
const DB_VERSION = 4; // Version 4 Remove unique constraint on progress

// --- Singleton DB Access ---
let dbPromise: Promise<IDBPDatabase<CoupleHabitsDB>> | null = null;

export function getDB() {
    if (!dbPromise) {
        dbPromise = openDB<CoupleHabitsDB>(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion, newVersion, transaction) {
                // Users
                const userStore = !db.objectStoreNames.contains('users')
                    ? db.createObjectStore('users', { keyPath: 'id' })
                    : transaction.objectStore('users');

                if (!userStore.indexNames.contains('by-email')) {
                    userStore.createIndex('by-email', 'email', { unique: true });
                }

                // Couples
                const coupleStore = !db.objectStoreNames.contains('couples')
                    ? db.createObjectStore('couples', { keyPath: 'id' })
                    : transaction.objectStore('couples');

                if (!coupleStore.indexNames.contains('by-code')) {
                    coupleStore.createIndex('by-code', 'code', { unique: true });
                }

                // Goals
                const goalStore = !db.objectStoreNames.contains('goals')
                    ? db.createObjectStore('goals', { keyPath: 'id' })
                    : transaction.objectStore('goals');

                if (!goalStore.indexNames.contains('by-couple')) {
                    goalStore.createIndex('by-couple', 'coupleId');
                }
                if (!goalStore.indexNames.contains('by-owner')) {
                    goalStore.createIndex('by-owner', 'ownerUserId');
                }

                // Progress
                const progressStore = !db.objectStoreNames.contains('progress')
                    ? db.createObjectStore('progress', { keyPath: 'id' })
                    : transaction.objectStore('progress');

                if (!progressStore.indexNames.contains('by-goal')) {
                    progressStore.createIndex('by-goal', 'goalId');
                }

                // Version 4 Change: unique: false for by-goal-date
                if (oldVersion < 4 && progressStore.indexNames.contains('by-goal-date')) {
                    progressStore.deleteIndex('by-goal-date');
                }

                if (!progressStore.indexNames.contains('by-goal-date')) {
                    // Start with unique: false to allow both partners to record progress
                    progressStore.createIndex('by-goal-date', ['goalId', 'dateKey'], { unique: false });
                }

                // Sync Queue
                const syncStore = !db.objectStoreNames.contains('sync_queue')
                    ? db.createObjectStore('sync_queue', { keyPath: 'id' })
                    : transaction.objectStore('sync_queue');

                if (!syncStore.indexNames.contains('by-status')) {
                    syncStore.createIndex('by-status', 'status');
                }
            },
        });
    }
    return dbPromise;
}

// --- Repository Implementations ---

export class IndexedDBGoalRepository implements IGoalRepository {
    async create(goal: Goal): Promise<void> {
        const db = await getDB();
        await db.put('goals', goal);
    }
    async update(goal: Goal): Promise<void> {
        const db = await getDB();
        await db.put('goals', goal);
    }
    async getById(id: GoalId): Promise<Goal | undefined> {
        const db = await getDB();
        return db.get('goals', id);
    }
    async getAllByCoupleId(coupleId: CoupleId): Promise<Goal[]> {
        const db = await getDB();
        return db.getAllFromIndex('goals', 'by-couple', coupleId);
    }
    async getAllByUserId(userId: UserId): Promise<Goal[]> {
        const db = await getDB();
        return db.getAllFromIndex('goals', 'by-owner', userId);
    }
}

export class IndexedDBProgressRepository implements IProgressRepository {
    async add(progress: Progress): Promise<void> {
        const db = await getDB();
        await db.put('progress', progress);
    }
    async getByGoalAndDate(goalId: GoalId, dateKey: string): Promise<Progress[]> {
        const db = await getDB();
        return db.getAllFromIndex('progress', 'by-goal-date', [goalId, dateKey]);
    }
    async getHistoryByGoal(goalId: GoalId, startDate: string, endDate: string): Promise<Progress[]> {
        const db = await getDB();
        const range = IDBKeyRange.bound([goalId, startDate], [goalId, endDate]);
        return db.getAllFromIndex('progress', 'by-goal-date', range);
    }
}

export class IndexedDBCoupleRepository implements ICoupleRepository {
    async create(couple: Couple): Promise<void> {
        const db = await getDB();
        await db.put('couples', couple);
    }
    async update(couple: Couple): Promise<void> {
        const db = await getDB();
        await db.put('couples', couple);
    }
    async getById(coupleId: CoupleId): Promise<Couple | undefined> {
        const db = await getDB();
        return db.get('couples', coupleId);
    }
    async getByInviteCode(code: string): Promise<Couple | undefined> {
        const db = await getDB();
        return db.getFromIndex('couples', 'by-code', code);
    }
    // Added for robustness against missing user.coupleId
    async getByUserId(userId: string): Promise<Couple | undefined> {
        const db = await getDB();
        // Since we don't have an index for userA/userB (Wait, we created idx_couples_users in SQL, but strictly in IDB we need indexes too)
        // We lack an index in IDB for userA/userB lookup efficiently.
        // But for MVP with 1 couple, iterating is fine? 
        // Or we should add indexes.
        // Let's iterate all couples (usually only 1 present locally).
        const couples = await db.getAll('couples');
        return couples.find(c => c.userAId === userId || c.userBId === userId);
    }
}

export class IndexedDBUserRepository implements IUserRepository {
    async create(user: User): Promise<void> {
        const db = await getDB();
        await db.put('users', user);
    }
    async getById(userId: UserId): Promise<User | undefined> {
        const db = await getDB();
        return db.get('users', userId);
    }
    async getByEmail(email: string): Promise<User | undefined> {
        const db = await getDB();
        return db.getFromIndex('users', 'by-email', email);
    }
}
