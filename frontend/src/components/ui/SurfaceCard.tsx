import { Card } from '@tremor/react'
import type { ComponentProps } from 'react'

type SurfaceCardProps = ComponentProps<typeof Card>

const BASE_CARD_CLASS =
  'rounded-3xl border border-[color:rgb(var(--votuna-ink)/0.08)] bg-[rgba(var(--votuna-paper),0.9)] p-6 shadow-xl shadow-black/5'

export default function SurfaceCard({ className = '', ...props }: SurfaceCardProps) {
  const classes = `${BASE_CARD_CLASS} ${className}`.trim()
  return <Card className={classes} {...props} />
}
