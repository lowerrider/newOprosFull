const snapshot = (job) =>
  job
    ? {
        ...job,
        sent: [...job.sent],
        failed: job.failed.map((item) => ({ ...item })),
      }
    : null;

export function createMailJobRunner() {
  let current = null;
  let nextId = 1;

  const get = () => snapshot(current);

  const start = ({ kind, items, send }) => {
    if (current?.status === "running") return null;

    const job = {
      id: nextId++,
      kind,
      status: items.length ? "running" : "done",
      total: items.length,
      processed: 0,
      sent: [],
      failed: [],
      startedAt: new Date().toISOString(),
      finishedAt: items.length ? null : new Date().toISOString(),
    };
    current = job;

    if (items.length) {
      queueMicrotask(async () => {
        for (const item of items) {
          try {
            await send(item);
            job.sent.push(item.email);
          } catch (error) {
            const message = error?.message || "Неизвестная ошибка отправки";
            console.error(`Не удалось отправить письмо ${item.email}:`, message);
            job.failed.push({ email: item.email, error: message });
          } finally {
            job.processed += 1;
          }
        }
        job.status = "done";
        job.finishedAt = new Date().toISOString();
      });
    }

    return get();
  };

  return { get, start };
}
