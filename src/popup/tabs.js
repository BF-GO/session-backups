// src/popup/tabs.js

import { attachScheduleTabEventListeners } from './schedule.js';
import { attachSessionsTabEventListeners, loadSessions } from './sessions.js';
import { attachSettingsTabEventListeners } from './settings.js';
import {
	attachStatisticsTabEventListeners,
	loadStatistics,
} from './statistics.js';
import { loadTab } from './utils.js';

/**
 * Главная функция переключения вкладок.
 * @param {string} tabName - Имя вкладки для загрузки.
 */
export function loadTabFunction(tabName) {
	switch (tabName) {
		case 'sessions':
			loadTab('sessions', attachSessionsTabEventListeners, loadSessions);
			break;
		case 'statistics':
			loadTab('statistics', attachStatisticsTabEventListeners, loadStatistics);
			break;
		case 'schedule':
			loadTab('schedule', attachScheduleTabEventListeners, null);
			break;
		case 'settings':
			loadTab('settings', attachSettingsTabEventListeners, null);
			break;
		default:
			console.warn(`Unknown tab: ${tabName}`);
			break;
	}
}
