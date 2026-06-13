export type AppPage = 'launcher' | 'market' | 'plugins' | 'account' | 'settings'

export interface PageNavigationProps {
  currentPage: AppPage
  onPageChange: (page: AppPage) => void
}
