const LoadingState = ({ message = "Loading...", lines = 4 }) => (
  <div className="loading-card reveal-item">
    <p className="loading-message">{message}</p>
    <div className="skeleton-stack">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          className="skeleton"
          style={{
            width: `${92 - index * 8}%`
          }}
          key={`skeleton-${index + 1}`}
        />
      ))}
    </div>
  </div>
);

export default LoadingState;
