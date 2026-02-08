import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'

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
const DEFAULT_AVATAR_SRC = '/img/default-avatar.svg'

export default function UserAvatar({
  src,
  alt,
  fallback,
  size,
  className = '',
  fallbackClassName = '',
}: UserAvatarProps) {
  const sizeStyle = { width: size, height: size }
  const requestedSrc = src || DEFAULT_AVATAR_SRC
  const [imageSrc, setImageSrc] = useState(requestedSrc)

  useEffect(() => {
    setImageSrc(requestedSrc)
  }, [requestedSrc])

  const handleImageError = () => {
    if (imageSrc !== DEFAULT_AVATAR_SRC) {
      setImageSrc(DEFAULT_AVATAR_SRC)
      return
    }
    setImageSrc('')
  }

  const imageClass = useMemo(() => `${DEFAULT_IMAGE_CLASS} ${className}`.trim(), [className])

  if (imageSrc) {
    return (
      <Image
        src={imageSrc}
        alt={alt}
        width={size}
        height={size}
        unoptimized
        style={sizeStyle}
        className={imageClass}
        onError={handleImageError}
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
