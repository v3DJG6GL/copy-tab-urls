// background.js

browser.contextMenus.create({
	id: "copy-active-url",
	title: "Copy Active URL",
	contexts: ["tab"]
});

browser.contextMenus.create({
	id: "copy-urls",
	title: "Copy Marked URLs",
	contexts: ["tab"]
});

browser.contextMenus.onClicked.addListener(async (info, tab) => {
	const storedData = await browser.storage.local.get(["templates", "activeTemplate"]);
	const activeTemplate = storedData.activeTemplate;
	const templates = storedData.templates || {};

	let prefix = "";
	let suffix = "";

	if (activeTemplate && templates[activeTemplate]) {
		prefix = templates[activeTemplate].prefix || "";
		suffix = templates[activeTemplate].suffix || "";
	}

	if (info.menuItemId === "copy-urls") {
		const tabs = await browser.tabs.query({currentWindow: true, highlighted: true});
		const urls = tabs.map(t => t.url);

		let output = prefix ? `${prefix}\n` : '';
		output += urls.map(url => `${url}${suffix}`).join("\n");

		await navigator.clipboard.writeText(output);
	}
	else if (info.menuItemId === "copy-active-url") {
		const activeTab = await browser.tabs.get(tab.id);
		const output = `${prefix ? prefix + '\n' : ''}${activeTab.url}${suffix}`;
		await navigator.clipboard.writeText(output);
	}
});
