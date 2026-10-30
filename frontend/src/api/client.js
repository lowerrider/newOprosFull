import axios from "axios";
import { session } from "./session";

// В разработке бекенд на localhost:3000, на сервере nginx отдаёт его по /api того же адреса.
// Другой адрес можно задать в .env: VITE_API_URL=https://api.example.ru/api
export const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:3000/api" : "/api"),
});

api.interceptors.request.use((request) => {
  if (session.token) request.headers.Authorization = `Bearer ${session.token}`;
  return request;
});

// Текст ошибки от сервера или общий
export const errorText = (error) =>
  error.response?.data?.error || "Не удалось связаться с сервером. Попробуйте ещё раз.";
