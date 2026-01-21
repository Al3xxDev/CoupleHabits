import { z } from 'zod';

// --- Primitives ---
export const UserIdSchema = z.string().uuid().brand('UserId');
export type UserId = z.infer<typeof UserIdSchema>;

export const CoupleIdSchema = z.string().uuid().brand('CoupleId');
export type CoupleId = z.infer<typeof CoupleIdSchema>;

export const GoalIdSchema = z.string().uuid().brand('GoalId');
export type GoalId = z.infer<typeof GoalIdSchema>;

export const ProgressIdSchema = z.string().uuid().brand('ProgressId');
export type ProgressId = z.infer<typeof ProgressIdSchema>;

export const TimestampSchema = z.number().int().min(0); // Unix timestamp (ms) - JS side uses ms, DB uses timestamptz (ISO string usually or date object)

// --- Enums ---
export const GenderIdentitySchema = z.enum([
  'female',
  'male',
  'non_binary',
  'prefer_not_to_say',
  'other'
]);
export type GenderIdentity = z.infer<typeof GenderIdentitySchema>;

export const CoupleStatusSchema = z.enum(['pending', 'active']);
export const GoalScopeSchema = z.enum(['personal', 'couple']);
export const GoalTrackingTypeSchema = z.enum(['boolean', 'count']);
export const ProgressStatusSchema = z.enum(['completed', 'missed', 'partial']);

// --- User & Couple ---
export const UserSchema = z.object({
  id: UserIdSchema,
  email: z.string().email(),
  fullName: z.string().min(1),
  displayName: z.string().optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),

  // Profile
  gender: GenderIdentitySchema.optional().nullable(),
  dateOfBirth: z.string().optional().nullable(), // YYYY-MM-DD

  // Onboarding
  onboardingCompleted: z.boolean().default(false),

  coupleId: CoupleIdSchema.optional().nullable(),
  createdAt: TimestampSchema,
});
export type User = z.infer<typeof UserSchema>;

export const CoupleSchema = z.object({
  id: CoupleIdSchema,
  userAId: UserIdSchema,
  userBId: UserIdSchema.optional().nullable(),
  status: CoupleStatusSchema,
  code: z.string().length(6).optional(),
  createdAt: TimestampSchema,
});
export type Couple = z.infer<typeof CoupleSchema>;

// --- Goals ---
export const GoalFrequencySchema = z.enum(['daily', 'weekly', 'custom']); // Expanded

export const GoalSchema = z.object({
  id: GoalIdSchema,
  title: z.string().min(1).max(100),
  description: z.string().optional(),

  scope: GoalScopeSchema,

  ownerUserId: UserIdSchema.optional().nullable(),
  coupleId: CoupleIdSchema.optional().nullable(),

  frequency: z.string(), // Simplified for now as text
  trackingType: GoalTrackingTypeSchema,
  targetValue: z.number().min(1).default(1),

  createdAt: TimestampSchema,
  archivedAt: TimestampSchema.optional().nullable(),
}).refine((data) => {
  if (data.scope === 'personal') return !!data.ownerUserId;
  if (data.scope === 'couple') return !!data.coupleId;
  return true;
}, {
  message: "Invalid scope/ownership combination",
  path: ["scope"],
});

export type Goal = z.infer<typeof GoalSchema>;

// --- Progress ---
export const ProgressSchema = z.object({
  id: ProgressIdSchema,
  goalId: GoalIdSchema,
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  value: z.number().min(0),
  status: ProgressStatusSchema,
  recordedByUserId: UserIdSchema.optional().nullable(), // Nullable in DB? No, references users. But effectively optional in some contexts?
  recordedAt: TimestampSchema,
  note: z.string().max(200).optional(),
});
export type Progress = z.infer<typeof ProgressSchema>;
