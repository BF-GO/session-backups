// src/popup/sessions.js

import { escapeHtml, formatTimestamp, showNotification } from './utils.js';

/**
 * Привязывает обработчики событий для вкладки "Сессии".
 */
export function attachSessionsTabEventListeners() {
	const contentContainer = document.getElementById('contentContainer');
	if (!contentContainer) return;

	// Делегирование кликов внутри вкладки "Сессии"
	contentContainer.addEventListener('click', handleSessionClick);

	// Обработчики для создания группы
	const createGroupBtn = document.getElementById('createGroupBtn');
	const createGroupForm = document.getElementById('createGroupForm');
	const saveGroupBtn = document.getElementById('saveGroupBtn');
	const cancelGroupBtn = document.getElementById('cancelGroupBtn');
	const addGroupUrlBtn = document.getElementById('addGroupUrlBtn');
	const groupSessionOption = document.getElementById('groupSessionOption');
	const groupCustomOption = document.getElementById('groupCustomOption');

	if (createGroupBtn) {
		createGroupBtn.addEventListener('click', () => {
			if (createGroupForm) {
				createGroupForm.style.display = 'block';
			}
		});
	}

	if (saveGroupBtn) {
		saveGroupBtn.addEventListener('click', saveGroup);
	}

	if (cancelGroupBtn) {
		cancelGroupBtn.addEventListener('click', () => {
			if (createGroupForm) {
				createGroupForm.style.display = 'none';
				resetCreateGroupForm();
			}
		});
	}

	if (addGroupUrlBtn) {
		addGroupUrlBtn.addEventListener('click', addCustomGroupUrlInput);
	}

	if (groupSessionOption) {
		groupSessionOption.addEventListener('change', updateGroupType);
	}
	if (groupCustomOption) {
		groupCustomOption.addEventListener('change', updateGroupType);
	}

	// Кнопка "Сохранить ручную сессию"
	const saveManualSessionBtn = document.getElementById('saveBtn');
	if (saveManualSessionBtn) {
		saveManualSessionBtn.addEventListener('click', () => {
			openSaveSessionDialog();
		});
	}

	// Изначально переключаем отображение блоков (groupSessionOption / groupCustomOption)
	updateGroupType();
}

/**
 * Загружает и отображает сессии из хранилища.
 */
export function loadSessions() {
	console.log('Loading sessions');
	chrome.storage.local.get(
		[
			'manualSessions',
			'autoSessions',
			'changeSessions',
			'groups',
			'manualSessionsEnabled',
			'autoSessionsEnabled',
			'changeSessionsEnabled',
			'customGroupsEnabled',
		],
		(result) => {
			const manualSessionsEnabled = result.manualSessionsEnabled !== false;
			const autoSessionsEnabled = result.autoSessionsEnabled !== false;
			const changeSessionsEnabled = result.changeSessionsEnabled !== false;
			const customGroupsEnabled = result.customGroupsEnabled !== false;

			const manualSessionsDiv = document.getElementById('manualSessions');
			const autoSessionsDiv = document.getElementById('autoSessions');
			const changeSessionsDiv = document.getElementById('changeSessions');
			const customGroupsDiv = document.getElementById('customGroups');

			// Ручные сессии
			if (manualSessionsDiv) {
				if (manualSessionsEnabled) {
					manualSessionsDiv.style.display = 'block';
					const manualSessions = result.manualSessions || [];
					console.log(`Loaded manualSessions: ${manualSessions.length}`);
					populateSessionList('manualSessions', manualSessions);
				} else {
					manualSessionsDiv.style.display = 'none';
				}
			}

			// Автоматические сессии
			if (autoSessionsDiv) {
				if (autoSessionsEnabled) {
					autoSessionsDiv.style.display = 'block';
					const autoSessions = result.autoSessions || [];
					console.log(`Loaded autoSessions: ${autoSessions.length}`);
					populateSessionList('autoSessions', autoSessions);
				} else {
					autoSessionsDiv.style.display = 'none';
				}
			}

			// Сессии при изменении вкладок
			if (changeSessionsDiv) {
				if (changeSessionsEnabled) {
					changeSessionsDiv.style.display = 'block';
					const changeSessions = result.changeSessions || [];
					console.log(`Loaded changeSessions: ${changeSessions.length}`);
					populateSessionList('changeSessions', changeSessions);
				} else {
					changeSessionsDiv.style.display = 'none';
				}
			}

			// Пользовательские группы
			if (customGroupsDiv) {
				if (customGroupsEnabled) {
					customGroupsDiv.style.display = 'block';
					const groups = result.groups || [];
					console.log(`Loaded groups: ${groups.length}`);
					populateSessionList('customGroups', groups);
				} else {
					customGroupsDiv.style.display = 'none';
				}
			}

			// Если включены кастомные группы, загрузим их
			if (customGroupsEnabled) {
				loadGroups();
				populateSessionsForGroupCreation();
			} else {
				const sessionSelectForGroup = document.getElementById(
					'sessionSelectForGroup'
				);
				if (sessionSelectForGroup) {
					sessionSelectForGroup.innerHTML = '';
				}
			}
		}
	);
}

/**
 * Обрабатывает клики внутри вкладки "Сессии".
 * @param {Event} e - Событие клика.
 */
function handleSessionClick(e) {
	// Сессии
	if (e.target.classList.contains('view-btn')) {
		const sessionIndex = e.target.getAttribute('data-index');
		const sessionType = e.target.getAttribute('data-type');
		console.log(`View session: Type=${sessionType}, Index=${sessionIndex}`);
		viewSessionDetails(sessionIndex, sessionType, e.target);
	} else if (e.target.classList.contains('restore-btn')) {
		const windowIndex = e.target.getAttribute('data-window-index');
		const sessionType = e.target.getAttribute('data-session-type');
		const sessionIndex = e.target.getAttribute('data-session-index');
		console.log(
			`Restore window: Type=${sessionType}, SessionIndex=${sessionIndex}, WindowIndex=${windowIndex}`
		);
		restoreWindowFromSession(windowIndex, sessionType, sessionIndex);
	} else if (e.target.classList.contains('toggle-tabs-btn')) {
		const tabsContainer = e.target.nextElementSibling;
		if (tabsContainer.style.display === 'block') {
			tabsContainer.style.display = 'none';
			e.target.textContent = 'Показать Вкладки';
		} else {
			tabsContainer.style.display = 'block';
			e.target.textContent = 'Скрыть Вкладки';
		}
	} else if (e.target.classList.contains('delete-btn')) {
		const sessionIndex = e.target.getAttribute('data-index');
		const sessionType = e.target.getAttribute('data-type');
		console.log(`Delete session: Type=${sessionType}, Index=${sessionIndex}`);
		deleteSession(sessionIndex, sessionType);
	} else if (e.target.classList.contains('export-btn')) {
		const sessionIndex = e.target.getAttribute('data-index');
		const sessionType = e.target.getAttribute('data-type');
		console.log(`Export session: Type=${sessionType}, Index=${sessionIndex}`);
		exportSingleSession(sessionIndex, sessionType);
	}

	// Группы
	if (e.target.classList.contains('view-group-btn')) {
		const groupIndex = e.target.getAttribute('data-index');
		console.log(`View group: Index=${groupIndex}`);
		viewGroupDetails(groupIndex, e.target);
	} else if (e.target.classList.contains('delete-group-btn')) {
		const groupIndex = e.target.getAttribute('data-index');
		console.log(`Delete group: Index=${groupIndex}`);
		deleteGroup(groupIndex);
	}
}

/**
 * Заполняет список сессий в указанном элементе.
 * @param {string} elementId - ID элемента списка.
 * @param {Array} sessions - Массив сессий.
 */
function populateSessionList(elementId, sessions) {
	const sessionList = document.getElementById(elementId);
	if (!sessionList) {
		console.error(`Element with id "${elementId}" not found.`);
		return;
	}

	let headerText = '';
	switch (elementId) {
		case 'autoSessions':
			headerText = 'Автоматические Сессии';
			break;
		case 'changeSessions':
			headerText = 'Сессии при Изменении Вкладок';
			break;
		case 'manualSessions':
			headerText = 'Ручные Сессии';
			break;
		case 'customGroups':
			headerText = 'Пользовательские Группы';
			break;
		default:
			headerText = 'Сессии';
	}

	sessionList.innerHTML = `<h3>${headerText}</h3>`;
	if (sessions.length === 0) {
		sessionList.innerHTML += '<p>Нет доступных сессий</p>';
		return;
	}

	const fragment = document.createDocumentFragment();
	sessions.forEach((session, index) => {
		const sessionItem = document.createElement('div');
		sessionItem.className = 'session-item';
		sessionItem.innerHTML = `
          <div class="session-header">
            <span>${escapeHtml(
							session.name || formatTimestamp(session.timestamp)
						)}</span>
            <div>
              <button class="button-small view-btn" data-index="${index}" data-type="${elementId}">Просмотреть</button>
              <button class="button-small export-btn" data-index="${index}" data-type="${elementId}">Экспорт</button>
              <button class="button-small delete-btn" data-index="${index}" data-type="${elementId}">Удалить</button>
            </div>
          </div>
          <div class="session-details" style="display: none;"></div>
        `;
		fragment.appendChild(sessionItem);
	});
	sessionList.appendChild(fragment);
}

/**
 * Отображает детали выбранной сессии.
 * @param {string} sessionIndex - Индекс сессии.
 * @param {string} sessionType - Тип сессии.
 * @param {HTMLElement} button - Кнопка, вызвавшая событие.
 */
function viewSessionDetails(sessionIndex, sessionType, button) {
	console.log(
		`Viewing session details: Type=${sessionType}, Index=${sessionIndex}`
	);
	chrome.storage.local.get([sessionType], (result) => {
		const sessions = result[sessionType] || [];
		const session = sessions[sessionIndex];

		if (!session) {
			console.error('Session not found:', sessionIndex, sessionType);
			showNotification('Ошибка', 'Сессия не найдена.');
			return;
		}

		const detailsDiv = button.parentElement.parentElement.nextElementSibling;
		if (detailsDiv.style.display === 'block') {
			detailsDiv.style.display = 'none';
			button.textContent = 'Просмотреть';
			return;
		}

		detailsDiv.innerHTML = '';

		session.windows.forEach((window, index) => {
			const windowItem = document.createElement('div');
			windowItem.className = 'window-item';
			windowItem.innerHTML = `
            <p>Окно ${index + 1} (${window.tabs.length} вкладок)</p>
            <button class="button-small toggle-tabs-btn">Показать Вкладки</button>
            <div class="tabs-container" style="display: none;">
              <ul>
                ${window.tabs
									.map(
										(tab) =>
											`<li><a href="${
												tab.url
											}" target="_blank" title="${escapeHtml(
												tab.title
											)}">${escapeHtml(tab.title)}</a></li>`
									)
									.join('')}
              </ul>
              <button class="button-small restore-btn" data-window-index="${index}" data-session-type="${sessionType}" data-session-index="${sessionIndex}">
                Восстановить Это Окно
              </button>
            </div>
          `;
			detailsDiv.appendChild(windowItem);
		});

		const restoreAllButton = document.createElement('button');
		restoreAllButton.className = 'button';
		restoreAllButton.textContent = 'Восстановить Все Окна';
		restoreAllButton.onclick = () => restoreAllWindows(session.windows);

		detailsDiv.appendChild(restoreAllButton);
		detailsDiv.style.display = 'block';
		button.textContent = 'Скрыть';
	});
}

/**
 * Восстанавливает окно из сессии.
 * @param {number} windowIndex - Индекс окна.
 * @param {string} sessionType - Тип сессии.
 * @param {number} sessionIndex - Индекс сессии.
 */
function restoreWindowFromSession(windowIndex, sessionType, sessionIndex) {
	console.log(
		`Restoring window: Type=${sessionType}, SessionIndex=${sessionIndex}, WindowIndex=${windowIndex}`
	);
	chrome.storage.local.get([sessionType], (result) => {
		const sessions = result[sessionType] || [];
		const session = sessions[sessionIndex];
		if (session && session.windows[windowIndex]) {
			restoreWindow(session.windows[windowIndex].tabs);
		} else {
			console.error('No matching session found for restoration.');
			showNotification('Ошибка', 'Сессия не найдена.');
		}
	});
}

/**
 * Восстанавливает окно с указанными вкладками.
 * @param {Array} tabs - Массив вкладок для восстановления.
 */
function restoreWindow(tabs) {
	console.log(`Restoring window with ${tabs.length} tabs`);
	if (tabs.length === 0) return;

	const firstTab = tabs[0].url;
	const otherTabs = tabs.slice(1).map((tab) => tab.url);

	chrome.windows.create({ url: firstTab, state: 'normal' }, (newWindow) => {
		if (!newWindow || !newWindow.id) {
			console.error('Failed to create new window.');
			showNotification('Ошибка', 'Не удалось создать новое окно.');
			return;
		}

		const maxConcurrent = 5;
		let currentIndex = 0;

		function openNextBatch() {
			const batch = otherTabs.slice(currentIndex, currentIndex + maxConcurrent);
			batch.forEach((url) => {
				chrome.tabs.create(
					{
						windowId: newWindow.id,
						url,
						active: false,
						autoDiscardable: true,
					},
					(tab) => {
						if (chrome.runtime.lastError) {
							console.error('Error creating tab:', chrome.runtime.lastError);
						}
					}
				);
			});
			currentIndex += maxConcurrent;
			if (currentIndex < otherTabs.length) {
				setTimeout(openNextBatch, 500);
			}
		}
		openNextBatch();
	});
}

/**
 * Восстанавливает все окна из массива.
 * @param {Array} windows - Массив окон для восстановления.
 */
function restoreAllWindows(windows) {
	console.log(`Restoring all ${windows.length} windows`);
	windows.forEach((window, windowIndex) => {
		setTimeout(() => {
			restoreWindow(window.tabs);
		}, windowIndex * 900);
	});
}

/**
 * Отображает детали группы.
 * @param {number} groupIndex - Индекс группы.
 * @param {HTMLElement} button - Кнопка, вызвавшая событие.
 */
function viewGroupDetails(groupIndex, button) {
	chrome.storage.local.get(
		['groups', 'autoSessions', 'changeSessions', 'manualSessions'],
		(result) => {
			const groups = result.groups || [];
			const group = groups[groupIndex];
			if (!group) {
				console.error('Group not found:', groupIndex);
				showNotification('Ошибка', 'Группа не найдена.');
				return;
			}

			const detailsDiv = button.parentElement.parentElement.nextElementSibling;
			if (detailsDiv.style.display === 'block') {
				detailsDiv.style.display = 'none';
				button.textContent = 'Просмотреть';
				detailsDiv.classList.remove('group-details');
				return;
			}

			detailsDiv.innerHTML = '';
			if (group.type === 'session') {
				const sessionList = document.createElement('ul');
				group.sessions.forEach((sessionId) => {
					const [sessionType, sessionIndex] = sessionId.split('_');
					const sessions = result[sessionType] || [];
					const session = sessions[sessionIndex];
					const li = document.createElement('li');
					if (session) {
						li.textContent = `${
							sessionType === 'autoSessions'
								? 'Авто'
								: sessionType === 'changeSessions'
								? 'Изменение'
								: 'Ручная'
						} - ${formatTimestamp(session.timestamp)}`;
					} else {
						li.textContent = 'Сессия не найдена';
					}
					sessionList.appendChild(li);
				});
				detailsDiv.appendChild(sessionList);
			} else if (group.type === 'custom') {
				// Отображаем кастомные ссылки
				const linkList = document.createElement('ul');
				group.customLinks.forEach((url) => {
					const li = document.createElement('li');
					li.innerHTML = `<a href="${url}" target="_blank">${escapeHtml(
						url
					)}</a>`;
					linkList.appendChild(li);
				});
				detailsDiv.appendChild(linkList);
			}

			const restoreGroupButton = document.createElement('button');
			restoreGroupButton.className = 'button';
			restoreGroupButton.textContent = 'Восстановить Группу';
			restoreGroupButton.onclick = () => restoreGroup(group);

			detailsDiv.appendChild(restoreGroupButton);
			detailsDiv.classList.add('group-details');
			detailsDiv.style.display = 'block';
			button.textContent = 'Скрыть';
		}
	);
}

/**
 * Восстанавливает группу.
 * @param {Object} group - Объект группы для восстановления.
 */
function restoreGroup(group) {
	if (group.type === 'session') {
		group.sessions.forEach((sessionId) => {
			const [sessionType, sessionIndex] = sessionId.split('_');
			restoreSessionByTypeAndIndex(sessionType, sessionIndex);
		});
	} else if (group.type === 'custom') {
		openCustomUrls(group.customLinks);
	}
}

/**
 * Восстанавливает сессию по типу и индексу.
 * @param {string} sessionType - Тип сессии.
 * @param {number} sessionIndex - Индекс сессии.
 */
function restoreSessionByTypeAndIndex(sessionType, sessionIndex) {
	chrome.storage.local.get([sessionType], (result) => {
		const sessions = result[sessionType] || [];
		const session = sessions[sessionIndex];
		if (session) {
			restoreAllWindows(session.windows);
		} else {
			console.error('Session not found:', sessionType, sessionIndex);
			showNotification('Ошибка', 'Сессия не найдена.');
		}
	});
}

/**
 * Открывает кастомные URL.
 * @param {Array} urls - Массив URL для открытия.
 */
function openCustomUrls(urls) {
	console.log(`Opening custom URLs: ${urls.length}`);
	urls.forEach((url) => {
		chrome.tabs.create({ url, active: false }, (tab) => {
			if (chrome.runtime.lastError) {
				console.error('Error opening URL:', chrome.runtime.lastError);
			}
		});
	});
}

/**
 * Удаляет группу из хранилища.
 * @param {number} groupIndex - Индекс группы для удаления.
 */
function deleteGroup(groupIndex) {
	chrome.storage.local.get(['groups'], (result) => {
		let groups = result.groups || [];
		groups.splice(groupIndex, 1);
		chrome.storage.local.set({ groups }, () => {
			if (chrome.runtime.lastError) {
				console.error('Error deleting group:', chrome.runtime.lastError);
				showNotification('Ошибка', 'Не удалось удалить группу.');
			} else {
				loadGroups();
				showNotification('Успех', 'Группа успешно удалена.');
			}
		});
	});
}

/**
 * Удаляет сессию из хранилища.
 * @param {number} sessionIndex - Индекс сессии.
 * @param {string} sessionType - Тип сессии.
 */
function deleteSession(sessionIndex, sessionType) {
	console.log(`Deleting session: Type=${sessionType}, Index=${sessionIndex}`);
	chrome.storage.local.get([sessionType], (result) => {
		let sessions = result[sessionType] || [];
		sessions.splice(sessionIndex, 1);
		chrome.storage.local.set({ [sessionType]: sessions }, () => {
			if (chrome.runtime.lastError) {
				console.error('Error deleting session:', chrome.runtime.lastError);
				showNotification('Ошибка', 'Не удалось удалить сессию.');
			} else {
				loadSessions();
				showNotification('Успех', 'Сессия успешно удалена.');
			}
		});
	});
}

/**
 * Экспортирует одну сессию в JSON-файл.
 * @param {number} sessionIndex - Индекс сессии.
 * @param {string} sessionType - Тип сессии.
 */
function exportSingleSession(sessionIndex, sessionType) {
	console.log(`Exporting session: Type=${sessionType}, Index=${sessionIndex}`);
	chrome.storage.local.get([sessionType], (result) => {
		const sessions = result[sessionType] || [];
		const session = sessions[sessionIndex];
		if (!session) {
			console.error('Session not found:', sessionIndex, sessionType);
			showNotification('Ошибка', 'Сессия не найдена.');
			return;
		}

		const data = { [sessionType]: [session] };
		const jsonStr = JSON.stringify(data, null, 2);
		const blob = new Blob([jsonStr], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const downloadLink = document.createElement('a');
		downloadLink.href = url;
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		downloadLink.download = `session_${timestamp}.json`;
		document.body.appendChild(downloadLink);
		downloadLink.click();
		document.body.removeChild(downloadLink);
		URL.revokeObjectURL(url);
		showNotification('Экспорт', 'Сессия успешно экспортирована.');
	});
}

/**
 * Сохраняет ручную сессию в хранилище.
 * @param {Object} session - Объект сессии для сохранения.
 */
function saveManualSession(session) {
	chrome.storage.local.get(
		['manualSessions', 'manualSessionsMax', 'manualSessionsEnabled'],
		(result) => {
			if (result.manualSessionsEnabled === false) {
				console.log('Manual sessions are disabled.');
				showNotification('Ошибка', 'Ручные сессии отключены.');
				return;
			}
			let manualSessions = result.manualSessions || [];
			manualSessions.push(session);

			let manualSessionsMax = result.manualSessionsMax;
			if (manualSessionsMax === undefined || manualSessionsMax < 0) {
				manualSessionsMax = 5;
			}
			if (manualSessions.length > manualSessionsMax) {
				manualSessions = manualSessions.slice(
					manualSessions.length - manualSessionsMax
				);
			}
			chrome.storage.local.set({ manualSessions }, () => {
				if (chrome.runtime.lastError) {
					console.error(
						'Error saving manual session:',
						chrome.runtime.lastError
					);
					showNotification('Ошибка', 'Не удалось сохранить сессию.');
				} else {
					loadSessions();
					showNotification('Успех', 'Сессия успешно сохранена.');
				}
			});
		}
	);
}

/**
 * Открывает диалог сохранения сессии.
 */
export function openSaveSessionDialog() {
	chrome.windows.getAll({ populate: true }, (windows) => {
		const dialog = document.createElement('div');
		dialog.className = 'save-session-dialog';

		dialog.innerHTML = `
          <div class="dialog-content">
            <h2>Сохранить Сессию</h2>
            <label for="sessionNameInput">Название сессии:</label>
            <input type="text" id="sessionNameInput" placeholder="Введите название сессии" />
            <p>Выберите окна для сохранения:</p>
            <div id="windowSelectionContainer">
              ${windows
								.map(
									(win, index) => `
                  <label>
                    <input type="checkbox" class="window-checkbox" value="${
											win.id
										}" checked />
                    Окно ${index + 1} (${win.tabs.length} вкладок)
                  </label>
                `
								)
								.join('')}
            </div>
            <div style="display: flex; justify-content: flex-end;">
              <button id="saveSessionConfirmBtn" class="button">Сохранить</button>
              <button id="cancelSessionBtn" class="button">Отмена</button>
            </div>
          </div>
        `;
		const overlay = document.createElement('div');
		overlay.className = 'dialog-overlay active';
		overlay.appendChild(dialog);
		document.body.appendChild(overlay);

		document
			.getElementById('saveSessionConfirmBtn')
			.addEventListener('click', () => {
				const sessionNameInput = document.getElementById('sessionNameInput');
				const sessionName = sessionNameInput.value.trim();
				if (!sessionName) {
					alert('Пожалуйста, введите название сессии.');
					return;
				}
				const selectedWindowIds = Array.from(
					document.querySelectorAll('.window-checkbox:checked')
				).map((checkbox) => parseInt(checkbox.value));
				if (selectedWindowIds.length === 0) {
					alert('Пожалуйста, выберите хотя бы одно окно для сохранения.');
					return;
				}

				const selectedWindows = windows.filter((win) =>
					selectedWindowIds.includes(win.id)
				);
				const session = {
					id: 'manual_' + Date.now(),
					name: sessionName,
					timestamp: Date.now(),
					windows: selectedWindows.map((win) => ({
						tabs: win.tabs.map((tab) => ({
							title: tab.title,
							url: tab.url,
						})),
					})),
				};

				saveManualSession(session);
				document.body.removeChild(overlay);
			});

		document
			.getElementById('cancelSessionBtn')
			.addEventListener('click', () => {
				document.body.removeChild(overlay);
			});

		// Закрытие диалога по клику вне
		overlay.addEventListener('click', (e) => {
			if (e.target === overlay) {
				document.body.removeChild(overlay);
			}
		});
	});
}

/**
 * Сохраняет группу в хранилище.
 * @param {Object} newGroup - Объект группы для сохранения.
 */
export function saveGroup(newGroup) {
	saveGroupToStorage(newGroup);
}

/**
 * Сохраняет группу в хранилище.
 * @param {Object} newGroup - Объект группы для сохранения.
 */
function saveGroupToStorage(newGroup) {
	chrome.storage.local.get(['groups'], (result) => {
		let groups = result.groups || [];
		groups.push(newGroup);
		chrome.storage.local.set({ groups }, () => {
			if (chrome.runtime.lastError) {
				console.error('Error saving group:', chrome.runtime.lastError);
				showNotification('Ошибка', 'Не удалось сохранить группу.');
			} else {
				loadGroups();
				showNotification(
					'Группа Создана',
					`Группа "${newGroup.name}" успешно создана.`
				);
				const createGroupForm = document.getElementById('createGroupForm');
				if (createGroupForm) {
					createGroupForm.style.display = 'none';
				}
				resetCreateGroupForm();
			}
		});
	});
}

/**
 * Сбрасывает форму создания группы.
 */
function resetCreateGroupForm() {
	const groupNameInput = document.getElementById('groupNameInput');
	const customGroupUrlsContainer = document.getElementById(
		'customGroupUrlsContainer'
	);
	const groupSessionOption = document.getElementById('groupSessionOption');
	const groupCustomOption = document.getElementById('groupCustomOption');

	if (groupNameInput) groupNameInput.value = '';
	if (customGroupUrlsContainer) {
		customGroupUrlsContainer.innerHTML = '';
		addCustomGroupUrlInput();
	}
	if (groupSessionOption) groupSessionOption.checked = true;
	if (groupCustomOption) groupCustomOption.checked = false;
	updateGroupType();
}

/**
 * Добавляет поле ввода URL для пользовательских групп.
 */
function addCustomGroupUrlInput() {
	const customGroupUrlsContainer = document.getElementById(
		'customGroupUrlsContainer'
	);
	if (!customGroupUrlsContainer) return;

	const urlInputGroup = document.createElement('div');
	urlInputGroup.className = 'url-input-group';

	const newInput = document.createElement('input');
	newInput.type = 'url';
	newInput.className = 'customGroupUrl';
	newInput.placeholder = 'https://example.com';
	newInput.required = true;

	const removeBtn = document.createElement('button');
	removeBtn.type = 'button';
	removeBtn.className = 'button-small remove-url-btn';
	removeBtn.textContent = '−';

	removeBtn.addEventListener('click', () => {
		customGroupUrlsContainer.removeChild(urlInputGroup);
	});

	urlInputGroup.appendChild(newInput);
	urlInputGroup.appendChild(removeBtn);
	customGroupUrlsContainer.appendChild(urlInputGroup);
}

/**
 * Переключает отображение опций группы (сессии или кастомные ссылки).
 */
function updateGroupType() {
	const groupSessionOption = document.getElementById('groupSessionOption');
	const groupCustomOption = document.getElementById('groupCustomOption');
	const sessionGroupOptions = document.getElementById('sessionGroupOptions');
	const customGroupOptions = document.getElementById('customGroupOptions');

	if (
		groupSessionOption &&
		groupCustomOption &&
		sessionGroupOptions &&
		customGroupOptions
	) {
		if (groupSessionOption.checked) {
			sessionGroupOptions.style.display = 'block';
			customGroupOptions.style.display = 'none';
		} else if (groupCustomOption.checked) {
			sessionGroupOptions.style.display = 'none';
			customGroupOptions.style.display = 'block';
		}
	}
}

/**
 * Загружает группы и отображает их.
 */
function loadGroups() {
	const customGroupsContainer = document.getElementById('customGroups');
	if (!customGroupsContainer) return;

	customGroupsContainer.innerHTML = '<h3>Пользовательские Группы</h3>';
	chrome.storage.local.get(['groups'], (result) => {
		const groups = result.groups || [];
		if (groups.length === 0) {
			customGroupsContainer.innerHTML += '<p>Нет доступных групп</p>';
			return;
		}
		const fragment = document.createDocumentFragment();
		groups.forEach((group, index) => {
			const groupItem = document.createElement('div');
			groupItem.className = 'session-item group-item';
			groupItem.innerHTML = `
            <div class="session-header">
              <span>${escapeHtml(group.name)}</span>
              <div>
                <button class="button-small view-group-btn" data-index="${index}">Просмотреть</button>
                <button class="button-small delete-group-btn" data-index="${index}">Удалить</button>
              </div>
            </div>
            <div class="session-details" style="display: none;"></div>
          `;
			fragment.appendChild(groupItem);
		});
		customGroupsContainer.appendChild(fragment);
	});
}

/**
 * Заполняет список сессий для создания группы.
 */
function populateSessionsForGroupCreation() {
	const sessionSelectForGroup = document.getElementById(
		'sessionSelectForGroup'
	);
	if (!sessionSelectForGroup) return;
	sessionSelectForGroup.innerHTML = '';

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
				sessionSelectForGroup.appendChild(option);
			});
		}
	);
}

/**
 * Сохраняет запланированную сессию.
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
