const params = new URLSearchParams(window.location.search)
const domain = params?.get('blockedUrl')
const retryAnchor = document.getElementById('retry-anchor')

document.getElementById('domain').innerText = new URL(domain).hostname

retryAnchor.addEventListener('click', () => {
	const goDomain = () => window.location.replace(domain)

	chrome.storage.sync.get('blockMode', function (data) {
		if (!data.blockMode) {
			goDomain()
		} else {
			chrome.storage.sync.get(['blockedWebsites'], function (result) {
				const blockedWebsites = result.blockedWebsites || []

				// check if the site is still blocked
				chrome.runtime.sendMessage(
					{ action: 'isSiteBlocked', domain: new URL(domain).hostname, blockedWebsites },
					function (response) {
						if (!response.isBlocked) goDomain()
					}
				)
			})
		}
	})
})

chrome.storage.onChanged.addListener((changes) => {
	if (changes.blockMode) {
		chrome.storage.sync.get('blockMode', function (data) {
			// if it's not block mode open page
			if (!data.blockMode) retryAnchor.click()
		})
	}
})

chrome.storage.onChanged.addListener((changes) => {
	if (changes.blockedWebsites) {
		chrome.storage.sync.get('blockMode', function (data) {
			// if it's block mode but site removed from the list
			if (data.blockMode) retryAnchor.click()
		})
	}
})
