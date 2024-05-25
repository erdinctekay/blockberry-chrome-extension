document.addEventListener('DOMContentLoaded', initializePopupPage)

function initializePopupPage() {
	const checkbox = document.getElementById('toggle-switch')
	const statusMessage = document.getElementById('status-message')
	const blockButton = document.getElementById('block-button')

	// load the current state of the block mode
	chrome.storage.sync.get('blockMode', function (data) {
		checkbox.checked = data.blockMode
		statusMessage.textContent = data.blockMode ? 'Block mode is enabled.' : 'Block mode is disabled.'
	})

	// get current tab url
	chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
		const url = tabs[0].url
		const domain = new URL(url).hostname
		const urlDisplay = document.getElementById('url-display')

		urlDisplay.innerText = domain

		if (!url.startsWith('http')) hideSubInfo()

		chrome.storage.sync.get(['blockedWebsites'], function (result) {
			const blockedWebsites = result.blockedWebsites || []

			chrome.runtime.sendMessage({ action: 'isSiteBlocked', domain, blockedWebsites }, function (response) {
				response.isBlocked ? disableBlockButton(blockButton) : enableBlockButton(blockButton)
			})
		})
	})

	// save the new state when the checkbox is toggled
	checkbox.addEventListener('change', function () {
		chrome.storage.sync.set({ blockMode: this.checked })
		statusMessage.textContent = this.checked ? 'Block mode is enabled.' : 'Block mode is disabled.'
		const slider = document.querySelector('.slider')

		// check all tabs if they are blocked or not
		if (this.checked) {
			chrome.tabs.query({}, function (tabs) {
				tabs.forEach((tab) => {
					const domain = new URL(tab.url).hostname
					chrome.storage.sync.get(['blockedWebsites'], function (result) {
						const blockedWebsites = result.blockedWebsites || []

						chrome.runtime.sendMessage({ action: 'isSiteBlocked', domain, blockedWebsites }, function (response) {
							if (response.isBlocked) {
								chrome.runtime.sendMessage({ action: 'updateTab', tab: tab })
								hideSubInfo()
							}
						})
					})
				})
			})

			if (slider.classList.contains('reverse-slide')) slider.classList.remove('reverse-slide')
			slider.classList.add('slide')
			setTimeout(() => {
				slider.classList.remove('slide')
			}, 500)
		} else {
			if (slider.classList.contains('slide')) slider.classList.remove('slide')
			slider.classList.add('reverse-slide')
			setTimeout(() => {
				slider.classList.remove('reverse-slide')
			}, 500)
		}
	})

	// block the current tab
	document.getElementById('block-button').addEventListener('click', function () {
		chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
			const url = tabs[0].url
			const domain = new URL(url).hostname.replace(/^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/|www\.)/, '')

			// check if block mode is enabled
			chrome.storage.sync.get('blockMode', function (data) {
				const blockButton = document.getElementById('block-button')
				const isBlocked = blockButton.disabled

				chrome.storage.sync.get(['blockedWebsites'], function (result) {
					let blockedWebsites = result.blockedWebsites || []
					if (!isBlocked) {
						if (!blockedWebsites.includes(domain)) blockedWebsites.push(domain)

						if (data.blockMode) {
							// search same domain in all tabs
							chrome.tabs.query({}, function (tabs) {
								tabs.forEach((tab) => {
									chrome.runtime.sendMessage(
										{ action: 'isSiteExactMatch', domain, blockedSite: new URL(tab.url).hostname },
										function (response) {
											if (response.isExactMatch && tab.url.startsWith('http')) {
												chrome.runtime.sendMessage({ action: 'updateTab', tab: tab })
											}
										}
									)
								})
							})

							hideSubInfo()
						} else {
							disableBlockButton(blockButton)
						}
					}

					chrome.storage.sync.set({ blockedWebsites })
				})
			})
		})
	})
}

/*
 ************************************************
 *  Helper Functions
 ************************************************
 */

function disableBlockButton(blockButton) {
	blockButton.textContent = 'Blocked'
	blockButton.classList.add('disabled')
	blockButton.disabled = true
}

function enableBlockButton(blockButton) {
	blockButton.textContent = 'Block'
	blockButton.classList.remove('disabled')
	if (blockButton.disabled) blockButton.removeAttribute('disabled')
}

function hideSubInfo() {
	const subInfo = document.querySelector('.sub-info')
	subInfo.style.display = 'none'
}
