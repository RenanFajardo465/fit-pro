/**
 * Roda antes do primeiro paint (via `dangerouslySetInnerHTML` direto no
 * `<head>`, não um componente React normal) pra aplicar a classe `.dark`
 * no `<html>` sem flash de tema errado. Padrão é escuro — só muda pra claro
 * se o usuário já tiver escolhido isso antes (gravado no localStorage pelo
 * `ThemeToggle`).
 */
const THEME_SCRIPT = `
(function () {
  try {
    var saved = localStorage.getItem("fit-pro-theme");
    if (saved === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
    }
  } catch (e) {
    document.documentElement.classList.add("dark");
  }
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />;
}
