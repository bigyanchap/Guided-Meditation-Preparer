import { AppLogo } from "./AppLogo";

export function AppHeader() {
  return (
    <header className="app-header">
      <div className="brand">
        <AppLogo size={44} priority />
        <div className="brand-copy">
          <p className="brand-name">Guided Meditation Preparer</p>
          <p className="brand-tag">Stitch tiny recordings into calm sessions</p>
        </div>
      </div>
    </header>
  );
}
