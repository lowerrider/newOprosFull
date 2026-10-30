import { createRouter, createWebHashHistory } from "vue-router";
import { session } from "@/api";
import HomeView from "@/views/HomeView.vue";

const routes = [
  { path: "/", name: "home", component: HomeView },
  {
    path: "/vote",
    name: "vote",
    component: () => import("@/views/VoteView.vue"),
    meta: { role: "voter" },
  },
  {
    path: "/admin",
    name: "admin",
    component: () => import("@/views/admin/AdminView.vue"),
    meta: { role: "admin" },
  },
  // Старые ссылки
  { path: "/questions", redirect: "/vote" },
  { path: "/:pathMatch(.*)*", redirect: "/" },
];

// Hash-история: обновление страницы работает на любом хостинге без настройки
export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

router.beforeEach((to) => {
  if (to.meta.role && session.role !== to.meta.role) return { name: "home" };
});
