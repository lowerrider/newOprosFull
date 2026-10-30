import axios from "axios";

// В разработке бекенд на localhost:3000, на сервере nginx отдаёт его по /api того же адреса.
// Другой адрес можно задать в .env: VITE_API_URL=https://api.example.ru/api
export const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:3000/api" : "/api"),
});

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

api.interceptors.request.use((request) => {
  if (session.token) request.headers.Authorization = `Bearer ${session.token}`;
  return request;
});

// Текст ошибки от сервера или общий
export const errorText = (error) =>
  error.response?.data?.error || "Не удалось связаться с сервером. Попробуйте ещё раз.";

// Значение варианта «Пропустить» в выборе номинанта
export const SKIP = "skip";
