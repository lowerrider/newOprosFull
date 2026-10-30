// Токен входа живёт до закрытия вкладки
const TOKEN_KEY = "opros_token";
const ROLE_KEY = "opros_role";

export const session = {
  get token() {
    return sessionStorage.getItem(TOKEN_KEY);
  },
  get role() {
    return sessionStorage.getItem(ROLE_KEY);
  },
  save(token, role) {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(ROLE_KEY, role);
  },
  clear() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(ROLE_KEY);
  },
};
