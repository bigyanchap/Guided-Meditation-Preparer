import { AppHeader } from "./components/AppHeader";
import { AppLogo } from "./components/AppLogo";

export default function App() {
  return (
    <div className="app-shell">
      <div className="ambient ambient-warm" aria-hidden="true" />
      <div className="ambient ambient-cool" aria-hidden="true" />

      <AppHeader />

      <main className="hero">
        <AppLogo size={168} className="hero-logo" priority />
        <h1>Guided Meditation Preparer</h1>
        <p className="hero-support">
          Capture short takes, arrange them in sequence, and export a single
          seamless guided session.
        </p>
        <div className="cta-row">
          <button type="button" className="cta primary">
            New session
          </button>
          <button type="button" className="cta secondary">
            Open project
          </button>
        </div>
      </main>

      <footer className="app-footer">
        <AppLogo size={28} />
        <span>Guided Meditation Preparer</span>
      </footer>
    </div>
  );
}
