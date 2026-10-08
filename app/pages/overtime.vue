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
          <Save class="w-4 h-4 mr-1" />保存
        </Button>
        <Button @click="showNoOvertimeDialog = true" variant="outline" size="sm" class="h-9 text-sm">
          <UsersRound class="w-4 h-4 mr-1" />无加班人员
        </Button>
        <Button @click="exportOvertimeApplication" variant="outline" size="sm" class="h-9 text-sm">
          <FileDown class="w-4 h-4 mr-1" />下载加班申请表
        </Button>
        <span v-if="totalRecordCount > 0" class="text-sm text-gray-500">共{{ totalRecordCount }}条记录</span>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-6">
      <div class="bg-white rounded-lg shadow p-6 relative">
        <div class="absolute top-4 right-4">
          <Button @click="addTask(1)" size="sm" class="bg-primary text-white"><Plus class="w-4 h-4 mr-1" />新增阶段</Button>
        </div>
        <h2 class="text-2xl font-bold mb-4 text-primary">一期</h2>
        <div v-if="overtimeTasks1.length === 0" class="text-gray-500 text-center py-8">暂无加班任务，请点击"新增阶段"</div>
        <div v-for="(task, tIdx) in overtimeTasks1" :key="tIdx" class="border rounded-lg p-3 mb-3 bg-gray-50/50">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-gray-500">阶段 {{ tIdx + 1 }}</span>
            <div class="flex gap-1">
              <Button @click="showAddDialog = true; addLocation = 1; addTargetTaskIndex = tIdx" size="sm" class="bg-primary text-white"><Plus class="w-4 h-4 mr-1" />新增人员</Button>
              <Button @click="showExportDialog = true; exportLocation = 1; exportTaskIndex = tIdx" variant="outline" size="sm"><Download class="w-4 h-4 mr-1" />导出</Button>
              <Button @click="printOvertimeWord(1, tIdx)" variant="outline" size="sm" :disabled="printingTaskKey === `1-${tIdx}`"><Printer class="w-4 h-4 mr-1" />{{ printingTaskKey === `1-${tIdx}` ? '转换中' : '打印' }}</Button>
              <Button @click="removeTask(1, tIdx)" variant="outline" size="sm" v-if="overtimeTasks1.length > 1" class="text-red-500">移除</Button>
            </div>
          </div>
          <div class="flex items-center gap-2 flex-wrap mb-2">
            <div class="flex items-center gap-1"><Label class="text-xs whitespace-nowrap">开始</Label>
              <Select v-model="task.startTime"><SelectTrigger class="w-24 h-8 text-sm"><SelectValue placeholder="选择" /></SelectTrigger>
                <SelectContent><SelectItem v-for="t in timeOptions" :key="t" :value="t">{{ t }}</SelectItem></SelectContent>
              </Select>
            </div>
            <div class="flex items-center gap-1"><Label class="text-xs whitespace-nowrap">结束</Label>
              <Select v-model="task.endTime"><SelectTrigger class="w-24 h-8 text-sm"><SelectValue placeholder="选择" /></SelectTrigger>
                <SelectContent><SelectItem v-for="t in timeOptions" :key="t" :value="t">{{ t }}</SelectItem></SelectContent>
              </Select>
            </div>
            <span v-if="getTaskDuration(task) > 0" class="text-xs text-blue-600 font-medium">{{ getTaskDuration(task).toFixed(2) }}h</span>
            <span v-if="task.persons.length > 0" class="text-xs text-gray-500">{{ task.persons.length }}人</span>
          </div>
          <div class="flex items-center gap-2 flex-wrap mb-3">
            <div class="flex items-center gap-1 flex-1"><Label class="text-xs whitespace-nowrap">作业位置</Label>
              <Input v-model="task.workLocation" placeholder="如: A栋3层" class="h-8 text-sm flex-1" />
            </div>
            <div class="flex items-center gap-1 flex-[2]"><Label class="text-xs whitespace-nowrap">作业内容</Label>
              <Input v-model="task.workContent" placeholder="作业内容描述" class="h-8 text-sm flex-1" />
            </div>
          </div>
          <PersonGroup v-for="(persons, position) in getTaskGroups(1, tIdx)" :key="position"
            :position="String(position)" :persons="persons" :location="virtLoc(1, tIdx)" :duplicate-ids="duplicateIds"
            @delete="(pid: number) => handleDelete(pid, 1, tIdx)"
            @reorder="(pos: string, _l: number, reordered: any[]) => handleReorder(pos, 1, reordered, tIdx)"
            @detail="showPersonDetail" @move="handleMove" />
        </div>
      </div>
      <div class="bg-white rounded-lg shadow p-6 relative">
        <div class="absolute top-4 right-4">
          <Button @click="addTask(2)" size="sm" class="bg-primary text-white"><Plus class="w-4 h-4 mr-1" />新增阶段</Button>
        </div>
        <h2 class="text-2xl font-bold mb-4 text-primary">二期</h2>
        <div v-if="overtimeTasks2.length === 0" class="text-gray-500 text-center py-8">暂无加班任务，请点击"新增阶段"</div>
        <div v-for="(task, tIdx) in overtimeTasks2" :key="tIdx" class="border rounded-lg p-3 mb-3 bg-gray-50/50">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-gray-500">阶段 {{ tIdx + 1 }}</span>
            <div class="flex gap-1">
              <Button @click="showAddDialog = true; addLocation = 2; addTargetTaskIndex = tIdx" size="sm" class="bg-primary text-white"><Plus class="w-4 h-4 mr-1" />新增人员</Button>
              <Button @click="showExportDialog = true; exportLocation = 2; exportTaskIndex = tIdx" variant="outline" size="sm"><Download class="w-4 h-4 mr-1" />导出</Button>
              <Button @click="printOvertimeWord(2, tIdx)" variant="outline" size="sm" :disabled="printingTaskKey === `2-${tIdx}`"><Printer class="w-4 h-4 mr-1" />{{ printingTaskKey === `2-${tIdx}` ? '转换中' : '打印' }}</Button>
              <Button @click="removeTask(2, tIdx)" variant="outline" size="sm" v-if="overtimeTasks2.length > 1" class="text-red-500">移除</Button>
            </div>
          </div>
          <div class="flex items-center gap-2 flex-wrap mb-2">
            <div class="flex items-center gap-1"><Label class="text-xs whitespace-nowrap">开始</Label>
              <Select v-model="task.startTime"><SelectTrigger class="w-24 h-8 text-sm"><SelectValue placeholder="选择" /></SelectTrigger>
                <SelectContent><SelectItem v-for="t in timeOptions" :key="t" :value="t">{{ t }}</SelectItem></SelectContent>
              </Select>
            </div>
            <div class="flex items-center gap-1"><Label class="text-xs whitespace-nowrap">结束</Label>
              <Select v-model="task.endTime"><SelectTrigger class="w-24 h-8 text-sm"><SelectValue placeholder="选择" /></SelectTrigger>
                <SelectContent><SelectItem v-for="t in timeOptions" :key="t" :value="t">{{ t }}</SelectItem></SelectContent>
              </Select>
            </div>
            <span v-if="getTaskDuration(task) > 0" class="text-xs text-blue-600 font-medium">{{ getTaskDuration(task).toFixed(2) }}h</span>
            <span v-if="task.persons.length > 0" class="text-xs text-gray-500">{{ task.persons.length }}人</span>
          </div>
          <div class="flex items-center gap-2 flex-wrap mb-3">
            <div class="flex items-center gap-1 flex-1"><Label class="text-xs whitespace-nowrap">作业位置</Label>
              <Input v-model="task.workLocation" placeholder="如: A栋3层" class="h-8 text-sm flex-1" />
            </div>
            <div class="flex items-center gap-1 flex-[2]"><Label class="text-xs whitespace-nowrap">作业内容</Label>
              <Input v-model="task.workContent" placeholder="作业内容描述" class="h-8 text-sm flex-1" />
            </div>
          </div>
          <PersonGroup v-for="(persons, position) in getTaskGroups(2, tIdx)" :key="position"
            :position="String(position)" :persons="persons" :location="virtLoc(2, tIdx)" :duplicate-ids="duplicateIds"
            @delete="(pid: number) => handleDelete(pid, 2, tIdx)"
            @reorder="(pos: string, _l: number, reordered: any[]) => handleReorder(pos, 2, reordered, tIdx)"
            @detail="showPersonDetail" @move="handleMove" />
        </div>
      </div>
    </div>    
    <AddPersonDialog v-model:open="showAddDialog" :location="addLocation" :available-persons="getAvailablePersons(addTargetTaskIndex, addLocation)" @success="fetchPersons" @add="handleAddPerson" />
    <ExportDialog v-model:open="showExportDialog" :persons="getExportTaskPersons()" 
      :work-location="getExportTaskData()?.workLocation || ''" 
      :work-content="getExportTaskData()?.workContent || ''" 
      :date="sharedDate"
      :start-time="getExportTaskData()?.startTime || ''"
      :end-time="getExportTaskData()?.endTime || ''"
      :location="exportLocation" />
    <PersonDetailDialog v-model:open="showDetailDialog" :person="selectedPerson" />
    <DeleteConfirmDialog v-model:open="showDeleteDialog" :person-id="deletePersonId" :person-name="deletePersonName" @confirm="confirmDelete" />
    <NoOvertimeDialog v-model:open="showNoOvertimeDialog" :persons="noOvertimePersons" :date="sharedDate" />
    <Dialog v-model:open="showSaveResultDialog">
      <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{{ saveResultTitle }}</DialogTitle>
          <DialogDescription>{{ saveResultMessage }}</DialogDescription>
        </DialogHeader>
        <div class="flex justify-end mt-4"><Button @click="closeSaveResultDialog">确定</Button></div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Plus, Download, Save, UsersRound, FileDown, Printer } from '@lucide/vue'
import PersonGroup from '~/components/PersonGroup.vue'
import AddPersonDialog from '~/components/AddPersonDialog.vue'
import ExportDialog from '~/components/ExportDialog.vue'
import PersonDetailDialog from '~/components/PersonDetailDialog.vue'
import DeleteConfirmDialog from '~/components/DeleteConfirmDialog.vue'
import NoOvertimeDialog from '~/components/NoOvertimeDialog.vue'

interface Person {
  id: number; name: string; id_card: string; phone: string; position: string; location: number
  address: string; entry_time: string; is_resign: number; emer_person: string; emer_phone: string
  bank_num: string; bank_name: string; bank_code: string; order: number | null; sort: number | null
  attendance_salary: number | null; actual_salary: number | null
}

interface OvertimeTaskData {
  id?: number; startTime: string; endTime: string
  workLocation: string; workContent: string; persons: Person[]; saving: boolean
}

const today = new Date()
const defaultDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
const sharedDate = ref(defaultDate)
const allPersons = ref<Person[]>([])
const deletedPersonIds = ref<number[]>([])

const showAddDialog = ref(false); const showExportDialog = ref(false)
const showDetailDialog = ref(false); const showDeleteDialog = ref(false)
const showSaveResultDialog = ref(false); const showNoOvertimeDialog = ref(false)
const addLocation = ref(1); const exportLocation = ref(1); const exportTaskIndex = ref(0)
const selectedPerson = ref<Person | null>(null)
const deletePersonId = ref<number | null>(null); const deletePersonName = ref('')
const deletePersonLocation = ref<number>(1); const deletePersonTaskIndex = ref<number>(0)
const saveResultMessage = ref(''); const saveResultSuccess = ref(true)
const saveResultTitle = ref('')
const saveResultCb = ref<(() => void) | null>(null)
const printingTaskKey = ref('')

const defaultLocation1 = '无'
const defaultContent1 = '无'
const defaultLocation2 = '碱洗区、压缩区、乙烯区、冷区、热区、丙烯区'
const defaultContent2 = '搭设脚手架、拆除脚手架'

function createDefaultTask(location: number): OvertimeTaskData {
  return {
    startTime: '18:00', endTime: '',
    workLocation: location === 2 ? defaultLocation2 : defaultLocation1,
    workContent: location === 2 ? defaultContent2 : defaultContent1,
    persons: [], saving: false
  }
}

const overtimeTasks1 = ref<OvertimeTaskData[]>([createDefaultTask(1)])
const overtimeTasks2 = ref<OvertimeTaskData[]>([createDefaultTask(2)])
const timeOptions = computed(() => {
  const options: string[] = []
  for (let h = 8; h < 24; h++) { options.push(`${String(h).padStart(2, '0')}:00`); options.push(`${String(h).padStart(2, '0')}:30`) }
  return options
})

const totalRecordCount = computed(() => {
  return overtimeTasks1.value.reduce((s, t) => s + t.persons.length, 0) +
         overtimeTasks2.value.reduce((s, t) => s + t.persons.length, 0)
})

const hasTask1 = computed(() => overtimeTasks1.value.some(t => t.id != null))
const hasTask2 = computed(() => overtimeTasks2.value.some(t => t.id != null))

function getTaskDuration(task: OvertimeTaskData): number {
  if (!task.startTime || !task.endTime) return 0
  const [sh, sm] = task.startTime.split(':').map(Number)
  const [eh, em] = task.endTime.split(':').map(Number)
  const startMin = (sh ?? 0) * 60 + (sm ?? 0); const endMin = (eh ?? 0) * 60 + (em ?? 0)
  if (endMin <= startMin) return 0
  return (endMin - startMin) / 60
}

function isTaskValid(task: OvertimeTaskData): boolean {
  return !!(sharedDate.value && task.startTime && task.endTime &&
    task.workLocation.trim() && task.workContent.trim() && getTaskDuration(task) > 0)
}

const canSaveAll = computed(() => {
  if (!sharedDate.value) return false
  const v1 = overtimeTasks1.value.filter(t => isTaskValid(t) && t.persons.length > 0 && !t.saving)
  const v2 = overtimeTasks2.value.filter(t => isTaskValid(t) && t.persons.length > 0 && !t.saving)
  return v1.length > 0 || v2.length > 0
})

function virtLoc(location: number, taskIndex: number): number { return location * 1000 + taskIndex }
function decodeVirtLoc(virt: number): { location: number; taskIndex: number } {
  return { location: Math.floor(virt / 1000), taskIndex: virt % 1000 }
}

function groupByPosition(persons: Person[]) {
  const positionOrder = ['管理', '架工', '普工', '监护人', '资料员']
  const groups: Record<string, Person[]> = {}
  positionOrder.forEach(pos => { groups[pos] = [] })
  persons.forEach(person => {
    const pos = person.position || '其他'
    if (!groups[pos]) groups[pos] = []
    groups[pos]!.push(person)
  })
  const sorted: Record<string, Person[]> = {}
  positionOrder.forEach(pos => { sorted[pos] = groups[pos]! })
  Object.keys(groups).forEach(pos => { if (!sorted[pos]) sorted[pos] = groups[pos]! })
  return sorted
}

function getTaskGroups(location: number, taskIndex: number): Record<string, Person[]> {
  const tasks = location === 1 ? overtimeTasks1.value : overtimeTasks2.value
  const task = tasks[taskIndex]
  if (!task) return {}
  return groupByPosition(task.persons)
}

function getPersonsByLocation(location: number): Person[] {
  const tasks = location === 1 ? overtimeTasks1.value : overtimeTasks2.value
  const seen = new Set<number>(); const result: Person[] = []
  for (const t of tasks) { for (const p of t.persons) { if (!seen.has(p.id)) { seen.add(p.id); result.push(p) } } }
  return result
}

function getExportTaskData(): OvertimeTaskData | null {
  const tasks = exportLocation.value === 1 ? overtimeTasks1.value : overtimeTasks2.value
  const idx = exportTaskIndex.value
  const task = tasks[idx]
  return task ?? null
}

function getExportTaskPersons(): Person[] {
  const task = getExportTaskData()
  return task ? task.persons : []
}

function getAvailablePersons(taskIndex: number, location: number): Person[] {
  const tasks = location === 1 ? overtimeTasks1.value : overtimeTasks2.value
  const task = tasks[taskIndex]
  const existingIds = new Set<number>(task?.persons.map(p => p.id) || [])
  return allPersons.value.filter(p => !existingIds.has(p.id) && p.is_resign === 0)
}

function getDeletedPersons(): Person[] {
  const displayedIds = new Set<number>()
  for (const t of overtimeTasks1.value) { for (const p of t.persons) displayedIds.add(p.id) }
  for (const t of overtimeTasks2.value) { for (const p of t.persons) displayedIds.add(p.id) }
  if (!hasTask1.value) { allPersons.value.filter(p => p.location === 1 && !deletedPersonIds.value.includes(p.id)).forEach(p => displayedIds.add(p.id)) }
  if (!hasTask2.value) { allPersons.value.filter(p => p.location === 2 && !deletedPersonIds.value.includes(p.id)).forEach(p => displayedIds.add(p.id)) }
  return allPersons.value.filter(p => !displayedIds.has(p.id))
}

const noOvertimePersons = computed(() => getDeletedPersons())

const duplicateIds = computed(() => {
  const ids = new Set<number>(); const seen = new Set<number>()
  for (const t of overtimeTasks1.value) { for (const p of t.persons) { if (seen.has(p.id)) ids.add(p.id); else seen.add(p.id) } }
  for (const t of overtimeTasks2.value) { for (const p of t.persons) { if (seen.has(p.id)) ids.add(p.id); else seen.add(p.id) } }
  return ids
})

// ---- 任务管理 ----
function addTask(location: number) {
  const tasks = location === 1 ? overtimeTasks1 : overtimeTasks2
  tasks.value.push(createDefaultTask(location))
}
function removeTask(location: number, taskIndex: number) {
  const tasks = location === 1 ? overtimeTasks1 : overtimeTasks2
  if (tasks.value.length <= 1) return
  const task = tasks.value[taskIndex]
  if (!task) return
  const removedPersons = task.persons
  tasks.value.splice(taskIndex, 1)
  for (const p of removedPersons) {
    if (!deletedPersonIds.value.includes(p.id)) deletedPersonIds.value.push(p.id)
  }
}
const addTargetTaskIndex = ref(0)
function addPersonsToTask(location: number, taskIndex: number) {
  addLocation.value = location; addTargetTaskIndex.value = taskIndex; showAddDialog.value = true
}
// ---- 数据加载 ----
async function fetchPersons() {
  try {
    const response = await $fetch('/api/person') as any
    if (response.success && response.data) allPersons.value = response.data
  } catch (error) { console.error('获取人员列表失败:', error) }
}

async function loadOvertimeRecords(location: number, date: string) {
  const tasks = location === 1 ? overtimeTasks1 : overtimeTasks2
  if (!date) { tasks.value = [createDefaultTask(location)]; return }
  try {
    const response = await $fetch(`/api/overtime?date=${date}&location=${location}`) as any
    if (response.success && response.data && response.data.length > 0) {
      tasks.value = response.data.map((t: any) => ({
        id: t.task_id, startTime: t.start_time || '18:00', endTime: t.end_time || '',
        workLocation: t.work_location || '', workContent: t.work_content || '',
        persons: (t.persons || []).map((p: any) => ({
          id: p.person_id, name: p.name, id_card: p.id_card, phone: p.phone,
          position: p.position, location: p.location, address: p.address,
          entry_time: p.entry_time, is_resign: p.is_resign, emer_person: p.emer_person,
          emer_phone: p.emer_phone, bank_num: p.bank_num, bank_name: '', bank_code: '',
          order: p.order, sort: p.sort, attendance_salary: null, actual_salary: null
        })), saving: false
      }))
    } else {
      const dt = createDefaultTask(location)
      dt.persons = allPersons.value.filter(p => p.location === location && !deletedPersonIds.value.includes(p.id))
      tasks.value = [dt]
    }
  } catch (error) { console.error('加载加班记录失败:', error); tasks.value = [createDefaultTask(location)] }
}

// ---- 保存 ----
async function saveAllOvertime() {
  const results: string[] = []; let hasError = false; const savedLocations: number[] = []
  for (const location of [1, 2]) {
    const tasks = location === 1 ? overtimeTasks1.value : overtimeTasks2.value
    const validTasks = tasks.filter(t => isTaskValid(t) && t.persons.length > 0 && !t.saving)
    if (validTasks.length === 0) {
      // 该期无人员，保存一条空人员的 overtime_task（作业信息沿用第一个任务）
      try {
        const dt = tasks[0]!
        const emptyTask = {
          startTime: `${sharedDate.value}T${dt.startTime || '18:00'}:00`,
          endTime: `${sharedDate.value}T${dt.endTime || '18:00'}:00`,
          workLocation: dt.workLocation,
          workContent: dt.workContent,
          personIds: []
        }
        const response = await $fetch('/api/overtime', { method: 'POST', body: { date: sharedDate.value, location, tasks: [emptyTask] } }) as any
        if (response.success) { results.push(`${location === 1 ? '一期' : '二期'}: ${response.message}`); savedLocations.push(location) }
        else { results.push(`${location === 1 ? '一期' : '二期'}: 保存失败 - ${response.message}`) }
      } catch (error: any) { results.push(`${location === 1 ? '一期' : '二期'}: 保存失败 - ${error.message}`) }
      continue
    }
    validTasks.forEach(t => { t.saving = true })
    try {
      const dateStr = sharedDate.value
      const apiTasks = validTasks.map(t => ({
        id: t.id, startTime: `${dateStr}T${t.startTime}:00`, endTime: `${dateStr}T${t.endTime}:00`,
        workLocation: t.workLocation, workContent: t.workContent, personIds: t.persons.map(p => p.id)
      }))
      const response = await $fetch('/api/overtime', { method: 'POST', body: { date: dateStr, location, tasks: apiTasks } }) as any
      if (response.success) { results.push(`${location === 1 ? '一期' : '二期'}: ${response.message}`); savedLocations.push(location) }
      else { hasError = true; results.push(`${location === 1 ? '一期' : '二期'}: 保存失败 - ${response.message}`) }
    } catch (error: any) { hasError = true; results.push(`${location === 1 ? '一期' : '二期'}: 保存失败 - ${error.message}`) }
    finally { validTasks.forEach(t => { t.saving = false }) }
  }
  if (savedLocations.length > 0) { await Promise.all([loadOvertimeRecords(1, sharedDate.value), loadOvertimeRecords(2, sharedDate.value)]) }
  if (results.length === 0) showSaveResult(false, '没有可保存的有效任务')
  else showSaveResult(!hasError, results.join('\n'))
}

function showSaveResult(success: boolean, message: string, onConfirm?: () => void, title?: string) {
  saveResultSuccess.value = success
  saveResultMessage.value = message
  saveResultTitle.value = title || (success ? '保存成功' : '保存失败')
  saveResultCb.value = onConfirm || null
  showSaveResultDialog.value = true
}

function closeSaveResultDialog() {
  showSaveResultDialog.value = false
  const cb = saveResultCb.value
  saveResultCb.value = null
  if (cb) cb()
}

// ---- 删除 ----
function handleDelete(id: number, location: number, taskIndex: number) {
  const person = allPersons.value.find(p => p.id === id)
  if (person) { deletePersonId.value = id; deletePersonName.value = person.name; deletePersonLocation.value = location; deletePersonTaskIndex.value = taskIndex; showDeleteDialog.value = true }
}
function confirmDelete(id: number) {
  const tasks = deletePersonLocation.value === 1 ? overtimeTasks1 : overtimeTasks2
  const ti = deletePersonTaskIndex.value
  const task = tasks.value[ti]
  if (task) task.persons = task.persons.filter(p => p.id !== id)
  if (!deletedPersonIds.value.includes(id)) deletedPersonIds.value.push(id)
  showDeleteDialog.value = false
}

// ---- 拖拽 ----
function handleReorder(position: string, location: number, reorderedPersons: Person[], taskIndex: number) {
  const tasks = location === 1 ? overtimeTasks1 : overtimeTasks2
  const task = tasks.value[taskIndex]
  if (!task) return
  const reordered = [...reorderedPersons]
  task.persons = task.persons.map(p => {
    if (p.position === position) return reordered.shift() || p
    return p
  })
}

function handleMove(personId: number, toVirtLoc: number, insertIndex: number, targetPosition: string) {
  const { location: toLocation, taskIndex: toTaskIdx } = decodeVirtLoc(toVirtLoc)
  let fromLocation = 0; let fromTaskIdx = 0
  for (let ti = 0; ti < overtimeTasks1.value.length; ti++) {
    const task = overtimeTasks1.value[ti] as OvertimeTaskData
    if (task.persons.some(p => p.id === personId)) { fromLocation = 1; fromTaskIdx = ti; break }
  }
  if (fromLocation === 0) {
    for (let ti = 0; ti < overtimeTasks2.value.length; ti++) {
      const task = overtimeTasks2.value[ti] as OvertimeTaskData
      if (task.persons.some(p => p.id === personId)) { fromLocation = 2; fromTaskIdx = ti; break }
    }
  }
  if (fromLocation === 0) return
  const fromTasks = fromLocation === 1 ? overtimeTasks1 : overtimeTasks2
  const fromTask = fromTasks.value[fromTaskIdx]
  if (!fromTask) return
  const person = fromTask.persons.find(p => p.id === personId)
  if (!person) return
  fromTask.persons = fromTask.persons.filter(p => p.id !== personId)
  const updatedPerson = { ...person, location: toLocation }
  const toTasks = toLocation === 1 ? overtimeTasks1 : overtimeTasks2
  const targetIdx = toTaskIdx < toTasks.value.length ? toTaskIdx : 0
  const targetTask = toTasks.value[targetIdx]
  if (!targetTask) return
  const targetList = targetTask.persons
  if (!targetList.find(p => p.id === personId)) {
    if (insertIndex >= 0 && targetPosition) {
      const posPersons = targetList.filter(p => p.position === targetPosition)
      const insIdx = Math.min(insertIndex, posPersons.length)
      if (insIdx < posPersons.length && posPersons[insIdx]) {
        const posPerson = posPersons[insIdx]!
        const gi = targetList.findIndex(p => p.id === posPerson.id)
        targetList.splice(gi, 0, updatedPerson)
      } else if (posPersons.length > 0) {
        const lp = posPersons[posPersons.length - 1]
        if (lp) { const gi = targetList.findIndex(p => p.id === lp.id); targetList.splice(gi + 1, 0, updatedPerson) }
      } else { targetList.push(updatedPerson) }
    } else { targetList.push(updatedPerson) }
  }
}
// ---- 新增/恢复人员 ----
function handleAddPerson(personId: number, location: number) {
  deletedPersonIds.value = deletedPersonIds.value.filter(id => id !== personId)
  allPersons.value = allPersons.value.map(p => { if (p.id === personId) return { ...p, location }; return p })
  const tasks = location === 1 ? overtimeTasks1 : overtimeTasks2
  const taskIdx = addTargetTaskIndex.value
  const person = allPersons.value.find(p => p.id === personId)
  const targetTask = tasks.value[taskIdx]
  if (person && targetTask) {
    if (!targetTask.persons.find(p => p.id === personId)) targetTask.persons.push({ ...person, location })
  }
}

function showPersonDetail(person: Person) { selectedPerson.value = person; showDetailDialog.value = true }

// ---- 打印 Word ----
async function printOvertimeWord(location: number, taskIndex: number) {
  const key = `${location}-${taskIndex}`
  const tasks = location === 1 ? overtimeTasks1.value : overtimeTasks2.value
  const task = tasks[taskIndex]
  if (!task) return
  if (!sharedDate.value) { showSaveResult(false, '请选择日期'); return }
  if (!task.startTime || !task.endTime) { showSaveResult(false, '请填写开始时间和结束时间'); return }
  if (!task.persons.length) { showSaveResult(false, '该阶段没有人员，无法打印'); return }

  printingTaskKey.value = key
  try {
    // 服务端生成 docx 后用本机 Word 转成 PDF（打印效果与 Word 完全一致）
    const response = await fetch('/export-word-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: sharedDate.value,
        startTime: task.startTime,
        endTime: task.endTime,
        workLocation: task.workLocation,
        workContent: task.workContent,
        persons: task.persons.map(p => ({ name: p.name, position: p.position })),
        location,
      }),
    })
    if (!response.ok) {
      const err = await response.json().catch(() => null) as any
      throw new Error(err?.message || '转换失败')
    }
    const blob = await response.blob()
    const objUrl = URL.createObjectURL(blob)
    // 转换耗时可能超出浏览器打印的用户手势窗口，点击"确定"后打印保证可靠弹出
    showSaveResult(true, 'PDF 已生成，点击确定开始打印', () => {
      printPdfViaIframe(objUrl)
      setTimeout(() => URL.revokeObjectURL(objUrl), 60000)
    }, '打印')
  } catch (error: any) {
    showSaveResult(false, '打印失败: ' + error.message + '（需本机已安装 Microsoft Word）')
  } finally {
    printingTaskKey.value = ''
  }
}

function printPdfViaIframe(objUrl: string) {
  // 隐藏 iframe 加载 PDF，加载完成后触发浏览器打印
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;right:100%;bottom:100%;width:0;height:0;border:0;'
  iframe.src = objUrl
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } catch {
      window.open(objUrl, '_blank')
    }
    // 打印对话框关闭前不能移除 iframe，延迟清理
    setTimeout(() => iframe.remove(), 60000)
  }
  document.body.appendChild(iframe)
}

// ---- 导出 ----
async function exportOvertimeApplication() {
  const entries: Array<{ location: number; startTime: string; endTime: string; workLocation: string; workContent: string; persons: string[] }> = []
  for (const loc of [1, 2] as const) {
    const tasks = loc === 1 ? overtimeTasks1.value : overtimeTasks2.value
    for (const task of tasks) {
      if (task.persons.length === 0) continue
      entries.push({ location: loc, startTime: task.startTime, endTime: task.endTime, workLocation: task.workLocation, workContent: task.workContent, persons: task.persons.map(p => p.name) })
    }
  }
  if (entries.length === 0) { showSaveResult(false, '没有可导出的人员'); return }
  try {
    const response = await fetch('/api/export-overtime-application', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: sharedDate.value, entries }) })
    if (!response.ok) { const err = await response.json(); throw new Error(err.message || '导出失败') }
    const blob = await response.blob()
    const [year, month, day] = sharedDate.value.split('-').map(Number)
    const fileName = `架设队${month}月${day}日加班申请表.xlsx`
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({ suggestedName: fileName, types: [{ description: 'Excel 文件', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }] })
        const writable = await handle.createWritable(); await writable.write(blob); await writable.close()
        showSaveResult(true, '加班申请表已保存'); return
      } catch (err: any) { if (err.name === 'AbortError') return }
    }
    const url = URL.createObjectURL(blob); const a = document.createElement('a')
    a.href = url; a.download = fileName; document.body.appendChild(a); a.click()
    document.body.removeChild(a); URL.revokeObjectURL(url)
    showSaveResult(true, '加班申请表已下载')
  } catch (error: any) { showSaveResult(false, '导出失败: ' + error.message) }
}

// ---- 初始化 ----
onMounted(async () => {
  await fetchPersons()
  await Promise.all([loadOvertimeRecords(1, sharedDate.value), loadOvertimeRecords(2, sharedDate.value)])
})
watch(sharedDate, async () => { deletedPersonIds.value = []; await Promise.all([loadOvertimeRecords(1, sharedDate.value), loadOvertimeRecords(2, sharedDate.value)]) })
</script>