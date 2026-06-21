<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle>无加班人员</DialogTitle>
        <DialogDescription>
          {{ date ? `${formattedDate} 未安排加班的人员` : '请选择日期后查看' }}
        </DialogDescription>
      </DialogHeader>
      <div class="space-y-4">
        <div v-if="noOvertimePersons.length === 0" class="text-center text-gray-500 py-6">
          所有人员均已安排加班
        </div>
        <div v-else class="bg-gray-50 p-4 rounded-lg space-y-3 max-h-[400px] overflow-y-auto">
          <div class="font-semibold text-gray-900">
            无加班人数：{{ noOvertimePersons.length }}人
          </div>
          <div class="font-semibold text-gray-900">
            人员明细（含工种）：
          </div>
          <div v-for="(group, position) in groupedPersons" :key="position" class="text-gray-700">
            <span class="font-medium">{{ position }}（{{ group.length }}人）:</span>
            <span>{{ group.map(p => p.name).join('，') }}</span>
          </div>
        </div>

        <div v-if="noOvertimePersons.length > 0" class="flex items-center gap-2">
          <Input v-model="exportText" readonly class="flex-1" />
          <Button @click="copyText" class="bg-primary text-white whitespace-nowrap">
            <Copy class="w-4 h-4 mr-2" />
            复制
          </Button>
        </div>
        <div v-if="copied" class="text-green-600 text-sm">已复制到剪贴板!</div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="open = false">关闭</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Copy } from '@lucide/vue'
import { useClipboard } from '@vueuse/core'

interface Person {
  id: number
  name: string
  position: string
  location: number
}

const props = defineProps<{
  open: boolean
  persons: Person[]
  date?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const open = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

const { copy } = useClipboard()
const copied = ref(false)

const formattedDate = computed(() => {
  if (!props.date) return ''
  const [y, m, d] = props.date.split('-').map(Number)
  return `${y}年${m}月${d}日`
})

const noOvertimePersons = computed(() => props.persons)

const groupedPersons = computed(() => {
  const positionOrder = ['管理', '架工', '普工', '监护人', '资料员']
  const groups: Record<string, Person[]> = {}

  noOvertimePersons.value.forEach(person => {
    const pos = person.position || '其他'
    if (!groups[pos]) groups[pos] = []
    groups[pos].push(person)
  })

  const sortedGroups: Record<string, Person[]> = {}
  positionOrder.forEach(pos => {
    if (groups[pos]) sortedGroups[pos] = groups[pos]
  })
  Object.keys(groups).forEach(pos => {
    if (!sortedGroups[pos]) sortedGroups[pos] = groups[pos]!
  })

  return sortedGroups
})

const exportText = computed(() => {
  const total = noOvertimePersons.value.length
  const lines: string[] = []

  if (props.date) {
    const [year, month, day] = props.date.split('-').map(Number)
    lines.push(`${year}年${month}月${day}日 无加班人员（共${total}人）`)
    lines.push('')
  }

  lines.push(`无加班人数：${total}人`)
  lines.push('人员明细（含工种）：')
  Object.entries(groupedPersons.value).forEach(([position, persons]) => {
    lines.push(`${position}（${persons.length}人）:${persons.map(p => p.name).join('，')}`)
  })
  return lines.join('\n')
})

async function copyText() {
  try {
    await copy(exportText.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch (error) {
    console.error('复制失败:', error)
  }
}
</script>
