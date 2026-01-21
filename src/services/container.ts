import {
    IndexedDBGoalRepository,
    IndexedDBProgressRepository,
    IndexedDBCoupleRepository,
    IndexedDBUserRepository
} from './storage/IndexedDBRepo';
import { syncEngine } from './sync/SyncEngine';
import { CreateGoalUseCase } from '../core/usecases/createGoal';
import { TrackProgressUseCase } from '../core/usecases/trackProgress';
import { UpdateGoalUseCase } from '../core/usecases/updateGoal';
import { JoinCoupleUseCase } from '../core/usecases/joinCouple';

// Repositories
const goalRepo = new IndexedDBGoalRepository();
const progressRepo = new IndexedDBProgressRepository();
const coupleRepo = new IndexedDBCoupleRepository();
const userRepo = new IndexedDBUserRepository();

// Use Cases
export const createGoalUseCase = new CreateGoalUseCase(goalRepo, syncEngine);
export const trackProgressUseCase = new TrackProgressUseCase(goalRepo, progressRepo, syncEngine);
export const joinCoupleUseCase = new JoinCoupleUseCase(coupleRepo, userRepo, syncEngine);
export const updateGoalUseCase = new UpdateGoalUseCase(goalRepo, syncEngine);

// Simple services object to import in React (or use Context)
export const services = {
    createGoal: createGoalUseCase,
    updateGoal: updateGoalUseCase,
    trackProgress: trackProgressUseCase,
    joinCouple: joinCoupleUseCase,
    // expose repos if needed for queries? 
    // Ideally we should have "QueryUseCases" or read directly from Repo for UI lists.
    // For MVP, reading from Repo in UI components is acceptable for "Reads".
    goals: goalRepo,
    progress: progressRepo,
    couples: coupleRepo,
    users: userRepo,
    syncEngine: syncEngine
};
