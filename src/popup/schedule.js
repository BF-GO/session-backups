// src/popup/schedule.js

import { formatTimestamp, isValidUrl, showNotification } from './utils.js';

/**
 * Привязывает обработчики событий для вкладки "Планирование".
 */
export function attachScheduleTabEventListeners() {
	console.log('Вкладка "Планирование" загружена.');

	const scheduleSessionOption = document.getElementById(
		'scheduleSessionOption'
	);
	const scheduleCustomOption = document.getElementById('scheduleCustomOption');
	const sessionScheduleOptions = document.getElementById(
		'sessionScheduleOptions'
	);
	const customScheduleOptions = document.getElementById(
		'customScheduleOptions'
	);
	const sessionSelect = document.getElementById('sessionSelect');
	const customUrlsContainer = document.getElementById('customUrlsContainer');
	const scheduleDateTimeInput = document.getElementById('scheduleDateTime');
	const addScheduleBtn = document.getElementById('addScheduleBtn');
	const scheduledSessionsList = document.getElementById(
		'scheduledSessionsList'
	);
	const addUrlBtn = document.getElementById('addUrlBtn');

	if (
		!sessionSelect ||
		!scheduleDateTimeInput ||
		!addScheduleBtn ||
		!scheduledSessionsList ||
		!scheduleSessionOption ||
		!scheduleCustomOption ||
		!sessionScheduleOptions ||
		!customScheduleOptions ||
		!customUrlsContainer ||
		!addUrlBtn
	) {
		console.error('One or more schedule elements not found');
		return;
	}

	// Переключение типа планировки
	scheduleSessionOption.addEventListener('change', updateScheduleType);
	scheduleCustomOption.addEventListener('change', updateScheduleType);
	updateScheduleType();

	// Загрузить сессии в выпадающий список
	loadSessionsForScheduling(sessionSelect);

	// Загрузить уже запланированные сессии
	loadScheduledSessions();

	// Обработчик для добавления новой планировки
	addScheduleBtn.addEventListener('click', () => {
		const scheduleDateTime = scheduleDateTimeInput.value;
		if (!scheduleDateTime) {
			alert('Пожалуйста, установите дату и время.');
			return;
		}
		const scheduleTime = new Date(scheduleDateTime);
		if (isNaN(scheduleTime.getTime())) {
			alert('Неверный формат даты и времени.');
			return;
		}
		if (scheduleTime <= new Date()) {
			alert('Выберите будущую дату и время.');
			return;
		}

		const scheduleId = 'schedule_' + Date.now();
		if (scheduleSessionOption.checked) {
			const selectedSessionId = sessionSelect.value;
			if (!selectedSessionId) {
				alert('Пожалуйста, выберите сессию.');
				return;
			}
			// Создаем новую запланированную сессию
			const scheduledSession = {
				id: scheduleId,
				type: 'session',
				sessionId: selectedSessionId,
				time: scheduleTime.toISOString(),
			};
			saveScheduledSession(scheduledSession);
		} else if (scheduleCustomOption.checked) {
			// Собираем все URL
			const urlInputs = customUrlsContainer.querySelectorAll('.customUrl');
			const urls = Array.from(urlInputs)
				.map((input) => input.value.trim())
				.filter((url) => url);

			if (urls.length === 0) {
				alert('Пожалуйста, введите хотя бы одну ссылку.');
				return;
			}
			const invalidUrls = urls.filter((url) => !isValidUrl(url));
			if (invalidUrls.length > 0) {
				alert('Найдены недействительные ссылки:\n' + invalidUrls.join('\n'));
				return;
			}
			const scheduledSession = {
				id: scheduleId,
				type: 'custom',
				urls: urls,
				time: scheduleTime.toISOString(),
			};
			saveScheduledSession(scheduledSession);
		}
	});

	// Обработчик добавления новых полей ввода ссылок
	addUrlBtn.addEventListener('click', () => {
		addCustomUrlInput();
	});
}

/**
 * Переключает отображение опций планировки (сессии или кастомные ссылки).
 */
function updateScheduleType() {
	const scheduleSessionOption = document.getElementById(
		'scheduleSessionOption'
	);
	const scheduleCustomOption = document.getElementById('scheduleCustomOption');
	const sessionScheduleOptions = document.getElementById(
		'sessionScheduleOptions'
	);
	const customScheduleOptions = document.getElementById(
		'customScheduleOptions'
	);

	if (
		scheduleSessionOption &&
		scheduleCustomOption &&
		sessionScheduleOptions &&
		customScheduleOptions
	) {
		if (scheduleSessionOption.checked) {
			sessionScheduleOptions.style.display = 'block';
			customScheduleOptions.style.display = 'none';
		} else if (scheduleCustomOption.checked) {
			sessionScheduleOptions.style.display = 'none';
			customScheduleOptions.style.display = 'block';
		}
	}
}

/**
 * Загружает сессии в select элемент для планирования.
 * @param {HTMLElement} sessionSelect - Элемент select для сессий.
 */
function loadSessionsForScheduling(sessionSelect) {
	chrome.storage.local.get(
		['autoSessions', 'changeSessions', 'manualSessions'],
		(result) => {
			const autoSessions = result.autoSessions || [];
			const changeSessions = result.changeSessions || [];
			const manualSessions = result.manualSessions || [];
			const allSessions = [
				...autoSessions.map((s, index) => ({
					...s,
					type: 'autoSessions',
					index,
				})),
				...changeSessions.map((s, index) => ({
					...s,
					type: 'changeSessions',
					index,
				})),
				...manualSessions.map((s, index) => ({
					...s,
					type: 'manualSessions',
					index,
				})),
			];

			sessionSelect.innerHTML = '';
			allSessions.forEach((session) => {
				const option = document.createElement('option');
				option.value = `${session.type}_${session.index}`;
				option.textContent = `${
					session.type === 'autoSessions'
						? 'Авто'
						: session.type === 'changeSessions'
						? 'Изменение'
						: 'Ручная'
				} - ${formatTimestamp(session.timestamp)}`;
				sessionSelect.appendChild(option);
			});
		}
	);
}

/**
 * Сохраняет запланированную сессию в хранилище.
 * @param {Object} scheduledSession - Объект запланированной сессии.
 */
function saveScheduledSession(scheduledSession) {
	chrome.storage.local.get(['scheduledSessions'], (result) => {
		let scheduledSessions = result.scheduledSessions || [];
		scheduledSessions.push(scheduledSession);
		chrome.storage.local.set({ scheduledSessions }, () => {
			if (chrome.runtime.lastError) {
				console.error(
					'Error saving scheduled session:',
					chrome.runtime.lastError
				);
			} else {
				// Просим background.js установить alarm
				chrome.runtime.sendMessage(
					{ action: 'scheduleSession', scheduledSession },
					(response) => {
						if (response && response.status === 'success') {
							loadScheduledSessions();
							showNotification('Планировка', 'Планировка успешно добавлена.');
						} else {
							showNotification('Ошибка', 'Не удалось добавить планировку.');
						}
					}
				);
			}
		});
	});
}

/**
 * Загружает и отображает запланированные сессии.
 */
function loadScheduledSessions() {
	const scheduledSessionsList = document.getElementById(
		'scheduledSessionsList'
	);
	if (!scheduledSessionsList) return;

	chrome.storage.local.get(['scheduledSessions'], (result) => {
		const scheduledSessions = result.scheduledSessions || [];
		scheduledSessionsList.innerHTML = '';

		if (scheduledSessions.length === 0) {
			scheduledSessionsList.innerHTML = '<li>Нет запланированных сессий</li>';
			return;
		}

		scheduledSessions.forEach((scheduledSession) => {
			const listItem = document.createElement('li');
			const scheduleTime = formatTimestamp(scheduledSession.time);
			let description = '';
			if (scheduledSession.type === 'session') {
				description = `Сессия: ${scheduledSession.sessionId}`;
			} else if (scheduledSession.type === 'custom') {
				description = `Пользовательские ссылки (${scheduledSession.urls.length})`;
			}

			listItem.textContent = `${description}, Время: ${scheduleTime}`;

			// Кнопка отмены
			const cancelButton = document.createElement('button');
			cancelButton.textContent = 'Отменить';
			cancelButton.className = 'button-small';
			cancelButton.addEventListener('click', () => {
				cancelScheduledSession(scheduledSession.id);
			});

			listItem.appendChild(cancelButton);
			scheduledSessionsList.appendChild(listItem);
		});
	});
}

/**
 * Отменяет запланированную сессию.
 * @param {string} scheduleId - ID запланированной сессии.
 */
function cancelScheduledSession(scheduleId) {
	chrome.storage.local.get(['scheduledSessions'], (result) => {
		let scheduledSessions = result.scheduledSessions || [];
		scheduledSessions = scheduledSessions.filter((s) => s.id !== scheduleId);
		chrome.storage.local.set({ scheduledSessions }, () => {
			if (chrome.runtime.lastError) {
				console.error(
					'Error cancelling scheduled session:',
					chrome.runtime.lastError
				);
				showNotification('Ошибка', 'Не удалось отменить планировку.');
			} else {
				chrome.runtime.sendMessage(
					{ action: 'cancelScheduledSession', scheduleId },
					(response) => {
						if (response && response.status === 'success') {
							loadScheduledSessions();
							showNotification('Планировка', 'Планировка отменена.');
						} else {
							showNotification('Ошибка', 'Не удалось отменить планировку.');
						}
					}
				);
			}
		});
	});
}

/**
 * Добавляет новое поле ввода URL для кастомных планировок.
 */
function addCustomUrlInput() {
	const customUrlsContainer = document.getElementById('customUrlsContainer');
	if (!customUrlsContainer) return;

	const urlInputGroup = document.createElement('div');
	urlInputGroup.className = 'url-input-group';

	const newInput = document.createElement('input');
	newInput.type = 'url';
	newInput.className = 'customUrl';
	newInput.placeholder = 'https://example.com';
	newInput.required = true;

	const removeBtn = document.createElement('button');
	removeBtn.type = 'button';
	removeBtn.className = 'button-small remove-url-btn';
	removeBtn.textContent = '−';

	removeBtn.addEventListener('click', () => {
		customUrlsContainer.removeChild(urlInputGroup);
	});

	urlInputGroup.appendChild(newInput);
	urlInputGroup.appendChild(removeBtn);
	customUrlsContainer.appendChild(urlInputGroup);
}
