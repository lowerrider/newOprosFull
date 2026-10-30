<template>
  <div class="picker">
    <div class="row">
      <b>Выбрано {{ modelValue.length }} из {{ participants.length }}</b>
      <button type="button" class="secondary" :disabled="disabled" @click="selectAll">Выбрать всех</button>
      <button type="button" class="secondary" :disabled="disabled" @click="clear">Снять всех</button>
      <select v-if="copySources.length" :disabled="disabled" @change="copyFrom($event)">
        <option value="">Скопировать из…</option>
        <option v-for="s in copySources" :key="s.key" :value="s.key">{{ s.title }}</option>
      </select>
      <button type="button" class="secondary" @click="open = !open">
        {{ open ? "Скрыть список" : "Показать список" }}
      </button>
    </div>

    <p v-if="!open && excluded.length && excluded.length <= 10" class="muted">
      Не участвуют: {{ excluded.map((p) => p.name).join(", ") }}
    </p>

    <template v-if="open">
      <div class="row">
        <input v-model="search" placeholder="Поиск по ФИО" style="min-width: 260px" />
        <label class="muted"><input v-model="onlySelected" type="checkbox" /> только выбранные</label>
      </div>
      <div class="list">
        <label v-for="p in visible" :key="p.id" class="item">
          <input
            type="checkbox"
            :checked="selectedSet.has(p.id)"
            :disabled="disabled"
            @change="toggle(p.id)" />
          {{ p.name }}
        </label>
        <p v-if="!visible.length" class="muted">Никого не найдено</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";

const props = defineProps({
  modelValue: { type: Array, required: true },
  participants: { type: Array, required: true },
  disabled: Boolean,
  // [{ key, title, ids }] — откуда можно скопировать состав
  copySources: { type: Array, default: () => [] },
});
const emit = defineEmits(["update:modelValue"]);

const open = ref(false);
const search = ref("");
const onlySelected = ref(false);

const selectedSet = computed(() => new Set(props.modelValue));
const excluded = computed(() => props.participants.filter((p) => !selectedSet.value.has(p.id)));

const visible = computed(() => {
  const q = search.value.trim().toLowerCase();
  return props.participants.filter(
    (p) =>
      (!q || p.name.toLowerCase().includes(q)) &&
      (!onlySelected.value || selectedSet.value.has(p.id))
  );
});

const update = (ids) => emit("update:modelValue", ids);
const selectAll = () => update(props.participants.map((p) => p.id));
const clear = () => update([]);
const toggle = (id) =>
  update(selectedSet.value.has(id) ? props.modelValue.filter((x) => x !== id) : [...props.modelValue, id]);

const copyFrom = (event) => {
  const source = props.copySources.find((s) => s.key === event.target.value);
  if (source) update([...source.ids]);
  event.target.value = "";
};
</script>

<style scoped>
.list {
  max-height: 320px;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 4px 16px;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
}
.item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  cursor: pointer;
}
select {
  padding: 7px;
  border-radius: 6px;
  font-size: 14px;
}
</style>
