import { z } from 'zod';
import { GoalSchema, ProgressSchema, UserSchema, CoupleSchema } from './schema';

// Action Types
export const ActionTypeSchema = z.enum([
    'CREATE_GOAL',
    'UPDATE_GOAL',
    'TRACK_PROGRESS',
    'JOIN_COUPLE',
    'CREATE_USER_PROFILE'
]);

export type ActionType = z.infer<typeof ActionTypeSchema>;

// Payloads - Using Zod Schemas for runtime usage, or infer types
export const CreateGoalPayloadSchema = GoalSchema;
export const TrackProgressPayloadSchema = ProgressSchema;
export const JoinCouplePayloadSchema = CoupleSchema;

// Sync Action Entity
export const SyncActionSchema = z.object({
    id: z.string().uuid(),
    type: ActionTypeSchema,
    payload: z.any(), // Refined by logic
    createdAt: z.number(), // Timestamp
    status: z.enum(['pending', 'processing', 'failed', 'synced']).default('pending'),
    retryCount: z.number().default(0),
});

export type SyncAction = z.infer<typeof SyncActionSchema>;
