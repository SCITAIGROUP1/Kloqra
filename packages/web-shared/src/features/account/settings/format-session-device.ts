export function formatSessionDevice(userAgent: string | null | undefined): string {
  if (!userAgent?.trim()) return "Unknown device";

  const ua = userAgent.toLowerCase();

  const browser =
    ua.includes("edg/") || ua.includes("edge/")
      ? "Edge"
      : ua.includes("firefox/")
        ? "Firefox"
        : ua.includes("chrome/") && !ua.includes("edg")
          ? "Chrome"
          : ua.includes("safari/") && !ua.includes("chrome/")
            ? "Safari"
            : "Browser";

  const os =
    ua.includes("iphone") || ua.includes("ipad")
      ? "iOS"
      : ua.includes("android")
        ? "Android"
        : ua.includes("mac os x") || ua.includes("macintosh")
          ? "macOS"
          : ua.includes("windows")
            ? "Windows"
            : ua.includes("linux")
              ? "Linux"
              : "Unknown OS";

  return `${browser} on ${os}`;
}
