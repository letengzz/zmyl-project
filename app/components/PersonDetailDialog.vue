<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>人员详细信息</DialogTitle>
      </DialogHeader>
      <div v-if="person" class="space-y-4">
        <div class="flex items-center gap-4 pb-4 border-b">
          <div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
            {{ person.name.charAt(0) }}
          </div>
          <div>
            <div class="text-xl font-bold text-gray-900">{{ person.name }}</div>
            <div class="text-sm text-gray-500">{{ person.position || '未设置职位' }}</div>
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <div class="text-sm text-gray-500">身份证号</div>
            <div class="font-medium">{{ person.id_card || '-' }}</div>
          </div>
          <div class="space-y-1">
            <div class="text-sm text-gray-500">手机号</div>
            <div class="font-medium">{{ person.phone || '-' }}</div>
          </div>
          <div class="space-y-1">
            <div class="text-sm text-gray-500">位置</div>
            <div class="font-medium">{{ getLocationText(person.location) }}</div>
          </div>
          <div class="space-y-1">
            <div class="text-sm text-gray-500">入场时间</div>
            <div class="font-medium">{{ formatDate(person.entry_time) }}</div>
          </div>
          <div class="space-y-1 col-span-2">
            <div class="text-sm text-gray-500">地址</div>
            <div class="font-medium">{{ person.address || '-' }}</div>
          </div>
          <div class="space-y-1">
            <div class="text-sm text-gray-500">紧急联系人</div>
            <div class="font-medium">{{ person.emer_person || '-' }}</div>
          </div>
          <div class="space-y-1">
            <div class="text-sm text-gray-500">紧急联系人手机号</div>
            <div class="font-medium">{{ person.emer_phone || '-' }}</div>
          </div>
          <div class="space-y-1 col-span-2">
            <div class="text-sm text-gray-500">银行卡号</div>
            <div class="font-medium">{{ person.bank_num || '-' }}</div>
          </div>
          <div class="space-y-1">
            <div class="text-sm text-gray-500">开户行名称</div>
            <div class="font-medium">{{ person.bank_name || '-' }}</div>
          </div>
          <div class="space-y-1">
            <div class="text-sm text-gray-500">银行行号</div>
            <div class="font-medium">{{ person.bank_code || '-' }}</div>
          </div>
          <div class="space-y-1">
            <div class="text-sm text-gray-500">考勤工资</div>
            <div class="font-medium">{{ person.attendance_salary != null ? `¥${person.attendance_salary}` : '-' }}</div>
          </div>
          <div class="space-y-1">
            <div class="text-sm text-gray-500">实际工资</div>
            <div class="font-medium">{{ person.actual_salary != null ? `¥${person.actual_salary}` : '-' }}</div>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="open = false">关闭</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Person {
  id: number
  name: string
  id_card: string
  phone: string
  position: string
  location: number
  address: string
  entry_time: string
  is_resign: number
  emer_person: string
  emer_phone: string
  bank_num: string
  bank_name: string
  bank_code: string
  order: number | null
  attendance_salary: number | null
  actual_salary: number | null
}

const props = defineProps<{
  open: boolean
  person: Person | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const open = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

function getLocationText(location: number) {
  const map: Record<number, string> = {
    0: '管理',
    1: '一期',
    2: '二期'
  }
  return map[location] || '未知'
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateStr
  }
}
</script>
