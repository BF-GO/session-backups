// src/popup/statistics.js

/**
 * Привязывает обработчики событий для вкладки "Статистика".
 */
export function attachStatisticsTabEventListeners() {
	// Здесь можно добавить обработчики событий для статистики, если потребуется
	console.log('Вкладка "Статистика" загружена.');
}

/**
 * Загружает и отображает статистику.
 */
export function loadStatistics() {
	console.log('Loading statistics');
	chrome.storage.local.get(
		['autoSessions', 'changeSessions', 'manualSessions'],
		(result) => {
			const autoSessions = result.autoSessions || [];
			const changeSessions = result.changeSessions || [];
			const manualSessions = result.manualSessions || [];
			const allSessions = [
				...autoSessions,
				...changeSessions,
				...manualSessions,
			];
			const totalSessions = allSessions.length;
			let totalTabs = 0;
			const siteCount = {};

			allSessions.forEach((session) => {
				session.windows.forEach((window) => {
					totalTabs += window.tabs.length;
					window.tabs.forEach((tab) => {
						try {
							const host = new URL(tab.url).hostname;
							siteCount[host] = (siteCount[host] || 0) + 1;
						} catch (e) {
							console.error('Invalid URL:', tab.url);
						}
					});
				});
			});

			// Находим самый частый сайт
			let mostFrequentSite = 'N/A';
			let maxCount = 0;
			for (const site in siteCount) {
				if (siteCount[site] > maxCount) {
					maxCount = siteCount[site];
					mostFrequentSite = site;
				}
			}

			// Обновляем элементы на странице
			const totalSessionsEl = document.getElementById('totalSessions');
			const totalTabsEl = document.getElementById('totalTabs');
			const mostFrequentSiteEl = document.getElementById('mostFrequentSite');

			if (totalSessionsEl) {
				totalSessionsEl.textContent = totalSessions;
				console.log(`Total Sessions: ${totalSessions}`);
			}
			if (totalTabsEl) {
				totalTabsEl.textContent = totalTabs;
				console.log(`Total Tabs: ${totalTabs}`);
			}
			if (mostFrequentSiteEl) {
				mostFrequentSiteEl.textContent = mostFrequentSite;
				console.log(`Most Frequent Site: ${mostFrequentSite}`);
			}
		}
	);
}
