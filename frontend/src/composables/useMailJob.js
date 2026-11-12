import { computed, onUnmounted, ref } from "vue";
import { api, errorText } from "@/api";

export function useMailJob(kind, onFinished) {
  const job = ref(null);
  const error = ref("");
  const running = computed(() => job.value?.status === "running");
  let timer = null;
  let finishedId = null;

  const clearTimer = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const apply = (next) => {
    if (!next || next.kind !== kind) return false;
    job.value = next;
    clearTimer();
    if (next.status === "running") {
      timer = setTimeout(refresh, 1500);
    } else if (finishedId !== next.id) {
      finishedId = next.id;
      Promise.resolve(onFinished?.(next)).catch(() => {});
    }
    return true;
  };

  const refresh = async () => {
    try {
      const { data } = await api.get("/admin/mail/job");
      apply(data.job);
    } catch (requestError) {
      error.value = errorText(requestError);
      clearTimer();
    }
  };

  const start = async (path, body) => {
    error.value = "";
    try {
      const { data } = await api.post(path, body);
      apply(data.job);
    } catch (requestError) {
      error.value = errorText(requestError);
    }
  };

  onUnmounted(clearTimer);

  return { job, error, running, start, refresh };
}
