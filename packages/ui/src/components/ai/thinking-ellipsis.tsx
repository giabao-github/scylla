export const ThinkingEllipsis = () => (
  <div
    className="flex items-center gap-1 px-1 py-0.5"
    role="status"
    aria-label="Thinking"
    aria-live="polite"
  >
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        aria-hidden="true"
        className="bg-current rounded-full opacity-40 animate-bounce size-1"
        style={{ animationDelay: `${i * 150}ms`, animationDuration: "1s" }}
      />
    ))}
  </div>
);
