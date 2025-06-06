const path = require('path');
const webpack = require('webpack');

const isDevelopment = process.env.NODE_ENV !== 'production';

const mainConfig = {
  mode: isDevelopment ? 'development' : 'production',
  target: 'electron-main',
  entry: './src/main/main.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'main.js',
  },
  node: {
    __dirname: false,
    __filename: false,
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@main': path.resolve(__dirname, 'src/main'),
      '@renderer': path.resolve(__dirname, 'src/renderer'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.electron.json',
            },
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.node$/,
        use: 'node-loader',
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    }),
  ],
  externals: {
    electron: 'commonjs electron',
    'better-sqlite3': 'commonjs better-sqlite3',
    'mongodb': 'commonjs mongodb',
    'electron-log': 'commonjs electron-log',
    'electron-updater': 'commonjs electron-updater',
    'node:fs': 'commonjs fs',
    'node:path': 'commonjs path',
    'node:os': 'commonjs os',
  },
  devtool: isDevelopment ? 'source-map' : false,
};

const preloadConfig = {
  mode: isDevelopment ? 'development' : 'production',
  target: 'electron-preload',
  entry: './src/preload/preload.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'preload.js',
    publicPath: './',
  },
  node: {
    __dirname: false,
    __filename: false,
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.electron.json',
            },
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },
  externals: {
    electron: 'commonjs electron',
  },
  devtool: isDevelopment ? 'source-map' : false,
};

module.exports = [mainConfig, preloadConfig];
