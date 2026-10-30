<template>
  <section>
    <div class="card">
      <h2>Добавить участников</h2>
      <p class="muted">
        По одному на строку: <code>ФИО; email</code>. Можно вставить прямо из Excel
        (два столбца). Если email уже есть, у участника обновится ФИО.
      </p>
      <textarea v-model="bulkText" placeholder="Иванов Иван Иванович; ivanov@mega-personal.ru"></textarea>
      <div class="row" style="margin-top: 8px">
        <button type="button" :disabled="!bulkText.trim()" @click="addBulk">Добавить</button>
        <span class="muted">Найдено строк: {{ parsedBulk.length }}</span>
      </div>
    </div>

    <div class="card">
      <h2>Рассылка на почту</h2>
      <p v-if="mailConfigured === false" class="error">
        Почта не настроена: заполните SMTP_* в <code>backend/.env</code> и перезапустите бекенд.
      </p>
      <p class="muted">
        Каждому участнику с email уходит письмо со ссылкой, логином и новым паролем. Пароль
        меняется только если письмо ушло.
      </p>
      <div class="row">
        <button type="button" :disabled="!mailConfigured || sending || !notSentCount" @click="sendCredentials({ onlyNotSent: true })">
          {{ sending ? "Отправка..." : `Разослать тем, кому ещё не отправляли (${notSentCount})` }}
        </button>
        <button type="button" class="secondary" :disabled="!mailConfigured || sending" @click="resendAll">
          Разослать всем заново
        </button>
      </div>
      <p v-if="mailResult" :class="mailResult.failed.length ? 'error' : 'ok'">
        Отправлено: {{ mailResult.sent.length }}<span v-if="mailResult.failed.length">,
        не удалось: {{ mailResult.failed.length }}</span>
      </p>
      <ul v-if="mailResult && mailResult.failed.length" class="muted">
        <li v-for="f in mailResult.failed" :key="f.email">{{ f.email }}: {{ f.error }}</li>
      </ul>
    </div>

    <div class="card">
      <h2>Пароли вручную</h2>
      <p class="muted">
        Если удобнее разослать самому: в базе хранятся только хеши, поэтому открытые пароли
        видны один раз, сразу после генерации. Скачайте файл и разошлите пароли участникам.
      </p>
      <div class="row">
        <button type="button" @click="generate({ onlyMissing: true })">
          Сгенерировать тем, у кого нет пароля
        </button>
        <button type="button" class="secondary" @click="regenerateAll">
          Перевыпустить всем
        </button>
      </div>
      <div v-if="credentials.length">
        <p class="ok">Сгенерировано паролей: {{ credentials.length }}</p>
        <div class="row">
          <button type="button" @click="downloadCredentials">Скачать CSV</button>
        </div>
        <table>
          <tr><th>ФИО</th><th>Email</th><th>Пароль</th></tr>
          <tr v-for="c in credentials" :key="c.email">
            <td>{{ c.name }}</td><td>{{ c.email }}</td><td><code>{{ c.password }}</code></td>
          </tr>
        </table>
      </div>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <h2>Участники ({{ participants.length }})</h2>
    <div class="row">
      <input v-model="search" placeholder="Поиск по ФИО или email" style="min-width: 280px" />
    </div>
    <table>
      <tr><th>ФИО</th><th>Email</th><th>Пароль</th><th>Письмо</th><th></th></tr>
      <tr v-for="p in filtered" :key="p.id">
        <template v-if="editingId === p.id">
          <td><input v-model="editForm.name" style="width: 100%" /></td>
          <td><input v-model="editForm.email" style="width: 100%" /></td>
          <td></td>
          <td></td>
          <td class="row" style="margin: 0">
            <button type="button" @click="saveEdit(p.id)">Сохранить</button>
            <button type="button" class="secondary" @click="editingId = null">Отмена</button>
          </td>
        </template>
        <template v-else>
          <td>{{ p.name }}</td>
          <td>{{ p.email || "—" }}</td>
          <td>{{ p.hasPassword ? "есть" : "нет" }}</td>
          <td>{{ p.credentialsSentAt ? formatDate(p.credentialsSentAt) : "—" }}</td>
          <td class="row" style="margin: 0">
            <button type="button" class="secondary" @click="startEdit(p)">Изменить</button>
            <button
              v-if="p.email && mailConfigured"
              type="button"
              class="secondary"
              :disabled="sending"
              @click="sendCredentials({ ids: [p.id], onlyNotSent: false })">
              Отправить на почту
            </button>
            <button v-if="p.email" type="button" class="secondary" @click="generate({ ids: [p.id], onlyMissing: false })">
              Новый пароль
            </button>
            <button type="button" class="danger" @click="remove(p)">Удалить</button>
          </td>
        </template>
      </tr>
    </table>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { api, errorText } from "../../api";
import { downloadCsv } from "./csv";

const participants = ref([]);
const bulkText = ref("");
const credentials = ref([]);
const error = ref("");
const search = ref("");
const editingId = ref(null);
const editForm = ref({ name: "", email: "" });
const mailConfigured = ref(null);
const sending = ref(false);
const mailResult = ref(null);

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
    participants.value = (await api.get("/admin/participants")).data;
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

const generate = (options) =>
  run(async () => {
    credentials.value = (await api.post("/admin/participants/passwords", options)).data;
  });

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
