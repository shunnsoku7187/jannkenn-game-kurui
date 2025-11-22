import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './src/components/App'; // Appコンポーネントをインポート
import './src/styles/index.css'; // グローバルスタイルをインポート

const rootElement = document.getElementById('app');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
