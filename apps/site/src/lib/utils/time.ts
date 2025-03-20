import dayjs from '$lib/dayjs';

export function formatTimeAgo(date: Date | string | number) {
	return dayjs(date).fromNow();
}
