export const ThinkingEllipsis = () => (
  <div
    className="flex min-w-28 items-center gap-2.5 px-0.5 py-0.5"
    role="status"
    aria-label="Assistant is preparing a reply"
    aria-live="polite"
  >
    <span className="relative flex size-2.5 shrink-0" aria-hidden="true">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-25" />
      <span className="relative inline-flex size-2.5 rounded-full bg-current opacity-70" />
    </span>
    <span className="text-xs font-medium text-current/85 md:text-sm">
      Preparing reply
    </span>
    <span className="flex items-center gap-1.5" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="h-1.5 rounded-full bg-current/45 animate-pulse"
          style={{
            animationDelay: `${index * 160}ms`,
            animationDuration: "1.1s",
            width: `${10 + index * 3}px`,
          }}
        />
      ))}
    </span>
  </div>
);
