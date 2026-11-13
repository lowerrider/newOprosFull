<template>
  <div class="admin">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark">★</span>
        <div>
          <div class="brand-title">Голосование</div>
          <div class="brand-sub">{{ isSuperAdmin ? "супер-администратор" : "панель администратора" }}</div>
        </div>
      </div>

      <nav class="steps">
        <button
          v-for="(step, i) in steps"
          :key="step.id"
          type="button"
          class="step"
          :class="{ active: active === step.id }"
          @click="active = step.id">
          <span class="step-num" :class="step.state">{{ step.state === "done" ? "✓" : i + 1 }}</span>
          <span class="step-text">
            <span class="step-title">{{ step.title }}</span>
            <span class="step-hint">{{ step.hint }}</span>
          </span>
        </button>
      </nav>

      <div class="sidebar-footer">
        <button type="button" class="link" @click="logout">Выйти</button>
      </div>
    </aside>

    <main class="content">
      <p v-if="error" class="alert error">{{ error }}</p>
      <template v-if="state.loaded">
        <ParticipantsPage v-if="active === 'participants'" />
        <NominationsPage v-else-if="active === 'nominations'" />
        <RoundPage v-else-if="active === 'round1'" key="round1" :round="1" @go="active = $event" />
        <RoundPage v-else-if="active === 'round2'" key="round2" :round="2" @go="active = $event" />
        <VotesAuditPage v-else-if="active === 'voteAudit'" />
      </template>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { session, errorText } from "@/api";
import { state, reload, roundStatus, statusText } from "@/stores/admin";
import ParticipantsPage from "./ParticipantsPage.vue";
import NominationsPage from "./NominationsPage.vue";
import RoundPage from "./RoundPage.vue";
import VotesAuditPage from "./VotesAuditPage.vue";

const router = useRouter();
const active = ref("participants");
const error = ref("");
const isSuperAdmin = computed(() => session.role === "superadmin");

const roundStep = (number) => {
  const status = roundStatus(number);
  return {
    hint: statusText[status],
    state: status === "closed" ? "done" : status === "open" ? "live" : "",
  };
};

const steps = computed(() => {
  const items = [{
    id: "participants",
    title: "Участники",
    hint: `${state.participants.length} чел.`,
    state: state.participants.length ? "done" : "",
  },
  {
    id: "nominations",
    title: "Номинации",
    hint: `${state.nominations.length} шт.`,
    state: state.nominations.length ? "done" : "",
  },
  { id: "round1", title: "1 тур", ...roundStep(1) },
  { id: "round2", title: "2 тур", ...roundStep(2) }];
  if (isSuperAdmin.value) {
    items.push({ id: "voteAudit", title: "Кто за кого", hint: "только для вас", state: "private" });
  }
  return items;
});

const logout = () => {
  session.clear();
  router.push("/");
};

onMounted(async () => {
  try {
    await reload();
  } catch (e) {
    if (e.response?.status === 401) return logout();
    error.value = errorText(e);
  }
});
</script>

<style>
/* Админка: светлая тема поверх праздничного фона */
.admin {
  --bg: #f4f5fb;
  --card: #ffffff;
  --text: #1d1f2c;
  --muted: #6b7085;
  --line: #e3e5ef;
  --accent: #5b4bdb;
  --accent-soft: #eeebff;
  --ok: #1f9d55;
  --ok-soft: #e3f6eb;
  --danger: #d64045;
  --danger-soft: #fdecec;
  --live: #e8890c;

  position: fixed;
  inset: 0;
  z-index: 10;
  display: flex;
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
  font-size: 14px;
  text-align: left;
}
.admin *,
.admin *::before,
.admin *::after {
  box-sizing: border-box;
}
/* Глобальные стили кнопок голосования (base.css) в админке не нужны:
   белый «блик» ::after и подпрыгивание при наведении */
.admin button::after {
  display: none !important;
}
.admin button:hover {
  transform: none;
  box-shadow: none;
}
.admin .sidebar {
  width: 250px;
  flex-shrink: 0;
  background: #1e1b3a;
  color: #fff;
  display: flex;
  flex-direction: column;
  padding: 20px 14px;
}
.admin .brand {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 0 8px 22px;
}
.admin .brand-mark {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--accent);
  display: grid;
  place-items: center;
  font-size: 18px;
}
.admin .brand-title {
  font-weight: 700;
  font-size: 16px;
}
.admin .brand-sub {
  font-size: 12px;
  opacity: 0.6;
}
.admin .steps {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.admin .sidebar .step {
  all: unset;
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 10px;
  border-radius: 10px;
  cursor: pointer;
  color: #fff;
}
.admin .sidebar .step:hover {
  background: rgba(255, 255, 255, 0.06);
}
.admin .sidebar .step.active {
  background: rgba(255, 255, 255, 0.12);
}
.admin .step-num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.35);
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}
.admin .step-num.done {
  background: var(--ok);
  border-color: var(--ok);
}
.admin .step-num.live {
  background: var(--live);
  border-color: var(--live);
}
.admin .step-num.private {
  background: #8b5cf6;
  border-color: #8b5cf6;
}
.admin .step-text {
  display: flex;
  flex-direction: column;
}
.admin .step-title {
  font-weight: 600;
}
.admin .step-hint {
  font-size: 12px;
  opacity: 0.6;
}
.admin .sidebar-footer {
  margin-top: auto;
  padding: 8px;
}
.admin .link {
  all: unset;
  cursor: pointer;
  opacity: 0.7;
}
.admin .link:hover {
  opacity: 1;
  text-decoration: underline;
}
.admin .content {
  flex: 1;
  overflow-y: auto;
  padding: 28px 32px 60px;
}
.admin .content > section {
  max-width: 980px;
}
.admin .content > section.results-page {
  max-width: none;
}

/* Общие элементы */
.admin .page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}
.admin h1 {
  font-size: 24px;
  margin: 0 0 4px;
  color: var(--text);
}
.admin h2 {
  font-size: 16px;
  margin: 0 0 12px;
  color: var(--text);
}
.admin h3 {
  color: var(--text);
}
.admin .card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 18px 20px;
  margin-bottom: 16px;
}
.admin .muted {
  color: var(--muted);
  font-size: 13px;
}
.admin .row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 12px;
}
.admin .alert {
  padding: 10px 14px;
  border-radius: 10px;
  margin: 0 0 16px;
}
.admin .alert.error,
.admin .error {
  color: var(--danger);
}
.admin .alert.error {
  background: var(--danger-soft);
}
.admin .alert.info {
  background: var(--accent-soft);
  color: var(--text);
}
.admin .ok {
  color: var(--ok);
}
.admin .content button {
  padding: 8px 14px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: var(--accent);
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: filter 0.15s;
}
.admin .content button:hover {
  transform: none;
  box-shadow: none;
}
.admin .content button:hover:not(:disabled) {
  filter: brightness(1.08);
}
.admin .content button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.admin .content button.secondary {
  background: #fff;
  color: var(--text);
  border-color: var(--line);
}
.admin .content button.secondary:hover:not(:disabled) {
  background: #f7f7fb;
}
.admin .content button.danger {
  background: var(--danger);
}
.admin .content button.ghost {
  background: transparent;
  color: var(--muted);
  padding: 6px 8px;
}
.admin .content button.ghost:hover:not(:disabled) {
  color: var(--text);
  background: #f0f1f7;
}
.admin .content button.big {
  padding: 12px 20px;
  font-size: 15px;
}
.admin input:not([type="checkbox"]),
.admin textarea,
.admin select {
  padding: 9px 11px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  color: var(--text);
  font-size: 14px;
  font-family: inherit;
}
.admin input:focus,
.admin textarea:focus,
.admin select:focus {
  outline: 2px solid var(--accent-soft);
  border-color: var(--accent);
}
.admin textarea {
  width: 100%;
  min-height: 90px;
  resize: vertical;
}
.admin input[type="checkbox"] {
  accent-color: var(--accent);
  width: 16px;
  height: 16px;
}
.admin table {
  width: 100%;
  border-collapse: collapse;
}
.admin th,
.admin td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--line);
  vertical-align: middle;
}
.admin th {
  text-align: left;
  color: var(--muted);
  font-weight: 500;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.admin code {
  background: #f0f1f7;
  padding: 1px 6px;
  border-radius: 5px;
}
.admin .badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: #eceef5;
  color: var(--muted);
}
.admin .badge.open {
  background: #fff3e0;
  color: var(--live);
}
.admin .badge.closed {
  background: var(--ok-soft);
  color: var(--ok);
}
.admin .badge.warn {
  background: var(--danger-soft);
  color: var(--danger);
}

@media (max-width: 760px) {
  .admin {
    flex-direction: column;
  }
  .admin .sidebar {
    width: 100%;
    padding: 10px;
  }
  .admin .brand,
  .admin .sidebar-footer {
    display: none;
  }
  .admin .steps {
    flex-direction: row;
    overflow-x: auto;
  }
  .admin .step-hint {
    display: none;
  }
  .admin .content {
    padding: 18px 16px 40px;
  }
}
</style>
