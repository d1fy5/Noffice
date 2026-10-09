export default function LogoMark({ size = 38, className = '' }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 512 512"
      role="img"
      aria-label="Noffice"
      focusable="false"
    >
      <rect width="512" height="512" rx="112" fill="#3157D5" />
      <rect x="26" y="26" width="460" height="460" rx="90" fill="none" stroke="#EFCE7B" strokeWidth="7" opacity="0.6" />
      <text
        x="256"
        y="378"
        textAnchor="middle"
        fontFamily="'Noto Serif Display','Playfair Display','Cormorant Garamond','Libre Baskerville',Georgia,'Times New Roman',serif"
        fontSize="340"
        fontWeight="700"
        fill="#EFCE7B"
      >N</text>
    </svg>
  );
}
