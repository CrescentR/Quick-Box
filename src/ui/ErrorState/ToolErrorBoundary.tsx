import { Component, type ReactNode } from 'react'
import { lt } from '../../i18n'
import { ErrorState } from './ErrorState'

export class ToolErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed
      ? <ErrorState title={lt('工具暂时无法显示', 'Tool temporarily unavailable')} description={lt('可以重试，或从左侧打开其他工具。', 'Retry loading, or pick another tool from the sidebar.')} onRetry={() => this.setState({ failed: false })} />
      : this.props.children
  }
}
