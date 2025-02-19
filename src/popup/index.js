// src/popup/index.js

import { loadTabFunction } from './tabs.js';

// --- Обработчик события загрузки DOM ---
document.addEventListener('DOMContentLoaded', () => {
	const htmlElement = document.documentElement; // Для доступа к корневому элементу

	// Применяем сохранённую тему при загрузке
	chrome.storage.local.get(['theme'], (result) => {
		const savedTheme = result.theme || 'light';
		console.log(`Saved theme: ${savedTheme}`);
		if (savedTheme === 'dark') {
			htmlElement.classList.add('dark-theme');
			const themeSwitch = document.getElementById('themeSwitch');
			if (themeSwitch) themeSwitch.checked = true;
		} else {
			htmlElement.classList.remove('dark-theme');
			const themeSwitch = document.getElementById('themeSwitch');
			if (themeSwitch) themeSwitch.checked = false;
		}
	});

	// Делегирование событий для кнопок "Назад"
	document.addEventListener('click', (event) => {
		const backButton = event.target.closest('.back-button');
		if (backButton) {
			console.log('Back button clicked');
			loadTabFunction('sessions');
			// >>> По умолчанию возвращаемся во вкладку "sessions"
		}
	});

	// Инициализируем обработчики переключения вкладок (см. tabs.js)
	// (Например, на кнопки c классом .tab-button)
	document.querySelectorAll('.tab-button').forEach((button) => {
		button.addEventListener('click', () => {
			const tabName = button.getAttribute('data-tab');
			loadTabFunction(tabName);
		});
	});

	// Загружаем вкладку "sessions" при запуске
	loadTabFunction('sessions');
});
