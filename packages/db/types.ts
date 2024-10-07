import type { hotSauces, userTable, stores } from './schema';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export type DatabaseUser = InferSelectModel<typeof userTable>;

export type HotSauce = InferSelectModel<typeof hotSauces>;
export type HotSauceInsert = InferInsertModel<typeof hotSauces>;

export type Store = InferSelectModel<typeof stores>;
export type StoreInsert = InferInsertModel<typeof stores>;
