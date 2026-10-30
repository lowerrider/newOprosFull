<template>
  <div class="admin">
    <header class="admin-header">
      <h1>Админка голосования</h1>
      <button type="button" class="secondary" @click="logout">Выйти</button>
    </header>

    <nav class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id">
        {{ tab.title }}
      </button>
    </nav>

    <Participants v-if="activeTab === 'participants'" />
    <Nominations v-else-if="activeTab === 'nominations'" />
    <Rounds v-else />
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { session } from "../../api";
import Participants from "./Participants.vue";
import Nominations from "./Nominations.vue";
import Rounds from "./Rounds.vue";

const router = useRouter();
const tabs = [
  { id: "participants", title: "Участники" },
  { id: "nominations", title: "Номинации" },
  { id: "rounds", title: "Туры и результаты" },
];
const activeTab = ref("participants");

const logout = () => {
  session.clear();
  router.push("/");
};
</script>

<style>
.admin {
  position: relative;
  z-index: 2;
  width: min(1100px, 100% - 32px);
  height: calc(100vh - 32px);
  overflow-y: auto;
  padding: 24px;
  box-sizing: border-box;
  background: rgba(20, 20, 40, 0.92);
  border-radius: 12px;
  color: #fff;
  text-align: left;
}
.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
.admin h1 {
  font-size: 26px;
  margin: 0;
}
.admin h2 {
  font-size: 20px;
  margin: 24px 0 12px;
}
.admin .tabs {
  display: flex;
  gap: 8px;
  margin: 20px 0;
  flex-wrap: wrap;
}
.admin button {
  padding: 8px 14px;
  border: none;
  border-radius: 6px;
  background: #007bff;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}
.admin button:disabled {
  background: #666;
  cursor: not-allowed;
}
.admin button.secondary,
.admin .tabs button {
  background: transparent;
  border: 1px solid #888;
}
.admin .tabs button.active {
  background: #007bff;
  border-color: #007bff;
}
.admin button.danger {
  background: #c62828;
}
.admin input,
.admin textarea {
  padding: 8px;
  border: 1px solid #888;
  border-radius: 6px;
  background: #fff;
  color: #222;
  font-size: 14px;
  box-sizing: border-box;
}
.admin textarea {
  width: 100%;
  min-height: 100px;
  font-family: inherit;
}
.admin table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.admin th,
.admin td {
  padding: 6px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  vertical-align: middle;
}
.admin th {
  text-align: left;
  opacity: 0.7;
  font-weight: 500;
}
.admin .row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 12px;
}
.admin .card {
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 16px;
}
.admin .muted {
  opacity: 0.7;
  font-size: 13px;
}
.admin .error {
  color: #ff6b6b;
}
.admin .ok {
  color: #69db7c;
}
.admin .badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  background: #555;
}
.admin .badge.open {
  background: #2e7d32;
}
.admin .badge.closed {
  background: #8e24aa;
}
.admin .select-wrap {
  color: #222;
}
</style>
