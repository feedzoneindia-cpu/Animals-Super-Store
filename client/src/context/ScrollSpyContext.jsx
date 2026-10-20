import { createContext, useContext, useMemo, useState } from 'react';

const ScrollSpyContext = createContext(null);

/**
 * Shares the active homepage section between the Home page (which owns the
 * sections and runs the IntersectionObserver) and the Navbar (which
 * highlights the matching link). Highlighting is display-only — clicking a
 * nav link always navigates to its route.
 * Lives in MainLayout so it survives route changes.
 */
export function ScrollSpyProvider({ children }) {
  const [activeSection, setActiveSection] = useState('home');

  const value = useMemo(
    () => ({ activeSection, setActiveSection }),
    [activeSection]
  );

  return <ScrollSpyContext.Provider value={value}>{children}</ScrollSpyContext.Provider>;
}

export function useScrollSpy() {
  const context = useContext(ScrollSpyContext);
  if (!context) {
    throw new Error('useScrollSpy must be used within a ScrollSpyProvider');
  }
  return context;
}
