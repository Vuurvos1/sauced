/**
 * Stands in for Workers AI's REST API locally, so review moderation runs the same
 * code as in production without a Cloudflare account. Only Llama Guard is served,
 * and its verdict comes from a word list rather than the model: a review
 * containing one of FLAG_WORDS comes back unsafe.
 */
import { createServer } from 'node:http';

const PORT = Number(process.env.PORT ?? 8788);
const FLAG_WORDS = (process.env.FLAG_WORDS ?? 'idiot,hate you,scam,garbage')
	.split(',')
	.map((word) => word.trim().toLowerCase())
	.filter(Boolean);

const ROUTE = /^\/client\/v4\/accounts\/[^/]+\/ai\/run\/(.+)$/;

const reply = (res, status, body) => {
	res.writeHead(status, { 'Content-Type': 'application/json' });
	res.end(JSON.stringify(body));
};

createServer(async (req, res) => {
	if (req.method === 'GET' && req.url === '/health') return reply(res, 200, { ok: true });

	const model = req.method === 'POST' && ROUTE.exec(req.url ?? '')?.[1];
	if (!model) return reply(res, 404, { success: false, errors: [{ message: 'Not found' }] });
	if (!req.headers.authorization?.startsWith('Bearer ')) {
		return reply(res, 401, { success: false, errors: [{ message: 'Authentication error' }] });
	}
	if (model !== '@cf/meta/llama-guard-3-8b') {
		return reply(res, 400, { success: false, errors: [{ message: `${model} isn't emulated` }] });
	}

	let body = '';
	for await (const chunk of req) body += chunk;
	const text = (JSON.parse(body || '{}').messages ?? [])
		.map((message) => String(message.content ?? ''))
		.join('\n')
		.toLowerCase();
	const hits = FLAG_WORDS.filter((word) => text.includes(word));

	console.log(`${hits.length ? 'unsafe' : 'safe  '} ${JSON.stringify(text.slice(0, 60))}`);
	// Workers AI wraps the model's answer in `result`, as the real API does.
	reply(res, 200, {
		success: true,
		errors: [],
		result: { response: { safe: hits.length === 0, categories: hits.length ? ['S10'] : [] } }
	});
}).listen(PORT, () =>
	console.log(`Workers AI stand-in on :${PORT}, flagging: ${FLAG_WORDS.join(', ')}`)
);
