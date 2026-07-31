import { Component, type ReactNode } from 'react'

interface WorkspaceErrorBoundaryProps {
  children: ReactNode
}

interface WorkspaceErrorBoundaryState {
  error: Error | null
}

export class WorkspaceErrorBoundary extends Component<WorkspaceErrorBoundaryProps, WorkspaceErrorBoundaryState> {
  state: WorkspaceErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): WorkspaceErrorBoundaryState {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-sm font-medium text-error">Something went wrong in this workspace.</p>
          <p className="max-w-md text-xs text-on-surface-variant">{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="rounded-md bg-primary-container px-3 py-1.5 text-xs font-semibold text-on-primary-container hover:opacity-90"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
