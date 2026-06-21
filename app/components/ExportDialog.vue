<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-[700px]">
      <DialogHeader>
        <DialogTitle>导出人员信息</DialogTitle>
      </DialogHeader>
      <div class="space-y-4">
        <div class="bg-gray-50 p-4 rounded-lg">
          <div class="space-y-3">
            <div v-if="date" class="font-semibold text-gray-900">
              作业时间：{{ formattedDate }}  {{ startTime || '' }} 点— {{ endTime || '' }} 点  {{ durationText }}
            </div>
            <div v-if="workContent" class="font-semibold text-gray-900">
              作业内容：{{ workContent }}
            </div>
            <div v-if="workLocation" class="font-semibold text-gray-900">
              作业位置：{{ workLocation }}
            </div>
            <div class="font-semibold text-gray-900">
              作业人数：{{ persons.length }}人
            </div>
            <div class="font-semibold text-gray-900">
              人员明细（含工种）：
            </div>
            <div v-for="(group, position) in groupedPersons" :key="position" class="text-gray-700">
              <span class="font-medium">{{ position }}（{{ group.length }}人）:</span>
              <span>{{ group.map(p => p.name).join('，') }}</span>
            </div>
          </div>
        </div>
        
        <div class="flex items-center gap-2">
          <Input v-model="exportText" readonly class="flex-1" />
          <Button @click="copyText" class="bg-primary text-white whitespace-nowrap">
            <Copy class="w-4 h-4 mr-2" />
            复制
          </Button>
          <Button @click="exportWord" class="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap">
            <FileText class="w-4 h-4 mr-2" />
            导出为 WORD
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
import { ref, computed, watch } from 'vue'
import { Copy, FileText } from '@lucide/vue'
import { useClipboard } from '@vueuse/core'

// window.showSaveFilePicker 类型声明
declare global {
  interface Window {
    showSaveFilePicker(options?: {
      suggestedName?: string
      types?: Array<{
        description?: string
        accept: Record<string, string[]>
      }>
    }): Promise<FileSystemFileHandle>
  }
}
interface FileSystemFileHandle {
  createWritable(): Promise<FileSystemWritableFileStream>
}
interface FileSystemWritableFileStream {
  write(data: Blob): Promise<void>
  close(): Promise<void>
}

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
  workLocation?: string
  workContent?: string
  date?: string
  startTime?: string
  endTime?: string
  location?: number
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
  return `${y}年 ${m} 月 ${d} 日`
})

const durationText = computed(() => {
  if (!props.startTime || !props.endTime) return ''
  const startParts = props.startTime.split(':').map(Number)
  const endParts = props.endTime.split(':').map(Number)
  const sh = startParts[0] ?? 0
  const sm = startParts[1] ?? 0
  const eh = endParts[0] ?? 0
  const em = endParts[1] ?? 0
  const startMin = sh * 60 + sm
  const endMin = eh * 60 + em
  if (endMin <= startMin) return ''
  return `加班${(endMin - startMin) / 60}小时`
})

const groupedPersons = computed(() => {
  // 定义职位排序顺序
  const positionOrder = ['管理', '架工', '普工', '监护人', '资料员']
  const groups: Record<string, Person[]> = {}
  
  props.persons.forEach(person => {
    const pos = person.position || '其他'
    if (!groups[pos]) groups[pos] = []
    groups[pos].push(person)
  })
  
  // 按指定顺序排序
  const sortedGroups: Record<string, Person[]> = {}
  positionOrder.forEach(pos => {
    if (groups[pos]) {
      sortedGroups[pos] = groups[pos]
    }
  })
  
  // 添加其他未在列表中的职位
  Object.keys(groups).forEach(pos => {
    if (!sortedGroups[pos]) {
      sortedGroups[pos] = groups[pos]!
    }
  })
  
  return sortedGroups
})

const exportText = computed(() => {
  const total = props.persons.length
  const lines: string[] = []
  
  // 作业时间行
  if (props.date) {
    const [year, month, day] = props.date.split('-').map(Number)
    const timeStr = `${props.startTime || ''} 点— ${props.endTime || ''} 点`
    // 计算加班时长
    let duration = ''
    if (props.startTime && props.endTime) {
      const startParts = props.startTime.split(':').map(Number)
      const endParts = props.endTime.split(':').map(Number)
      const sh = startParts[0] ?? 0
      const sm = startParts[1] ?? 0
      const eh = endParts[0] ?? 0
      const em = endParts[1] ?? 0
      const startMin = sh * 60 + sm
      const endMin = eh * 60 + em
      if (endMin > startMin) {
        const hours = (endMin - startMin) / 60
        duration = `  加班${hours}小时`
      }
    }
    lines.push(`作业时间：   ${year}年  ${month}  月  ${day}  日           ${timeStr}${duration}`)
    lines.push('')
  }
  
  // 作业内容行
  if (props.workContent) {
    lines.push(`作业内容：${props.workContent}`)
  }
  
  // 作业位置行
  if (props.workLocation) {
    lines.push(`                                                                      作业位置：${props.workLocation}`)
  }
  
  lines.push(`作业人数：${total}人`)
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
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (error) {
    console.error('复制失败:', error)
  }
}

async function exportWord() {
  if (!props.date || !props.startTime || !props.endTime) {
    alert('请填写日期、开始时间和结束时间')
    return
  }
  
  try {
    const response = await fetch('/export-word', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: props.date,
        startTime: props.startTime,
        endTime: props.endTime,
        workLocation: props.workLocation || '',
        workContent: props.workContent || '',
        persons: props.persons.map(p => ({ name: p.name, position: p.position })),
        location: props.location || 1,
      }),
    })
    
    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.message || '导出失败')
    }
    
    const blob = await response.blob()
    
    // 生成文件名
    const [year, month, day] = props.date.split('-').map(Number)
    const dateStr = `${String(year).slice(2)}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`
    const locationStr = props.location === 1 ? '一期' : '二期'
    const fileName = `${dateStr}-${locationStr}加班加点申请表(1).docx`

    // 默认路径提示
    const defaultFolder = props.location === 1 
      ? `D:\\中煤\\加班\\01一期\\${String(year).slice(2)}${String(month).padStart(2, '0')}`
      : `D:\\中煤\\加班\\02二期\\${String(year).slice(2)}${String(month).padStart(2, '0')}`
    
    // 使用 File System Access API 弹出保存对话框，让用户选择路径
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: 'Word 文档',
            accept: { 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] },
          }],
        })
        const writable = await handle.createWritable()
        await writable.write(blob)
        await writable.close()
        return
      } catch (err: any) {
        if (err.name === 'AbortError') return // 用户取消了
        // 降级到浏览器默认下载
      }
    }
    
    // 降级方案：浏览器默认下载
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (error: any) {
    console.error('导出 WORD 失败:', error)
    alert('导出失败: ' + error.message)
  }
}
</script>
