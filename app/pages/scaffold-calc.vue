<template>
  <div class="space-y-6 p-6 min-h-screen bg-gray-50">
    <h1 class="text-3xl font-bold">脚手架价格计算</h1>

    <!-- 计算表单 -->
    <div class="bg-white rounded-xl border border-gray-200 p-6">
      <h2 class="text-lg font-semibold text-gray-700 mb-4">计算参数</h2>
      
      <!-- 第一行：类型筛选 + 脚手架项目 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div class="space-y-2">
          <Label>类型筛选</Label>
          <Select v-model="calcForm.type">
            <SelectTrigger>
              <SelectValue placeholder="全部类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem v-for="type in scaffoldTypes" :key="type" :value="type">
                {{ type }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="space-y-2">
          <Label>脚手架项目</Label>
          <Select v-model="calcForm.scaffoldId">
            <SelectTrigger>
              <SelectValue placeholder="选择项目" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem 
                v-for="item in filteredScaffoldList" 
                :key="item.id" 
                :value="String(item.id)"
              >
                {{ item.name }} ({{ item.price }}元/{{ item.unit }})
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <!-- 第二行：根据公式动态显示输入框 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <!-- 长度 -->
        <div v-if="showField('长度')" class="space-y-2">
          <Label>长度 (m)</Label>
          <Input type="number" v-model="calcForm.length" placeholder="输入长度" min="0" step="0.1" />
        </div>
        <!-- 宽度 -->
        <div v-if="showField('宽度')" class="space-y-2">
          <Label>宽度 (m)</Label>
          <Input type="number" v-model="calcForm.width" placeholder="输入宽度" min="0" step="0.1" />
        </div>
        <!-- 高度 -->
        <div v-if="showField('高度')" class="space-y-2">
          <Label>高度 (m)</Label>
          <Input type="number" v-model="calcForm.height" placeholder="输入高度" min="0" step="0.1" />
        </div>
        <!-- 周长 -->
        <div v-if="showField('周长')" class="space-y-2">
          <Label>周长 (m)</Label>
          <Input type="number" v-model="calcForm.perimeter" placeholder="输入周长" min="0" step="0.1" />
        </div>
        <!-- 斜道长度 -->
        <div v-if="showField('斜道长度')" class="space-y-2">
          <Label>斜道长度 (m)</Label>
          <Input type="number" v-model="calcForm.rampLength" placeholder="输入斜道长度" min="0" step="0.1" />
        </div>
        <!-- 斜道宽度 -->
        <div v-if="showField('斜道宽度')" class="space-y-2">
          <Label>斜道宽度 (m)</Label>
          <Input type="number" v-model="calcForm.rampWidth" placeholder="输入斜道宽度" min="0" step="0.1" />
        </div>
        <!-- 个数 -->
        <div class="space-y-2">
          <Label>个数</Label>
          <Input type="number" v-model="calcForm.count" placeholder="输入个数" min="0" />
        </div>
      </div>

      <div class="mt-6 flex gap-3">
        <Button @click="calculate" class="bg-primary text-white">计算价格</Button>
        <Button @click="resetForm" variant="outline">重置</Button>
      </div>
    </div>

    <!-- 计算结果 -->
    <div v-if="result" class="bg-white rounded-xl border border-gray-200 p-6">
      <h2 class="text-lg font-semibold text-gray-700 mb-4">计算结果</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-blue-50 rounded-lg p-4">
          <div class="text-sm text-gray-600 mb-1">工程量</div>
          <div class="text-2xl font-bold text-blue-600">{{ result.quantity }} {{ result.unit }}</div>
        </div>
        <div class="bg-green-50 rounded-lg p-4">
          <div class="text-sm text-gray-600 mb-1">单价</div>
          <div class="text-2xl font-bold text-green-600">{{ result.unitPrice }} 元/{{ result.unit }}</div>
        </div>
        <div class="bg-orange-50 rounded-lg p-4">
          <div class="text-sm text-gray-600 mb-1">总费用</div>
          <div class="text-2xl font-bold text-orange-600">{{ result.totalFee }} 元</div>
        </div>
      </div>

      <div class="mt-4 p-4 bg-gray-50 rounded-lg">
        <h3 class="font-medium text-gray-700 mb-2">计算明细</h3>
        <div class="text-sm text-gray-600 space-y-1">
          <p>• 搭设类型：{{ result.scaffoldName }}</p>
          <p>• 计算公式：{{ result.formula }}</p>
          <p>• 工程量：{{ result.quantity }} {{ result.unit }}</p>
          <p>• 单价：{{ result.unitPrice }} 元/{{ result.unit }}</p>
          <p>• 总费用：{{ result.quantity }} × {{ result.unitPrice }} = {{ result.totalFee }} 元</p>
        </div>
      </div>
    </div>

    <!-- 脚手架价格表 -->
    <div class="bg-white rounded-xl border border-gray-200 p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-gray-700">脚手架价格表</h2>
        <Button @click="openAddDialog" class="bg-primary text-white">
          <Plus class="w-4 h-4 mr-1" />
          添加脚手架
        </Button>
      </div>
      
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-100 border-b">
            <tr>
              <th class="px-4 py-3 text-left font-medium text-gray-700">序号</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700">搭设类型名称</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700">单位</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700">计算公式</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700">最高限价(元)</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700">备注</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr v-if="filteredScaffoldList.length === 0">
              <td colspan="7" class="px-4 py-8 text-center text-gray-500">暂无数据</td>
            </tr>
            <tr v-for="(item, index) in filteredScaffoldList" :key="item.id" class="hover:bg-gray-50">
              <td class="px-4 py-3">{{ index + 1 }}</td>
              <td class="px-4 py-3">{{ item.name }}</td>
              <td class="px-4 py-3">{{ item.unit }}</td>
              <td class="px-4 py-3 text-gray-600">{{ item.formula || '-' }}</td>
              <td class="px-4 py-3 font-medium text-primary">{{ item.price }}</td>
              <td class="px-4 py-3 text-gray-500">{{ item.remark || '-' }}</td>
              <td class="px-4 py-3">
                <div class="flex gap-2">
                  <Button @click.stop="openEditDialog(item)" variant="outline" size="sm" class="h-7 text-xs">编辑</Button>
                  <Button @click.stop="openDeleteDialog(item)" variant="outline" size="sm" class="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50">删除</Button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 添加/编辑对话框 -->
    <Dialog v-model:open="showFormDialog">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{{ editingItem ? '编辑脚手架' : '添加脚手架' }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <Label>搭设类型名称</Label>
            <Input v-model="formDialog.name" placeholder="如：井字脚手架" />
          </div>
          <div class="space-y-2">
            <Label>脚手架类型</Label>
            <Input v-model="formDialog.type" placeholder="如：综合脚手架" />
          </div>
          <div class="space-y-2">
            <Label>单位</Label>
            <Input v-model="formDialog.unit" placeholder="如：m², m, m³, 处, 个" />
          </div>
          <div class="space-y-2">
            <Label>计算公式</Label>
            <Input v-model="formDialog.formula" placeholder="如：周长*高度, 长度*宽度, 个数" />
          </div>
          <div class="space-y-2">
            <Label>最高限价 (元)</Label>
            <Input type="number" v-model="formDialog.price" placeholder="输入单价" step="0.01" />
          </div>
          <div class="space-y-2">
            <Label>备注</Label>
            <Input v-model="formDialog.remark" placeholder="备注说明" />
          </div>
          <div v-if="formError" class="text-sm text-red-600">{{ formError }}</div>
        </div>
        <DialogFooter>
          <Button @click="showFormDialog = false" variant="outline">取消</Button>
          <Button @click="saveForm" class="bg-primary text-white">保存</Button>
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
          <p>确定要删除脚手架 <strong>{{ deletingItem?.name }}</strong> 吗？</p>
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
import { Plus } from '@lucide/vue'
import { ref, reactive, computed, onMounted } from 'vue'

interface ScaffoldInfo {
  id: number
  name: string
  type: string
  unit: string
  formula: string
  price: number
  status: number
  remark: string
}

interface CalcResult {
  scaffoldName: string
  formula: string
  quantity: number
  unit: string
  unitPrice: number
  totalFee: number
}

const scaffoldList = ref<ScaffoldInfo[]>([])

const scaffoldTypes = computed(() => {
  const types = new Set(scaffoldList.value.map(s => s.type))
  return Array.from(types)
})

const filteredScaffoldList = computed(() => {
  if (!calcForm.type || calcForm.type === 'all') return scaffoldList.value
  return scaffoldList.value.filter(s => s.type === calcForm.type)
})

const calcForm = reactive({
  type: 'all',
  scaffoldId: '',
  length: '',
  width: '',
  height: '',
  perimeter: '',
  rampLength: '',
  rampWidth: '',
  count: ''
})

const result = ref<CalcResult | null>(null)

// 根据选中的脚手架项目公式，判断是否显示某个输入字段
const selectedFormula = computed(() => {
  if (!calcForm.scaffoldId) return ''
  const scaffold = scaffoldList.value.find(s => s.id === Number(calcForm.scaffoldId))
  return scaffold?.formula || ''
})

function showField(fieldName: string): boolean {
  const formula = selectedFormula.value.toLowerCase()
  if (!formula) return false // 未选择项目时隐藏所有字段
  return formula.includes(fieldName)
}

// 对话框状态
const showFormDialog = ref(false)
const showDeleteDialog = ref(false)
const editingItem = ref<ScaffoldInfo | null>(null)
const deletingItem = ref<ScaffoldInfo | null>(null)
const formError = ref('')

// 提示弹窗
const showTipDialog = ref(false)
const tipMessage = ref('')
const tipTitle = ref('提示')

function showTip(msg: string, title = '提示') {
  tipMessage.value = msg
  tipTitle.value = title
  showTipDialog.value = true
}

const formDialog = reactive({
  name: '',
  type: '',
  unit: '',
  formula: '',
  price: '',
  remark: ''
})

function calculate() {
  if (!calcForm.scaffoldId) {
    showTip('请先选择脚手架项目', '提示')
    return
  }

  const scaffold = scaffoldList.value.find(s => s.id === Number(calcForm.scaffoldId))
  if (!scaffold) {
    showTip('脚手架信息不存在', '错误')
    return
  }

  const formula = scaffold.formula || ''
  const L = Number(calcForm.length) || 0
  const W = Number(calcForm.width) || 0
  const H = Number(calcForm.height) || 0
  const P = Number(calcForm.perimeter) || 0
  const RL = Number(calcForm.rampLength) || 0
  const RW = Number(calcForm.rampWidth) || 0
  const C = Number(calcForm.count) || 0

  // 根据公式计算工程量
  let quantity = 0
  const formulaLower = formula.toLowerCase()

  if (formulaLower.includes('周长') && formulaLower.includes('高度')) {
    quantity = P * H
  } else if (formulaLower.includes('长度') && formulaLower.includes('高度')) {
    quantity = L * H
  } else if (formulaLower.includes('长度') && formulaLower.includes('宽度')) {
    quantity = L * W
  } else if (formulaLower.includes('斜道长度') && formulaLower.includes('斜道宽度') && formulaLower.includes('高度')) {
    quantity = RL * RW * H
  } else if (formulaLower.includes('斜道长度') && formulaLower.includes('斜道宽度')) {
    quantity = RL * RW
  } else if (formulaLower.includes('个数') || formulaLower === '个') {
    quantity = C
  } else if (formulaLower.includes('长度')) {
    quantity = L
  } else if (formulaLower.includes('高度')) {
    quantity = H
  } else if (formulaLower.includes('宽度')) {
    quantity = W
  } else if (formulaLower.includes('周长')) {
    quantity = P
  }

  // 乘以个数
  if (C > 1) {
    quantity = quantity * C
  }

  if (quantity <= 0) {
    showTip('请根据计算公式填写对应的参数（公式：' + formula + '）', '提示')
    return
  }

  const totalFee = quantity * scaffold.price

  result.value = {
    scaffoldName: scaffold.name,
    formula: formula,
    quantity: Math.round(quantity * 100) / 100,
    unit: scaffold.unit,
    unitPrice: scaffold.price,
    totalFee: Math.round(totalFee * 100) / 100
  }
}

function resetForm() {
  calcForm.type = 'all'
  calcForm.scaffoldId = ''
  calcForm.length = ''
  calcForm.width = ''
  calcForm.height = ''
  calcForm.perimeter = ''
  calcForm.rampLength = ''
  calcForm.rampWidth = ''
  calcForm.count = ''
  result.value = null
}

function openAddDialog() {
  editingItem.value = null
  formDialog.name = ''
  formDialog.type = ''
  formDialog.unit = ''
  formDialog.formula = ''
  formDialog.price = ''
  formDialog.remark = ''
  formError.value = ''
  showFormDialog.value = true
}

function openEditDialog(item: ScaffoldInfo) {
  editingItem.value = item
  formDialog.name = item.name
  formDialog.type = item.type
  formDialog.unit = item.unit
  formDialog.formula = item.formula || ''
  formDialog.price = String(item.price)
  formDialog.remark = item.remark || ''
  formError.value = ''
  showFormDialog.value = true
}

async function saveForm() {
  if (!formDialog.name || !formDialog.type || !formDialog.unit || !formDialog.price) {
    formError.value = '请填写必填项（名称、类型、单位、单价）'
    return
  }

  try {
    if (editingItem.value) {
      const response = await $fetch('/api/scaffold-info-update', {
        method: 'POST',
        body: {
          id: editingItem.value.id,
          name: formDialog.name,
          type: formDialog.type,
          unit: formDialog.unit,
          formula: formDialog.formula,
          price: Number(formDialog.price),
          remark: formDialog.remark
        }
      }) as any
      if (response.success) {
        showFormDialog.value = false
        fetchScaffoldList()
      } else {
        formError.value = response.message || '保存失败'
      }
    } else {
      const response = await $fetch('/api/scaffold-info', {
        method: 'POST',
        body: {
          name: formDialog.name,
          type: formDialog.type,
          unit: formDialog.unit,
          formula: formDialog.formula,
          price: Number(formDialog.price),
          remark: formDialog.remark
        }
      }) as any
      if (response.success) {
        showFormDialog.value = false
        fetchScaffoldList()
      } else {
        formError.value = response.message || '添加失败'
      }
    }
  } catch (error: any) {
    formError.value = error.message || '操作失败'
  }
}

function openDeleteDialog(item: ScaffoldInfo) {
  deletingItem.value = item
  showDeleteDialog.value = true
}

async function confirmDelete() {
  if (!deletingItem.value) return

  try {
    const response = await $fetch('/api/scaffold-info-delete', {
      method: 'POST',
      body: { id: deletingItem.value.id }
    }) as any
    if (response.success) {
      showDeleteDialog.value = false
      fetchScaffoldList()
    } else {
      showTip(response.message || '删除失败', '错误')
    }
  } catch (error: any) {
    showTip(error.message || '删除失败', '错误')
  }
}

async function fetchScaffoldList() {
  try {
    const response = await $fetch('/api/scaffold-info') as any
    if (response.success) {
      scaffoldList.value = response.data
    }
  } catch (error) {
    console.error('获取脚手架列表失败:', error)
  }
}

onMounted(() => {
  fetchScaffoldList()
})
</script>
