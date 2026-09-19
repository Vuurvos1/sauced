import { DATABASE_URL } from '$env/static/private';
import { getDb } from '@app/db';

export const db = getDb(DATABASE_URL);
