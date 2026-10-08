<template>
  <div class="space-y-6 p-6 min-h-screen bg-gray-50">
    <h1 class="text-3xl font-bold">作业票管理</h1>

    <div class="bg-white rounded-xl border border-gray-200 p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-gray-700">作业票记录</h2>
        <div class="flex gap-2">
          <Select v-model="filterDay" @update:model-value="onFilterChange">
            <SelectTrigger class="w-32">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="1">星期一</SelectItem>
              <SelectItem value="2">星期二</SelectItem>
              <SelectItem value="3">星期三</SelectItem>
              <SelectItem value="4">星期四</SelectItem>
              <SelectItem value="5">星期五</SelectItem>
              <SelectItem value="6">星期六</SelectItem>
              <SelectItem value="7">星期日</SelectItem>
            </SelectContent>
          </Select>
          <Select v-model="filterEnabled" @update:model-value="onFilterChange">
            <SelectTrigger class="w-28">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="1">已启用</SelectItem>
              <SelectItem value="0">未启用</SelectItem>
            </SelectContent>
          </Select>
          <Input 
            v-model="searchText" 
            placeholder="搜索编号、作业位置或审批人..." 
            class="w-56"
            @input="debouncedFetch"
          />
          <Button @click="openBatchDialog" variant="outline" :disabled="!selectedItems.length" title="批量打印勾选作业票的PDF">
            <Printer class="w-4 h-4 mr-1" />
            批量打印{{ selectedItems.length ? `（${selectedItems.length}）` : '' }}
          </Button>
          <Button @click="openAddDialog" class="bg-primary text-white">
            <Plus class="w-4 h-4 mr-1" />
            新增作业票
          </Button>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-100 border-b">
            <tr>
              <th class="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  class="w-4 h-4 accent-primary cursor-pointer align-middle"
                  :checked="isAllSelected"
                  :indeterminate.prop="isPartialSelected"
                  @change="toggleSelectAll"
                  title="全选本页"
                />
              </th>
              <th class="px-4 py-3 text-left font-medium text-gray-700">编号</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700">作业位置</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700">每周开票时间</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700">下次开始时间</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700">是否启用</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700">审批人</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700">备注</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr v-if="list.length === 0">
              <td colspan="9" class="px-4 py-8 text-center text-gray-500">暂无数据</td>
            </tr>
            <tr v-for="item in list" :key="item.id" class="hover:bg-gray-50">
              <td class="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  class="w-4 h-4 accent-primary cursor-pointer align-middle"
                  :checked="isSelected(item)"
                  @change="toggleSelect(item)"
                />
              </td>
              <td class="px-4 py-3 font-medium">{{ item.ticket_no || '-' }}</td>
              <td class="px-4 py-3">{{ item.work_location }}</td>
              <td class="px-4 py-3">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  星期{{ dayLabel(item.weekly_invoice_day) }}
                </span>
              </td>
              <td class="px-4 py-3 text-gray-600">{{ calcNextStartDate(item.weekly_invoice_day) }}</td>
              <td class="px-4 py-3">
                <button
                  type="button"
                  :class="[
                    'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
                    item.is_enabled ? 'bg-green-500' : 'bg-gray-300'
                  ]"
                  @click="toggleEnabled(item)"
                >
                  <span
                    :class="[
                      'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200',
                      item.is_enabled ? 'translate-x-4' : 'translate-x-0'
                    ]"
                  />
                </button>
              </td>
              <td class="px-4 py-3">{{ item.approver || '-' }}</td>
              <td class="px-4 py-3 text-gray-500 max-w-[150px] truncate" :title="item.remark ?? undefined">{{ item.remark || '-' }}</td>
              <td class="px-4 py-3">
                <div class="space-y-1">
                  <div class="flex gap-1">
                    <Button 
                      @click="openEditDialog(item)" 
                      variant="outline" 
                      size="sm" 
                      class="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Pencil class="w-3 h-3 mr-1" />
                      编辑
                    </Button>
                    <Button 
                      @click="openDeleteDialog(item)" 
                      variant="outline" 
                      size="sm" 
                      class="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      删除
                    </Button>
                  </div>
                  <div class="flex flex-wrap gap-1">
                    <Button
                      v-for="slot in pdfSlots"
                      :key="slot.type"
                      @click="printTicket(item, slot)"
                      variant="outline"
                      size="sm"
                      :title="`打印${slot.label}（${slot.duplex === 'long' ? '双面长边' : '双面短边'}）`"
                      :class="['h-7 text-xs', item[slot.field] ? slot.activeClass : 'text-gray-400 hover:text-gray-500 hover:bg-gray-50']"
                    >
                      <Printer class="w-3 h-3 mr-1" />
                      {{ slot.shortLabel }}
                    </Button>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 总条数与分页 -->
      <div class="flex items-center justify-between mt-4 pt-4 border-t">
        <div class="text-sm text-gray-600">共 <span class="font-medium text-gray-900">{{ pagination.total }}</span> 条记录</div>
        <div class="flex items-center gap-2">
          <Select :model-value="String(pagination.pageSize)" @update:model-value="onPageSizeChange">
            <SelectTrigger class="w-28 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 条/页</SelectItem>
              <SelectItem value="20">20 条/页</SelectItem>
              <SelectItem value="50">50 条/页</SelectItem>
              <SelectItem value="100">100 条/页</SelectItem>
            </SelectContent>
          </Select>
          <template v-if="pagination.totalPages > 1">
            <span class="text-sm text-gray-500">第 {{ pagination.page }} / {{ pagination.totalPages }} 页</span>
            <Button @click="changePage(1)" :disabled="pagination.page <= 1" variant="outline" size="sm">首页</Button>
            <Button @click="changePage(pagination.page - 1)" :disabled="pagination.page <= 1" variant="outline" size="sm">上一页</Button>
            <Button @click="changePage(pagination.page + 1)" :disabled="pagination.page >= pagination.totalPages" variant="outline" size="sm">下一页</Button>
            <Button @click="changePage(pagination.totalPages)" :disabled="pagination.page >= pagination.totalPages" variant="outline" size="sm">末页</Button>
          </template>
        </div>
      </div>
    </div>

    <!-- 新增/编辑对话框 -->
    <Dialog v-model:open="showFormDialog">
      <DialogContent class="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader class="shrink-0">
          <DialogTitle>{{ editingItem ? '编辑作业票' : '新增作业票' }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-4 py-4 overflow-y-auto flex-1 min-h-0">
          <div class="space-y-2">
            <Label>编号</Label>
            <Input v-model="form.ticket_no" placeholder="请输入编号" />
          </div>
          <div class="space-y-2">
            <Label>作业位置 *</Label>
            <Input v-model="form.work_location" placeholder="请输入作业位置" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label>每周开票时间 *</Label>
              <Select v-model="form.weekly_invoice_day">
                <SelectTrigger>
                  <SelectValue placeholder="选择星期几" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">星期一</SelectItem>
                  <SelectItem value="2">星期二</SelectItem>
                  <SelectItem value="3">星期三</SelectItem>
                  <SelectItem value="4">星期四</SelectItem>
                  <SelectItem value="5">星期五</SelectItem>
                  <SelectItem value="6">星期六</SelectItem>
                  <SelectItem value="7">星期日</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-2">
              <Label>下次开始时间</Label>
              <p class="h-9 px-3 py-2 border rounded-md text-sm bg-gray-50 text-gray-700">
                {{ computedNextStartDate }}
              </p>
            </div>
          </div>
          <div class="space-y-2">
            <Label>是否启用</Label>
            <Select v-model="form.is_enabled">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">否</SelectItem>
                <SelectItem value="1">是</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label>审批人</Label>
            <Input v-model="form.approver" placeholder="请输入审批人" />
          </div>
          <div class="space-y-2">
            <Label>备注</Label>
            <Input v-model="form.remark" placeholder="备注信息（选填）" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div v-for="slot in pdfSlots" :key="slot.type" class="space-y-2">
              <Label>{{ slot.label }}</Label>
              <div v-if="editingItem" class="flex items-center gap-2 h-9">
                <span class="text-xs" :class="editingItem[slot.field] ? 'text-green-600' : 'text-gray-400'">
                  {{ editingItem[slot.field] ? '已上传' : '未上传' }}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  class="h-7 text-xs"
                  :disabled="uploadingType === slot.type"
                  @click="triggerPdfInput(slot.type)"
                >
                  <Upload class="w-3 h-3 mr-1" />
                  {{ uploadingType === slot.type ? '上传中...' : (editingItem[slot.field] ? '重新上传' : '上传') }}
                </Button>
              </div>
              <p v-else class="text-xs text-gray-400 h-9 flex items-center">保存后可上传</p>
            </div>
          </div>
          <input ref="pdfFileInput" type="file" accept="application/pdf,.pdf" class="hidden" @change="onPdfSelected">
          <div v-if="formError" class="text-sm text-red-600">{{ formError }}</div>
        </div>
        <DialogFooter class="shrink-0">
          <Button @click="showFormDialog = false" variant="outline">取消</Button>
          <Button @click="saveForm" class="bg-primary text-white" :disabled="saving">
            {{ saving ? '保存中...' : '保存' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 删除确认对话框 -->
    <Dialog v-model:open="showDeleteDialog">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>确认删除</DialogTitle>
        </DialogHeader>
        <div class="py-4">
          <p>确定要删除作业位置 <strong>{{ deletingItem?.work_location }}</strong> 的作业票吗？</p>
          <p class="text-sm text-gray-500 mt-2">此操作不可撤销。</p>
        </div>
        <DialogFooter>
          <Button @click="showDeleteDialog = false" variant="outline">取消</Button>
          <Button @click="confirmDelete" class="bg-red-600 text-white hover:bg-red-700">删除</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 批量打印对话框 -->
    <Dialog v-model:open="showBatchDialog">
      <DialogContent class="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader class="shrink-0">
          <DialogTitle>批量打印</DialogTitle>
        </DialogHeader>
        <div class="space-y-4 py-4 overflow-y-auto flex-1 min-h-0">
          <p class="text-sm text-gray-600">已选 <strong>{{ selectedItems.length }}</strong> 张作业票，勾选要打印的 PDF：</p>
          <div class="space-y-2">
            <label v-for="slot in pdfSlots" :key="slot.type" class="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                class="w-4 h-4 accent-primary"
                :checked="batchTypes.includes(slot.type)"
                @change="toggleBatchType(slot.type)"
              />
              <span>{{ slot.label }}</span>
              <span class="text-xs text-gray-400">（{{ slot.duplex === 'long' ? '双面长边' : '双面短边' }}，已上传 {{ countUploaded(slot.field) }} 份）</span>
            </label>
          </div>
          <p class="text-sm text-gray-600">
            共 <strong>{{ batchStats.total }}</strong> 份 PDF 将合并打印
            <span v-if="batchStats.missing" class="text-gray-400">（{{ batchStats.missing }} 份未上传自动跳过）</span>
          </p>
          <p v-if="batchDuplexMixed" class="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
            JSA 与交底双面模式不同，将分为两个 PDF 依次打印：先交底（双面长边）打印一次，再 JSA（双面短边）打印一次，共两次打印。
          </p>
        </div>
        <DialogFooter class="shrink-0">
          <Button @click="showBatchDialog = false" variant="outline">取消</Button>
          <Button @click="confirmBatchPrint" class="bg-primary text-white" :disabled="!batchStats.total || batchPrinting">
            {{ batchPrinting ? '正在合并...' : '开始打印' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 提示弹窗 -->
    <Dialog v-model:open="showTipDialog">
      <DialogContent class="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{{ tipTitle }}</DialogTitle>
        </DialogHeader>
        <div class="py-4">
          <p class="text-sm text-gray-700">{{ tipMessage }}</p>
        </div>
        <DialogFooter>
          <Button @click="closeTipDialog" class="bg-primary text-white">确定</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { Plus, Pencil, Printer, Upload } from '@lucide/vue'
import { ref, reactive, computed, onMounted } from 'vue'

// ==================== 数据定义 ====================
interface WorkTicket {
  id: number
  ticket_no: string | null
  work_location: string
  weekly_invoice_day: number
  next_start_date: string | null
  is_enabled: number
  approver: string | null
  remark: string | null
  height_jsa_pdf: string | null
  height_analysis_pdf: string | null
  scaffold_jsa_pdf: string | null
  scaffold_analysis_pdf: string | null
  confined_jsa_pdf: string | null
  confined_analysis_pdf: string | null
  created_at: string
}

const list = ref<WorkTicket[]>([])
const searchText = ref('')
const filterDay = ref('all')
const filterEnabled = ref('all')
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 0
})

const showFormDialog = ref(false)
const showDeleteDialog = ref(false)
const editingItem = ref<WorkTicket | null>(null)
const deletingItem = ref<WorkTicket | null>(null)
const formError = ref('')
const saving = ref(false)

const showTipDialog = ref(false)
const tipMessage = ref('')
const tipTitle = ref('提示')
const tipConfirmCb = ref<(() => void) | null>(null)

const pdfFileInput = ref<HTMLInputElement | null>(null)

type PdfType = 'height-jsa' | 'height-analysis' | 'scaffold-jsa' | 'scaffold-analysis' | 'confined-jsa' | 'confined-analysis'
type PdfField = 'height_jsa_pdf' | 'height_analysis_pdf' | 'scaffold_jsa_pdf' | 'scaffold_analysis_pdf' | 'confined_jsa_pdf' | 'confined_analysis_pdf'

// 三种作业票（高处/脚手架/受限空间）各分为 JSA交底 + 交底 两个PDF；JSA交底双面短边打印，交底双面长边打印
const pdfSlots: { type: PdfType; label: string; shortLabel: string; field: PdfField; duplex: 'long' | 'short'; activeClass: string }[] = [
  { type: 'height-jsa', label: '高处作业票 · JSA交底', shortLabel: '高处JSA', field: 'height_jsa_pdf', duplex: 'short', activeClass: 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50' },
  { type: 'height-analysis', label: '高处作业票 · 交底', shortLabel: '高处交底', field: 'height_analysis_pdf', duplex: 'long', activeClass: 'text-teal-600 hover:text-teal-700 hover:bg-teal-50' },
  { type: 'scaffold-jsa', label: '脚手架作业票 · JSA交底', shortLabel: '脚手架JSA', field: 'scaffold_jsa_pdf', duplex: 'short', activeClass: 'text-violet-600 hover:text-violet-700 hover:bg-violet-50' },
  { type: 'scaffold-analysis', label: '脚手架作业票 · 交底', shortLabel: '脚手架交底', field: 'scaffold_analysis_pdf', duplex: 'long', activeClass: 'text-purple-600 hover:text-purple-700 hover:bg-purple-50' },
  { type: 'confined-jsa', label: '受限空间作业票 · JSA交底', shortLabel: '受限空间JSA', field: 'confined_jsa_pdf', duplex: 'short', activeClass: 'text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50' },
  { type: 'confined-analysis', label: '受限空间作业票 · 交底', shortLabel: '受限空间交底', field: 'confined_analysis_pdf', duplex: 'long', activeClass: 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50' }
]

const currentPdfType = ref<PdfType>('height-jsa')
const uploadingType = ref<'' | PdfType>('')

function showTip(msg: string, title = '提示', onConfirm?: () => void) {
  tipMessage.value = msg
  tipTitle.value = title
  tipConfirmCb.value = onConfirm || null
  showTipDialog.value = true
}

function closeTipDialog() {
  showTipDialog.value = false
  const cb = tipConfirmCb.value
  tipConfirmCb.value = null
  if (cb) cb()
}

const form = reactive({
  ticket_no: '',
  work_location: '',
  weekly_invoice_day: '1',
  is_enabled: '1',
  approver: '',
  remark: ''
})

// ==================== 星期与日期计算 ====================
const dayNames = ['', '一', '二', '三', '四', '五', '六', '日']

function dayLabel(day: number): string {
  return dayNames[day] || String(day)
}

function calcNextStartDate(weeklyDay: number | string): string {
  const targetDay = Number(weeklyDay)
  if (!targetDay || targetDay < 1 || targetDay > 7) return '-'
  
  const today = new Date()
  // JS: 0=Sun, 1=Mon...6=Sat  |  我们的定义: 1=Mon...7=Sun
  const jsDay = today.getDay() // 0-6 (Sun-Sat)
  const todayDay = jsDay === 0 ? 7 : jsDay // 转换为 1-7 (Mon-Sun)
  
  let daysUntil = targetDay - todayDay
  if (daysUntil <= 0) {
    daysUntil += 7
  }
  
  const nextDate = new Date(today)
  nextDate.setDate(today.getDate() + daysUntil)
  
  const y = nextDate.getFullYear()
  const m = String(nextDate.getMonth() + 1).padStart(2, '0')
  const d = String(nextDate.getDate()).padStart(2, '0')
  return `${y}年${m}月${d}日`
}

const computedNextStartDate = computed(() => {
  return calcNextStartDate(form.weekly_invoice_day)
})

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}年${m}月${day}日`
}

// ==================== 数据获取 ====================
async function fetchList() {
  try {
    const params = new URLSearchParams({
      page: String(pagination.page),
      pageSize: String(pagination.pageSize)
    })
    if (searchText.value) {
      params.append('search', searchText.value)
    }
    if (filterDay.value && filterDay.value !== 'all') {
      params.append('weekly_invoice_day', filterDay.value)
    }
    if (filterEnabled.value && filterEnabled.value !== 'all') {
      params.append('is_enabled', filterEnabled.value)
    }
    const response = await $fetch(`/api/work-ticket-list?${params.toString()}`) as any
    if (response.success) {
      list.value = response.data
      if (response.pagination) {
        pagination.total = response.pagination.total
        pagination.totalPages = Math.ceil(response.pagination.total / pagination.pageSize)
      }
    }
  } catch (error) {
    console.error('获取作业票列表失败:', error)
  }
}

let searchTimer: ReturnType<typeof setTimeout> | null = null
function debouncedFetch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    pagination.page = 1
    pagination.totalPages = 0
    fetchList()
  }, 300)
}

function onFilterChange() {
  pagination.page = 1
  pagination.totalPages = 0
  fetchList()
}

function changePage(p: number) {
  if (p < 1 || p > pagination.totalPages) return
  pagination.page = p
  fetchList()
}

// 切换每页条数：重置到第1页重新加载（参数为Select的AcceptableValue，此处用any兼容）
function onPageSizeChange(v: any) {
  pagination.pageSize = Number(v) || 10
  pagination.page = 1
  pagination.totalPages = 0
  fetchList()
}

// ==================== 状态切换 ====================
async function toggleEnabled(item: WorkTicket) {
  const newValue = item.is_enabled ? 0 : 1
  try {
    const response = await $fetch('/api/work-ticket-toggle-enabled', {
      method: 'POST',
      body: { id: item.id, is_enabled: newValue }
    }) as any
    if (response.success) {
      item.is_enabled = newValue
    } else {
      showTip('切换失败: ' + response.message, '错误')
    }
  } catch (error: any) {
    showTip('切换失败: ' + error.message, '错误')
  }
}

// ==================== 表单操作 ====================
function openAddDialog() {
  editingItem.value = null
  form.ticket_no = ''
  form.work_location = ''
  form.weekly_invoice_day = '1'
  form.is_enabled = '1'
  form.approver = ''
  form.remark = ''
  formError.value = ''
  showFormDialog.value = true
}

function openEditDialog(item: WorkTicket) {
  editingItem.value = item
  form.ticket_no = item.ticket_no || ''
  form.work_location = item.work_location
  form.weekly_invoice_day = String(item.weekly_invoice_day)
  form.is_enabled = String(item.is_enabled)
  form.approver = item.approver || ''
  form.remark = item.remark || ''
  formError.value = ''
  showFormDialog.value = true
}

async function saveForm() {
  if (!form.work_location) {
    formError.value = '请输入作业位置'
    return
  }
  if (!form.weekly_invoice_day) {
    formError.value = '请选择每周开票时间'
    return
  }

  saving.value = true
  formError.value = ''

  try {
    if (editingItem.value) {
      const response = await $fetch('/api/work-ticket-update', {
        method: 'POST',
        body: {
          id: editingItem.value.id,
          ticket_no: form.ticket_no,
          work_location: form.work_location,
          weekly_invoice_day: Number(form.weekly_invoice_day),
          is_enabled: Number(form.is_enabled),
          approver: form.approver,
          remark: form.remark
        }
      }) as any
      if (response.success) {
        showFormDialog.value = false
        fetchList()
      } else {
        formError.value = response.message || '保存失败'
      }
    } else {
      const response = await $fetch('/api/work-ticket-add', {
        method: 'POST',
        body: {
          ticket_no: form.ticket_no,
          work_location: form.work_location,
          weekly_invoice_day: Number(form.weekly_invoice_day),
          is_enabled: Number(form.is_enabled),
          approver: form.approver,
          remark: form.remark
        }
      }) as any
      if (response.success) {
        showFormDialog.value = false
        pagination.page = 1
        fetchList()
      } else {
        formError.value = response.message || '添加失败'
      }
    }
  } catch (error: any) {
    formError.value = error.message || '操作失败'
  } finally {
    saving.value = false
  }
}

// ==================== PDF 上传与打印 ====================
function triggerPdfInput(type: PdfType) {
  currentPdfType.value = type
  pdfFileInput.value?.click()
}

async function onPdfSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // 清空以便重复选择同一文件
  if (!file || !editingItem.value) return
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    formError.value = '请选择 PDF 文件'
    return
  }
  const type = currentPdfType.value
  const slot = pdfSlots.find(s => s.type === type)
  uploadingType.value = type
  formError.value = ''
  try {
    const fd = new FormData()
    fd.append('id', String(editingItem.value.id))
    fd.append('type', type)
    fd.append('file', file)
    const response = await $fetch('/api/work-ticket-upload-pdf', {
      method: 'POST',
      body: fd
    }) as any
    if (response.success) {
      // 直接更新当前编辑项（与列表共享同一对象引用，列表同步刷新）
      if (slot) {
        editingItem.value[slot.field] = response.path
      }
      showTip(`${slot?.label || '作业票'} PDF 上传成功`)
    } else {
      formError.value = response.message || '上传失败'
    }
  } catch (error: any) {
    formError.value = error.message || '上传失败'
  } finally {
    uploadingType.value = ''
  }
}

function printTicket(item: WorkTicket, slot: (typeof pdfSlots)[number]) {
  const path = item[slot.field]
  if (!path) {
    showTip(`「${item.work_location}」还未上传${slot.label} PDF，请先在编辑中上传`, '提示')
    return
  }
  // 通过 duplex 参数让服务端在PDF中写入双面打印偏好（JSA交底=短边 / 交底=长边）
  printOnePdf(`${path}?duplex=${slot.duplex}`)
}

// ==================== 批量选择与打印 ====================
// 存行对象而非id：跨页/筛选后仍能统计PDF上传情况，且与编辑弹窗共享引用自动同步
const selectedItems = ref<WorkTicket[]>([])
const showBatchDialog = ref(false)
const batchTypes = ref<PdfType[]>(pdfSlots.map(s => s.type))
const batchPrinting = ref(false)

function isSelected(item: WorkTicket) {
  return selectedItems.value.some(s => s.id === item.id)
}

function toggleSelect(item: WorkTicket) {
  const idx = selectedItems.value.findIndex(s => s.id === item.id)
  if (idx >= 0) selectedItems.value.splice(idx, 1)
  else selectedItems.value.push(item)
}

const isAllSelected = computed(() => list.value.length > 0 && list.value.every(i => isSelected(i)))
const isPartialSelected = computed(() => !isAllSelected.value && list.value.some(i => isSelected(i)))

function toggleSelectAll() {
  if (isAllSelected.value) {
    const pageIds = new Set(list.value.map(i => i.id))
    selectedItems.value = selectedItems.value.filter(s => !pageIds.has(s.id))
  } else {
    for (const item of list.value) {
      if (!isSelected(item)) selectedItems.value.push(item)
    }
  }
}

function toggleBatchType(type: PdfType) {
  const idx = batchTypes.value.indexOf(type)
  if (idx >= 0) batchTypes.value.splice(idx, 1)
  else batchTypes.value.push(type)
}

function countUploaded(field: PdfField) {
  return selectedItems.value.filter(i => i[field]).length
}

// 可打印份数与未上传跳过份数
const batchStats = computed(() => {
  let total = 0
  for (const item of selectedItems.value) {
    for (const slot of pdfSlots) {
      if (batchTypes.value.includes(slot.type) && item[slot.field]) total++
    }
  }
  return { total, missing: selectedItems.value.length * batchTypes.value.length - total }
})

// 勾选类型是否同时包含长边和短边（合并PDF只能有一个文档级双面设置）
const batchDuplexMixed = computed(() => {
  const set = new Set(pdfSlots.filter(s => batchTypes.value.includes(s.type)).map(s => s.duplex))
  return set.size > 1
})

function openBatchDialog() {
  if (!selectedItems.value.length) return
  showBatchDialog.value = true
}

async function confirmBatchPrint() {
  if (!batchStats.value.total || batchPrinting.value) return
  batchPrinting.value = true
  try {
    const ids = selectedItems.value.map(i => i.id).join(',')
    const slots = pdfSlots.filter(s => batchTypes.value.includes(s.type))
    // 按双面模式分组：交底（长边）一组、JSA（短边）一组，各合并为一个PDF分两次打印
    const groups = [
      { duplex: 'long', label: '交底', slots: slots.filter(s => s.duplex === 'long') },
      { duplex: 'short', label: 'JSA', slots: slots.filter(s => s.duplex === 'short') }
    ].filter(g => g.slots.length)

    // 先把各组合并PDF全部准备好（blob URL），避免打印间隙再做网络请求
    const jobs: { label: string; objUrl: string }[] = []
    for (const g of groups) {
      // 该组没有已上传文件时跳过（不发起请求）
      const hasFile = g.slots.some(slot => selectedItems.value.some(i => i[slot.field]))
      if (!hasFile) continue

      const url = `/api/work-ticket-print-merge?ids=${ids}&types=${g.slots.map(s => s.type).join(',')}&duplex=${g.duplex}`
      // 用原生fetch避免$fetch对动态URL的路由类型深度推断；先取响应以捕获服务端错误，再转blob URL
      const res = await fetch(url)
      if (!res.ok) {
        const data = await res.json().catch(() => null) as any
        throw new Error(data?.message || '合并打印文件失败')
      }
      const blob = await res.blob()
      jobs.push({ label: g.label, objUrl: URL.createObjectURL(blob) })
    }

    if (!jobs.length) {
      showTip('所选作业票没有已上传的对应PDF', '提示')
      return
    }

    // 提前关对话框，避免遮挡打印对话框
    showBatchDialog.value = false

    // 打印队列：Chrome 的 print() 需要用户手势（约5秒窗口），第一次打印后手势已过期，
    // 第二次 print() 会被静默忽略，必须经用户点击续接（提示框"确定"）重新获得手势
    const run = async (idx: number) => {
      const job = jobs[idx]
      if (!job) return
      await printOnePdf(job.objUrl)
      URL.revokeObjectURL(job.objUrl)
      if (idx + 1 < jobs.length) {
        const next = jobs[idx + 1]
        if (!next) return
        showTip(
          `「${job.label}」已打印完成。请点击"确定"继续打印「${next.label}」（第 ${idx + 2}/${jobs.length} 次打印）。`,
          '批量打印',
          () => run(idx + 1)
        )
      }
    }
    await run(0)
  } catch (error: any) {
    showTip(error?.message || '合并打印文件失败，请稍后重试', '错误')
  } finally {
    batchPrinting.value = false
  }
}

function printOnePdf(path: string): Promise<void> {
  // 隐藏 iframe 加载同源 PDF，加载完成后触发浏览器打印；打印对话框关闭后 resolve（供批量打印排队）
  return new Promise(resolve => {
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '100%'
    iframe.style.bottom = '100%'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.src = path
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      setTimeout(() => iframe.remove(), 3000)
      resolve()
    }
    // 兜底：iframe加载失败或打印异常时30秒后强制继续，避免批量打印卡死
    setTimeout(finish, 30000)
    iframe.onload = () => {
      const win = iframe.contentWindow
      if (!win) {
        finish()
        return
      }
      try {
        win.focus()
        win.addEventListener('afterprint', finish, { once: true })
        win.print()
        // Chrome/Edge 的 print() 同步阻塞，返回时对话框已关闭；
        // 但 iframe 的 afterprint 事件不可靠（可能触发在父窗口或根本不触发），
        // 用短延迟兜底确保批量打印能继续排队（约1.5秒后弹下一次打印）
        setTimeout(finish, 1500)
      } catch {
        window.open(path, '_blank')
        finish()
      }
    }
    document.body.appendChild(iframe)
  })
}

// ==================== 删除 ====================
function openDeleteDialog(item: WorkTicket) {
  deletingItem.value = item
  showDeleteDialog.value = true
}

async function confirmDelete() {
  if (!deletingItem.value) return
  try {
    const response = await $fetch('/api/work-ticket-delete', {
      method: 'POST',
      body: { id: deletingItem.value.id }
    }) as any
    if (response.success) {
      showDeleteDialog.value = false
      selectedItems.value = selectedItems.value.filter(s => s.id !== deletingItem.value?.id)
      fetchList()
    } else {
      showTip(response.message || '删除失败', '错误')
    }
  } catch (error: any) {
    showTip(error.message || '删除失败', '错误')
  }
}

// ==================== 初始化 ====================
onMounted(() => {
  fetchList()
})
</script>
