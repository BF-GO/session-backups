// webpack.config.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
	mode: 'production', // Или 'development' для отладки

	entry: {
		// Точка входа для popup
		popup: path.resolve(__dirname, 'src', 'popup', 'index.js'),
		// Точка входа для background
		background: path.resolve(__dirname, 'src', 'background', 'index.js'),
	},

	output: {
		path: path.resolve(__dirname, 'extension'),
		filename: '[name].js', // Будут созданы popup.js и background.js
		clean: true, // Очистка выходной директории перед сборкой (Webpack 5)
	},

	plugins: [
		// Плагин для обработки popup.html
		new HtmlWebpackPlugin({
			template: path.resolve(__dirname, 'src', 'popup', 'popup.html'),
			filename: 'popup.html', // Итоговый файл в папке extension/
			chunks: ['popup'], // Внедряем только popup.js
			inject: 'body', // Внедряем скрипты в конец body
		}),
		// Плагин для копирования статических файлов
		new CopyWebpackPlugin({
			patterns: [
				{
					from: path.resolve(__dirname, 'src', 'popup', 'icons'),
					to: path.resolve(__dirname, 'extension', 'icons'),
				},
				{
					from: path.resolve(__dirname, 'src', 'popup', 'styles.css'),
					to: path.resolve(__dirname, 'extension', 'styles.css'),
				},
				{
					from: path.resolve(__dirname, 'src', 'manifest.json'),
					to: path.resolve(__dirname, 'extension', 'manifest.json'),
				},
			],
		}),
	],

	module: {
		rules: [
			// Если вы используете Babel для транспиляции
			/*
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'],
                    },
                },
            },
            */
			// Лоадеры для CSS, если необходимо
			/*
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
            */
			// Лоадеры для изображений, если необходимо
			/*
            {
                test: /\.(png|svg|jpg|jpeg|gif)$/i,
                type: 'asset/resource',
            },
            */
		],
	},

	resolve: {
		fallback: {
			fs: false,
			path: false,
			// Добавьте другие Node-полифилы при необходимости
		},
	},

	// Опционально: настройка devServer или других параметров
};
