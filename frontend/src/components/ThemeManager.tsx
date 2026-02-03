'use client'

import { useEffect, useState } from 'react'

type ThemeSetting = 'light' | 'dark' | 'system'

type UserSettings = {
  theme: ThemeSetting
  receive_emails: boolean
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const THEME_STORAGE_KEY = 'votuna-theme'

function resolveTheme(theme: ThemeSetting) {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}

function applyTheme(theme: ThemeSetting) {
  const resolved = resolveTheme(theme)
  document.documentElement.dataset.theme = resolved
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}

/** Apply the stored user theme preference to the document. */
export default function ThemeManager() {
  const [theme, setTheme] = useState<ThemeSetting>('system')

  useEffect(() => {
    const storedTheme = (localStorage.getItem(THEME_STORAGE_KEY) as ThemeSetting | null) ?? 'system'
    setTheme(storedTheme)
    applyTheme(storedTheme)

    const loadSettings = async () => {
      try {
        const response = await fetch(`${API_URL}/api/v1/users/me/settings`, {
          credentials: 'include',
        })
        if (!response.ok) return
        const payload = (await response.json()) as UserSettings
        setTheme(payload.theme)
        applyTheme(payload.theme)
        localStorage.setItem(THEME_STORAGE_KEY, payload.theme)
      } catch {
        // Ignore settings load failures and keep system default.
      }
    }

    loadSettings()
  }, [])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<UserSettings>).detail
      if (!detail?.theme) return
      setTheme(detail.theme)
      applyTheme(detail.theme)
    }
    window.addEventListener('votuna:settings-updated', handler as EventListener)
    return () => window.removeEventListener('votuna:settings-updated', handler as EventListener)
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system')
      }
    }
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [theme])

  return null
}
