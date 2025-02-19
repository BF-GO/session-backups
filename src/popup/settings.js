// src/popup/settings.js

import { loadSessions } from './sessions.js';
import { showNotification } from './utils.js';

/**
 * Привязывает обработчики событий для вкладки "Настройки".
 */
export function attachSettingsTabEventListeners() {
	const htmlElement = document.documentElement;
	const themeSwitch = document.getElementById('themeSwitch');
	const notificationSwitch = document.getElementById('notificationSwitch');
	const intervalInput = document.getElementById('intervalInput');
	const importBtn = document.getElementById('importBtn');
	const importFileInput = document.getElementById('importFileInput');
	const exportBtn = document.getElementById('exportBtn');

	// --- Ручные сессии ---
	const manualSessionsEnabledSwitch = document.getElementById(
		'manualSessionsEnabledSwitch'
	);
	const manualSessionsMaxInput = document.getElementById(
		'manualSessionsMaxInput'
	);
	if (manualSessionsEnabledSwitch) {
		manualSessionsEnabledSwitch.addEventListener('change', () => {
			const isEnabled = manualSessionsEnabledSwitch.checked;
			chrome.storage.local.set({ manualSessionsEnabled: isEnabled }, () => {
				console.log(`Manual sessions ${isEnabled ? 'enabled' : 'disabled'}`);
				showNotification(
					'Настройки Обновлены',
					`Ручные сессии ${isEnabled ? 'включены' : 'отключены'}.`
				);
				loadSessions();
			});
		});
	}
	if (manualSessionsMaxInput) {
		manualSessionsMaxInput.addEventListener('change', () => {
			let maxValue = parseInt(manualSessionsMaxInput.value, 10);
			if (isNaN(maxValue) || maxValue < 0) {
				maxValue = 0;
			}
			chrome.storage.local.set({ manualSessionsMax: maxValue }, () => {
				console.log(`Manual sessions max set to: ${maxValue}`);
				showNotification(
					'Настройки Обновлены',
					`Максимальное количество ручных сессий установлено на ${maxValue}.`
				);
			});
		});
	}

	// --- Авто сессии ---
	const autoSessionsEnabledSwitch = document.getElementById(
		'autoSessionsEnabledSwitch'
	);
	const autoSessionsMaxInput = document.getElementById('autoSessionsMaxInput');
	if (autoSessionsEnabledSwitch) {
		autoSessionsEnabledSwitch.addEventListener('change', () => {
			const isEnabled = autoSessionsEnabledSwitch.checked;
			chrome.storage.local.set({ autoSessionsEnabled: isEnabled }, () => {
				console.log(`Auto sessions ${isEnabled ? 'enabled' : 'disabled'}`);
				showNotification(
					'Настройки Обновлены',
					`Авто сессии ${isEnabled ? 'включены' : 'отключены'}.`
				);
				loadSessions();
			});
		});
	}
	if (autoSessionsMaxInput) {
		autoSessionsMaxInput.addEventListener('change', () => {
			let maxValue = parseInt(autoSessionsMaxInput.value, 10);
			if (isNaN(maxValue) || maxValue < 0) {
				maxValue = 0;
			}
			chrome.storage.local.set({ autoSessionsMax: maxValue }, () => {
				console.log(`Auto sessions max set to: ${maxValue}`);
				showNotification(
					'Настройки Обновлены',
					`Максимальное количество авто сессий установлено на ${maxValue}.`
				);
			});
		});
	}

	// --- Сессии при изменении вкладок ---
	const changeSessionsEnabledSwitch = document.getElementById(
		'changeSessionsEnabledSwitch'
	);
	const changeSessionsMaxInput = document.getElementById(
		'changeSessionsMaxInput'
	);
	if (changeSessionsEnabledSwitch) {
		changeSessionsEnabledSwitch.addEventListener('change', () => {
			const isEnabled = changeSessionsEnabledSwitch.checked;
			chrome.storage.local.set({ changeSessionsEnabled: isEnabled }, () => {
				console.log(`Change sessions ${isEnabled ? 'enabled' : 'disabled'}`);
				showNotification(
					'Настройки Обновлены',
					`Сессии при изменении ${isEnabled ? 'включены' : 'отключены'}.`
				);
				loadSessions();
			});
		});
	}
	if (changeSessionsMaxInput) {
		changeSessionsMaxInput.addEventListener('change', () => {
			let maxValue = parseInt(changeSessionsMaxInput.value, 10);
			if (isNaN(maxValue) || maxValue < 0) {
				maxValue = 0;
			}
			chrome.storage.local.set({ changeSessionsMax: maxValue }, () => {
				console.log(`Change sessions max set to: ${maxValue}`);
				showNotification(
					'Настройки Обновлены',
					`Максимальное количество сессий при изменении установлено на ${maxValue}.`
				);
			});
		});
	}

	// --- Пользовательские группы ---
	const customGroupsEnabledSwitch = document.getElementById(
		'customGroupsEnabledSwitch'
	);
	if (customGroupsEnabledSwitch) {
		customGroupsEnabledSwitch.addEventListener('change', () => {
			const isEnabled = customGroupsEnabledSwitch.checked;
			chrome.storage.local.set({ customGroupsEnabled: isEnabled }, () => {
				console.log(`Custom groups ${isEnabled ? 'enabled' : 'disabled'}`);
				showNotification(
					'Настройки Обновлены',
					`Пользовательские группы ${isEnabled ? 'включены' : 'отключены'}.`
				);
				loadSessions();
			});
		});
	}

	// --- Переключатель Темы ---
	if (themeSwitch) {
		themeSwitch.addEventListener('change', () => {
			if (themeSwitch.checked) {
				htmlElement.classList.add('dark-theme');
				chrome.storage.local.set({ theme: 'dark' }, () => {
					console.log('Theme set to dark');
				});
			} else {
				htmlElement.classList.remove('dark-theme');
				chrome.storage.local.set({ theme: 'light' }, () => {
					console.log('Theme set to light');
				});
			}
		});
	}

	// --- Переключатель Уведомлений ---
	if (notificationSwitch) {
		notificationSwitch.addEventListener('change', () => {
			const isEnabled = notificationSwitch.checked;
			chrome.storage.local.set({ notificationsEnabled: isEnabled }, () => {
				console.log(`Notifications ${isEnabled ? 'enabled' : 'disabled'}`);
				showNotification(
					'Настройки Обновлены',
					`Push уведомления ${isEnabled ? 'включены' : 'отключены'}.`
				);
			});
		});
	}

	// --- Интервал Автобэкапа ---
	if (intervalInput) {
		intervalInput.addEventListener('change', () => {
			let intervalValue = parseInt(intervalInput.value, 10);
			console.log(`AutoBackup interval changed to: ${intervalValue}`);
			if (intervalValue >= 1) {
				chrome.storage.local.set({ autoBackupInterval: intervalValue }, () => {
					showNotification(
						'Настройки Обновлены',
						`Интервал автосохранения установлен на ${intervalValue} минут.`
					);
				});
			} else {
				intervalInput.value = 10;
				chrome.storage.local.set({ autoBackupInterval: 10 }, () => {
					showNotification(
						'Настройки Обновлены',
						'Интервал автосохранения сброшен на значение по умолчанию (10 минут).'
					);
				});
			}
		});
	}

	// --- Кнопки Импорта и Экспорта ---
	if (importBtn && importFileInput) {
		importBtn.addEventListener('click', () => {
			console.log('Import button clicked');
			importFileInput.click();
		});
		importFileInput.addEventListener('change', handleImportFile);
	}
	if (exportBtn) {
		exportBtn.addEventListener('click', () => {
			console.log('Export button clicked');
			exportSessions();
		});
	}

	// --- Инициализация значений настроек при открытии вкладки "Настройки" ---
	initializeSettings(themeSwitch, notificationSwitch, intervalInput);
}

/**
 * Инициализирует значения настроек на вкладке "Настройки".
 * @param {HTMLElement} themeSwitch - Переключатель темы.
 * @param {HTMLElement} notificationSwitch - Переключатель уведомлений.
 * @param {HTMLElement} intervalInput - Поле ввода интервала автосохранения.
 */
function initializeSettings(themeSwitch, notificationSwitch, intervalInput) {
	const htmlElement = document.documentElement;

	// Тема
	chrome.storage.local.get(['theme'], (result) => {
		const savedTheme = result.theme || 'light';
		console.log(`Initializing theme: ${savedTheme}`);
		if (savedTheme === 'dark') {
			htmlElement.classList.add('dark-theme');
			if (themeSwitch) themeSwitch.checked = true;
		} else {
			htmlElement.classList.remove('dark-theme');
			if (themeSwitch) themeSwitch.checked = false;
		}
	});

	// Уведомления
	chrome.storage.local.get(['notificationsEnabled'], (result) => {
		const notificationsEnabled = result.notificationsEnabled !== false;
		if (notificationSwitch) notificationSwitch.checked = notificationsEnabled;
		console.log(`Initializing notifications: ${notificationsEnabled}`);
	});

	// Интервал
	chrome.storage.local.get(['autoBackupInterval'], (result) => {
		const interval = result.autoBackupInterval || 10;
		if (intervalInput) intervalInput.value = interval;
		console.log(`Initializing autoBackupInterval: ${interval}`);
	});

	// Настройки ручных сессий
	const manualSessionsEnabledSwitch = document.getElementById(
		'manualSessionsEnabledSwitch'
	);
	const manualSessionsMaxInput = document.getElementById(
		'manualSessionsMaxInput'
	);
	chrome.storage.local.get(
		['manualSessionsEnabled', 'manualSessionsMax'],
		(result) => {
			const manualSessionsEnabled = result.manualSessionsEnabled !== false;
			if (manualSessionsEnabledSwitch) {
				manualSessionsEnabledSwitch.checked = manualSessionsEnabled;
			}
			const manualSessionsMax = result.manualSessionsMax;
			if (manualSessionsMaxInput) {
				manualSessionsMaxInput.value =
					manualSessionsMax !== undefined ? manualSessionsMax : 5;
			}
		}
	);

	// Авто сессии
	const autoSessionsEnabledSwitch = document.getElementById(
		'autoSessionsEnabledSwitch'
	);
	const autoSessionsMaxInput = document.getElementById('autoSessionsMaxInput');
	chrome.storage.local.get(
		['autoSessionsEnabled', 'autoSessionsMax'],
		(result) => {
			const autoSessionsEnabled = result.autoSessionsEnabled !== false;
			if (autoSessionsEnabledSwitch) {
				autoSessionsEnabledSwitch.checked = autoSessionsEnabled;
			}
			const autoSessionsMax = result.autoSessionsMax;
			if (autoSessionsMaxInput) {
				autoSessionsMaxInput.value =
					autoSessionsMax !== undefined ? autoSessionsMax : 5;
			}
		}
	);

	// Сессии при изменении вкладок
	const changeSessionsEnabledSwitch = document.getElementById(
		'changeSessionsEnabledSwitch'
	);
	const changeSessionsMaxInput = document.getElementById(
		'changeSessionsMaxInput'
	);
	chrome.storage.local.get(
		['changeSessionsEnabled', 'changeSessionsMax'],
		(result) => {
			const changeSessionsEnabled = result.changeSessionsEnabled !== false;
			if (changeSessionsEnabledSwitch) {
				changeSessionsEnabledSwitch.checked = changeSessionsEnabled;
			}
			const changeSessionsMax = result.changeSessionsMax;
			if (changeSessionsMaxInput) {
				changeSessionsMaxInput.value =
					changeSessionsMax !== undefined ? changeSessionsMax : 5;
			}
		}
	);

	// Пользовательские группы
	const customGroupsEnabledSwitch = document.getElementById(
		'customGroupsEnabledSwitch'
	);
	chrome.storage.local.get(['customGroupsEnabled'], (result) => {
		const customGroupsEnabled = result.customGroupsEnabled !== false;
		if (customGroupsEnabledSwitch) {
			customGroupsEnabledSwitch.checked = customGroupsEnabled;
			console.log(`Initializing custom groups: ${customGroupsEnabled}`);
		}
	});
}

/**
 * Обрабатывает импортированный файл.
 * @param {Event} event - Событие изменения файла.
 */
function handleImportFile(event) {
	const fileInput = event.target;
	if (!fileInput.files || fileInput.files.length === 0) {
		console.error('Файл для импорта не выбран.');
		return;
	}

	const file = fileInput.files[0];
	const reader = new FileReader();

	reader.onload = function (e) {
		try {
			const importedData = JSON.parse(e.target.result);
			// Обработка импортированных данных
			// Например, сохранение данных в хранилище Chrome:
			chrome.storage.local.set(importedData, () => {
				if (chrome.runtime.lastError) {
					console.error(
						'Ошибка при сохранении импортированных данных:',
						chrome.runtime.lastError
					);
				} else {
					showNotification('Импорт', 'Данные успешно импортированы.');
					// Дополнительные действия после успешного импорта, например, обновление интерфейса
				}
			});
		} catch (err) {
			console.error('Ошибка при чтении или парсинге файла импорта:', err);
			showNotification(
				'Ошибка импорта',
				'Не удалось обработать выбранный файл.'
			);
		}
	};

	reader.onerror = function (err) {
		console.error('Ошибка при чтении файла:', err);
		showNotification('Ошибка импорта', 'Не удалось прочитать файл.');
	};

	reader.readAsText(file);
}
