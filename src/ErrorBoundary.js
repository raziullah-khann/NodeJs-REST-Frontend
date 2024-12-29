import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error details for debugging in the console
    console.error("Error caught in ErrorBoundary:", error, errorInfo);

    // Update the state with the error and errorInfo
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "20px", color: "red", fontFamily: "Arial, sans-serif" }}>
          <h1>Something went wrong!</h1>
          <h2>Error: {this.state.error?.toString()}</h2>
          
          {this.state.errorInfo && (
            <div>
              <h3>Component Stack Trace:</h3>
              <pre style={{ whiteSpace: "pre-wrap", marginTop: "10px" }}>
                {this.state.errorInfo.componentStack}
              </pre>
            </div>
          )}

          {/* Log full error stack */}
          {this.state.error && this.state.error.stack && (
            <div>
              <h3>Full Error Stack Trace:</h3>
              <pre style={{ whiteSpace: "pre-wrap", marginTop: "10px", color: "black" }}>
                {this.state.error.stack}
              </pre>
            </div>
          )}
        </div>
      );
    }

    // If no error, render children components
    return this.props.children;
  }
}

export default ErrorBoundary;
