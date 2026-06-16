<template>
  <div class="auth-layout">
    <main class="auth-left">
      <div class="auth-form">
        <slot />
      </div>
    </main>
    <aside class="auth-right">
      <slot name="right">
        <div class="auth-right-content">
          <h3>家庭收纳备忘</h3>
          <p>轻松管理家中物品，<br>让生活更有条理</p>
        </div>
      </slot>
    </aside>
  </div>
</template>
