document.addEventListener('DOMContentLoaded', initializeOptionsPage)

const blockedWebsitesInput = document.getElementById('blocked-websites')
const statusMessageElems = document.querySelectorAll('.status-message')

/*
 ************************************************
 *  Core Functions
 ************************************************
 */

function saveBlockedWebsites() {
	const blockedWebsites = Promise.all(
		getBlockedWebsites().map((website) => {
			return new Promise((resolve, reject) => {
				let sanitizedWebsite = website
					.replace(/^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/|www\.)/, '')
					.replace(/\/.*$/, '')
					.trim()

				let wildcard = false
				if (sanitizedWebsite.startsWith('*.')) {
					sanitizedWebsite = sanitizedWebsite.replace('*.', '')
					wildcard = true
				}

				chrome.runtime.sendMessage({ action: 'parseDomain', domain: sanitizedWebsite }, function (response) {
					const { parsed } = response

					console.log(parsed)

					if (parsed.domain && parsed.tld) {
						if (wildcard) {
							resolve(`*.${parsed.domain}`)
						} else {
							resolve(parsed.subdomain ? `${parsed.subdomain}.${parsed.domain}` : `${parsed.domain}`)
						}
					} else {
						resolve(null)
					}
				})
			})
		})
	)

	blockedWebsites.then((websites) => {
		const sanitizedWebsites = [...new Set(websites.filter(Boolean))]
		chrome.storage.sync.set({ blockedWebsites: sanitizedWebsites }, () => {
			showSaveSuccessMessage()
			loadBlockedWebsites()
		})
	})
}

function loadBlockedWebsites() {
	chrome.storage.sync.get(['blockedWebsites'], (result) => {
		const blockedWebsites = result.blockedWebsites || []
		blockedWebsitesInput.value = blockedWebsites.join('\n')
	})
}

function initializeOptionsPage() {
	const saveButton = document.getElementById('save-button')
	saveButton.addEventListener('click', saveBlockedWebsites)
	loadBlockedWebsites()
}

/*
 ************************************************
 *  Event Listeners
 ************************************************
 */

chrome.storage.onChanged.addListener((changes) => {
	if (changes.blockedWebsites) loadBlockedWebsites()
})

blockedWebsitesInput.addEventListener('input', () => {
	chrome.storage.sync.get(['blockedWebsites'], (result) => {
		const savedBlockedWebsites = result.blockedWebsites || []
		JSON.stringify(savedBlockedWebsites.map((x) => x.trim())) ===
		JSON.stringify(getBlockedWebsites().map((x) => x.trim()))
			? removeUnsavedChangesMessage()
			: showUnsavedChangesMessage()
	})
})

/*
 ************************************************
 *  Helper Functions
 ************************************************
 */

function showUnsavedChangesMessage() {
	statusMessageElems.forEach((elem) => {
		if (elem.classList.contains('saved-changes')) elem.classList.remove('saved-changes')
		elem.classList.add('unsaved-changes')
		elem.textContent = 'You have unsaved changes.'
	})
}

function removeUnsavedChangesMessage() {
	statusMessageElems.forEach((elem) => {
		if (elem.classList.contains('unsaved-changes')) elem.classList.remove('unsaved-changes')
		elem.textContent = '\u00A0'
	})
}

function showSaveSuccessMessage() {
	statusMessageElems.forEach((elem) => {
		if (elem.classList.contains('unsaved-changes')) elem.classList.remove('unsaved-changes')
		elem.classList.add('saved-changes')
		elem.textContent = 'Blocked websites list saved successfully.'

		setTimeout(() => {
			elem.textContent = '\u00A0'
			elem.classList.remove('saved-changes')
		}, 2000)
	})
}

function getBlockedWebsites() {
	return blockedWebsitesInput.value.split('\n').filter((site) => site.trim() !== '')
}
