export function trackEvent(name: string, props?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "development") return;
  void name;
  void props;
}
