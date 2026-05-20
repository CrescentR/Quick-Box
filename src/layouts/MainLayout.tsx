import type { PropsWithChildren } from 'react'

export default function MainLayout({ children }: PropsWithChildren) {
  return <main className="app-shell">{children}</main>
}
