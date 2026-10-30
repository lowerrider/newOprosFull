<template>
  <div class="picker">
    <div class="toolbar">
      <input v-model="search" class="search" placeholder="Поиск по ФИО" />
      <button type="button" class="secondary" :disabled="disabled" @click="selectAll">Выбрать всех</button>
      <button type="button" class="secondary" :disabled="disabled" @click="clear">Снять всех</button>
      <select v-if="copySources.length" :disabled="disabled" @change="copyFrom($event)">
        <option value="">Скопировать из…</option>
        <option v-for="s in copySources" :key="s.key" :value="s.key">{{ s.title }}</option>
      </select>
      <select v-model="filter">
        <option value="all">Показать всех</option>
        <option value="selected">Только отмеченных</option>
        <option value="excluded">Только не отмеченных</option>
      </select>
    </div>

    <div class="list">
      <label v-for="p in visible" :key="p.id" class="item" :class="{ off: !selectedSet.has(p.id) }">
        <input
          type="checkbox"
          :checked="selectedSet.has(p.id)"
          :disabled="disabled"
          @change="toggle(p.id)" />
        <span>{{ p.name }}</span>
      </label>
      <p v-if="!visible.length" class="muted empty">Никого не найдено</p>
    </div>
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
  // all | selected | excluded
  initialFilter: { type: String, default: "all" },
});
const emit = defineEmits(["update:modelValue"]);

const search = ref("");
const filter = ref(props.initialFilter);

const selectedSet = computed(() => new Set(props.modelValue));

const visible = computed(() => {
  const q = search.value.trim().toLowerCase();
  return props.participants.filter(
    (p) =>
      (!q || p.name.toLowerCase().includes(q)) &&
      (filter.value === "all" || selectedSet.value.has(p.id) === (filter.value === "selected"))
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
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
}
.search {
  flex: 1;
  min-width: 200px;
}
.list {
  max-height: 340px;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 2px 12px;
  padding: 8px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fafbfe;
}
.item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 6px;
  border-radius: 6px;
  cursor: pointer;
}
.item:hover {
  background: var(--accent-soft);
}
.item.off span {
  color: var(--muted);
  text-decoration: line-through;
}
.empty {
  padding: 8px;
}
</style>
