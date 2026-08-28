export default function FormField({ label, htmlFor, hint, error, required, children }) {
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={htmlFor}>
        {label}
        {required && <span style={{ color: 'var(--red)' }}> *</span>}
      </label>
      {children}
      {hint && !error && <div className="form-hint">{hint}</div>}
      {error && <div className="form-error" role="alert">{error}</div>}
    </div>
  );
}
