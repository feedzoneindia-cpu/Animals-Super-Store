export default function Logo({
  className = '',
  imgClassName = '',
  textClassName = '',
  showText = true,
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 sm:gap-3 ${className}`}>
      <img
        src="/animals-super-store-logo.png"
        alt="Animals Super Store official logo"
        className={`h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 aspect-square shrink-0 object-contain ${imgClassName}`}
        loading="eager"
        decoding="async"
      />
      {showText && (
        <span
          className={`text-base sm:text-lg font-extrabold tracking-tight text-gray-900 whitespace-nowrap ${textClassName}`}
        >
          Animals Super <span className="text-brand-700">Store</span>
        </span>
      )}
    </span>
  );
}

