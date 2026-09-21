import { describe, it, expect } from 'vitest';
import { isBundleName, shouldSkipProduct } from './filter.js';

describe('isBundleName', () => {
	it('keeps ordinary sauces', () => {
		for (const name of [
			'Habanero Hustle',
			'Reaper Rollin',
			'Garlic Habanero',
			'Madame Jeanette & Adjuma Pepper Sauce',
			'Sweet Sting Hot Honey'
		]) {
			expect(isBundleName(name), name).toBe(false);
		}
	});

	it('drops multipacks', () => {
		for (const name of ['3 Pack', '3-Pack Hot Sauce', 'Hot Sauce 5 pack', 'Trio Box', 'Duo']) {
			expect(isBundleName(name), name).toBe(true);
		}
	});

	it('drops gift sets in the spellings stores actually use', () => {
		for (const name of [
			'Raijmakers Heetmakers Hot Sauce Giftpack',
			'Gift Set',
			'Scovello Gift cards',
			'Hot Sauce Gift Box'
		]) {
			expect(isBundleName(name), name).toBe(true);
		}
	});

	it('drops subscriptions and challenges', () => {
		for (const name of [
			'Monthly Subscription',
			'The Wings of Death Challenge',
			'Year of Hot Ones'
		]) {
			expect(isBundleName(name), name).toBe(true);
		}
	});

	it('drops merch', () => {
		for (const name of ["Chardy's hat", "Chardy's Tote Bag", 'Hot Ones Socks', 'Logo T-Shirt']) {
			expect(isBundleName(name), name).toBe(true);
		}
	});

	it('treats a missing name as unusable', () => {
		expect(isBundleName('')).toBe(true);
		expect(isBundleName(null)).toBe(true);
	});
});

describe('shouldSkipProduct', () => {
	it('applies store-specific patterns on top of the bundle filter', () => {
		expect(shouldSkipProduct('Original Hot -C', [/\s-C$/])).toBe(true);
		expect(shouldSkipProduct('Original Hot', [/\s-C$/])).toBe(false);
	});
});

describe('isBundleName — multilingual bundles', () => {
	it('should drop bundles named in Dutch, German and French', () => {
		expect(isBundleName('Coffret 5 Sauces Da’Bomb')).toBe(true);
		expect(isBundleName('Hot sauce proefpakket – Mild')).toBe(true);
		expect(isBundleName('Adobo Rojo BBQ peperpakket')).toBe(true);
		expect(isBundleName('6er Set Sriracha Hot Chili Sauce 6 x 200ml')).toBe(true);
		expect(isBundleName('Mexican Tears – Hot Sauce Adventskalender mit 24')).toBe(true);
		expect(isBundleName('Carte Cadeau Maison Piquante')).toBe(true);
	});

	it('should drop wholesale cases and multipacks in any language', () => {
		expect(isBundleName('Case of Private Label Mango Hot Sauce, 12 x 5oz')).toBe(true);
		expect(isBundleName('Nekrogoblikon’s Goblin Sauce - Case of 12')).toBe(true);
		expect(isBundleName('Set of 3 Fatalii Seedlings - Buy Now!')).toBe(true);
	});
});

describe('isBundleName — non-sauce products', () => {
	it('should drop growing kit, produce and merch', () => {
		expect(isBundleName('Aji Mango 1 Litre Pot Plant (Pre Order)')).toBe(true);
		expect(isBundleName('Red Habanero Chilli Seeds')).toBe(true);
		expect(isBundleName('Chilli & Pepper Focus Plant Food')).toBe(true);
		expect(isBundleName('Propagator')).toBe(true);
		expect(isBundleName('De Sambal Longsleeve – Per de Man')).toBe(true);
	});

	it('should drop powders, rubs and seasonings', () => {
		expect(isBundleName('Queen Majesty Ancho Habanero Hot Sauce Powder')).toBe(true);
		expect(isBundleName('BLACK COFFEE GHOST RUB')).toBe(true);
		expect(isBundleName('Karma Sauce Jerk Me Around Seasoning')).toBe(true);
	});

	it('should drop coffee and snacks but keep coffee-flavoured sauce', () => {
		expect(isBundleName('Medium Roast Coffee Beans | 250g')).toBe(true);
		expect(isBundleName('Firechips Carolina Reaper Kartoffelchips')).toBe(true);
		expect(isBundleName('Dawson’s Coffee Date hot sauce')).toBe(false);
		expect(isBundleName('Coffee BBQ Sauce - Rich Coffee Flavor')).toBe(false);
	});
});

describe('isBundleName — checkout line items', () => {
	it('should drop shipping and fee products', () => {
		expect(isBundleName('Nouvelle Livraison (Expédition)')).toBe(true);
		expect(isBundleName('Verzendkosten')).toBe(true);
		expect(isBundleName('Shipping Protection')).toBe(true);
	});

	// A bare `tip` pattern would take this one.
	it('should keep a sauce whose name merely contains a fee word', () => {
		expect(isBundleName('Blacktip Widow Hot Sauce')).toBe(false);
	});
});

describe('isBundleName — false positives that must survive', () => {
	// Every one of these was wrongly dropped by an earlier draft of the patterns.
	it('should keep sauces whose name contains an alcohol flavour', () => {
		expect(isBundleName('Burning Asphalt Irish Whiskey BBQ Sauce')).toBe(false);
		expect(isBundleName('PepperNutz Caribbean Rum Hot Sauce')).toBe(false);
	});

	it('should keep sauces whose brand collides with a filter word', () => {
		expect(isBundleName('Seed Ranch Flavor Co. Truffle Hound Hot Sauce')).toBe(false);
		expect(isBundleName('Buffalo Wings Hot Sauce | Chilli Mash Co. | Plant Based')).toBe(false);
	});

	// The shared filter reads names only, and nothing in this one marks it as fake —
	// the joke is in the description. It is excluded per-store instead.
	it('should not try to catch the Glass Onion joke listing here', () => {
		expect(isBundleName('Jeremy Renner’s Small-Batch Hot Sauce - Glass Onion')).toBe(false);
		expect(
			shouldSkipProduct('Jeremy Renner’s Small-Batch Hot Sauce - Glass Onion', [/glass onion/i])
		).toBe(true);
	});

	it('should drop the bottled spirit itself', () => {
		expect(isBundleName('Dekker Pepper Spicy Spirit – chili (700ml)')).toBe(true);
	});
});

describe('isBundleName — accented and compound vocabulary', () => {
	// JS \b only knows [A-Za-z0-9_], so `\bépices\b` never matched "d'épices".
	// Patterns are ASCII and the name is accent-folded before testing.
	it('should match accented words', () => {
		expect(isBundleName('Raz El Hanout mélange d’épices')).toBe(true);
		expect(isBundleName('Chimichurri mélange d’épice traditionnelle')).toBe(true);
		expect(isBundleName('7 Piments Ghost Pepper séchés entiers indiens')).toBe(true);
		expect(isBundleName('Paprika en Poudre')).toBe(true);
	});

	it('should match German and French non-sauce products', () => {
		expect(isBundleName('Zwilling Gourmet Selbstschärfender Messerblock 7-teilig')).toBe(true);
		expect(isBundleName('Lil’Nitro bonbon Nounours le plus piquant du monde')).toBe(true);
	});

	it('should match words inside Dutch compounds', () => {
		expect(isBundleName('Honinglepel hout')).toBe(true);
		expect(isBundleName('Adobo Rojo BBQ peperpakket')).toBe(true);
	});

	it('should match French seeds and Dutch sweets', () => {
		expect(isBundleName('Graines - Dame Blanche 🔥🔥')).toBe(true);
		expect(isBundleName('Dr Fire Blast Balls Snoep')).toBe(true);
	});

	// "Hot Sauce" in the name must not rescue merch.
	it('should match bags and playing cards', () => {
		expect(isBundleName('Drawstring Character Bag')).toBe(true);
		expect(isBundleName('Garlic Reaper Hot Sauce Playing Cards – 54-Card Deck')).toBe(true);
		expect(isBundleName('Dekker Pepper Speelkaarten – 55 kaarten')).toBe(true);
		expect(isBundleName('Garlic Lover’s Bag - Garlic Sauces')).toBe(true);
	});

	it('should match Dutch merch and produce', () => {
		expect(isBundleName('Chilipeper Sokken Zwart (maat 39/45)')).toBe(true);
		expect(isBundleName('Gedroogde Madame Jeanette pepers')).toBe(true);
	});

	// `gedroogd` and `dried` describe an ingredient just as often as a product.
	it('should keep a sauce made from dried peppers', () => {
		expect(isBundleName('Gedroogde Tomaat Saus')).toBe(false);
		expect(isBundleName('Smoked Dried Chipotle Hot Sauce')).toBe(false);
	});

	it('should drop confectionery but keep chilli varieties named after it', () => {
		expect(isBundleName('Fudge Caramels')).toBe(true);
		expect(isBundleName('Diva Diablo Dulce de Leche Caramel Pretzels')).toBe(true);
		expect(isBundleName('Chocolate Habanero Chilli Sauce')).toBe(false);
		expect(isBundleName('Cocoa Ghost Hot Sauce')).toBe(false);
		expect(isBundleName('Satay Peanut Hot Sauce')).toBe(false);
	});

	it('should drop bulk and hardware', () => {
		expect(isBundleName('Los Calientes Verde 5 Gallon Bucket')).toBe(true);
		expect(isBundleName('Psycho Juice Pen')).toBe(true);
	});
});
