importScripts('src/plugin/psl.min.js')

/*
 ************************************************
 *  Decide Icon Set
 ************************************************
 */

chrome.storage.onChanged.addListener(function (changes, namespace) {
	if (changes.blockMode) {
		decideIconSet(changes.blockMode.newValue)
	}
})

self.addEventListener('install', (event) => {
	chrome.storage.sync.get('blockMode', function (data) {
		decideIconSet(data.blockMode)
	})
})

self.addEventListener('activate', (event) => {
	chrome.storage.sync.get('blockMode', function (data) {
		decideIconSet(data.blockMode)
	})
})

/*
 ************************************************
 *  Change Listeners
 ************************************************
 */

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
	const url = tab.url
	const domain = new URL(url).hostname

	chrome.storage.sync.get(['blockedWebsites'], function (result) {
		chrome.storage.sync.get('blockMode', function (data) {
			if (data.blockMode) {
				const blockedWebsites = result.blockedWebsites || []
				if (isSiteBlocked(domain, blockedWebsites)) {
					chrome.tabs.update(tab.id, { url: 'redirect/blocked.html?blockedUrl=' + url })
				}
			}
		})
	})
})

chrome.storage.onChanged.addListener(function (changes, namespace) {
	if (changes.blockedWebsites) {
		// get if block mode is enabled
		chrome.storage.sync.get('blockMode', function (data) {
			if (data.blockMode) {
				chrome.tabs.query({}, function (tabs) {
					tabs.forEach((tab) => {
						const domain = new URL(tab.url).hostname
						const blockedWebsites = changes.blockedWebsites.newValue || []
						if (isSiteBlocked(domain, blockedWebsites)) {
							updateTab(tab)
						}
					})
				})
			}
		})
	}
})

/*
 ************************************************
 *  Message Listeners
 ************************************************
 */

chrome.runtime.onMessage.addListener(({ action, domain, blockedWebsites }, sender, sendResponse) => {
	if (action === 'isSiteBlocked') sendResponse({ isBlocked: isSiteBlocked(domain, blockedWebsites) })
})

chrome.runtime.onMessage.addListener(({ action, domain, blockedSite }, sender, sendResponse) => {
	if (action === 'isSiteExactMatch') sendResponse({ isExactMatch: isExactMatch(domain, blockedSite) })
})

chrome.runtime.onMessage.addListener(({ action, domain }, sender, sendResponse) => {
	if (action === 'parseDomain') sendResponse({ parsed: psl.parse(domain) })
})

chrome.runtime.onMessage.addListener(({ action, tab }, sender, sendResponse) => {
	if (action === 'updateTab') updateTab(tab)
})

/*
 ************************************************
 *  Common Functions
 ************************************************
 */

function decideIconSet(blockMode) {
	const relativeName = blockMode ? 'icon-active' : 'icon-passive'
	const path = '../../icons/'
	const options = {
		path: {
			128: path + relativeName + '-128.png',
		},
	}

	chrome.action.setIcon(options)
}

function isSiteBlocked(domain, blockedWebsites) {
	const parsed = psl.parse(domain)
	const baseDomain = parsed.domain

	// remove www.
	blockedWebsites = blockedWebsites.map((site) => site.replace('www.', ''))

	// Check for exact match
	if (blockedWebsites.some((blockedWebsite) => isExactMatch(domain, blockedWebsite))) {
		return true
	}

	// Check for wildcard match
	for (let blockedWebsite of blockedWebsites) {
		if (blockedWebsite.startsWith('*.')) {
			const wildcardDomain = blockedWebsite.slice(2)
			if (baseDomain?.endsWith(wildcardDomain)) return true
		}
	}

	// No match found
	return false
}

function isExactMatch(domain, blockedWebsite) {
	return domain.replace('www.', '') === blockedWebsite.replace('www.', '')
}

function updateTab(tab) {
	chrome.tabs.update(tab.id, { url: 'redirect/blocked.html?blockedUrl=' + tab.url })
}
