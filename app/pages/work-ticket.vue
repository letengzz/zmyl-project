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
              <td colspan="8" class="px-4 py-8 text-center text-gray-500">暂无数据</td>
            </tr>
            <tr v-for="item in list" :key="item.id" class="hover:bg-gray-50">
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
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 总条数与分页 -->
      <div class="flex items-center justify-between mt-4 pt-4 border-t">
        <div class="text-sm text-gray-600">共 <span class="font-medium text-gray-900">{{ pagination.total }}</span> 条记录</div>
        <div v-if="pagination.totalPages > 1" class="flex items-center gap-2">
          <span class="text-sm text-gray-500">第 {{ pagination.page }} / {{ pagination.totalPages }} 页</span>
          <Button @click="changePage(1)" :disabled="pagination.page <= 1" variant="outline" size="sm">首页</Button>
          <Button @click="changePage(pagination.page - 1)" :disabled="pagination.page <= 1" variant="outline" size="sm">上一页</Button>
          <Button @click="changePage(pagination.page + 1)" :disabled="pagination.page >= pagination.totalPages" variant="outline" size="sm">下一页</Button>
          <Button @click="changePage(pagination.totalPages)" :disabled="pagination.page >= pagination.totalPages" variant="outline" size="sm">末页</Button>
        </div>
      </div>
    </div>

    <!-- 新增/编辑对话框 -->
    <Dialog v-model:open="showFormDialog">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{{ editingItem ? '编辑作业票' : '新增作业票' }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-4 py-4">
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
          <div v-if="formError" class="text-sm text-red-600">{{ formError }}</div>
        </div>
        <DialogFooter>
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
          <Button @click="showTipDialog = false" class="bg-primary text-white">确定</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { Plus, Pencil } from '@lucide/vue'
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

function showTip(msg: string, title = '提示') {
  tipMessage.value = msg
  tipTitle.value = title
  showTipDialog.value = true
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
