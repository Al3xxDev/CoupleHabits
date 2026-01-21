import { Goal, GoalId, UserId } from '../domain/schema';
import { IGoalRepository, ISyncEngine, IProgressRepository } from '../repositories/interfaces';

export class UpdateGoalUseCase {
    constructor(
        private goalRepo: IGoalRepository,
        private syncEngine: ISyncEngine
    ) { }

    async execute(input: {
        goalId: string;
        userId: string;
        updates: Partial<Pick<Goal, 'title' | 'description' | 'frequency' | 'targetValue' | 'trackingType' | 'archivedAt'>>;
    }): Promise<void> {
        const goalId = input.goalId as GoalId;
        const userId = input.userId as UserId;

        const existingGoal = await this.goalRepo.getById(goalId);

        if (!existingGoal) {
            throw new Error('Goal not found');
        }

        // Authorization Check
        if (existingGoal.scope === 'personal' && existingGoal.ownerUserId !== userId) {
            throw new Error('Unauthorized: Cannot edit personal goal of another user');
        }
        // For couple goals, we assume any member of the couple can edit (checked by UI/context usually, but could verify coupleId matches user's coupleId if we had access to user profile here. For MVP, assuming access implies auth).

        const updatedGoal: Goal = {
            ...existingGoal,
            // Only update fields that are explicitly defined in updates
            ...(Object.fromEntries(
                Object.entries(input.updates).filter(([_, v]) => v !== undefined)
            ) as any),
            // Prevent changing stable IDs
            id: existingGoal.id,
            scope: existingGoal.scope,
            ownerUserId: existingGoal.ownerUserId,
            coupleId: existingGoal.coupleId,
            createdAt: existingGoal.createdAt,
        };

        await this.goalRepo.update(updatedGoal);
        await this.syncEngine.enqueueAction('UPDATE_GOAL', updatedGoal);
    }
}
