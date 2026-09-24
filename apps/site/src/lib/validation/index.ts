import { z } from 'zod/v4';

export const usernameSchema = z
	.string()
	.min(1, 'Username must be at least 1 character')
	.max(30, 'Username cannot exceed 30 characters')
	.regex(
		/^[a-zA-Z0-9_-]+$/,
		'Username can only contain letters, numbers, underscores, and hyphens'
	);

export const emailSchema = z.email('Invalid email address');

// Single source of truth for password requirements. The UI and the schema both
// read from this list so they can't drift apart.
export const passwordRules = [
	{ label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
	{ label: 'A lowercase letter', test: (v: string) => /[a-z]/.test(v) },
	{ label: 'An uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
	{ label: 'A number', test: (v: string) => /[0-9]/.test(v) }
] as const;

// Strong schema — used for password CREATION (signup + reset-password).
export const passwordSchema = z
	.string()
	.min(8, 'Password must be at least 8 characters')
	.max(255, 'Password must be less than 255 characters')
	.regex(/[a-z]/, 'Password must contain a lowercase letter')
	.regex(/[A-Z]/, 'Password must contain an uppercase letter')
	.regex(/[0-9]/, 'Password must contain a number');

// Permissive schema — used for LOGIN so users with pre-existing weaker
// passwords can still sign in. Strength enforcement happens at creation time.
export const loginPasswordSchema = z.string().min(1, 'Password is required');
