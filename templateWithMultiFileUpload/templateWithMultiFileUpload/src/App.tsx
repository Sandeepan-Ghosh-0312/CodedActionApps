import { useCallback, useEffect, useState } from 'react';
import Upload from './components/Upload';
import './App.css';

function App() {
  const [darkTheme, setDarkTheme] = useState(false);

  // Seeded once from the task theme Action Center reports on load.
  const handleInitTheme = useCallback((isDark: boolean) => {
    setDarkTheme(isDark);
  }, []);

  // The palette is defined on `body.light` / `body.dark`, so the class has to land on the body -
  // setting it on a wrapper element would match no selector.
  useEffect(() => {
    document.body.className = darkTheme ? 'dark' : 'light';
  }, [darkTheme]);

  return (
    <div className="app-shell">
      <Upload onInitTheme={handleInitTheme} />
    </div>
  );
}

export default App;
