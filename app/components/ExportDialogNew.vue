<template>
  <Dialog :open="open" @update:open="onOpenChange">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>导出人员信息</DialogTitle>
      </DialogHeader>
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label>导出格式</Label>
            <Select v-model="exportFormat">
              <SelectTrigger>
                <SelectValue placeholder="选择格式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">文本格式</SelectItem>
                <SelectItem value="csv">CSV 格式</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label>分组方式</Label>
            <Select v-model="groupBy">
              <SelectTrigger>
                <SelectValue placeholder="选择分组" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="location">按位置分组</SelectItem>
                <SelectItem value="position">按职位分组</SelectItem>
                <SelectItem value="none">不分组</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div class="space-y-2">
          <Label>预览</Label>
          <div class="border rounded-md p-3 bg-gray-50 max-h-[300px] overflow-y-auto">
            <pre class="text-sm whitespace-pre-wrap">{{ exportText }}</pre>
          </div>
        </div>
        
        <div class="flex items-center gap-2">
          <Input v-model="exportText" readonly class="flex-1" />
          <Button @click="copyText" class="bg-primary text-white whitespace-nowrap">
            <Copy class="w-4 h-4 mr-2" />
            复制
          </Button>
        </div>
        
        <div v-if="copied" class="text-green-600 text-sm">已复制到剪贴板!</div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="onOpenChange(false)">关闭</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Copy } from '@lucide/vue'
import { useClipboard } from '@vueuse/core'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Button } from '~/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'

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
  persons: Person[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const exportFormat = ref('text')
const groupBy = ref('location')

const { copy } = useClipboard()
const copied = ref(false)

function onOpenChange(value: boolean) {
  emit('update:open', value)
}

const groupedPersons = computed(() => {
  const groups: Record<string, Person[]> = {}
  
  if (groupBy.value === 'none') {
    groups['全部'] = props.persons
    return groups
  }
  
  props.persons.forEach(person => {
    let key = ''
    if (groupBy.value === 'location') {
      key = person.location === 1 ? '一期' : '二期'
    } else if (groupBy.value === 'position') {
      key = person.position || '其他'
    }
    
    if (!groups[key]) groups[key] = []
    const group = groups[key]
    if (group) group.push(person)
  })
  
  return groups
})

const exportText = computed(() => {
  if (exportFormat.value === 'csv') {
    return generateCSV()
  }
  return generateText()
})

function generateText(): string {
  const lines: string[] = []
  
  Object.entries(groupedPersons.value).forEach(([group, persons]) => {
    if (groupBy.value !== 'none') {
      lines.push(`${group}(${persons.length}人):`)
    }
    
    persons.forEach(person => {
      const info = [
        person.name,
        person.id_card,
        person.phone,
        person.position
      ].filter(Boolean).join(' - ')
      lines.push(`  ${info}`)
    })
    
    if (groupBy.value !== 'none') {
      lines.push('')
    }
  })
  
  return lines.join('\n')
}

function generateCSV(): string {
  const lines: string[] = []
  lines.push('姓名,身份证号,电话,职位,位置,入职时间,考勤工资,实际工资')
  
  props.persons.forEach(person => {
    const row = [
      person.name,
      person.id_card,
      person.phone,
      person.position,
      person.location === 1 ? '一期' : '二期',
      person.entry_time ? person.entry_time.split(' ')[0] : '',
      person.attendance_salary ?? '',
      person.actual_salary ?? ''
    ].map(field => `"${field || ''}"`).join(',')
    lines.push(row)
  })
  
  return lines.join('\n')
}

async function copyText() {
  try {
    await copy(exportText.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (error) {
    console.error('复制失败:', error)
  }
}
</script>
