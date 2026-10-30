import "./assets/main.css";
import { createApp } from "vue";
import { createRouter, createWebHashHistory } from "vue-router";
import App from "./App.vue";
import Main from "./components/Main.vue";
import Questions from "./components/Questions.vue";
import Admin from "./components/admin/Admin.vue";
import { session } from "./api";

const routes = [
  { path: "/", name: "Main", component: Main },
  { path: "/questions", name: "Questions", component: Questions, meta: { role: "voter" } },
  { path: "/admin", name: "Admin", component: Admin, meta: { role: "admin" } },
];

// Hash-история, чтобы на GitHub Pages обновление страницы не давало 404
const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

router.beforeEach((to) => {
  if (to.meta.role && session.role !== to.meta.role) return { name: "Main" };
});

const app = createApp(App);
app.use(router);
app.mount("#app");
