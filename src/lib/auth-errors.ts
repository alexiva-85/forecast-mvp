export function mapAuthCallbackError(
  code: string | null,
  description: string | null,
): string {
  const raw = (description ?? code ?? "").toLowerCase();
  if (raw.includes("access_denied") || raw.includes("user cancelled")) {
    return "Вход отменён.";
  }
  if (raw.includes("provider") && raw.includes("not enabled")) {
    return "Этот способ входа ещё не настроен на сервере. Используйте email и пароль.";
  }
  if (description?.trim()) {
    return description.trim();
  }
  if (code?.trim()) {
    return code.trim();
  }
  return "Не удалось войти. Попробуйте снова или выберите другой способ.";
}

export function mapMagicLinkError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Слишком много писем. Подождите пару минут и попробуйте снова.";
  }
  if (lower.includes("signup") && lower.includes("disabled")) {
    return "Регистрация по email отключена. Обратитесь в поддержку.";
  }
  return message;
}

export function mapOAuthStartError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("provider") && lower.includes("not enabled")) {
    return "Вход через этот сервис не настроен. Используйте email или другой способ.";
  }
  return message;
}
