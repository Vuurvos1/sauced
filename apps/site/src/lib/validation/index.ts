import { z } from 'zod';

export const usernameSchema = z
	.string()
	.min(1, 'Username must be at least 1 character')
	.max(30, 'Username cannot exceed 20 characters')
	.regex(
		/^[a-zA-Z0-9_-]+$/,
		'Username can only contain letters, numbers, underscores, and hyphens'
	);
// export const usernamePattern = '[a-zA-Z0-9_\\-]{1,30}';

export const emailSchema = z.email('Invalid email address');

export const passwordSchema = z
	.string()
	.min(6, 'Password must be at least 6 characters')
	.max(255, 'Password must be less than 255 characters');
