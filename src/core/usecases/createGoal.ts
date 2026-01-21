import { v4 as uuidv4 } from 'uuid';
import { Goal, GoalSchema } from '../domain/schema';
import { IGoalRepository, ISyncEngine } from '../repositories/interfaces';

export class CreateGoalUseCase {
    constructor(
        private goalRepo: IGoalRepository,
        private syncEngine: ISyncEngine
    ) { }

    async execute(input: Omit<Goal, 'id' | 'createdAt' | 'archivedAt'>): Promise<Goal> {

        const id = uuidv4() as string as any; // Cast for now if strict typing complains
        const createdAt = Date.now();

        const newGoal = {
            ...input,
            id,
            createdAt,
            archivedAt: null,
            targetValue: input.targetValue || 1,
        };

        const validatedGoal = GoalSchema.parse(newGoal);

        await this.goalRepo.create(validatedGoal);

        await this.syncEngine.enqueueAction('CREATE_GOAL', validatedGoal);

        return validatedGoal;
    }
}
