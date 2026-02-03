import { Card } from '@tremor/react'

/** Landing page hero content. */
export default function Home() {
  return (
    <main className="relative overflow-hidden">
      <div className="mx-auto flex min-h-[calc(100vh-84px)] w-full max-w-6xl flex-col justify-center gap-10 px-6 py-16 lg:flex-row lg:items-center">
        <div className="fade-up space-y-6 lg:w-3/5">
          <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(var(--votuna-paper),0.7)] px-4 py-2 text-xs uppercase tracking-[0.25em] text-[color:rgb(var(--votuna-ink)/0.55)] shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[rgb(var(--votuna-accent))]" />
            Beta
          </div>
          <h1 className="text-5xl font-semibold tracking-tight text-[rgb(var(--votuna-ink))] sm:text-6xl">
            Run votes that feel fast, fair, and human.
          </h1>
          <p className="text-lg text-[color:rgb(var(--votuna-ink)/0.7)] sm:text-xl">
            Votuna helps you launch opinion checks, pulse surveys, and playlists votes with a clean
            login flow and a calm, focused UI.
          </p>
          <div className="flex flex-wrap gap-3 text-sm text-[color:rgb(var(--votuna-ink)/0.55)]">
            <span className="rounded-full border border-[color:rgb(var(--votuna-ink)/0.1)] bg-[rgba(var(--votuna-paper),0.7)] px-4 py-2">
              SoundCloud ready
            </span>
            <span className="rounded-full border border-[color:rgb(var(--votuna-ink)/0.1)] bg-[rgba(var(--votuna-paper),0.7)] px-4 py-2">
              Spotify coming soon
            </span>
            <span className="rounded-full border border-[color:rgb(var(--votuna-ink)/0.1)] bg-[rgba(var(--votuna-paper),0.7)] px-4 py-2">
              Secure sessions
            </span>
          </div>
        </div>

        <div className="fade-up-delay lg:w-2/5">
          <Card className="rounded-3xl border border-[color:rgb(var(--votuna-ink)/0.08)] bg-[rgba(var(--votuna-paper),0.9)] p-6 shadow-xl shadow-black/5">
            <div className="space-y-6">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[color:rgb(var(--votuna-ink)/0.4)]">
                  Quick start
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[rgb(var(--votuna-ink))]">
                  Invite your crew
                </h2>
                <p className="mt-3 text-sm text-[color:rgb(var(--votuna-ink)/0.7)]">
                  Share a single link, collect votes, and keep the momentum moving.
                </p>
              </div>
              <div className="grid gap-4 text-sm text-[color:rgb(var(--votuna-ink)/0.7)]">
                <div className="rounded-2xl border border-orange-100 bg-[rgba(var(--votuna-accent-soft),0.5)] p-4">
                  <p className="text-[color:rgb(var(--votuna-ink)/0.55)]">Login provider</p>
                  <p className="mt-2 text-base font-semibold text-[rgb(var(--votuna-ink))]">SoundCloud</p>
                </div>
                <div className="rounded-2xl border border-[color:rgb(var(--votuna-ink)/0.1)] bg-[rgba(var(--votuna-paper),0.8)] p-4">
                  <p className="text-[color:rgb(var(--votuna-ink)/0.55)]">Default flow</p>
                  <p className="mt-2 text-base font-semibold text-[rgb(var(--votuna-ink))]">API + Frontend</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </main>
  )
}