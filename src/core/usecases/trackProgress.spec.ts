import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrackProgressUseCase } from './trackProgress';
import { IGoalRepository, IProgressRepository, ISyncEngine } from '../repositories/interfaces';
import { Goal, Progress } from '../domain/schema';

// Mocks
const mockGoalRepo = {
    getById: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    getAllByCoupleId: vi.fn(),
    getAllByUserId: vi.fn(),
} as unknown as IGoalRepository;

const mockProgressRepo = {
    add: vi.fn(),
    getByGoalAndDate: vi.fn(),
    getHistoryByGoal: vi.fn(),
} as unknown as IProgressRepository;

const mockSyncEngine = {
    enqueueAction: vi.fn(),
} as unknown as ISyncEngine;

describe('TrackProgressUseCase', () => {
    let useCase: TrackProgressUseCase;

    beforeEach(() => {
        vi.clearAllMocks();
        useCase = new TrackProgressUseCase(mockGoalRepo, mockProgressRepo, mockSyncEngine);
        // We don't mock crypto here anymore, we expect any string.
        if (!globalThis.crypto) {
            // @ts-ignore
            globalThis.crypto = { randomUUID: () => 'test-uuid' };
        }
    });

    const validGoal: Goal = {
        id: 'goal-1' as any,
        title: 'Test Goal',
        scope: 'personal',
        ownerUserId: 'user-1' as any,
        frequency: 'daily',
        trackingType: 'boolean',
        targetValue: 1,
        createdAt: 1000,
    } as Goal;

    it('should create new progress and enqueue sync action', async () => {
        vi.spyOn(mockGoalRepo, 'getById').mockResolvedValue(validGoal);
        vi.spyOn(mockProgressRepo, 'getByGoalAndDate').mockResolvedValue(undefined);

        const result = await useCase.execute({
            goalId: 'goal-1',
            userId: 'user-1',
            dateKey: '2023-01-01',
            value: 1,
        });

        expect(result.status).toBe('completed');
        expect(mockProgressRepo.add).toHaveBeenCalled();
        expect(mockSyncEngine.enqueueAction).toHaveBeenCalledWith('TRACK_PROGRESS', expect.objectContaining({
            id: expect.any(String), // Expect ANY string ID
            status: 'completed'
        }));
    });

    it('should fail if user matches not owner for personal goal', async () => {
        vi.spyOn(mockGoalRepo, 'getById').mockResolvedValue(validGoal);

        await expect(useCase.execute({
            goalId: 'goal-1',
            userId: 'user-2',
            dateKey: '2023-01-01',
            value: 1,
        })).rejects.toThrow('Unauthorized');
    });

    it('should update existing progress and enqueue sync action', async () => {
        const counterGoal = { ...validGoal, trackingType: 'count', targetValue: 5 } as Goal;
        const existingProgress = {
            id: 'prog-1',
            goalId: 'goal-1',
            dateKey: '2023-01-01',
            value: 2,
            status: 'partial'
        } as Progress;

        vi.spyOn(mockGoalRepo, 'getById').mockResolvedValue(counterGoal);
        vi.spyOn(mockProgressRepo, 'getByGoalAndDate').mockResolvedValue(existingProgress);

        const result = await useCase.execute({
            goalId: 'goal-1',
            userId: 'user-1',
            dateKey: '2023-01-01',
            value: 6,
        });

        expect(result.status).toBe('completed');
        expect(result.value).toBe(6);
        expect(mockProgressRepo.add).toHaveBeenCalled();
        expect(mockSyncEngine.enqueueAction).toHaveBeenCalledWith('TRACK_PROGRESS', expect.objectContaining({
            id: 'prog-1',
            value: 6,
            status: 'completed'
        }));
    });
});
