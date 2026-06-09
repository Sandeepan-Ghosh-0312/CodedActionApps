import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Form from './components/Form';
import './App.css';
import themeTogglerIcon from './assets/themeToggler.png';

function App() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    // The Validation Station web component reads the theme from a `light` /
    // `dark` class on <body>, so keep it in sync with the app theme.
    document.body.classList.toggle('dark', isDark);
    document.body.classList.toggle('light', !isDark);
  }, [isDark]);

  const toggleTheme = () => setIsDark(prev => !prev);

  return (
    <div className="app">
      <button
        type="button"
        className="theme-toggle-button"
        onClick={toggleTheme}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        <img src={themeTogglerIcon} alt="Toggle theme" width="20" height="20" />
      </button>
      <div className="container">
        <Routes>
          <Route path="/" element={<Form onInitTheme={setIsDark} />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
