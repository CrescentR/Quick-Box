import { Component, type ReactNode } from 'react'
import { ErrorState } from './ErrorState'

export class ToolErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed
      ? <ErrorState title="工具暂时无法显示" description="可以重试，或从左侧打开其他工具。" onRetry={() => this.setState({ failed: false })} />
      : this.props.children
  }
}
