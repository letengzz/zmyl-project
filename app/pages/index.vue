<template>
  <div class="p-6">
    <!-- 欢迎区域 -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">欢迎使用管理系统</h1>
      <p class="text-gray-500 mt-2">选择下方功能模块开始使用</p>
    </div>

    <!-- 功能卡片网格 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <NuxtLink
        v-for="item in features"
        :key="item.to"
        :to="item.to"
        class="group bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300"
      >
        <div class="flex items-start gap-4">
          <div
            class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors"
            :class="item.bgColor"
          >
            <component :is="item.icon" class="w-6 h-6" :class="item.iconColor" />
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-lg font-semibold text-gray-900 group-hover:text-primary transition-colors">
              {{ item.title }}
            </h3>
            <p class="text-sm text-gray-500 mt-1 line-clamp-2">
              {{ item.description }}
            </p>
          </div>
        </div>
        <div class="mt-4 flex items-center text-sm text-gray-400 group-hover:text-primary transition-colors">
          <span>进入</span>
          <ArrowRight class="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Users, CalendarClock, Clock, Calculator, Wrench, ArrowRight } from '@lucide/vue'

const features = [
  {
    to: '/person-manage',
    title: '人员管理',
    description: '管理人员信息，包括姓名、身份证、职位、银行卡等资料的增删改查和导出',
    icon: Users,
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    to: '/attendance',
    title: '考勤管理',
    description: '导入考勤数据，管理出勤记录，支持按日期查看和导出考勤报表',
    icon: CalendarClock,
    bgColor: 'bg-green-50',
    iconColor: 'text-green-600',
  },
  {
    to: '/overtime',
    title: '加班管理',
    description: '管理一期、二期加班人员，支持拖拽调配、加班记录保存和申请表导出',
    icon: Clock,
    bgColor: 'bg-orange-50',
    iconColor: 'text-orange-600',
  },
  {
    to: '/scaffold-calc',
    title: '脚手架',
    description: '脚手架架设管理',
    icon: Calculator,
    bgColor: 'bg-purple-50',
    iconColor: 'text-purple-600',
  },
  {
    to: '/tools',
    title: '工具箱',
    description: '实用小工具集合，包含人民币数字转大写金额、内容对比等功能',
    icon: Wrench,
    bgColor: 'bg-gray-100',
    iconColor: 'text-gray-600',
  },
]
</script>
