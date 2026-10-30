<template>
  <div class="content">
    <div class="snowflakes">
      <div
        class="snowflake"
        style="left: 10%; animation-duration: 5s; animation-delay: 0s"></div>
      <div
        class="snowflake"
        style="left: 30%; animation-duration: 7s; animation-delay: 1s"></div>
      <div
        class="snowflake"
        style="left: 50%; animation-duration: 6s; animation-delay: 2s"></div>
      <div
        class="snowflake"
        style="left: 70%; animation-duration: 5s; animation-delay: 3s"></div>
      <div
        class="snowflake"
        style="left: 90%; animation-duration: 8s; animation-delay: 4s"></div>
    </div>
    <!-- <div class="tree"></div>
    <div class="toy"></div>
    <div class="toy2"></div>
    <div class="toy3"></div>
    <div class="toy4"></div>
    <div class="nutcracker"></div>
    <div class="podarok"></div>
    <div class="vetka">
      <img class="vetkaImg" src="./assets/images/vetka.png" alt="" />
    </div>
    <div class="vetka2">
      <img class="vetkaImg2" src="./assets/images/vetka.png" alt="" />
    </div> -->

    <router-view></router-view>
  </div>
</template>

<style scoped>
.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh; /* Занимает всю высоту окна */
}
</style>
