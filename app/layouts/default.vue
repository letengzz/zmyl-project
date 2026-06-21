<template>
  <div class="min-h-screen bg-gray-50/80">
    <nav class="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/60 shadow-sm">
      <div class="max-w-7xl mx-auto px-6">
        <div class="flex items-center h-16">
          <!-- Logo -->
          <div class="flex items-center gap-2.5 mr-10">
            <div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Building2 class="w-4.5 h-4.5 text-white" />
            </div>
            <span class="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              管理系统
            </span>
          </div>

          <!-- Navigation -->
          <div class="flex items-center gap-1">
            <NuxtLink
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              class="nav-link flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              :class="isActive(item.to)
                ? 'bg-primary/10 text-primary shadow-sm'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/80'"
            >
              <component :is="item.icon" class="w-4 h-4" />
              {{ item.label }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </nav>

    <main class="max-w-7xl mx-auto">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { Users, CalendarClock, Clock, Calculator, Building2, Wrench, Home } from '@lucide/vue'

const route = useRoute()

const navItems = [
  { to: '/', label: '首页', icon: Home },
  { to: '/person-manage', label: '人员管理', icon: Users },
  { to: '/attendance', label: '考勤管理', icon: CalendarClock },
  { to: '/overtime', label: '加班管理', icon: Clock },
  { to: '/scaffold-calc', label: '脚手架管理', icon: Calculator },
  { to: '/tools', label: '工具箱', icon: Wrench },
]

function isActive(path: string) {
  return route.path === path
}
</script>

<style scoped>
.nav-link {
  position: relative;
}
</style>
