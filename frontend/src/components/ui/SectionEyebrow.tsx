import type { ComponentPropsWithoutRef } from 'react'

type SectionEyebrowProps = ComponentPropsWithoutRef<'p'>

const BASE_CLASS =
  'text-xs uppercase tracking-[0.25em] text-[color:rgb(var(--votuna-ink)/0.4)]'

export default function SectionEyebrow({ className = '', ...props }: SectionEyebrowProps) {
  const classes = `${BASE_CLASS} ${className}`.trim()
  return <p className={classes} {...props} />
}
