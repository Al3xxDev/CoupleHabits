import { GoalId, Progress, ProgressId, UserId } from '../domain/schema';
import { IGoalRepository, IProgressRepository, ISyncEngine } from '../repositories/interfaces';
import { v4 as uuidv4 } from 'uuid';

export class TrackProgressUseCase {
    constructor(
        private goalRepo: IGoalRepository,
        private progressRepo: IProgressRepository,
        private syncEngine: ISyncEngine
    ) { }

    async execute(input: {
        goalId: string;
        userId: string;
        dateKey: string;
        value: number;
        note?: string;
    }): Promise<Progress> {
        const goalId = input.goalId as GoalId;
        const progressId = uuidv4() as unknown as ProgressId;
        const userId = input.userId as UserId;

        const goal = await this.goalRepo.getById(goalId);
        if (!goal) {
            throw new Error('Goal not found');
        }

        if (goal.scope === 'personal' && goal.ownerUserId !== userId) {
            throw new Error('Unauthorized: Cannot track personal goal of another user');
        }

        const allProgress = await this.progressRepo.getByGoalAndDate(goalId, input.dateKey);
        const existing = allProgress.find(p => p.recordedByUserId === userId);

        if (existing) {
            const updatedProgress: Progress = {
                ...existing,
                value: input.value,
                status: this.calculateStatus(goal, input.value),
                recordedByUserId: userId,
                recordedAt: Date.now(),
                note: input.note
            };

            await this.progressRepo.add(updatedProgress);
            await this.syncEngine.enqueueAction('TRACK_PROGRESS', updatedProgress);
            return updatedProgress;
        }

        const status = this.calculateStatus(goal, input.value);

        const newProgress: Progress = {
            id: progressId,
            goalId,
            dateKey: input.dateKey,
            value: input.value,
            status,
            recordedByUserId: userId,
            recordedAt: Date.now(),
            note: input.note
        };

        await this.progressRepo.add(newProgress);
        await this.syncEngine.enqueueAction('TRACK_PROGRESS', newProgress);
        return newProgress;
    }

    private calculateStatus(goal: any, value: number): 'completed' | 'partial' | 'missed' {
        if (goal.trackingType === 'boolean') {
            return value > 0 ? 'completed' : 'missed';
        }
        if (goal.trackingType === 'count') {
            return value >= goal.targetValue ? 'completed' : 'partial';
        }
        return 'partial';
    }
}
