/** Whether a key press is someone typing, so page-wide shortcuts should leave it alone. */
export function isTyping(event: KeyboardEvent) {
	const target = event.target as HTMLElement | null;
	return Boolean(target?.isContentEditable || target?.closest('input, textarea, select'));
}

/** A modal dialog has the keyboard: shortcuts behind it shouldn't fire. */
export function dialogOpen() {
	return document.querySelector('[role="dialog"]') !== null;
}
