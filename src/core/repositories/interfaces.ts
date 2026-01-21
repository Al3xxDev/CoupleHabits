import { Goal, GoalId, Progress, User, Couple, UserId, CoupleId } from '../domain/schema';

export interface IGoalRepository {
    create(goal: Goal): Promise<void>;
    update(goal: Goal): Promise<void>;
    getById(id: GoalId): Promise<Goal | undefined>;
    getAllByCoupleId(coupleId: CoupleId): Promise<Goal[]>;
    getAllByUserId(userId: UserId): Promise<Goal[]>;
}

export interface IProgressRepository {
    add(progress: Progress): Promise<void>;
    getByGoalAndDate(goalId: GoalId, dateKey: string): Promise<Progress[]>;
    getHistoryByGoal(goalId: GoalId, startDate: string, endDate: string): Promise<Progress[]>;
}

export interface ICoupleRepository {
    create(couple: Couple): Promise<void>;
    update(couple: Couple): Promise<void>;
    getById(coupleId: CoupleId): Promise<Couple | undefined>;
    getByInviteCode(code: string): Promise<Couple | undefined>;
}

export interface IUserRepository {
    create(user: User): Promise<void>;
    getById(userId: UserId): Promise<User | undefined>;
    getByEmail(email: string): Promise<User | undefined>;
}

export interface ISyncEngine {
    enqueueAction(type: string, payload: any): Promise<void>;
    fetchCoupleByCode(code: string): Promise<any | null>;
}

