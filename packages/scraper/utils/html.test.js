import { describe, it, expect } from 'vitest';
import { decodeEntities, stripHtml } from './html.js';

describe('decodeEntities', () => {
	it('decodes named entities', () => {
		expect(decodeEntities('Salt &amp; Pepper')).toBe('Salt & Pepper');
	});

	it('decodes decimal and hex references', () => {
		expect(decodeEntities('De Sambal &#8211; Per de Man')).toBe('De Sambal – Per de Man');
		expect(decodeEntities('Caf&#xe9;')).toBe('Café');
	});

	it('leaves unknown entities alone rather than dropping them', () => {
		expect(decodeEntities('a &notreal; b')).toBe('a &notreal; b');
	});
});

describe('stripHtml', () => {
	it('returns an empty string for missing input', () => {
		expect(stripHtml(null)).toBe('');
		expect(stripHtml(undefined)).toBe('');
		expect(stripHtml('')).toBe('');
	});

	it('strips tags and decodes entities', () => {
		expect(stripHtml('<p>Smoky <strong>chipotle</strong> &amp; mango</p>')).toBe(
			'Smoky chipotle & mango'
		);
	});

	it('keeps paragraphs apart instead of running words together', () => {
		expect(stripHtml('<p>First</p><p>Second</p>')).toBe('First\nSecond');
	});

	it('turns <br> into a newline', () => {
		expect(stripHtml('one<br>two')).toBe('one\ntwo');
	});

	it('drops script and style content', () => {
		expect(stripHtml('<p>keep</p><script>alert(1)</script>')).toBe('keep');
	});

	it('collapses the whitespace a stripped layout leaves behind', () => {
		// Runs of blank lines settle at one paragraph break, never more.
		expect(stripHtml('<div>  a   b  </div>\n\n\n<div>c</div>')).toBe('a b\n\nc');
	});

	it('handles the meta tags Shopify injects into body_html', () => {
		expect(stripHtml('<p><meta charset="utf-8">Onima’s JANG sauce</p>')).toBe('Onima’s JANG sauce');
	});
});
