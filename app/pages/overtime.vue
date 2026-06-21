<template>
  <div class="p-6 min-h-screen bg-gray-50">
    <div class="mb-6 flex items-center justify-between flex-wrap gap-4">
      <h1 class="text-3xl font-bold">加班管理</h1>
      <div class="flex items-center gap-3 flex-wrap">
        <div class="flex items-center gap-1">
          <Label class="text-sm whitespace-nowrap">日期</Label>
          <Input type="date" v-model="sharedDate" class="w-40 h-9 text-sm" />
        </div>
        <Button @click="saveAllOvertime" :disabled="!canSaveAll" size="sm" class="h-9 bg-green-600 hover:bg-green-700 text-white text-sm px-4">
          <Save class="w-4 h-4 mr-1" />
          保存
        </Button>
        <Button @click="showNoOvertimeDialog = true" variant="outline" size="sm" class="h-9 text-sm">
          <UsersRound class="w-4 h-4 mr-1" />
          无加班人员
        </Button>
        <Button @click="exportOvertimeApplication" variant="outline" size="sm" class="h-9 text-sm">
          <FileDown class="w-4 h-4 mr-1" />
          下载加班申请表
        </Button>
        <span v-if="totalRecordCount > 0" class="text-sm text-gray-500">共{{ totalRecordCount }}条记录</span>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-6">
      <!-- 一期区域 -->
      <div class="bg-white rounded-lg shadow p-6 relative">
        <div class="absolute top-4 right-4 flex gap-2">
          <Button @click="showAddDialog = true; addLocation = 1" size="sm" class="bg-primary text-white">
            <Plus class="w-4 h-4 mr-1" />
            新增
          </Button>
          <Button @click="showExportDialog = true; exportLocation = 1" variant="outline" size="sm">
            <Download class="w-4 h-4 mr-1" />
            导出
          </Button>
        </div>
        <h2 class="text-2xl font-bold mb-4 text-primary">一期</h2>
        

        <div class="flex items-center gap-3 flex-wrap mb-4 p-3 bg-gray-50 rounded-lg">
          <div class="flex items-center gap-1">
            <Label class="text-xs whitespace-nowrap">开始</Label>
            <Select v-model="overtime1.startTime">
              <SelectTrigger class="w-28 h-8 text-sm"><SelectValue placeholder="选择" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="t in timeOptions" :key="t" :value="t">{{ t }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="flex items-center gap-1">
            <Label class="text-xs whitespace-nowrap">结束</Label>
            <Select v-model="overtime1.endTime">
              <SelectTrigger class="w-28 h-8 text-sm"><SelectValue placeholder="选择" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="t in timeOptions" :key="t" :value="t">{{ t }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
                  <!-- 一期加班记录 -->
        <div class="flex items-center gap-3 ">
          <div class="flex items-center gap-1 flex-1">
            <Label class="text-xs whitespace-nowrap">作业位置</Label>
            <Input v-model="overtime1.workLocation" placeholder="如: A栋3层" class="h-8 text-sm flex-1" />
          </div>
          <div class="flex items-center gap-1 flex-[2]">
            <Label class="text-xs whitespace-nowrap">作业内容</Label>
            <Input v-model="overtime1.workContent" placeholder="作业内容描述" class="h-8 text-sm flex-1" />
          </div>
        </div>
          <span v-if="overtime1.recordCount > 0" class="text-xs text-gray-500">{{ overtime1.recordCount }}条记录</span>
          <span v-if="getOvertimeDuration(1) > 0" class="text-xs text-blue-600 font-medium">{{ getOvertimeDuration(1).toFixed(2) }}h</span>
        </div>
        
        <div v-if="Object.keys(location1Groups).length === 0" class="text-gray-500 text-center py-8">
          暂无人员数据
        </div>
        <PersonGroup 
          v-for="(persons, position) in location1Groups" 
          :key="position"
          :position="String(position)"
          :persons="persons"
          :location="1"
          :duplicate-ids="duplicateIds"
          @delete="handleDelete"
          @reorder="handleReorder"
          @detail="showPersonDetail"
          @move="handleMove"
        />
      </div>

      <!-- 二期区域 -->
      <div class="bg-white rounded-lg shadow p-6 relative">
        <div class="absolute top-4 right-4 flex gap-2">
          <Button @click="showAddDialog = true; addLocation = 2" size="sm" class="bg-primary text-white">
            <Plus class="w-4 h-4 mr-1" />
            新增
          </Button>
          <Button @click="showExportDialog = true; exportLocation = 2" variant="outline" size="sm">
            <Download class="w-4 h-4 mr-1" />
            导出
          </Button>
        </div>
        <h2 class="text-2xl font-bold mb-4 text-primary">二期</h2>
        
        
        <div class="flex items-center gap-3 flex-wrap mb-4 p-3 bg-gray-50 rounded-lg">
          <div class="flex items-center gap-1">
            <Label class="text-xs whitespace-nowrap">开始</Label>
            <Select v-model="overtime2.startTime">
              <SelectTrigger class="w-28 h-8 text-sm"><SelectValue placeholder="选择" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="t in timeOptions" :key="t" :value="t">{{ t }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="flex items-center gap-1">
            <Label class="text-xs whitespace-nowrap">结束</Label>
            <Select v-model="overtime2.endTime">
              <SelectTrigger class="w-28 h-8 text-sm"><SelectValue placeholder="选择" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="t in timeOptions" :key="t" :value="t">{{ t }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <!-- 二期加班记录 -->
        <div class="flex items-center gap-3  ">
          <div class="flex items-center gap-1 flex-1">
            <Label class="text-xs whitespace-nowrap">作业位置</Label>
            <Input v-model="overtime2.workLocation" placeholder="作业位置" class="h-8 text-sm flex-1" />
          </div>
          <div class="flex items-center gap-1 flex-[2]">
            <Label class="text-xs whitespace-nowrap">作业内容</Label>
            <Input v-model="overtime2.workContent" placeholder="作业内容" class="h-8 text-sm flex-1" />
          </div>
        </div>
          <span v-if="overtime2.recordCount > 0" class="text-xs text-gray-500">{{ overtime2.recordCount }}条记录</span>
          <span v-if="getOvertimeDuration(2) > 0" class="text-xs text-blue-600 font-medium">{{ getOvertimeDuration(2).toFixed(2) }}h</span>
        </div>
        
        <div v-if="Object.keys(location2Groups).length === 0" class="text-gray-500 text-center py-8">
          暂无人员数据
        </div>
        <PersonGroup 
          v-for="(persons, position) in location2Groups" 
          :key="position"
          :position="String(position)"
          :persons="persons"
          :location="2"
          :duplicate-ids="duplicateIds"
          @delete="handleDelete"
          @reorder="handleReorder"
          @detail="showPersonDetail"
          @move="handleMove"
        />
      </div>
    </div>

    <!-- 新增(恢复)对话框 -->
    <AddPersonDialog 
      v-model:open="showAddDialog" 
      :location="addLocation" 
      :deleted-persons="getDeletedPersons()"
      @success="fetchPersons" 
      @add="handleAddPerson" 
    />

    <!-- 导出对话框 -->
    <ExportDialog 
      v-model:open="showExportDialog" 
      :persons="getPersonsByLocation(exportLocation)" 
      :work-location="getOt(exportLocation).workLocation" 
      :work-content="getOt(exportLocation).workContent" 
      :date="sharedDate"
      :start-time="getOt(exportLocation).startTime"
      :end-time="getOt(exportLocation).endTime"
      :location="exportLocation"
    />

    <!-- 人员详情对话框 -->
    <PersonDetailDialog v-model:open="showDetailDialog" :person="selectedPerson" />

    <!-- 删除确认对话框 -->
    <DeleteConfirmDialog 
      v-model:open="showDeleteDialog" 
      :person-id="deletePersonId" 
      :person-name="deletePersonName"
      @confirm="confirmDelete"
    />

    <!-- 无加班人员对话框 -->
    <NoOvertimeDialog 
      v-model:open="showNoOvertimeDialog" 
      :persons="noOvertimePersons" 
      :date="sharedDate" 
    />

    <!-- 保存结果对话框 -->
    <Dialog v-model:open="showSaveResultDialog">
      <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{{ saveResultSuccess ? '保存成功' : '保存失败' }}</DialogTitle>
          <DialogDescription>
            {{ saveResultMessage }}
          </DialogDescription>
        </DialogHeader>
        <div class="flex justify-end mt-4">
          <Button @click="showSaveResultDialog = false">确定</Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Plus, Download, Save, UsersRound, FileDown } from '@lucide/vue'
import PersonGroup from '~/components/PersonGroup.vue'
import AddPersonDialog from '~/components/AddPersonDialog.vue'
import ExportDialog from '~/components/ExportDialog.vue'
import PersonDetailDialog from '~/components/PersonDetailDialog.vue'
import DeleteConfirmDialog from '~/components/DeleteConfirmDialog.vue'
import NoOvertimeDialog from '~/components/NoOvertimeDialog.vue'

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
  sort: number | null
  attendance_salary: number | null
  actual_salary: number | null
}

interface OvertimeState {
  startTime: string
  endTime: string
  workLocation: string
  workContent: string
  recordCount: number
  saving: boolean
}

// ---- 状态 ----

const today = new Date()
const defaultDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
const sharedDate = ref(defaultDate)

const allPersons = ref<Person[]>([])
const deletedPersonIds = ref<number[]>([])
// 每个期的加班人员列表（拖拽后的顺序）
const overtimePersons1 = ref<Person[]>([])
const overtimePersons2 = ref<Person[]>([])
// 每个期是否存在已保存的加班任务
const hasTask1 = ref(false)
const hasTask2 = ref(false)

const showAddDialog = ref(false)
const showExportDialog = ref(false)
const showDetailDialog = ref(false)
const showDeleteDialog = ref(false)
const showSaveResultDialog = ref(false)
const showNoOvertimeDialog = ref(false)

const addLocation = ref(1)
const exportLocation = ref(1)
const selectedPerson = ref<Person | null>(null)
const deletePersonId = ref<number | null>(null)
const deletePersonName = ref('')
const deletePersonLocation = ref<number>(1)
const saveResultMessage = ref('')
const saveResultSuccess = ref(true)

const defaultLocation2 = '压缩区、205管桥、碱洗区、202管桥、204管廊、构-205、热区、构-216、构-206、构-203'
const defaultContent2 = '搭设脚手架、拆除脚手架'

const overtime1 = ref<OvertimeState>({ startTime: '18:00', endTime: '', workLocation: '', workContent: '', recordCount: 0, saving: false })
const overtime2 = ref<OvertimeState>({ startTime: '18:00', endTime: '', workLocation: defaultLocation2, workContent: defaultContent2, recordCount: 0, saving: false })

// ---- 计算属性 ----

const timeOptions = computed(() => {
  const options: string[] = []
  for (let h = 18; h < 24; h++) {
    options.push(`${String(h).padStart(2, '0')}:00`)
    options.push(`${String(h).padStart(2, '0')}:30`)
  }
  return options
})

const totalRecordCount = computed(() => overtime1.value.recordCount + overtime2.value.recordCount)

function getOt(location: number): OvertimeState {
  return location === 1 ? overtime1.value : overtime2.value
}

function getOvertimeDuration(location: number): number {
  const ot = getOt(location)
  if (!ot.startTime || !ot.endTime) return 0
  const [sh, sm] = ot.startTime.split(':').map(Number)
  const [eh, em] = ot.endTime.split(':').map(Number)
  const startMin = (sh ?? 0) * 60 + (sm ?? 0)
  const endMin = (eh ?? 0) * 60 + (em ?? 0)
  if (endMin <= startMin) return 0
  return (endMin - startMin) / 60
}

function canSaveOvertime(location: number): boolean {
  const ot = getOt(location)
  return !!(sharedDate.value && ot.startTime && ot.endTime && ot.workLocation.trim() && ot.workContent.trim() && getOvertimeDuration(location) > 0 && !ot.saving)
}

// 两期都必须填齐开始时间、结束时间、作业位置、作业内容才可保存
const canSaveAll = computed(() => canSaveOvertime(1) && canSaveOvertime(2))

// 无加班人员：与新增按钮逻辑相同，取当前实际显示的人员作为“在岗”，其余为“无加班”
const noOvertimePersons = computed(() => {
  const displayedIds = new Set<number>()
  // 一期当前实际显示的人员
  if (hasTask1.value) {
    overtimePersons1.value.forEach(p => displayedIds.add(p.id))
  } else {
    allPersons.value.filter(p => p.location === 1 && !deletedPersonIds.value.includes(p.id))
      .forEach(p => displayedIds.add(p.id))
  }
  // 二期当前实际显示的人员
  if (hasTask2.value) {
    overtimePersons2.value.forEach(p => displayedIds.add(p.id))
  } else {
    allPersons.value.filter(p => p.location === 2 && !deletedPersonIds.value.includes(p.id))
      .forEach(p => displayedIds.add(p.id))
  }
  return allPersons.value.filter(p => !displayedIds.has(p.id))
})

// 一期和二期的人员ID集合，用于检测重复
const duplicateIds = computed(() => {
  const ids1 = new Set<number>()
  if (hasTask1.value) {
    overtimePersons1.value.forEach(p => ids1.add(p.id))
  } else {
    allPersons.value.filter(p => p.location === 1 && !deletedPersonIds.value.includes(p.id))
      .forEach(p => ids1.add(p.id))
  }
  const ids2 = new Set<number>()
  if (hasTask2.value) {
    overtimePersons2.value.forEach(p => ids2.add(p.id))
  } else {
    allPersons.value.filter(p => p.location === 2 && !deletedPersonIds.value.includes(p.id))
      .forEach(p => ids2.add(p.id))
  }
  const duplicates = new Set<number>()
  ids1.forEach(id => { if (ids2.has(id)) duplicates.add(id) })
  return duplicates
})

// 按职位分组
function groupByPosition(persons: Person[]) {
  const positionOrder = ['管理', '架工', '普工', '监护人']
  const groups: Record<string, Person[]> = {}
  positionOrder.forEach(pos => { groups[pos] = [] })
  persons.forEach(person => {
    const pos = person.position || '其他'
    if (!groups[pos]) groups[pos] = []
    groups[pos]!.push(person)
  })
  const sortedGroups: Record<string, Person[]> = {}
  positionOrder.forEach(pos => { sortedGroups[pos] = groups[pos]! })
  Object.keys(groups).forEach(pos => {
    if (!sortedGroups[pos]) sortedGroups[pos] = groups[pos]!
  })
  return sortedGroups
}

const location1Groups = computed(() => {
  const persons = hasTask1.value
    ? overtimePersons1.value
    : allPersons.value.filter(p => p.location === 1 && !deletedPersonIds.value.includes(p.id))
  return groupByPosition(persons)
})

const location2Groups = computed(() => {
  const persons = hasTask2.value
    ? overtimePersons2.value
    : allPersons.value.filter(p => p.location === 2 && !deletedPersonIds.value.includes(p.id))
  return groupByPosition(persons)
})

function getPersonsByLocation(location: number): Person[] {
  if (location === 1 && hasTask1.value) return overtimePersons1.value
  if (location === 2 && hasTask2.value) return overtimePersons2.value
  return allPersons.value.filter(p => p.location === location && !deletedPersonIds.value.includes(p.id))
}

// 获取「已删除」人员：在职人员中未出现在一期/二期显示列表中的人
function getDeletedPersons(): Person[] {
  const displayedIds = new Set<number>()
  // 收集一期当前显示的人员
  if (hasTask1.value) {
    overtimePersons1.value.forEach(p => displayedIds.add(p.id))
  } else {
    allPersons.value.filter(p => p.location === 1 && !deletedPersonIds.value.includes(p.id))
      .forEach(p => displayedIds.add(p.id))
  }
  // 收集二期当前显示的人员
  if (hasTask2.value) {
    overtimePersons2.value.forEach(p => displayedIds.add(p.id))
  } else {
    allPersons.value.filter(p => p.location === 2 && !deletedPersonIds.value.includes(p.id))
      .forEach(p => displayedIds.add(p.id))
  }
  // 所有在职人员中未显示的即为「已删除」
  return allPersons.value.filter(p => !displayedIds.has(p.id))
}

// ---- 数据加载 ----

async function fetchPersons() {
  try {
    const response = await $fetch('/api/person') as any
    if (response.success && response.data) {
      allPersons.value = response.data
    }
  } catch (error) {
    console.error('获取人员列表失败:', error)
  }
}

async function loadOvertimeRecords(location: number, date: string) {
  const ot = getOt(location)
  if (!date) {
    ot.recordCount = 0
    ot.startTime = '18:00'
    ot.endTime = ''
    ot.workLocation = ''
    ot.workContent = ''
    if (location === 1) { hasTask1.value = false; overtimePersons1.value = [] }
    else { hasTask2.value = false; overtimePersons2.value = [] }
    return
  }
  try {
    const response = await $fetch(`/api/overtime?date=${date}&location=${location}`) as any
    if (response.success) {
      const data = response.data || []
      if (data.length > 0 && data[0].task_id) {
        // 有加班任务（即使人员为0也视为有任务）
        if (location === 1) hasTask1.value = true
        else hasTask2.value = true

        ot.recordCount = data.filter((r: any) => r.person_id).length
        const record = data[0]

        function parseTime(val: any): string {
          if (!val) return ''
          if (val instanceof Date) return `${String(val.getHours()).padStart(2, '0')}:${String(val.getMinutes()).padStart(2, '0')}`
          const m = String(val).match(/(\d{2}):(\d{2})/)
          return m ? `${m[1]}:${m[2]}` : ''
        }

        const parsedStart = parseTime(record.start_time)
        const parsedEnd = parseTime(record.end_time)
        if (parsedStart) ot.startTime = parsedStart
        if (parsedEnd) ot.endTime = parsedEnd
        ot.workLocation = record.work_location || ''
        ot.workContent = record.work_content || ''

        // 提取人员列表（保留 sort 字段）
        const persons: Person[] = data
          .filter((r: any) => r.person_id)
          .map((r: any) => ({
            id: r.person_id, name: r.name, id_card: r.id_card, phone: r.phone,
            position: r.position, location: r.location, address: r.address,
            entry_time: r.entry_time, is_resign: r.is_resign, emer_person: r.emer_person,
            emer_phone: r.emer_phone, bank_num: r.bank_num, order: r.order, sort: r.sort,
            attendance_salary: null, actual_salary: null
          }))
        if (location === 1) overtimePersons1.value = persons
        else overtimePersons2.value = persons
      } else {
        // 没有加班任务，从 person 表显示
        if (location === 1) { hasTask1.value = false; overtimePersons1.value = [] }
        else { hasTask2.value = false; overtimePersons2.value = [] }
        ot.recordCount = 0
        ot.startTime = '18:00'
        ot.endTime = ''
        ot.workLocation = location === 2 ? defaultLocation2 : ''
        ot.workContent = location === 2 ? defaultContent2 : ''
      }
    }
  } catch (error) {
    console.error('加载加班记录失败:', error)
  }
}

// 监听日期变化，同时加载一期和二期
watch(sharedDate, async (newDate) => {
  // 先重置所有状态，避免旧数据残留
  for (const loc of [1, 2]) {
    const ot = getOt(loc)
    ot.startTime = '18:00'; ot.endTime = ''
    ot.workLocation = loc === 2 ? defaultLocation2 : ''
    ot.workContent = loc === 2 ? defaultContent2 : ''
    ot.recordCount = 0
  }
  hasTask1.value = false; overtimePersons1.value = []
  hasTask2.value = false; overtimePersons2.value = []

  if (newDate) {
    await Promise.all([
      loadOvertimeRecords(1, newDate),
      loadOvertimeRecords(2, newDate)
    ])
  }
})

// ---- 保存 ----

function showSaveResult(success: boolean, message: string) {
  saveResultSuccess.value = success
  saveResultMessage.value = message
  showSaveResultDialog.value = true
}

async function saveAllOvertime() {
  const results: string[] = []
  let hasError = false
  const savedLocations: number[] = []

  for (const location of [1, 2]) {
    if (!canSaveOvertime(location)) continue

    const ot = getOt(location)
    // 直接从 overtimePersons 获取当前显示的人员
    const otPersons = location === 1 ? overtimePersons1.value : overtimePersons2.value
    const hasTask = location === 1 ? hasTask1.value : hasTask2.value
    const personIds: number[] = otPersons.map(p => p.id)

    // 如果该期从未保存过且 overtimePersons 未填充，从 allPersons 获取并排除已移动到另一期的人员
    if (!hasTask && otPersons.length === 0) {
      const otherOtPersons = location === 1 ? overtimePersons2.value : overtimePersons1.value
      const otherIds = new Set(otherOtPersons.map(p => p.id))
      allPersons.value
        .filter(p => p.location === location && !deletedPersonIds.value.includes(p.id) && !otherIds.has(p.id))
        .forEach(p => personIds.push(p.id))
    }

    console.log(`[保存] ${location === 1 ? '一期' : '二期'}: hasTask=${hasTask}, otPersons=${otPersons.length}, personIds=${personIds.length}`)

    ot.saving = true
    try {
      const dateStr = sharedDate.value
      const startTimeStr = `${dateStr}T${ot.startTime}:00`
      const endTimeStr = `${dateStr}T${ot.endTime}:00`

      const response = await $fetch('/api/overtime', {
        method: 'POST',
        body: { date: dateStr, startTime: startTimeStr, endTime: endTimeStr, personIds, location, workLocation: ot.workLocation, workContent: ot.workContent }
      }) as any

      if (response.success) {
        results.push(`${location === 1 ? '一期' : '二期'}: ${response.message}`)
        savedLocations.push(location)
      } else {
        hasError = true
        results.push(`${location === 1 ? '一期' : '二期'}: 保存失败 - ${response.message}`)
      }
    } catch (error: any) {
      hasError = true
      results.push(`${location === 1 ? '一期' : '二期'}: 保存失败 - ${error.message}`)
    } finally {
      ot.saving = false
    }
  }

  // 保存完成后统一重载两期数据，保证页面与数据库一致
  if (savedLocations.length > 0) {
    await Promise.all([
      loadOvertimeRecords(1, sharedDate.value),
      loadOvertimeRecords(2, sharedDate.value)
    ])
  }

  if (results.length === 0) {
    showSaveResult(false, '没有可保存的数据')
  } else {
    showSaveResult(!hasError, results.join('\n'))
  }
}

// ---- 拖拽相关 ----

function handleMove(personId: number, toLocation: number, insertIndex: number = -1, targetPosition: string = '') {
  // 从实际显示列表中查找源位置（而不是依赖 person.location）
  let fromLocation: number
  const inList1 = overtimePersons1.value.some(p => p.id === personId)
  const inList2 = overtimePersons2.value.some(p => p.id === personId)

  if (toLocation === 1) {
    fromLocation = inList2 ? 2 : 1
  } else {
    fromLocation = inList1 ? 1 : 2
  }

  const person = allPersons.value.find(p => p.id === personId)
  if (!person) return

  // 如果目标期还没有保存过记录，先填充该期的原始人员
  if (toLocation === 1 && !hasTask1.value) {
    overtimePersons1.value = allPersons.value.filter(
      p => p.location === 1 && !deletedPersonIds.value.includes(p.id) && p.id !== personId
    )
    hasTask1.value = true
  }
  if (toLocation === 2 && !hasTask2.value) {
    overtimePersons2.value = allPersons.value.filter(
      p => p.location === 2 && !deletedPersonIds.value.includes(p.id) && p.id !== personId
    )
    hasTask2.value = true
  }

  // 如果源期也没有保存过记录，先填充该期的原始人员
  if (fromLocation === 1 && !hasTask1.value) {
    overtimePersons1.value = allPersons.value.filter(
      p => p.location === 1 && !deletedPersonIds.value.includes(p.id)
    )
    hasTask1.value = true
  }
  if (fromLocation === 2 && !hasTask2.value) {
    overtimePersons2.value = allPersons.value.filter(
      p => p.location === 2 && !deletedPersonIds.value.includes(p.id)
    )
    hasTask2.value = true
  }

  // 从源期移除
  if (fromLocation === 1) {
    overtimePersons1.value = overtimePersons1.value.filter(p => p.id !== personId)
  } else {
    overtimePersons2.value = overtimePersons2.value.filter(p => p.id !== personId)
  }

  // 添加到目标期（使用 splice 插入到指定位置）
  const updatedPerson = { ...person, location: toLocation }
  const targetList = toLocation === 1 ? overtimePersons1.value : overtimePersons2.value

  if (!targetList.find(p => p.id === personId)) {
    if (insertIndex >= 0 && targetPosition) {
      const positionPersons = targetList.filter(p => p.position === targetPosition)
      const insertIdx = Math.min(insertIndex, positionPersons.length)

      if (insertIdx < positionPersons.length) {
        const targetPerson = positionPersons[insertIdx]
        if (targetPerson) {
          const targetGlobalIndex = targetList.findIndex(p => p.id === targetPerson.id)
          targetList.splice(targetGlobalIndex, 0, updatedPerson)
        }
      } else {
        if (positionPersons.length > 0) {
          const lastPerson = positionPersons[positionPersons.length - 1]
          if (lastPerson) {
            const lastGlobalIndex = targetList.findIndex(p => p.id === lastPerson.id)
            targetList.splice(lastGlobalIndex + 1, 0, updatedPerson)
          }
        } else {
          targetList.push(updatedPerson)
        }
      }
    } else {
      targetList.push(updatedPerson)
    }
  }
}

function handleReorder(position: string, location: number, reorderedPersons: Person[]) {
  // 同组拖拽排序后，将新顺序同步到 overtimePersons
  const otPersons = location === 1 ? overtimePersons1.value : overtimePersons2.value
  const reordered = [...reorderedPersons]

  // 找出同岗位的人员，用排序后的列表替换
  const updatedList = otPersons.map(p => {
    if (p.position === position) {
      return reordered.shift() || p
    }
    return p
  })

  if (location === 1) overtimePersons1.value = updatedList
  else overtimePersons2.value = updatedList
}

// ---- 删除与恢复 ----

function handleDelete(id: number, location: number) {
  const person = allPersons.value.find(p => p.id === id)
  if (person) {
    deletePersonId.value = id
    deletePersonName.value = person.name
    deletePersonLocation.value = location
    showDeleteDialog.value = true
  }
}

function confirmDelete(id: number) {
  const location = deletePersonLocation.value

  // 如果该期还没有 hasTask，先填充
  if (location === 1 && !hasTask1.value) {
    overtimePersons1.value = allPersons.value.filter(
      p => p.location === 1 && !deletedPersonIds.value.includes(p.id) && p.id !== id
    )
    hasTask1.value = true
  }
  if (location === 2 && !hasTask2.value) {
    overtimePersons2.value = allPersons.value.filter(
      p => p.location === 2 && !deletedPersonIds.value.includes(p.id) && p.id !== id
    )
    hasTask2.value = true
  }

  // 从加班列表中移除
  if (location === 1) {
    overtimePersons1.value = overtimePersons1.value.filter(p => p.id !== id)
  } else {
    overtimePersons2.value = overtimePersons2.value.filter(p => p.id !== id)
  }

  if (!deletedPersonIds.value.includes(id)) {
    deletedPersonIds.value.push(id)
  }

  showDeleteDialog.value = false
}

function handleAddPerson(personId: number, location: number) {
  deletedPersonIds.value = deletedPersonIds.value.filter(id => id !== personId)

  allPersons.value = allPersons.value.map(p => {
    if (p.id === personId) return { ...p, location }
    return p
  })

  // 如果该期已有任务，添加到加班人员列表
  const hasTask = location === 1 ? hasTask1.value : hasTask2.value
  if (hasTask) {
    const person = allPersons.value.find(p => p.id === personId)
    if (person) {
      const targetList = location === 1 ? overtimePersons1.value : overtimePersons2.value
      if (!targetList.find(p => p.id === personId)) {
        targetList.push({ ...person, location })
      }
    }
  }
}

function showPersonDetail(person: Person) {
  selectedPerson.value = person
  showDetailDialog.value = true
}

// ---- 下载加班申请表 ----

async function exportOvertimeApplication() {
  // 收集有人员的期的数据
  const entries: Array<{
    location: number
    startTime: string
    endTime: string
    workLocation: string
    workContent: string
    persons: string[]
  }> = []

  for (const loc of [1, 2] as const) {
    const groups = loc === 1 ? location1Groups.value : location2Groups.value
    const names: string[] = []
    Object.values(groups).forEach(persons => {
      persons.forEach(p => names.push(p.name))
    })
    if (names.length === 0) continue

    const ot = getOt(loc)
    entries.push({
      location: loc,
      startTime: ot.startTime,
      endTime: ot.endTime,
      workLocation: ot.workLocation,
      workContent: ot.workContent,
      persons: names
    })
  }

  if (entries.length === 0) {
    showSaveResult(false, '没有可导出的人员')
    return
  }

  try {
    const response = await fetch('/api/export-overtime-application', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: sharedDate.value, entries })
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.message || '导出失败')
    }

    const blob = await response.blob()

    // 生成文件名
    const [year, month, day] = sharedDate.value.split('-').map(Number)
    const fileName = `架设队${month}月${day}日加班申请表.xlsx`

    // 使用 File System Access API 让用户选择保存位置
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: 'Excel 文件',
            accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
          }]
        })
        const writable = await handle.createWritable()
        await writable.write(blob)
        await writable.close()
        showSaveResult(true, '加班申请表已保存')
        return
      } catch (err: any) {
        if (err.name === 'AbortError') return
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
    showSaveResult(true, '加班申请表已下载')
  } catch (error: any) {
    showSaveResult(false, '导出失败: ' + error.message)
  }
}

// ---- 初始化 ----

onMounted(async () => {
  await fetchPersons()
  await Promise.all([
    loadOvertimeRecords(1, sharedDate.value),
    loadOvertimeRecords(2, sharedDate.value)
  ])
})
</script>
