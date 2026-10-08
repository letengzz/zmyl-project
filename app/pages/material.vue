<template>
  <div class="space-y-6 p-6 min-h-screen bg-gray-50">
    <h1 class="text-3xl font-bold">物资管理</h1>

    <!-- 标签切换 -->
    <div class="flex gap-1.5 bg-white rounded-xl border border-gray-200 p-1.5 w-fit">
      <button
        type="button"
        @click="switchTab('material')"
        :class="['flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors', activeTab === 'material' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100']"
      >
        <Boxes class="w-4 h-4" />
        物资管理
      </button>
      <button
        type="button"
        @click="switchTab('dispatch')"
        :class="['flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors', activeTab === 'dispatch' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100']"
      >
        <PackageMinus class="w-4 h-4" />
        出场物资管理
      </button>
    </div>

    <!-- ==================== 物资管理 Tab ==================== -->
    <div v-show="activeTab === 'material'" class="bg-white rounded-xl border border-gray-200 p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-gray-700">物资台账</h2>
        <div class="flex gap-2">
          <Input
            v-model="materialSearch"
            placeholder="搜索物资名称或规格..."
            class="w-56"
            @input="debouncedFetchMaterials"
          />
          <Button @click="openMaterialDialog()" class="bg-primary text-white">
            <Plus class="w-4 h-4 mr-1" />
            新增物资
          </Button>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-100 border-b">
            <tr>
              <th class="px-4 py-3 text-left font-medium text-gray-700">物资名称</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700">规格</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700">总数量</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700">已出场</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700">剩余</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700">备注</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr v-if="materials.length === 0">
              <td colspan="7" class="px-4 py-8 text-center text-gray-500">暂无数据</td>
            </tr>
            <tr v-for="item in materials" :key="item.id" class="hover:bg-gray-50">
              <td class="px-4 py-3 font-medium">{{ item.name }}</td>
              <td class="px-4 py-3 text-gray-600">{{ item.spec || '-' }}</td>
              <td class="px-4 py-3">{{ item.total_quantity }}</td>
              <td class="px-4 py-3 text-amber-600">{{ item.dispatched_quantity }}</td>
              <td class="px-4 py-3 font-medium" :class="remain(item) === 0 ? 'text-red-500' : 'text-green-600'">{{ remain(item) }}</td>
              <td class="px-4 py-3 text-gray-500 max-w-[200px] truncate" :title="item.remark ?? undefined">{{ item.remark || '-' }}</td>
              <td class="px-4 py-3">
                <div class="flex gap-1">
                  <Button
                    @click="openMaterialDialog(item)"
                    variant="outline"
                    size="sm"
                    class="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Pencil class="w-3 h-3 mr-1" />
                    编辑
                  </Button>
                  <Button
                    @click="openDeleteConfirm('material', item)"
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

      <!-- 分页 -->
      <div class="flex items-center justify-between mt-4 pt-4 border-t">
        <div class="text-sm text-gray-600">共 <span class="font-medium text-gray-900">{{ materialPagination.total }}</span> 条记录</div>
        <div class="flex items-center gap-2">
          <Select :model-value="String(materialPagination.pageSize)" @update:model-value="onMaterialPageSizeChange">
            <SelectTrigger class="w-28 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 条/页</SelectItem>
              <SelectItem value="20">20 条/页</SelectItem>
              <SelectItem value="50">50 条/页</SelectItem>
              <SelectItem value="100">100 条/页</SelectItem>
            </SelectContent>
          </Select>
          <template v-if="materialPagination.totalPages > 1">
            <span class="text-sm text-gray-500">第 {{ materialPagination.page }} / {{ materialPagination.totalPages }} 页</span>
            <Button @click="changeMaterialPage(1)" :disabled="materialPagination.page <= 1" variant="outline" size="sm">首页</Button>
            <Button @click="changeMaterialPage(materialPagination.page - 1)" :disabled="materialPagination.page <= 1" variant="outline" size="sm">上一页</Button>
            <Button @click="changeMaterialPage(materialPagination.page + 1)" :disabled="materialPagination.page >= materialPagination.totalPages" variant="outline" size="sm">下一页</Button>
            <Button @click="changeMaterialPage(materialPagination.totalPages)" :disabled="materialPagination.page >= materialPagination.totalPages" variant="outline" size="sm">末页</Button>
          </template>
        </div>
      </div>
    </div>

    <!-- ==================== 出场物资管理 Tab ==================== -->
    <div v-show="activeTab === 'dispatch'" class="bg-white rounded-xl border border-gray-200 p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-gray-700">出场记录</h2>
        <Button @click="openDispatchDialog" class="bg-primary text-white">
          <PackageMinus class="w-4 h-4 mr-1" />
          新增出场
        </Button>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-100 border-b">
            <tr>
              <th class="px-4 py-3 text-left font-medium text-gray-700">物资名称</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700">规格</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700">出场数量</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700">出场日期</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700">备注</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr v-if="dispatches.length === 0">
              <td colspan="6" class="px-4 py-8 text-center text-gray-500">暂无出场记录</td>
            </tr>
            <tr v-for="item in dispatches" :key="item.id" class="hover:bg-gray-50">
              <td class="px-4 py-3 font-medium">{{ item.material_name || '（物资已删除）' }}</td>
              <td class="px-4 py-3 text-gray-600">{{ item.material_spec || '-' }}</td>
              <td class="px-4 py-3 text-amber-600">{{ item.quantity }}</td>
              <td class="px-4 py-3">{{ item.dispatch_date }}</td>
              <td class="px-4 py-3 text-gray-500 max-w-[200px] truncate" :title="item.remark ?? undefined">{{ item.remark || '-' }}</td>
              <td class="px-4 py-3">
                <Button
                  @click="openDeleteConfirm('dispatch', item)"
                  variant="outline"
                  size="sm"
                  class="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  删除
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div class="flex items-center justify-between mt-4 pt-4 border-t">
        <div class="text-sm text-gray-600">共 <span class="font-medium text-gray-900">{{ dispatchPagination.total }}</span> 条记录</div>
        <div class="flex items-center gap-2">
          <Select :model-value="String(dispatchPagination.pageSize)" @update:model-value="onDispatchPageSizeChange">
            <SelectTrigger class="w-28 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 条/页</SelectItem>
              <SelectItem value="20">20 条/页</SelectItem>
              <SelectItem value="50">50 条/页</SelectItem>
              <SelectItem value="100">100 条/页</SelectItem>
            </SelectContent>
          </Select>
          <template v-if="dispatchPagination.totalPages > 1">
            <span class="text-sm text-gray-500">第 {{ dispatchPagination.page }} / {{ dispatchPagination.totalPages }} 页</span>
            <Button @click="changeDispatchPage(1)" :disabled="dispatchPagination.page <= 1" variant="outline" size="sm">首页</Button>
            <Button @click="changeDispatchPage(dispatchPagination.page - 1)" :disabled="dispatchPagination.page <= 1" variant="outline" size="sm">上一页</Button>
            <Button @click="changeDispatchPage(dispatchPagination.page + 1)" :disabled="dispatchPagination.page >= dispatchPagination.totalPages" variant="outline" size="sm">下一页</Button>
            <Button @click="changeDispatchPage(dispatchPagination.totalPages)" :disabled="dispatchPagination.page >= dispatchPagination.totalPages" variant="outline" size="sm">末页</Button>
          </template>
        </div>
      </div>
    </div>

    <!-- 新增/编辑物资弹窗 -->
    <Dialog v-model:open="showMaterialDialog">
      <DialogContent class="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader class="shrink-0">
          <DialogTitle>{{ editingMaterial ? '编辑物资' : '新增物资' }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-4 py-4 overflow-y-auto flex-1 min-h-0">
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label>物资名称 *</Label>
              <Input v-model="materialForm.name" placeholder="请输入物资名称" />
            </div>
            <div class="space-y-2">
              <Label>规格</Label>
              <Input v-model="materialForm.spec" placeholder="请输入规格（选填）" />
            </div>
          </div>
          <div class="space-y-2">
            <Label>总数量 *</Label>
            <Input v-model="materialForm.total_quantity" type="number" min="0" placeholder="请输入总数量" />
            <p v-if="editingMaterial" class="text-xs text-gray-400">
              当前已出场 {{ editingMaterial.dispatched_quantity }}，剩余 {{ remain(editingMaterial) }}
            </p>
          </div>
          <div class="space-y-2">
            <Label>备注</Label>
            <Input v-model="materialForm.remark" placeholder="备注信息（选填）" />
          </div>
          <div v-if="formError" class="text-sm text-red-600">{{ formError }}</div>
        </div>
        <DialogFooter class="shrink-0">
          <Button @click="showMaterialDialog = false" variant="outline">取消</Button>
          <Button @click="saveMaterial" class="bg-primary text-white" :disabled="savingMaterial">
            {{ savingMaterial ? '保存中...' : '保存' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 新增出场弹窗 -->
    <Dialog v-model:open="showDispatchDialog">
      <DialogContent class="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader class="shrink-0">
          <DialogTitle>新增出场</DialogTitle>
        </DialogHeader>
        <div class="space-y-4 py-4 overflow-y-auto flex-1 min-h-0">
          <div class="space-y-2">
            <Label>物资 *</Label>
            <Select v-model="dispatchForm.material_id" @update:model-value="onDispatchMaterialChange">
              <SelectTrigger>
                <SelectValue placeholder="选择物资" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="m in allMaterials" :key="m.id" :value="String(m.id)">
                  {{ m.name }}{{ m.spec ? ' · ' + m.spec : '' }}（剩余 {{ remain(m) }}）
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label>出场数量 *</Label>
            <Input v-model="dispatchForm.quantity" type="number" min="1" placeholder="请输入出场数量" />
            <p class="text-xs text-gray-400">
              所选物资剩余
              <span class="font-medium" :class="selectedRemain === 0 ? 'text-red-500' : 'text-green-600'">{{ selectedRemain }}</span>
            </p>
          </div>
          <div class="space-y-2">
            <Label>出场日期 *</Label>
            <Input v-model="dispatchForm.dispatch_date" type="date" />
          </div>
          <div class="space-y-2">
            <Label>备注</Label>
            <Input v-model="dispatchForm.remark" placeholder="备注信息（选填）" />
          </div>
          <div v-if="formError" class="text-sm text-red-600">{{ formError }}</div>
        </div>
        <DialogFooter class="shrink-0">
          <Button @click="showDispatchDialog = false" variant="outline">取消</Button>
          <Button @click="saveDispatch" class="bg-primary text-white" :disabled="savingDispatch">
            {{ savingDispatch ? '保存中...' : '保存' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 删除确认弹窗 -->
    <Dialog v-model:open="showDeleteDialog">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>确认删除</DialogTitle>
        </DialogHeader>
        <div class="py-4">
          <p v-if="deleteType === 'material'">确定要删除物资 <strong>{{ deletingMaterial?.name }}</strong> 吗？</p>
          <p v-else>确定要删除 <strong>{{ deletingDispatch?.material_name }}{{ deletingDispatch?.material_spec ? ' · ' + deletingDispatch.material_spec : '' }}</strong> 的出场记录（数量 {{ deletingDispatch?.quantity }}）吗？</p>
          <p class="text-sm text-gray-500 mt-2">
            <template v-if="deleteType === 'material'">删除后该物资不再显示，历史出场记录保留。</template>
            <template v-else>删除后剩余数量自动回补。</template>
          </p>
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
import { Plus, Pencil, Boxes, PackageMinus } from '@lucide/vue'
import { ref, reactive, computed, onMounted } from 'vue'

interface Material {
  id: number
  name: string
  spec: string | null
  total_quantity: number
  remark: string | null
  dispatched_quantity: number
  created_at: string
}

interface DispatchRecord {
  id: number
  material_id: number
  quantity: number
  dispatch_date: string
  remark: string | null
  material_name: string | null
  material_spec: string | null
  created_at: string
}

const activeTab = ref<'material' | 'dispatch'>('material')

function switchTab(tab: 'material' | 'dispatch') {
  activeTab.value = tab
  if (tab === 'material') fetchMaterials()
  else fetchDispatches()
}

// 剩余数量 = 总数量 - 已出场
function remain(m: Material) {
  return Math.max(0, Number(m.total_quantity) - Number(m.dispatched_quantity))
}

// ==================== 物资列表 ====================
const materials = ref<Material[]>([])
const materialSearch = ref('')
const materialPagination = reactive({ page: 1, pageSize: 10, total: 0, totalPages: 0 })

async function fetchMaterials() {
  try {
    const params = new URLSearchParams({
      page: String(materialPagination.page),
      pageSize: String(materialPagination.pageSize)
    })
    if (materialSearch.value) {
      params.append('search', materialSearch.value)
    }
    const response = await $fetch(`/api/material-list?${params.toString()}`) as any
    if (response.success) {
      materials.value = response.data
      if (response.pagination) {
        materialPagination.total = response.pagination.total
        materialPagination.totalPages = Math.ceil(response.pagination.total / materialPagination.pageSize)
      }
    }
  } catch (error) {
    console.error('获取物资列表失败:', error)
  }
}

let materialSearchTimer: ReturnType<typeof setTimeout> | null = null
function debouncedFetchMaterials() {
  if (materialSearchTimer) clearTimeout(materialSearchTimer)
  materialSearchTimer = setTimeout(() => {
    materialPagination.page = 1
    materialPagination.totalPages = 0
    fetchMaterials()
  }, 300)
}

function changeMaterialPage(p: number) {
  if (p < 1 || p > materialPagination.totalPages) return
  materialPagination.page = p
  fetchMaterials()
}

// 切换每页条数：重置到第1页重新加载（参数为Select的AcceptableValue，此处用any兼容）
function onMaterialPageSizeChange(v: any) {
  materialPagination.pageSize = Number(v) || 10
  materialPagination.page = 1
  materialPagination.totalPages = 0
  fetchMaterials()
}

// ==================== 出场记录列表 ====================
const dispatches = ref<DispatchRecord[]>([])
const dispatchPagination = reactive({ page: 1, pageSize: 10, total: 0, totalPages: 0 })

async function fetchDispatches() {
  try {
    const params = new URLSearchParams({
      page: String(dispatchPagination.page),
      pageSize: String(dispatchPagination.pageSize)
    })
    const response = await $fetch(`/api/material-dispatch-list?${params.toString()}`) as any
    if (response.success) {
      dispatches.value = response.data
      if (response.pagination) {
        dispatchPagination.total = response.pagination.total
        dispatchPagination.totalPages = Math.ceil(response.pagination.total / dispatchPagination.pageSize)
      }
    }
  } catch (error) {
    console.error('获取出场记录失败:', error)
  }
}

function changeDispatchPage(p: number) {
  if (p < 1 || p > dispatchPagination.totalPages) return
  dispatchPagination.page = p
  fetchDispatches()
}

function onDispatchPageSizeChange(v: any) {
  dispatchPagination.pageSize = Number(v) || 10
  dispatchPagination.page = 1
  dispatchPagination.totalPages = 0
  fetchDispatches()
}

// ==================== 物资新增/编辑 ====================
const showMaterialDialog = ref(false)
const editingMaterial = ref<Material | null>(null)
const savingMaterial = ref(false)
const materialForm = reactive({ name: '', spec: '', total_quantity: '0', remark: '' })
const formError = ref('')

function openMaterialDialog(item?: Material) {
  editingMaterial.value = item || null
  materialForm.name = item?.name || ''
  materialForm.spec = item?.spec || ''
  materialForm.total_quantity = String(item?.total_quantity ?? 0)
  materialForm.remark = item?.remark || ''
  formError.value = ''
  showMaterialDialog.value = true
}

async function saveMaterial() {
  if (!materialForm.name.trim()) {
    formError.value = '请输入物资名称'
    return
  }
  const qty = parseInt(materialForm.total_quantity)
  if (!Number.isInteger(qty) || qty < 0) {
    formError.value = '总数量必须为非负整数'
    return
  }

  savingMaterial.value = true
  formError.value = ''
  try {
    if (editingMaterial.value) {
      const response = await $fetch('/api/material-update', {
        method: 'POST',
        body: {
          id: editingMaterial.value.id,
          name: materialForm.name.trim(),
          spec: materialForm.spec,
          total_quantity: qty,
          remark: materialForm.remark
        }
      }) as any
      if (response.success) {
        showMaterialDialog.value = false
        fetchMaterials()
      } else {
        formError.value = response.message || '保存失败'
      }
    } else {
      const response = await $fetch('/api/material-add', {
        method: 'POST',
        body: {
          name: materialForm.name.trim(),
          spec: materialForm.spec,
          total_quantity: qty,
          remark: materialForm.remark
        }
      }) as any
      if (response.success) {
        showMaterialDialog.value = false
        materialPagination.page = 1
        fetchMaterials()
      } else {
        formError.value = response.message || '添加失败'
      }
    }
  } catch (error: any) {
    formError.value = error.message || '操作失败'
  } finally {
    savingMaterial.value = false
  }
}

// ==================== 新增出场 ====================
const showDispatchDialog = ref(false)
const savingDispatch = ref(false)
const allMaterials = ref<Material[]>([])
const dispatchForm = reactive({ material_id: '', quantity: '', dispatch_date: '', remark: '' })

const selectedMaterial = computed(() => allMaterials.value.find(m => String(m.id) === dispatchForm.material_id))
const selectedRemain = computed(() => (selectedMaterial.value ? remain(selectedMaterial.value) : 0))

// 本地时区的今天日期（toISOString 是 UTC，东八区晚上会差一天）
function todayStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

async function openDispatchDialog() {
  dispatchForm.material_id = ''
  dispatchForm.quantity = ''
  dispatchForm.dispatch_date = todayStr()
  dispatchForm.remark = ''
  formError.value = ''
  showDispatchDialog.value = true
  // 拉取全部物资作为下拉选项（含剩余数量提示）
  try {
    const response = await $fetch('/api/material-list?page=1&pageSize=100') as any
    if (response.success) {
      allMaterials.value = response.data
    }
  } catch (error) {
    console.error('获取物资选项失败:', error)
  }
}

function onDispatchMaterialChange() {
  dispatchForm.quantity = ''
}

async function saveDispatch() {
  if (!dispatchForm.material_id) {
    formError.value = '请选择物资'
    return
  }
  const qty = parseInt(dispatchForm.quantity)
  if (!Number.isInteger(qty) || qty <= 0) {
    formError.value = '出场数量必须为正整数'
    return
  }
  if (!dispatchForm.dispatch_date) {
    formError.value = '请选择出场日期'
    return
  }
  if (qty > selectedRemain.value) {
    formError.value = `剩余数量不足（剩余 ${selectedRemain.value}）`
    return
  }

  savingDispatch.value = true
  formError.value = ''
  try {
    const response = await $fetch('/api/material-dispatch-add', {
      method: 'POST',
      body: {
        material_id: Number(dispatchForm.material_id),
        quantity: qty,
        dispatch_date: dispatchForm.dispatch_date,
        remark: dispatchForm.remark
      }
    }) as any
    if (response.success) {
      showDispatchDialog.value = false
      dispatchPagination.page = 1
      fetchDispatches()
      fetchMaterials() // 同步刷新物资剩余数量
      showTip('出场记录添加成功')
    } else {
      formError.value = response.message || '添加失败'
    }
  } catch (error: any) {
    formError.value = error.message || '操作失败'
  } finally {
    savingDispatch.value = false
  }
}

// ==================== 删除 ====================
const showDeleteDialog = ref(false)
const deleteType = ref<'material' | 'dispatch'>('material')
const deletingMaterial = ref<Material | null>(null)
const deletingDispatch = ref<DispatchRecord | null>(null)

function openDeleteConfirm(type: 'material' | 'dispatch', item: Material | DispatchRecord) {
  deleteType.value = type
  if (type === 'material') {
    deletingMaterial.value = item as Material
    deletingDispatch.value = null
  } else {
    deletingDispatch.value = item as DispatchRecord
    deletingMaterial.value = null
  }
  showDeleteDialog.value = true
}

async function confirmDelete() {
  try {
    if (deleteType.value === 'material' && deletingMaterial.value) {
      const response = await $fetch('/api/material-delete', {
        method: 'POST',
        body: { id: deletingMaterial.value.id }
      }) as any
      if (response.success) {
        showDeleteDialog.value = false
        fetchMaterials()
      } else {
        showTip(response.message || '删除失败', '错误')
      }
    } else if (deleteType.value === 'dispatch' && deletingDispatch.value) {
      const response = await $fetch('/api/material-dispatch-delete', {
        method: 'POST',
        body: { id: deletingDispatch.value.id }
      }) as any
      if (response.success) {
        showDeleteDialog.value = false
        fetchDispatches()
        fetchMaterials() // 同步刷新物资剩余数量
      } else {
        showTip(response.message || '删除失败', '错误')
      }
    }
  } catch (error: any) {
    showTip(error.message || '删除失败', '错误')
  }
}

// ==================== 提示 ====================
const showTipDialog = ref(false)
const tipMessage = ref('')
const tipTitle = ref('提示')

function showTip(msg: string, title = '提示') {
  tipMessage.value = msg
  tipTitle.value = title
  showTipDialog.value = true
}

// ==================== 初始化 ====================
onMounted(() => {
  fetchMaterials()
})
</script>
