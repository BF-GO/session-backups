// src/popup/utils.js

/**
 * Загружает указанную вкладку.
 * @param {string} tabName - Имя вкладки для загрузки.
 * @param {function} attachEventListeners - Функция для привязки обработчиков событий вкладки.
 * @param {function} loadContent - Функция для загрузки содержимого вкладки.
 */
export function loadTab(tabName, attachEventListeners, loadContent) {
	console.log(`Loading tab: ${tabName}`);
	const contentContainer = document.getElementById('contentContainer');
	if (!contentContainer) {
		console.error('No contentContainer found.');
		return;
	}

	// Ищем <template> для каждой вкладки
	const templateId = `${tabName}TabTemplate`;
	const tabTemplate = document.getElementById(templateId);

	if (!tabTemplate) {
		console.error(`${templateId} not found.`);
		return;
	}

	// Снимаем active-классы со всех кнопок .tab-button
	document.querySelectorAll('.tab-button').forEach((button) => {
		button.classList.remove('active');
	});

	// Добавляем active на ту кнопку, которая кликнута
	const activeTabButton = document.querySelector(
		`.tab-button[data-tab="${tabName}"]`
	);
	if (activeTabButton) activeTabButton.classList.add('active');

	// Очищаем содержимое контейнера
	contentContainer.innerHTML = '';

	// Клонируем и вставляем содержимое шаблона
	const clone = tabTemplate.content.cloneNode(true);
	contentContainer.appendChild(clone);
	console.log(`Loaded ${tabName} tab template`);

	// Вызываем функции для привязки обработчиков и загрузки содержимого
	if (attachEventListeners && typeof attachEventListeners === 'function') {
		attachEventListeners();
	}

	if (loadContent && typeof loadContent === 'function') {
		loadContent();
	}

	// Добавляем active-класс к содержимому вкладки
	const activeTabContent = contentContainer.querySelector('.tab-content');
	if (activeTabContent) {
		activeTabContent.classList.add('active');
		console.log(`Activated tab content: ${tabName}`);
	}
}

/**
 * Показывает уведомление пользователю.
 * @param {string} title - Заголовок уведомления.
 * @param {string} message - Сообщение уведомления.
 */
export function showNotification(title, message) {
	console.log(`Showing notification: ${title} - ${message}`);
	chrome.storage.local.get(['notificationsEnabled'], (result) => {
		if (result.notificationsEnabled !== false) {
			if (chrome.notifications && chrome.notifications.create) {
				chrome.notifications.create(
					'',
					{
						type: 'basic',
						iconUrl: 'icons/icon48.png',
						title: title,
						message: message,
					},
					(notificationId) => {
						if (chrome.runtime.lastError) {
							console.error('Notification Error:', chrome.runtime.lastError);
						} else {
							console.log('Notification shown with ID:', notificationId);
						}
					}
				);
			} else {
				alert(`${title}: ${message}`);
			}
		}
	});
}

/**
 * Форматирует временную метку в читаемый формат.
 * @param {number} timestamp - Временная метка.
 * @returns {string} Отформатированная дата и время.
 */
export function formatTimestamp(timestamp) {
	const date = new Date(timestamp);
	if (isNaN(date.getTime())) {
		console.error('Invalid date detected:', timestamp);
		return 'Неверная дата';
	}
	return date.toLocaleString('ru-RU', {
		timeZone: 'Europe/Moscow',
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

/**
 * Экранирует HTML-символы в строке.
 * @param {string} text - Исходный текст.
 * @returns {string} Экранированный текст.
 */
export function escapeHtml(text) {
	const map = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#039;',
	};
	return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Проверяет, является ли строка валидным URL.
 * @param {string} string - Проверяемая строка.
 * @returns {boolean} `true` если валидный URL, иначе `false`.
 */
export function isValidUrl(string) {
	try {
		new URL(string);
		return true;
	} catch (_) {
		return false;
	}
}
