/** Разрешаем только относительные пути внутри приложения. */
export function safeAuthRedirect(path: string | null | undefined): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return "/";
  }
  return path;
}
