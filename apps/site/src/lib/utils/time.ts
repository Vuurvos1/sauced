import dayjs from '#lib/dayjs.js';

export function formatTimeAgo(date: Date | string | number) {
	return dayjs(date).fromNow();
}
