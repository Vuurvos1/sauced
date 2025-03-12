import type { hotSauces, stores } from '@app/db/schema';
import type { InferSelectModel } from 'drizzle-orm';

type HotSauce = InferSelectModel<typeof hotSauces>;
type Store = InferSelectModel<typeof stores>;

type SearchSauce = Pick<HotSauce, 'sauceId' | 'name' | 'description' | 'slug' | 'imageUrl'> & {
	avgRating: number | null;
	ratingCount: number;
};

type SearchStore = Pick<Store, 'name' | 'description'> & {
	id: Store['storeId'];
};

export interface SearchResponse {
	makers: never[];
	stores: SearchStore[];
	sauces: SearchSauce[];
}
