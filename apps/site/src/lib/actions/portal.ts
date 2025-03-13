/**
 * Teleport a node to another element
 */
export function portal(node: HTMLElement, element: string) {
	const teleportElement = document.querySelector(element);

	// TODO: maybe add a fallback to create the element if it doesn't exist?

	if (!teleportElement) return;

	// if (!teleportElement) {
	//   teleportElement = document.createElement('div');
	//   teleportElement.id = element.replace('#', '');
	//   document.body.appendChild(teleportElement);
	// }

	teleportElement.appendChild(node);

	return {
		// update(element: string) {
		//   teleportElement = document.querySelector(element);
		//   teleportElement.appendChild(node);
		// },

		destroy() {
			if (!teleportElement || !node) return;
			if (node.parentNode !== teleportElement) return;

			try {
				teleportElement.removeChild(node);
			} catch (e) {
				console.error(e);
			}
		}
	};
}
