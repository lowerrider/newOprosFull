import { reactive } from "vue";
import { api } from "../../api";

// Общие данные админки: участники, номинации (с номинантами обоих туров) и туры
export const state = reactive({
  participants: [],
  nominations: [],
  rounds: [],
  loaded: false,
});

export async function reload() {
  const [p, n, r] = await Promise.all([
    api.get("/admin/participants"),
    api.get("/admin/nominations"),
    api.get("/admin/rounds"),
  ]);
  state.participants = p.data;
  state.nominations = n.data;
  state.rounds = r.data;
  state.loaded = true;
}

export const roundStatus = (number) =>
  state.rounds.find((r) => r.number === number)?.status || "draft";

export const statusText = { draft: "не начат", open: "идёт голосование", closed: "завершён" };
