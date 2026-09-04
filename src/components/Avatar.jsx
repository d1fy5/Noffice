export default function Avatar({ name = '', size = '', className = '' }) {
  let initials = '';
  if (name) {
    initials = name
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
  return (
    <span className={`avatar ${size} ${className}`} role="img" aria-label={name ? `${name} avatar` : 'Empty avatar placeholder'}>
      {initials || '\u00A0'}
    </span>
  );
}
