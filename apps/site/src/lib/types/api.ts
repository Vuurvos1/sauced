import type { hotSauces, makers, stores } from '@app/db/schema';
import type { InferSelectModel } from 'drizzle-orm';

type HotSauce = InferSelectModel<typeof hotSauces>;
type Store = InferSelectModel<typeof stores>;
type Maker = InferSelectModel<typeof makers>;

type SearchSauce = Pick<HotSauce, 'sauceId' | 'name' | 'description' | 'slug' | 'imageUrl'> & {
	avgRating: number | null;
	ratingCount: number;
};

type SearchStore = Pick<Store, 'name' | 'description'> & {
	id: Store['storeId'];
};

type SearchMaker = Pick<Maker, 'name' | 'slug'> & {
	id: Maker['makerId'];
	sauceCount: number;
};

export interface SearchResponse {
	makers: SearchMaker[];
	stores: SearchStore[];
	sauces: SearchSauce[];
}
