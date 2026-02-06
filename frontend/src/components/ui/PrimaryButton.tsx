import { Button } from '@tremor/react'
import type { ComponentProps } from 'react'

type PrimaryButtonProps = ComponentProps<typeof Button>

const BASE_CLASS =
  'rounded-full bg-[rgb(var(--votuna-ink))] text-[rgb(var(--votuna-paper))] hover:bg-[color:rgb(var(--votuna-ink)/0.9)]'

export default function PrimaryButton({ className = '', ...props }: PrimaryButtonProps) {
  const classes = `${BASE_CLASS} ${className}`.trim()
  return <Button className={classes} {...props} />
}
