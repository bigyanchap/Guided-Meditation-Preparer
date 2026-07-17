type AppLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

/** Shared brand mark — use this component anywhere the product logo appears. */
export function AppLogo({
  size = 40,
  className = "",
  priority = false,
}: AppLogoProps) {
  return (
    <img
      src="/logo.png"
      alt="Guided Meditation Preparer"
      width={size}
      height={size}
      className={`app-logo ${className}`.trim()}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      draggable={false}
    />
  );
}
