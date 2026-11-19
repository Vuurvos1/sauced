import { hotSauces } from '@app/db/schema';
import { isNull } from 'drizzle-orm';

/** Sauces visitors may see: not taken off the site by an admin. */
export const visibleSauce = isNull(hotSauces.hiddenAt);
