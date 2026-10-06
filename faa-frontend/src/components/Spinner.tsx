type SpinnerProps = {
  label?: string;
  variant?: 'page' | 'inline';
};

export function Spinner({ label, variant = 'page' }: SpinnerProps) {
  return (
    <div
      className={`loading-state loading-state--${variant}`}
      role="status"
      aria-live="polite"
      aria-label={label || 'Loading'}
    >
      <div className="loading-state-content">
        <span className="loading-state-orbit" aria-hidden="true" />
        {label && <span className="loading-state-label">{label}</span>}
      </div>
    </div>
  );
}
