import { DATABASE_URL } from '$env/static/private';
import { getDb } from '@app/db';

// TODO: move to server folder
export const db = getDb(DATABASE_URL);
