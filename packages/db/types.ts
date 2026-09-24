import type { hotSauces, user, stores, session } from './';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export type User = InferSelectModel<typeof user>;

export type Session = InferSelectModel<typeof session>;

export type HotSauce = InferSelectModel<typeof hotSauces>;
export type HotSauceInsert = InferInsertModel<typeof hotSauces>;

export type Store = InferSelectModel<typeof stores>;
export type StoreInsert = InferInsertModel<typeof stores>;
