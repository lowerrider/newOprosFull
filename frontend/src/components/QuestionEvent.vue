<template>
  <div class="content2">
    <div class="inputSize">
      <h2 class="textTitle">{{ title }}</h2>
      <h3 class="textSubTitle">{{ subTitle }}</h3>

      <VueSelect
        class="select"
        :inputId="id"
        v-model="selected"
        :options="options"
        placeholder="Выберите номинанта из списка" />
    </div>
  </div>
</template>

<script setup>
import VueSelect from "vue3-select-component";
import { ref, computed, watch } from "vue";
import { SKIP } from "../api";

const props = defineProps({
  title: String,
  subTitle: String,
  id: String,
  selected: [Number, String],
  nominees: Array,
});

const emit = defineEmits(["update:selected"]);
const selected = ref(props.selected ?? null);

const options = computed(() => [
  { label: "Пропустить", value: SKIP },
  ...props.nominees.map((nominee) => ({ label: nominee.name, value: nominee.id })),
]);

watch(
  () => props.selected,
  (newValue) => {
    selected.value = newValue ?? null;
  }
);

watch(selected, (newValue) => {
  emit("update:selected", { id: props.id, value: newValue });
});
</script>

<style scoped>
.textTitle {
  margin: 20px;
}
.textSubTitle {
  margin: 30px;
}
.select {
  margin: 60px auto;
  width: 100%;
  max-width: 600px;
}
.content2 {
  display: flex;
  justify-content: center;
  text-align: center;
}
.inputSize {
  width: 70%;
  text-align: center;
}
</style>
