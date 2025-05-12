import React, { useState } from 'react';
import Monaco from './Monaco';
import '../styles/App.css';

const SUPPORTED_LANGUAGES = {
  javascript: 'JavaScript',
  python: 'Python',
  java: 'Java',
  cpp: 'C++',
};

export default function App() {
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('');
  const [theme, setTheme] = useState('vs-dark');

  const handleLanguageChange = (event) => {
    setLanguage(event.target.value);
  };

  const handleThemeChange = (event) => {
    setTheme(event.target.value);
  };

  const handleCodeChange = (newCode) => {
    setCode(newCode);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-controls">
          <div className="control-group">
            <label htmlFor="language-select">Language:</label>
            <select
              id="language-select"
              value={language}
              onChange={handleLanguageChange}
              className="select-control"
            >
              {Object.entries(SUPPORTED_LANGUAGES).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label htmlFor="theme-select">Theme:</label>
            <select
              id="theme-select"
              value={theme}
              onChange={handleThemeChange}
              className="select-control"
            >
              <option value="vs-dark">Dark</option>
              <option value="vs-light">Light</option>
              <option value="hc-black">High Contrast</option>
            </select>
          </div>
        </div>
      </header>

      <main className="app-main">
        <Monaco
          language={language}
          value={code}
          onChange={handleCodeChange}
          theme={theme}
        />
      </main>
    </div>
  );
}