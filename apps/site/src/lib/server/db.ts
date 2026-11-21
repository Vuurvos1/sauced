import { DATABASE_URL } from '$app/env/private';
import { getDb } from '@app/db';

export const db = getDb(DATABASE_URL);
