export type AppPage = 'launcher' | 'plugins' | 'settings'

export interface PageNavigationProps {
  currentPage: AppPage
  onPageChange: (page: AppPage) => void
}
