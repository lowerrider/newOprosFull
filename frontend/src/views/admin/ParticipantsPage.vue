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
        <div class="stat"><b>{{ participants.length - notSentCount }}</b><span>получили письмо</span></div>
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
            {{ sending ? "Отправка..." : `Разослать новым (${notSentCount})` }}
          </button>
          <button type="button" class="secondary" :disabled="!mailConfigured || sending" @click="resendAll">
            Всем заново
          </button>
        </div>
        <p v-if="mailResult" :class="mailResult.failed.length ? 'error' : 'ok'" style="margin-bottom: 0">
          Отправлено: {{ mailResult.sent.length }}<span v-if="mailResult.failed.length">,
          не удалось: {{ mailResult.failed.length }}</span>
        </p>
        <ul v-if="mailResult && mailResult.failed.length" class="muted">
          <li v-for="f in mailResult.failed" :key="f.email">{{ f.email }}: {{ f.error }}</li>
        </ul>

        <details class="manual">
          <summary>Без почты: сгенерировать пароли и скачать CSV</summary>
          <p class="muted">
            Открытые пароли видны один раз, сразу после генерации: в базе хранятся только хеши.
          </p>
          <div class="row">
            <button type="button" class="secondary" :disabled="generating" @click="generate({ onlyMissing: true })">
              {{ generating ? "Генерация..." : "Тем, у кого нет пароля" }}
            </button>
            <button type="button" class="secondary" :disabled="generating" @click="regenerateAll">
              Перевыпустить всем
            </button>
            <button v-if="credentials.length" type="button" @click="downloadCredentials">
              Скачать CSV ({{ credentials.length }})
            </button>
          </div>
        </details>
      </div>
    </div>

    <div class="card">
      <div class="row">
        <h2 style="margin: 0; flex: 1">Список ({{ filtered.length }})</h2>
        <input v-model="search" placeholder="Поиск по ФИО или email" style="min-width: 260px" />
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>ФИО</th><th>Email</th><th>Пароль</th><th>Письмо</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="p in filtered" :key="p.id">
              <template v-if="editingId === p.id">
                <td><input v-model="editForm.name" style="width: 100%" /></td>
                <td><input v-model="editForm.email" style="width: 100%" /></td>
                <td></td>
                <td></td>
                <td class="actions">
                  <button type="button" @click="saveEdit(p.id)">Сохранить</button>
                  <button type="button" class="ghost" @click="editingId = null">Отмена</button>
                </td>
              </template>
              <template v-else>
                <td>{{ p.name }}</td>
                <td>{{ p.email || "—" }}</td>
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
import { downloadCsv } from "@/utils/csv";
import { state, reload } from "@/stores/admin";

const participants = computed(() => state.participants);
const bulkText = ref("");
const credentials = ref([]);
const error = ref("");
const search = ref("");
const editingId = ref(null);
const editForm = ref({ name: "", email: "" });
const mailConfigured = ref(null);
const sending = ref(false);
const generating = ref(false);
const mailResult = ref(null);

const withPassword = computed(() => participants.value.filter((p) => p.hasPassword).length);
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

const generate = async (options) => {
  generating.value = true;
  await run(async () => {
    credentials.value = (await api.post("/admin/participants/passwords", options)).data;
  });
  generating.value = false;
};

const regenerateAll = () => {
  if (confirm("Старые пароли перестанут работать у всех участников. Продолжить?")) {
    generate({ onlyMissing: false });
  }
};

const downloadCredentials = () =>
  downloadCsv("passwords.csv", [
    ["ФИО", "Email", "Пароль"],
    ...credentials.value.map((c) => [c.name, c.email, c.password]),
  ]);

const sendCredentials = async (options) => {
  sending.value = true;
  mailResult.value = null;
  await run(async () => {
    mailResult.value = (await api.post("/admin/participants/send-credentials", options)).data;
  });
  sending.value = false;
};

const resendAll = () => {
  if (confirm("Всем участникам уйдут новые пароли, старые перестанут работать. Продолжить?")) {
    sendCredentials({ onlyNotSent: false });
  }
};

const startEdit = (p) => {
  editingId.value = p.id;
  editForm.value = { name: p.name, email: p.email || "" };
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

onMounted(async () => {
  await load();
  try {
    mailConfigured.value = (await api.get("/admin/mail/status")).data.configured;
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
.two-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.manual {
  margin-top: 16px;
  border-top: 1px solid var(--line);
  padding-top: 12px;
}
.manual summary {
  cursor: pointer;
  color: var(--muted);
  font-size: 13px;
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
@media (max-width: 900px) {
  .two-cols {
    grid-template-columns: 1fr;
  }
}
</style>
