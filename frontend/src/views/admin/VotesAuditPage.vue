<template>
  <section>
    <div class="page-head">
      <div>
        <h1>Кто за кого голосовал</h1>
        <p class="muted">Поимённая детализация бюллетеней во время голосования. Доступна только супер-администратору.</p>
      </div>
      <div class="stats">
        <div class="stat"><b>{{ ballots.length }}</b><span>бюллетеней</span></div>
        <div class="stat"><b>{{ voterCount }}</b><span>участников</span></div>
      </div>
    </div>

    <p v-if="error" class="alert error" role="alert">{{ error }}</p>

    <div class="card filters">
      <label>
        <span>Поиск участника</span>
        <input v-model="search" type="search" placeholder="ФИО или email" />
      </label>
      <label>
        <span>Тур</span>
        <select v-model="roundFilter">
          <option value="all">Все туры</option>
          <option value="1">1 тур</option>
          <option value="2">2 тур</option>
        </select>
      </label>
      <button type="button" class="secondary refresh" :disabled="loading" @click="load">
        {{ loading ? "Обновляю…" : "Обновить" }}
      </button>
    </div>

    <div v-if="loading && !ballots.length" class="card empty" role="status">Загружаю бюллетени…</div>
    <div v-else-if="!groups.length" class="card empty" role="status">
      {{ ballots.length ? "По фильтру ничего не найдено." : "Пока никто не проголосовал." }}
    </div>

    <div v-else class="voter-list">
      <article v-for="group in groups" :key="group.voter.id" class="card voter-card">
        <header class="voter-head">
          <div>
            <h2>{{ group.voter.name }}</h2>
            <p class="muted">{{ group.voter.email || "Email не указан" }}</p>
          </div>
          <span class="badge closed">{{ group.ballots.length }} {{ ballotWord(group.ballots.length) }}</span>
        </header>

        <section v-for="ballot in group.ballots" :key="ballot.id" class="ballot">
          <div class="ballot-head">
            <strong>{{ ballot.round }} тур</strong>
            <time :datetime="ballot.submittedAt">{{ formatDate(ballot.submittedAt) }}</time>
          </div>
          <dl class="choices">
            <div v-for="choice in ballot.choices" :key="choice.nominationId" class="choice">
              <dt>{{ choice.nomination }}</dt>
              <dd :class="{ skipped: !choice.candidate }">
                {{ choice.candidate || "Пропущено" }}
              </dd>
            </div>
          </dl>
        </section>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { api, errorText } from "@/api";

const ballots = ref([]);
const loading = ref(false);
const error = ref("");
const search = ref("");
const roundFilter = ref("all");

const voterCount = computed(() => new Set(ballots.value.map((ballot) => ballot.voter.id)).size);

const filtered = computed(() => {
  const query = search.value.trim().toLowerCase();
  return ballots.value.filter((ballot) => {
    const matchesRound = roundFilter.value === "all" || String(ballot.round) === roundFilter.value;
    const matchesSearch =
      !query ||
      ballot.voter.name.toLowerCase().includes(query) ||
      (ballot.voter.email || "").toLowerCase().includes(query);
    return matchesRound && matchesSearch;
  });
});

const groups = computed(() => {
  const result = [];
  const byVoter = new Map();
  for (const ballot of filtered.value) {
    let group = byVoter.get(ballot.voter.id);
    if (!group) {
      group = { voter: ballot.voter, ballots: [] };
      byVoter.set(ballot.voter.id, group);
      result.push(group);
    }
    group.ballots.push(ballot);
  }
  return result;
});

const formatDate = (value) =>
  new Date(value.replace(" ", "T") + "Z").toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const ballotWord = (count) => (count === 1 ? "бюллетень" : "бюллетеня");

const load = async () => {
  loading.value = true;
  error.value = "";
  try {
    ballots.value = (await api.get("/admin/vote-audit")).data.ballots;
  } catch (e) {
    error.value = errorText(e);
  } finally {
    loading.value = false;
  }
};

onMounted(load);
</script>

<style scoped>
.stats {
  display: flex;
  gap: 10px;
}
.stat {
  min-width: 104px;
  padding: 10px 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--card);
  display: flex;
  flex-direction: column;
}
.stat b {
  font-size: 22px;
}
.stat span {
  color: var(--muted);
  font-size: 12px;
}
.filters {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) 160px auto;
  gap: 12px;
  align-items: end;
}
.filters label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--muted);
  font-size: 12px;
}
.filters input,
.filters select {
  width: 100%;
}
.refresh {
  margin-bottom: 0;
}
.empty {
  padding: 36px 20px;
  color: var(--muted);
  text-align: center;
}
.voter-list {
  display: grid;
  gap: 12px;
}
.voter-card {
  margin-bottom: 0;
}
.voter-head,
.ballot-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.voter-head {
  padding-bottom: 14px;
}
.voter-head h2 {
  margin-bottom: 3px;
}
.ballot {
  padding: 14px 0;
  border-top: 1px solid var(--line);
}
.ballot-head {
  margin-bottom: 10px;
}
.ballot-head time {
  color: var(--muted);
  font-size: 12px;
}
.choices {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 18px;
}
.choice {
  padding: 9px 10px;
  border-radius: 8px;
  background: #f7f7fb;
}
.choice dt {
  margin-bottom: 4px;
  color: var(--muted);
  font-size: 12px;
}
.choice dd {
  margin: 0;
  font-weight: 600;
}
.choice dd.skipped {
  color: var(--muted);
  font-weight: 500;
}
@media (max-width: 700px) {
  .filters,
  .choices {
    grid-template-columns: 1fr;
  }
  .filters .refresh {
    width: 100%;
  }
}
</style>
