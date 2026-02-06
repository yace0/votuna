import Image from 'next/image'

type UserAvatarProps = {
  src?: string | null
  alt: string
  fallback: string
  size: number
  className?: string
  fallbackClassName?: string
}

const DEFAULT_IMAGE_CLASS = 'object-cover'
const DEFAULT_FALLBACK_CLASS =
  'flex items-center justify-center bg-[rgba(var(--votuna-ink),0.1)] text-xs font-semibold text-[rgb(var(--votuna-ink))]'

export default function UserAvatar({
  src,
  alt,
  fallback,
  size,
  className = '',
  fallbackClassName = '',
}: UserAvatarProps) {
  const sizeStyle = { width: size, height: size }
  if (src) {
    const imageClass = `${DEFAULT_IMAGE_CLASS} ${className}`.trim()
    return (
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        unoptimized
        style={sizeStyle}
        className={imageClass}
      />
    )
  }

  const fallbackClasses = `${DEFAULT_FALLBACK_CLASS} ${fallbackClassName}`.trim()
  return (
    <div style={sizeStyle} className={fallbackClasses}>
      {fallback}
    </div>
  )
}
