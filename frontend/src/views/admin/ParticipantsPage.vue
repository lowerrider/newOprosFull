<template>
  <section>
    <div class="page-head">
      <div>
        <h1>Участники</h1>
        <p class="muted">Кто голосует. Те же люди становятся номинантами в номинациях.</p>
      </div>
      <div class="stats">
        <div class="stat"><b>{{ participants.length }}</b><span>всего</span></div>
        <div class="stat"><b>{{ withPassword }}</b><span>с паролем</span></div>
        <div class="stat"><b>{{ sentCount }}</b><span>доступ выдан</span></div>
        <div class="stat" :class="{ 'stat-warning': withoutEmailCount }">
          <b>{{ withoutEmailCount }}</b><span>без email</span>
        </div>
      </div>
    </div>

    <p v-if="error" class="alert error">{{ error }}</p>

    <div class="two-cols">
      <div class="card">
        <h2>Добавить участников</h2>
        <p class="muted">
          По одному на строку: <code>ФИО; email</code>. Можно вставить из Excel (два столбца).
          Если email уже есть, у участника обновится ФИО.
        </p>
        <div class="excel-import">
          <label for="participants-xlsx" class="file-label">Импорт из Excel (.xlsx)</label>
          <input
            id="participants-xlsx"
            ref="fileInput"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            aria-describedby="xlsx-help"
            @change="readExcel"
          />
          <p id="xlsx-help" class="muted">
            Нужны столбцы <strong>ФИО</strong> и <strong>email</strong>. Пустые и некорректные
            адреса загрузятся без email и будут отмечены в списке.
          </p>
          <p v-if="excelLoading" class="muted" role="status">Читаю файл…</p>
          <div v-if="excelReport" class="excel-preview" role="status">
            <p>
              <strong>{{ excelFileName }}</strong>: подготовлено {{ excelParticipants.length }},
              с email — {{ excelReport.withEmail }}, без email — {{ excelReport.withoutEmail }}.
              <span v-if="excelReport.duplicateCount">
                Дублей пропущено: {{ excelReport.duplicateCount }}.
              </span>
            </p>
            <details v-if="excelReport.invalidEmails.length" class="email-issues">
              <summary>Некорректные адреса: {{ excelReport.invalidEmails.length }}</summary>
              <ul>
                <li v-for="item in excelReport.invalidEmails" :key="`${item.name}-${item.email}`">
                  {{ item.name }} — <code>{{ item.email }}</code>
                </li>
              </ul>
            </details>
            <button type="button" :disabled="excelImporting" @click="addExcelParticipants">
              {{ excelImporting ? "Загрузка…" : `Добавить из Excel (${excelParticipants.length})` }}
            </button>
          </div>
          <p v-if="importResult" class="ok import-result">{{ importResult }}</p>
        </div>
        <div class="manual-divider"><span>или вставить вручную</span></div>
        <textarea v-model="bulkText" placeholder="Иванов Иван Иванович; ivanov@mega-personal.ru"></textarea>
        <div class="row" style="margin: 10px 0 0">
          <button type="button" :disabled="!parsedBulk.length" @click="addBulk">
            Добавить{{ parsedBulk.length ? ` (${parsedBulk.length})` : "" }}
          </button>
        </div>
      </div>

      <div class="card">
        <h2>Рассылка логинов и паролей</h2>
        <p v-if="mailConfigured === false" class="alert error">
          Почта не настроена: заполните SMTP_* в <code>backend/.env</code> и перезапустите бекенд.
        </p>
        <p class="muted">
          Каждому уйдёт письмо со ссылкой, логином и новым паролем. Пароль меняется, только если
          письмо ушло.
        </p>
        <div class="row" style="margin: 10px 0 0">
          <button
            type="button"
            :disabled="!mailConfigured || sending || !notSentCount"
            @click="sendCredentials({ onlyNotSent: true })">
            {{ sending ? `Отправка ${mailResult.processed}/${mailResult.total}` : `Разослать новым (${notSentCount})` }}
          </button>
          <button type="button" class="secondary" :disabled="!mailConfigured || sending" @click="resendAll">
            Всем заново
          </button>
        </div>
        <p v-if="mailJobError" class="alert error" role="alert">{{ mailJobError }}</p>
        <p
          v-if="mailResult"
          :class="mailResult.status === 'done' && mailResult.failed.length ? 'error' : mailResult.status === 'done' ? 'ok' : 'muted'"
          style="margin-bottom: 0"
          role="status">
          {{ mailResult.status === "running" ? `Обработано: ${mailResult.processed} из ${mailResult.total}. ` : "" }}
          Отправлено: {{ mailResult.sent.length }}<span v-if="mailResult.failed.length">,
          не удалось: {{ mailResult.failed.length }}</span>
        </p>
        <ul v-if="mailResult && mailResult.failed.length" class="muted">
          <li v-for="f in mailResult.failed" :key="f.email">{{ f.email }}: {{ f.error }}</li>
        </ul>

        <div class="password-tools">
          <h3>Сгенерировать недостающие пароли</h3>
          <p class="muted">
            Создаст пароль только участникам с email, у которых пароля ещё нет. Уже выданные
            пароли останутся рабочими. Результат можно скачать одним CSV-файлом.
          </p>
          <div class="row">
            <button
              type="button"
              class="secondary"
              :disabled="generating || !missingPasswordCount"
              @click="generate({ onlyMissing: true })">
              {{ generating ? "Генерация…" : `Сгенерировать без пароля (${missingPasswordCount})` }}
            </button>
            <button v-if="credentials.length" type="button" @click="downloadCredentials">
              Скачать CSV ({{ credentials.length }})
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="card danger-zone">
      <div>
        <h2>Удалить всех участников</h2>
        <p class="muted">
          Удалит участников, их пароли, голоса и составы кандидатов. Номинации останутся,
          статусы туров вернутся в «не начат».
        </p>
      </div>
      <button
        type="button"
        class="danger"
        :disabled="deletingAll || !participants.length"
        @click="deleteAllParticipants">
        {{ deletingAll ? "Удаляю…" : `Удалить всех (${participants.length})` }}
      </button>
    </div>

    <div class="card">
      <div class="row">
        <h2 style="margin: 0; flex: 1">Список ({{ filtered.length }})</h2>
        <input v-model="search" placeholder="Поиск по ФИО или email" style="min-width: 260px" />
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>ФИО</th><th>Email</th><th>Пароль</th><th>Доступ</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="p in filtered" :key="p.id" :class="{ 'missing-email-row': !p.email }">
              <template v-if="editingId === p.id">
                <td><input v-model="editForm.name" aria-label="ФИО участника" style="width: 100%" /></td>
                <td><input v-model="editForm.email" type="email" aria-label="Email участника" style="width: 100%" /></td>
                <td>
                  <div class="edit-password">
                    <input
                      v-model="editForm.password"
                      :type="showEditPassword ? 'text' : 'password'"
                      autocomplete="new-password"
                      minlength="8"
                      maxlength="64"
                      aria-label="Новый пароль участника"
                      placeholder="Новый пароль" />
                    <button
                      type="button"
                      class="ghost password-visibility"
                      :aria-label="showEditPassword ? 'Скрыть пароль' : 'Показать пароль'"
                      :title="showEditPassword ? 'Скрыть пароль' : 'Показать пароль'"
                      @click="showEditPassword = !showEditPassword">
                      {{ showEditPassword ? "Скрыть" : "Показать" }}
                    </button>
                  </div>
                  <small class="muted">
                    Пусто — оставить прежний. Новый пароль: 8–64 символа; доступ отметится как
                    выданный вручную.
                  </small>
                </td>
                <td></td>
                <td class="actions">
                  <button
                    type="button"
                    :disabled="!editForm.name.trim() || (editForm.password && editForm.password.length < 8)"
                    @click="saveEdit(p.id)">
                    Сохранить
                  </button>
                  <button type="button" class="ghost" @click="editingId = null">Отмена</button>
                </td>
              </template>
              <template v-else>
                <td>{{ p.name }}</td>
                <td>
                  <span v-if="p.email">{{ p.email }}</span>
                  <span v-else class="missing-email">
                    <strong>Нет email</strong>
                    <small>не получит письмо и не сможет войти</small>
                  </span>
                </td>
                <td>
                  <span class="badge" :class="{ closed: p.hasPassword }">{{ p.hasPassword ? "есть" : "нет" }}</span>
                </td>
                <td class="muted">{{ p.credentialsSentAt ? formatDate(p.credentialsSentAt) : "—" }}</td>
                <td class="actions">
                  <button
                    v-if="p.email && mailConfigured"
                    type="button"
                    class="ghost"
                    :disabled="sending"
                    title="Отправить новый пароль на почту"
                    @click="sendCredentials({ ids: [p.id], onlyNotSent: false })">
                    ✉
                  </button>
                  <button
                    v-if="p.email"
                    type="button"
                    class="ghost"
                    title="Сгенерировать новый пароль"
                    @click="generate({ ids: [p.id], onlyMissing: false })">
                    🔑
                  </button>
                  <button type="button" class="ghost" title="Изменить" @click="startEdit(p)">✎</button>
                  <button type="button" class="ghost" title="Удалить" @click="remove(p)">✕</button>
                </td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="credentials.length" class="card">
      <div class="row">
        <h2 style="margin: 0; flex: 1">Новые пароли ({{ credentials.length }})</h2>
        <button type="button" @click="downloadCredentials">Скачать CSV</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>ФИО</th><th>Email</th><th>Пароль</th></tr></thead>
          <tbody>
            <tr v-for="c in credentials" :key="c.email">
              <td>{{ c.name }}</td><td>{{ c.email }}</td><td><code>{{ c.password }}</code></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { api, errorText } from "@/api";
import { useMailJob } from "@/composables/useMailJob";
import { downloadCsv } from "@/utils/csv";
import { parseParticipantsXlsx } from "@/utils/xlsx";
import { state, reload } from "@/stores/admin";

const participants = computed(() => state.participants);
const bulkText = ref("");
const credentials = ref([]);
const error = ref("");
const search = ref("");
const editingId = ref(null);
const editForm = ref({ name: "", email: "", password: "" });
const showEditPassword = ref(false);
const mailConfigured = ref(null);
const generating = ref(false);
const fileInput = ref(null);
const excelParticipants = ref([]);
const excelReport = ref(null);
const excelFileName = ref("");
const excelLoading = ref(false);
const excelImporting = ref(false);
const importResult = ref("");
const deletingAll = ref(false);

const withPassword = computed(() => participants.value.filter((p) => p.hasPassword).length);
const withoutEmailCount = computed(() => participants.value.filter((p) => !p.email).length);
const missingPasswordCount = computed(
  () => participants.value.filter((p) => p.email && !p.hasPassword).length
);
const sentCount = computed(
  () => participants.value.filter((p) => p.email && p.credentialsSentAt).length
);
const notSentCount = computed(
  () => participants.value.filter((p) => p.email && !p.credentialsSentAt).length
);

// Время в базе хранится в UTC
const formatDate = (value) =>
  new Date(value.replace(" ", "T") + "Z").toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const load = async () => {
  try {
    await reload();
  } catch (e) {
    error.value = errorText(e);
  }
};

const {
  job: mailResult,
  error: mailJobError,
  running: sending,
  start: startMailJob,
  refresh: refreshMailJob,
} = useMailJob("credentials", load);

const parsedBulk = computed(() =>
  bulkText.value
    .split("\n")
    .map((line) => line.split(/[;\t,]/).map((s) => s.trim()))
    .filter(([name]) => name)
    .map(([name, email]) => ({ name, email }))
);

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return participants.value;
  return participants.value.filter(
    (p) => p.name.toLowerCase().includes(q) || (p.email || "").toLowerCase().includes(q)
  );
});

const run = async (action) => {
  error.value = "";
  try {
    await action();
    await load();
  } catch (e) {
    error.value = errorText(e);
  }
};

const addBulk = () =>
  run(async () => {
    await api.post("/admin/participants", parsedBulk.value);
    bulkText.value = "";
  });

const resetExcel = () => {
  excelParticipants.value = [];
  excelReport.value = null;
  excelFileName.value = "";
  if (fileInput.value) fileInput.value.value = "";
};

const readExcel = async (event) => {
  const file = event.target.files?.[0];
  error.value = "";
  importResult.value = "";
  resetExcel();
  if (!file) return;
  excelLoading.value = true;
  try {
    const parsed = await parseParticipantsXlsx(file);
    excelParticipants.value = parsed.participants;
    excelReport.value = parsed.report;
    excelFileName.value = file.name;
  } catch (e) {
    error.value = e.message || "Не удалось прочитать Excel-файл";
  } finally {
    excelLoading.value = false;
  }
};

const addExcelParticipants = async () => {
  excelImporting.value = true;
  importResult.value = "";
  await run(async () => {
    const { data } = await api.post("/admin/participants", excelParticipants.value);
    const parts = [`добавлено ${data.added}`];
    if (data.updated) parts.push(`обновлено ${data.updated}`);
    if (data.skipped) parts.push(`без изменений ${data.skipped}`);
    importResult.value = `Excel загружен: ${parts.join(", ")}.`;
    resetExcel();
  });
  excelImporting.value = false;
};

const generate = async (options) => {
  generating.value = true;
  await run(async () => {
    credentials.value = (await api.post("/admin/participants/passwords", options)).data;
  });
  generating.value = false;
};

const downloadCredentials = () =>
  downloadCsv("passwords.csv", [
    ["ФИО", "Email", "Пароль"],
    ...credentials.value.map((c) => [c.name, c.email, c.password]),
  ]);

const sendCredentials = (options) =>
  startMailJob("/admin/participants/send-credentials", options);

const resendAll = () => {
  if (confirm("Всем участникам уйдут новые пароли, старые перестанут работать. Продолжить?")) {
    sendCredentials({ onlyNotSent: false });
  }
};

const startEdit = (p) => {
  editingId.value = p.id;
  editForm.value = { name: p.name, email: p.email || "", password: "" };
  showEditPassword.value = false;
};

const saveEdit = (id) =>
  run(async () => {
    await api.put(`/admin/participants/${id}`, editForm.value);
    editingId.value = null;
  });

const remove = (p) => {
  if (confirm(`Удалить участника «${p.name}»? Его голоса тоже удалятся.`)) {
    run(() => api.delete(`/admin/participants/${p.id}`));
  }
};

const deleteAllParticipants = async () => {
  const confirmed = confirm(
    `Удалить всех участников (${participants.value.length}) вместе с их голосами и паролями?`
  );
  if (!confirmed) return;
  const phrase = prompt("Это действие нельзя отменить. Введите УДАЛИТЬ заглавными буквами:");
  if (phrase !== "УДАЛИТЬ") {
    if (phrase !== null) error.value = "Удаление отменено: контрольное слово введено неверно";
    return;
  }
  deletingAll.value = true;
  credentials.value = [];
  mailResult.value = null;
  await run(() => api.delete("/admin/participants", { data: { confirmation: "DELETE_ALL" } }));
  deletingAll.value = false;
};

onMounted(async () => {
  await load();
  try {
    mailConfigured.value = (await api.get("/admin/mail/status")).data.configured;
    await refreshMailJob();
  } catch (e) {
    error.value = errorText(e);
  }
});
</script>

<style scoped>
.stats {
  display: flex;
  gap: 10px;
}
.stat {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 10px 16px;
  display: flex;
  flex-direction: column;
  min-width: 96px;
}
.stat b {
  font-size: 22px;
}
.stat span {
  color: var(--muted);
  font-size: 12px;
}
.stat-warning {
  background: var(--danger-soft);
  border-color: #f2c7c9;
}
.stat-warning b,
.stat-warning span {
  color: var(--danger);
}
.two-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.excel-import {
  margin-top: 14px;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fafafe;
}
.file-label {
  display: block;
  margin-bottom: 7px;
  font-weight: 600;
}
.excel-import input[type="file"] {
  width: 100%;
  margin-bottom: 8px;
}
.excel-preview {
  margin-top: 10px;
  padding: 12px;
  border-left: 3px solid var(--accent);
  background: var(--accent-soft);
  border-radius: 7px;
}
.excel-preview p {
  margin-bottom: 10px;
  line-height: 1.45;
}
.email-issues {
  margin-bottom: 10px;
  color: var(--danger);
}
.email-issues summary {
  cursor: pointer;
  font-weight: 600;
}
.email-issues ul {
  max-height: 130px;
  overflow: auto;
  margin: 8px 0 0;
  padding-left: 20px;
}
.import-result {
  margin-top: 10px;
}
.manual-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 14px 0;
  color: var(--muted);
  font-size: 12px;
}
.manual-divider::before,
.manual-divider::after {
  content: "";
  height: 1px;
  flex: 1;
  background: var(--line);
}
.password-tools {
  margin-top: 16px;
  border-top: 1px solid var(--line);
  padding-top: 12px;
}
.password-tools h3 {
  margin: 0 0 6px;
  font-size: 14px;
}
.danger-zone {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  border-color: #f2c7c9;
}
.danger-zone h2 {
  color: var(--danger);
}
.danger-zone p {
  max-width: 680px;
}
.table-wrap {
  max-height: 520px;
  overflow: auto;
}
thead th {
  position: sticky;
  top: 0;
  background: var(--card);
}
.actions {
  white-space: nowrap;
  text-align: right;
}
.edit-password {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 230px;
}
.edit-password input {
  min-width: 140px;
  width: 100%;
}
.password-visibility {
  flex: 0 0 auto;
}
.edit-password + small {
  display: block;
  margin-top: 4px;
  max-width: 240px;
  line-height: 1.3;
}
.missing-email-row {
  background: var(--danger-soft);
}
.missing-email-row:hover {
  background: #f9dddd;
}
.missing-email {
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: var(--danger);
}
.missing-email small {
  font-size: 11px;
}
@media (max-width: 900px) {
  .two-cols {
    grid-template-columns: 1fr;
  }
  .danger-zone {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
