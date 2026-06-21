<template>
  <div class="p-6 min-h-screen bg-gray-50">
    <!-- 顶部标题和按钮 -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-3xl font-bold">考勤管理</h1>
      <div class="flex gap-2 items-center">
        <!-- 对比不一致提示图标 -->
        <div v-if="hasMismatch || hasOvertimeMismatch" class="relative group">
          <AlertCircle class="w-5 h-5 text-red-500 cursor-pointer animate-pulse" />
          <div class="absolute right-0 top-7 hidden group-hover:block z-50 bg-white border border-red-200 rounded-lg shadow-lg p-3 min-w-[240px] max-w-[320px]">
            <p v-if="hasMismatch" class="text-sm font-medium text-red-600 mb-2">金额不一致</p>
            <ul class="text-xs text-gray-600 space-y-1">
              <li v-if="diff.workDaysDiff" class="flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-red-400 inline-block"></span>
                考勤天数：系统 {{ diff.ourWorkDays }}天 / 工资表 {{ diff.salaryWorkDays }}天
              </li>
              <li v-if="diff.dailySalaryDiff" class="flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-red-400 inline-block"></span>
                每日工资：系统 ¥{{ diff.ourDailySalary }} / 工资表 ¥{{ diff.salaryDailySalary }}
              </li>
              <li v-if="diff.netSalaryDiff" class="flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-red-400 inline-block"></span>
                税后金额：系统 ¥{{ diff.ourNetSalary }} / 工资表 ¥{{ diff.salaryNetSalary }}
              </li>
            </ul>
            <p v-if="hasOvertimeMismatch" class="text-sm font-medium text-red-600 mb-2 mt-2" :class="{ 'border-t pt-2': hasMismatch }">加班-考勤不一致</p>
            <ul class="text-xs text-gray-600 space-y-1">
              <li v-if="overtimeOnlyDates.length > 0" class="flex items-start gap-1">
                <span class="w-2 h-2 rounded-full bg-red-400 inline-block mt-0.5 shrink-0"></span>
                <span>加班有但考勤无（{{ overtimeOnlyDates.length }}天）：<br/>{{ overtimeOnlyDates.join('、') }}</span>
              </li>
              <li v-if="attendanceOnlyDates.length > 0" class="flex items-start gap-1">
                <span class="w-2 h-2 rounded-full bg-purple-400 inline-block mt-0.5 shrink-0"></span>
                <span>考勤有但加班无（{{ attendanceOnlyDates.length }}天）：<br/>{{ attendanceOnlyDates.join('、') }}</span>
              </li>
            </ul>
          </div>
        </div>
        <Button @click="showImportDialog = true" variant="outline" size="sm">
          <Upload class="w-4 h-4 mr-1" />
          导入初始考勤
        </Button>
        <Button @click="exportOwner" variant="outline" size="sm">
          <Download class="w-4 h-4 mr-1" />
          导出为业主考勤
        </Button>
        <Button @click="exportProxy" variant="outline" size="sm" :disabled="!selectedPerson">
          <Download class="w-4 h-4 mr-1" />
          导出为代发考勤
        </Button>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow p-6">
      <!-- 人员切换栏 -->
      <div class="flex items-center justify-center gap-4 mb-4">
        <Button @click="prevPerson" variant="ghost" size="sm" :disabled="!persons.length || currentIndex <= 0">
          <ChevronLeft class="w-5 h-5" />
        </Button>
        <div class="relative">
          <button
            @click="openPersonDialog"
            class="text-xl font-semibold text-primary hover:text-primary/80 cursor-pointer border-b-2 border-dashed border-primary px-6 py-1 min-w-[120px] text-center"
          >
            {{ selectedPerson ? selectedPerson.name : '请选择人员' }}
          </button>
        </div>
        <Button @click="nextPerson" variant="ghost" size="sm" :disabled="!persons.length || currentIndex >= persons.length - 1">
          <ChevronRight class="w-5 h-5" />
        </Button>
      </div>

      <!-- 年月选择 -->
      <div class="flex items-center justify-center gap-4 mb-6">
        <Button @click="prevMonth" variant="ghost" size="sm">
          <ChevronLeft class="w-4 h-4" />
        </Button>
        <span class="text-lg font-medium min-w-[140px] text-center">{{ currentYear }}年 {{ currentMonth }}月</span>
        <Button @click="nextMonth" variant="ghost" size="sm">
          <ChevronRight class="w-4 h-4" />
        </Button>
      </div>

      <!-- 考勤汇总数据 -->
      <div class="grid grid-cols-3 sm:grid-cols-7 gap-4 mb-6 p-4 bg-blue-50 rounded-lg">
        <div class="text-center">
          <div class="text-sm text-gray-600">考勤工时</div>
          <div class="text-2xl font-bold text-primary">{{ summary.totalHours }}h</div>
        </div>
        <div class="text-center">
          <div class="text-sm text-gray-600">考勤天数</div>
          <div class="text-2xl font-bold" :class="diff.workDaysDiff ? 'text-red-600' : 'text-primary'">{{ summary.attendanceDays.toFixed(2) }}天</div>
          <div v-if="diff.workDaysDiff" class="text-xs text-red-500">工资表: {{ salaryEntry?.workDays }}天</div>
        </div>
        <div class="text-center">
          <div class="text-sm text-gray-600">考勤工资</div>
          <div class="text-2xl font-bold" :class="diff.dailySalaryDiff ? 'text-red-600' : 'text-green-600'">{{ selectedPerson?.attendance_salary != null ? '¥' + selectedPerson.attendance_salary : '-' }}</div>
          <div v-if="diff.dailySalaryDiff" class="text-xs text-red-500">工资表: ¥{{ salaryEntry?.dailySalary }}</div>
        </div>
        <div class="text-center">
          <div class="text-sm text-gray-600">考勤收入</div>
          <div class="text-2xl font-bold" :class="diff.netSalaryDiff ? 'text-red-600' : 'text-green-700'">{{ summary.attendanceIncome !== null ? '¥' + summary.attendanceIncome : '-' }}</div>
          <div v-if="diff.netSalaryDiff" class="text-xs text-red-500">工资表: ¥{{ salaryEntry?.netSalary }}</div>
        </div>
        <div class="text-center">
          <div class="text-sm text-gray-600">实际工资</div>
          <div class="text-2xl font-bold text-orange-600">{{ selectedPerson?.actual_salary != null ? '¥' + selectedPerson.actual_salary : '-' }}</div>
        </div>
        <div class="text-center">
          <div class="text-sm text-gray-600">实际收入</div>
          <div class="text-2xl font-bold text-orange-700">{{ summary.actualIncome !== null ? '¥' + summary.actualIncome : '-' }}</div>
        </div>
        <div class="text-center">
          <div class="text-sm text-gray-600">差额</div>
          <div class="text-2xl font-bold" :class="summary.incomeDiff !== null ? (summary.incomeDiff > 0 ? 'text-green-600' : summary.incomeDiff < 0 ? 'text-red-600' : '') : ''">{{ summary.incomeDiff !== null ? '¥' + (summary.incomeDiff >= 0 ? '+' : '') + summary.incomeDiff : '-' }}</div>
        </div>
      </div>

      <!-- 日历区域 -->
      <div class="border rounded-lg overflow-hidden">
        <!-- 星期头 -->
        <div class="grid grid-cols-7 bg-gray-100">
          <div v-for="day in weekDays" :key="day" class="py-2 text-center text-sm font-medium text-gray-600 border-b">
            {{ day }}
          </div>
        </div>
        <!-- 日历格子 -->
        <div class="grid grid-cols-7">
          <div
            v-for="(cell, idx) in calendarCells"
            :key="idx"
            class="border-b border-r min-h-[90px] p-1"
            :class="[
              cell!.isCurrentMonth ? (overtimeOnlyDates.includes(cell!.date) ? 'bg-red-100' : attendanceOnlyDates.includes(cell!.date) ? 'bg-purple-100' : 'bg-white') : 'bg-gray-50 text-gray-400',
              cell!.isToday ? 'bg-blue-50' : '',
              idx % 7 === 6 ? 'border-r-0' : ''
            ]"
          >
            <div class="flex items-center justify-between mb-1">
              <span
                class="text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full"
                :class="cell!.isToday ? 'bg-primary text-white' : ''"
              >
                {{ cell!.day }}
              </span>
            </div>
            <div v-if="cell!.isCurrentMonth && cell!.hours > 0" class="space-y-0.5">
              <div class="text-xs bg-blue-100 text-blue-700 rounded px-1 py-0.5 text-center">
                上班 {{ cell!.normalHours }}h
              </div>
              <div v-if="cell!.overtimeHours > 0" class="text-xs bg-orange-100 text-orange-700 rounded px-1 py-0.5 text-center">
                加班 {{ cell!.overtimeHours }}h
              </div>
            </div>
            <div v-else-if="cell!.isCurrentMonth && !cell!.hours" class="text-xs text-gray-400 text-center mt-2">
              休息
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 导入考勤对话框 -->
    <Dialog :open="showImportDialog" @update:open="showImportDialog = $event">
      <DialogContent class="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>导入初始考勤</DialogTitle>
          <DialogDescription>
            上传 Excel 考勤表（.xls/.xlsx），系统将自动识别标题中的年月并导入考勤数据
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-4">
          <div class="space-y-2">
            <Label>选择考勤表文件</Label>
            <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer"
              @click="triggerFileInput"
              @dragover.prevent
              @drop.prevent="handleFileDrop"
            >
              <Upload class="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p v-if="!importFile" class="text-sm text-gray-500">点击选择文件或拖拽文件到此处</p>
              <p v-else class="text-sm text-primary font-medium">{{ importFile.name }}</p>
              <p class="text-xs text-gray-400 mt-1">支持 .xls、.xlsx 格式</p>
              <input
                ref="fileInputRef"
                type="file"
                accept=".xls,.xlsx"
                class="hidden"
                @change="handleFileSelect"
              />
            </div>
          </div>
          <div v-if="importResult" class="text-sm p-3 rounded-md" :class="importResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'">
            <p class="font-medium mb-1">{{ importResult.message }}</p>
            <ul v-if="importResult.results && importResult.results.length > 0" class="mt-2 space-y-1 max-h-40 overflow-y-auto">
              <li v-for="(r, idx) in importResult.results" :key="idx" class="flex items-center gap-2">
                <span :class="r.success ? 'text-green-500' : 'text-red-500'">{{ r.success ? '✓' : '✗' }}</span>
                <span>{{ r.name }}</span>
                <span v-if="r.success" class="text-gray-400 text-xs">{{ r.days }}天 {{ r.hours }}h</span>
                <span v-else class="text-red-400 text-xs">{{ r.error }}</span>
              </li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" @click="showImportDialog = false">取消</Button>
            <Button @click="doImport" :disabled="!importFile || importing" class="bg-primary text-white">
              {{ importing ? '导入中...' : '开始导入' }}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>

    <!-- 人员选择弹窗 -->
    <Dialog :open="showPersonDialog" @update:open="showPersonDialog = $event">
      <DialogContent class="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>选择人员</DialogTitle>
        </DialogHeader>
        <div class="space-y-3">
          <Input v-model="personSearch" placeholder="搜索姓名或职位..." class="w-full" />
          <!-- 状态筛选标签 -->
          <div class="flex gap-2">
            <button
              v-for="tab in personStatusTabs"
              :key="tab.value"
              @click="personStatusFilter = tab.value"
              class="px-3 py-1 text-sm rounded-full border transition-colors"
              :class="personStatusFilter === tab.value ? 'bg-primary text-white border-primary' : 'border-gray-300 text-gray-600 hover:bg-gray-100'"
            >{{ tab.label }}</button>
          </div>
          <div class="max-h-[360px] overflow-y-auto space-y-1">
            <div
              v-for="p in filteredPersons"
              :key="p.id"
              @click="selectPerson(p)"
              class="flex items-center justify-between px-3 py-2 rounded-md cursor-pointer hover:bg-gray-100"
              :class="selectedPerson?.id === p.id ? 'bg-blue-50 text-primary font-medium' : ''"
            >
              <span>
                {{ p.name }}
                <span v-if="p.is_resign" class="text-xs text-orange-400 ml-1">(已离职)</span>
              </span>
              <span class="text-xs text-gray-400">{{ p.position }}</span>
            </div>
            <div v-if="filteredPersons.length === 0" class="text-center text-gray-400 py-4">
              无匹配人员
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { ChevronLeft, ChevronRight, Upload, Download, AlertCircle } from '@lucide/vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  position: string
  location: number
  order: number | null
  attendance_salary: number | null
  actual_salary: number | null
  is_resign: number
}

interface AttendanceRecord {
  id: number
  person_id: number
  attendance_date: string
  hours: number
}

interface CalendarCell {
  day: number
  isCurrentMonth: boolean
  isToday: boolean
  hours: number
  normalHours: number
  overtimeHours: number
  date: string
}

const weekDays = ['日', '一', '二', '三', '四', '五', '六']

// 人员相关
const persons = ref<Person[]>([])
const selectedPerson = ref<Person | null>(null)
const currentIndex = ref(0)
const showPersonDialog = ref(false)
const personSearch = ref('')
const personStatusFilter = ref<string>('all')

const personStatusTabs = [
  { label: '全部', value: 'all' },
  { label: '在职', value: 'active' },
  { label: '已离职', value: 'resigned' },
]

const filteredPersons = computed(() => {
  const keyword = personSearch.value.trim().toLowerCase()
  let list = persons.value
  // 状态筛选
  if (personStatusFilter.value === 'active') {
    list = list.filter(p => !p.is_resign)
  } else if (personStatusFilter.value === 'resigned') {
    list = list.filter(p => p.is_resign)
  }
  // 搜索
  if (keyword) {
    list = list.filter(p =>
      p.name.toLowerCase().includes(keyword) ||
      (p.position && p.position.toLowerCase().includes(keyword))
    )
  }
  return list
})

// 年月相关
const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth() + 1)

// 考勤数据
const attendanceRecords = ref<AttendanceRecord[]>([])

// 加班数据（当前人员当月的加班日期集合）
const overtimeDates = ref<Set<string>>(new Set())

// 导入相关
const showImportDialog = ref(false)
const importFile = ref<File | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const importing = ref(false)
const importResult = ref<{ success: boolean; message: string; results?: any[]; salaryData?: { idCard: string; name: string; workDays: number; dailySalary: number; netSalary: number }[] } | null>(null)

// 工资表对比数据（按身份证号索引），仅对导入时的年月有效
const salaryDataMap = ref<Record<string, { idCard: string; name: string; workDays: number; dailySalary: number; netSalary: number }>>({})
const salaryDataYear = ref<number | null>(null)
const salaryDataMonth = ref<number | null>(null)

// 日历数据
const calendarCells = computed<CalendarCell[]>((): CalendarCell[] => {
  const year = currentYear.value
  const month = currentMonth.value

  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const daysInMonth = lastDay.getDate()
  const startDayOfWeek = firstDay.getDay() // 0=周日

  // 构建日期->工时映射
  // mysql2 返回的 DATE 经 JSON 序列化后是 ISO 字符串（如 "2026-04-30T16:00:00.000Z"），
  // 不能直接 slice(0,10)，需用 Date 解析后取本地日期
  const hoursMap: Record<string, number> = {}
  for (const r of attendanceRecords.value) {
    const raw = r.attendance_date as string | Date
    let d: string
    if (typeof raw === 'string') {
      if (raw.includes('T')) {
        const dt = new Date(raw)
        d = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
      } else {
        d = raw.slice(0, 10)
      }
    } else if (raw instanceof Date) {
      d = `${raw.getFullYear()}-${String(raw.getMonth() + 1).padStart(2, '0')}-${String(raw.getDate()).padStart(2, '0')}`
    } else {
      d = String(raw).slice(0, 10)
    }
    hoursMap[d] = Number(r.hours)
  }

  const cells: CalendarCell[] = []
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  // 填充上月空白格子
  const prevMonthLastDay = new Date(year, month - 1, 0).getDate()
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i
    const m = month === 1 ? 12 : month - 1
    const y = month === 1 ? year - 1 : year
    cells.push({
      day: d,
      isCurrentMonth: false,
      isToday: false,
      hours: 0,
      normalHours: 0,
      overtimeHours: 0,
      date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    })
  }

  // 填充当月格子
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const hours = hoursMap[dateStr] || 0
    const normalHours = Math.min(hours, 9)
    const overtimeHours = Math.max(0, hours - 9)

    cells.push({
      day: d,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      hours,
      normalHours,
      overtimeHours,
      date: dateStr
    })
  }

  // 填充下月空白格子（补齐到7的倍数）
  const remaining = 7 - (cells.length % 7)
  if (remaining < 7) {
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    for (let d = 1; d <= remaining; d++) {
      cells.push({
        day: d,
        isCurrentMonth: false,
        isToday: false,
        hours: 0,
        normalHours: 0,
        overtimeHours: 0,
        date: `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      })
    }
  }

  return cells
})

// 汇总数据
const summary = computed(() => {
  let totalHours = 0

  for (const r of attendanceRecords.value) {
    totalHours += Number(r.hours) || 0
  }

  const totalHoursRounded = Math.round(totalHours * 10) / 10
  const attendanceDays = Math.round((totalHoursRounded / 9) * 100) / 100

  const attendanceSalary = selectedPerson.value?.attendance_salary
  const actualSalary = selectedPerson.value?.actual_salary
  const attendanceIncome = attendanceSalary != null ? Math.round(attendanceDays * attendanceSalary) : null
  const actualIncome = actualSalary != null ? Math.round(attendanceDays * actualSalary) : null

  return {
    totalHours: totalHoursRounded,
    attendanceDays,
    attendanceIncome,
    actualIncome,
    incomeDiff: attendanceIncome != null && actualIncome != null ? attendanceIncome - actualIncome : null,
    totalNormalHours: 0,
    totalOvertimeHours: 0
  }
})

// 当前人员的工资表数据（仅当月/年匹配时才生效）
const salaryEntry = computed(() => {
  if (!selectedPerson.value) return null
  if (salaryDataYear.value !== currentYear.value || salaryDataMonth.value !== currentMonth.value) return null
  return salaryDataMap.value[selectedPerson.value.id_card] || null
})

// 对比差异
const diff = computed(() => {
  const entry = salaryEntry.value
  const days = summary.value.attendanceDays
  const ourSalary = selectedPerson.value?.attendance_salary ?? 0
  const ourIncome = summary.value.attendanceIncome ?? 0

  if (!entry) {
    return { workDaysDiff: false, dailySalaryDiff: false, netSalaryDiff: false, ourWorkDays: '', ourDailySalary: '', ourNetSalary: '', salaryWorkDays: '', salaryDailySalary: '', salaryNetSalary: '' }
  }

  const workDaysDiff = Math.abs(days - entry.workDays) >= 0.01
  const dailySalaryDiff = Math.abs(ourSalary - entry.dailySalary) >= 0.01
  const netSalaryDiff = Math.abs(ourIncome - entry.netSalary) >= 0.01

  return {
    workDaysDiff,
    dailySalaryDiff,
    netSalaryDiff,
    ourWorkDays: days.toFixed(2),
    ourDailySalary: String(ourSalary),
    ourNetSalary: String(ourIncome),
    salaryWorkDays: String(entry.workDays),
    salaryDailySalary: String(entry.dailySalary),
    salaryNetSalary: String(entry.netSalary)
  }
})

const hasMismatch = computed(() => {
  return diff.value.workDaysDiff || diff.value.dailySalaryDiff || diff.value.netSalaryDiff
})

// 加班-考勤对比（仅对比有加班的情况，即考勤工时 > 9h）
const attendanceDateSet = computed(() => {
  const s = new Set<string>()
  for (const r of attendanceRecords.value) {
    if (Number(r.hours) <= 9) continue
    const raw = r.attendance_date as string | Date
    let d: string
    if (typeof raw === 'string') {
      if (raw.includes('T')) {
        const dt = new Date(raw)
        d = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
      } else {
        d = raw.slice(0, 10)
      }
    } else if (raw instanceof Date) {
      d = `${raw.getFullYear()}-${String(raw.getMonth() + 1).padStart(2, '0')}-${String(raw.getDate()).padStart(2, '0')}`
    } else {
      d = String(raw).slice(0, 10)
    }
    s.add(d)
  }
  return s
})

// 加班有但考勤没有的日期
const overtimeOnlyDates = computed(() => {
  const result: string[] = []
  overtimeDates.value.forEach(d => {
    if (!attendanceDateSet.value.has(d)) result.push(d)
  })
  return result.sort()
})

// 考勤有但加班没有的日期
const attendanceOnlyDates = computed(() => {
  const result: string[] = []
  attendanceDateSet.value.forEach(d => {
    if (!overtimeDates.value.has(d)) result.push(d)
  })
  return result.sort()
})

const hasOvertimeMismatch = computed(() => {
  return overtimeOnlyDates.value.length > 0 || attendanceOnlyDates.value.length > 0
})

// 切换人员
function openPersonDialog() {
  personSearch.value = ''
  personStatusFilter.value = 'all'
  showPersonDialog.value = true
}

function prevPerson() {
  if (currentIndex.value > 0) {
    currentIndex.value--
    selectedPerson.value = persons.value[currentIndex.value]!
    fetchAttendance()
    fetchOvertimeDates()
  }
}

function nextPerson() {
  if (currentIndex.value < persons.value.length - 1) {
    currentIndex.value++
    selectedPerson.value = persons.value[currentIndex.value]!
    fetchAttendance()
    fetchOvertimeDates()
  }
}

function selectPerson(person: Person) {
  selectedPerson.value = person
  currentIndex.value = persons.value.findIndex(p => p.id === person.id)
  showPersonDialog.value = false
  fetchAttendance()
  fetchOvertimeDates()
}

// 切换月份
function prevMonth() {
  if (currentMonth.value === 1) {
    currentMonth.value = 12
    currentYear.value--
  } else {
    currentMonth.value--
  }
  fetchPersons()
  fetchAttendance()
  fetchOvertimeDates()
  fetchSalaryCompare()
}

function nextMonth() {
  if (currentMonth.value === 12) {
    currentMonth.value = 1
    currentYear.value++
  } else {
    currentMonth.value++
  }
  fetchPersons()
  fetchAttendance()
  fetchOvertimeDates()
  fetchSalaryCompare()
}

// 获取当月有考勤记录的人员列表（含离职，保持考勤导入顺序）
async function fetchPersons() {
  try {
    const response = await $fetch(`/api/attendance-persons?year=${currentYear.value}&month=${currentMonth.value}`) as any
    if (response.success) {
      persons.value = response.data || []
      // 如果已选人员在列表中，保持选中；否则选第一个
      if (selectedPerson.value) {
        const idx = persons.value.findIndex(p => p.id === selectedPerson.value!.id)
        if (idx >= 0) {
          currentIndex.value = idx
          selectedPerson.value = persons.value[idx]!
        } else if (persons.value.length > 0) {
          selectedPerson.value = persons.value[0]!
          currentIndex.value = 0
          fetchAttendance()
          fetchOvertimeDates()
          fetchSalaryCompare()
        } else {
          selectedPerson.value = null
        }
      } else if (persons.value.length > 0) {
        selectedPerson.value = persons.value[0]!
        currentIndex.value = 0
        fetchAttendance()
        fetchOvertimeDates()
        fetchSalaryCompare()
      }
    }
  } catch (error) {
    console.error('获取人员列表失败:', error)
  }
}

// 获取考勤数据
async function fetchAttendance() {
  if (!selectedPerson.value) return

  try {
    const response = await $fetch('/api/attendance', {
      params: {
        person_id: selectedPerson.value.id,
        year: currentYear.value,
        month: currentMonth.value
      }
    }) as any
    if (response.success) {
      attendanceRecords.value = response.data || []
    }
  } catch (error) {
    console.error('获取考勤数据失败:', error)
  }
}

// 从数据库加载工资表对比数据
async function fetchSalaryCompare() {
  try {
    const response = await $fetch('/api/salary-compare', {
      params: { year: currentYear.value, month: currentMonth.value }
    }) as any
    if (response.success && response.data) {
      const map: Record<string, any> = {}
      for (const item of response.data) {
        map[item.id_card] = {
          idCard: item.id_card,
          name: item.name,
          workDays: Number(item.work_days),
          dailySalary: Number(item.daily_salary),
          netSalary: Number(item.net_salary)
        }
      }
      salaryDataMap.value = map
      salaryDataYear.value = currentYear.value
      salaryDataMonth.value = currentMonth.value
    }
  } catch (error) {
    console.error('获取工资表对比数据失败:', error)
  }
}

// 获取当前人员当月的加班日期
async function fetchOvertimeDates() {
  if (!selectedPerson.value) {
    overtimeDates.value = new Set()
    return
  }
  try {
    const response = await $fetch('/api/overtime-person', {
      params: {
        person_id: selectedPerson.value.id,
        year: currentYear.value,
        month: currentMonth.value
      }
    }) as any
    if (response.success && response.data) {
      const s = new Set<string>()
      for (const r of response.data) {
        const raw = r.task_date
        let d: string
        if (typeof raw === 'string') {
          if (raw.includes('T')) {
            const dt = new Date(raw)
            d = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
          } else {
            d = raw.slice(0, 10)
          }
        } else if (raw instanceof Date) {
          d = `${raw.getFullYear()}-${String(raw.getMonth() + 1).padStart(2, '0')}-${String(raw.getDate()).padStart(2, '0')}`
        } else {
          d = String(raw).slice(0, 10)
        }
        s.add(d)
      }
      overtimeDates.value = s
    } else {
      overtimeDates.value = new Set()
    }
  } catch (error) {
    console.error('获取加班日期失败:', error)
    overtimeDates.value = new Set()
  }
}

// 文件选择
function triggerFileInput() {
  fileInputRef.value?.click()
}

function handleFileSelect(e: Event) {
  const target = e.target as HTMLInputElement
  const f = target.files?.[0]
  if (f) {
    importFile.value = f
    importResult.value = null
  }
}

function handleFileDrop(e: DragEvent) {
  const f = e.dataTransfer?.files?.[0]
  if (f) {
    importFile.value = f
    importResult.value = null
  }
}

// 导入考勤
async function doImport() {
  if (!importFile.value) {
    importResult.value = { success: false, message: '请选择考勤表文件' }
    return
  }

  importing.value = true
  importResult.value = null

  try {
    const formData = new FormData()
    formData.append('file', importFile.value)

    const response = await $fetch('/api/attendance-import', {
      method: 'POST',
      body: formData
    }) as any
    importResult.value = { success: response.success, message: response.message, results: response.results, salaryData: response.salaryData }
    if (response.success) {
      // 存储工资表对比数据
      if (response.salaryData && Array.isArray(response.salaryData)) {
        const map: Record<string, any> = {}
        for (const item of response.salaryData) {
          map[item.idCard] = item
        }
        salaryDataMap.value = map
        salaryDataYear.value = response.year
        salaryDataMonth.value = response.month
      }
      // 更新年月到导入的月份
      currentYear.value = response.year
      currentMonth.value = response.month
      importFile.value = null
      if (selectedPerson.value) {
        await fetchAttendance()
      }
      // 延迟关闭弹窗，让用户看到结果
      setTimeout(() => {
        showImportDialog.value = false
        importResult.value = null
      }, 2000)
    }
  } catch (error: any) {
    importResult.value = { success: false, message: error.message || '导入失败' }
  } finally {
    importing.value = false
  }
}

// 导出业主考勤
async function exportOwner() {
  try {
    const url = `/api/attendance-export-owner?year=${currentYear.value}&month=${currentMonth.value}`
    window.open(url, '_blank')
  } catch (error) {
    console.error('导出失败:', error)
    alert('导出失败')
  }
}

// 导出代发考勤
async function exportProxy() {
  try {
    const url = `/api/attendance-export-proxy?year=${currentYear.value}&month=${currentMonth.value}`
    window.open(url, '_blank')
  } catch (error) {
    console.error('导出失败:', error)
    alert('导出失败')
  }
}

onMounted(() => {
  fetchPersons()
})
</script>