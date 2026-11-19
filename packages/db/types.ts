import type { hotSauces, hotSauceImages, user, stores, session } from './';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export type User = InferSelectModel<typeof user>;

export type Session = InferSelectModel<typeof session>;

export type HotSauce = InferSelectModel<typeof hotSauces>;
export type HotSauceInsert = InferInsertModel<typeof hotSauces>;

export type HotSauceImage = InferSelectModel<typeof hotSauceImages>;
export type HotSauceImageInsert = InferInsertModel<typeof hotSauceImages>;

export type Store = InferSelectModel<typeof stores>;
export type StoreInsert = InferInsertModel<typeof stores>;
