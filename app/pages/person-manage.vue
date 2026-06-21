<template>
  <div class="p-6 min-h-screen bg-gray-50">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-3xl font-bold">人员管理</h1>
      <div class="flex gap-2">
        <Button @click="showAddDialog = true" size="sm" class="bg-primary text-white">
          <Plus class="w-4 h-4 mr-1" />
          新增
        </Button>
        <Button @click="showExportDialog = true" variant="outline" size="sm">
          <Download class="w-4 h-4 mr-1" />
          导出
        </Button>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow p-6">
      <!-- 过滤查询区域 -->
      <div class="flex items-center gap-3 flex-wrap mb-6 p-4 bg-gray-50 rounded-lg">
        <div class="flex items-center gap-2">
          <Label class="text-sm whitespace-nowrap">关键词</Label>
          <Input 
            v-model="filters.keyword" 
            placeholder="姓名/身份证/电话" 
            class="w-48 h-9 text-sm"
            @input="debounceSearch"
          />
        </div>
        <div class="flex items-center gap-2">
          <Label class="text-sm whitespace-nowrap">位置</Label>
          <Select v-model="filters.location">
            <SelectTrigger class="w-28 h-9 text-sm">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="1">一期</SelectItem>
              <SelectItem value="2">二期</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="flex items-center gap-2">
          <Label class="text-sm whitespace-nowrap">职位</Label>
          <Select v-model="filters.position">
            <SelectTrigger class="w-28 h-9 text-sm">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem v-for="pos in positionOptions" :key="pos" :value="pos">{{ pos }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="flex items-center gap-2">
          <Label class="text-sm whitespace-nowrap">状态</Label>
          <Select v-model="filters.is_resign">
            <SelectTrigger class="w-28 h-9 text-sm">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="0">在职</SelectItem>
              <SelectItem value="1">已离职</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button @click="fetchPersons" size="sm" class="h-9 bg-primary text-white">
          <Search class="w-4 h-4 mr-1" />
          查询
        </Button>
        <Button @click="resetFilters" variant="outline" size="sm" class="h-9">
          重置
        </Button>
      </div>

      <!-- 人员表格 -->
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-100 border-b">
            <tr>
              <th class="px-4 py-3 text-left font-medium text-gray-700">姓名</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700">身份证</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700">电话</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700">职位</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700">位置</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700">入职时间</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700">状态</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700">考勤工资</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700">实际工资</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer select-none hover:text-primary" @click="toggleOrderSort">
                排序 {{ orderSortIcon }}
              </th>
              <th class="px-4 py-3 text-left font-medium text-gray-700">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr v-if="persons.length === 0">
              <td colspan="11" class="px-4 py-8 text-center text-gray-500">
                暂无数据
              </td>
            </tr>
            <tr v-for="person in persons" :key="person.id" class="hover:bg-gray-50">
              <td class="px-4 py-3">{{ person.name }}</td>
              <td class="px-4 py-3">{{ person.id_card }}</td>
              <td class="px-4 py-3">{{ person.phone }}</td>
              <td class="px-4 py-3">{{ person.position }}</td>
              <td class="px-4 py-3">
                <span :class="person.location === 1 ? 'text-blue-600' : 'text-green-600'">
                  {{ person.location === 1 ? '一期' : '二期' }}
                </span>
              </td>
              <td class="px-4 py-3">{{ formatDate(person.entry_time) }}</td>
              <td class="px-4 py-3">
                <span :class="person.is_resign === 1 ? 'text-red-600' : 'text-green-600'">
                  {{ person.is_resign === 1 ? '已离职' : '在职' }}
                </span>
              </td>
              <td class="px-4 py-3">{{ person.attendance_salary != null ? `¥${person.attendance_salary}` : '-' }}</td>
              <td class="px-4 py-3">{{ person.actual_salary != null ? `¥${person.actual_salary}` : '-' }}</td>
              <td class="px-4 py-3">
                <input
                  type="number"
                  :value="person.order ?? ''"
                  @change="updateOrder(person, $event)"
                  class="w-16 h-7 px-2 text-sm border border-gray-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="排序"
                />
              </td>
              <td class="px-4 py-3">
                <div class="flex gap-1">
                  <Button @click="showPersonDetail(person)" variant="ghost" size="sm" class="h-7 text-xs">
                    详情
                  </Button>
                  <Button @click="handleEdit(person)" variant="ghost" size="sm" class="h-7 text-xs text-blue-600 hover:text-blue-700">
                    编辑
                  </Button>
                  <Button @click="handleDelete(person)" variant="ghost" size="sm" class="h-7 text-xs text-red-600 hover:text-red-700">
                    删除
                  </Button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div class="flex items-center justify-between mt-6 pt-4 border-t">
        <div class="text-sm text-gray-600">
          共 {{ pagination.total }} 条记录，第 {{ pagination.page }} / {{ pagination.totalPages }} 页
        </div>
        <div class="flex items-center gap-2">
          <Button 
            @click="changePage(pagination.page - 1)" 
            :disabled="pagination.page <= 1" 
            variant="outline" 
            size="sm"
          >
            上一页
          </Button>
          <Button 
            @click="changePage(pagination.page + 1)" 
            :disabled="pagination.page >= pagination.totalPages" 
            variant="outline" 
            size="sm"
          >
            下一页
          </Button>
          <Select v-model="pageSize" @update:model-value="changePageSize">
            <SelectTrigger class="w-24 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="10">10条/页</SelectItem>
              <SelectItem :value="20">20条/页</SelectItem>
              <SelectItem :value="50">50条/页</SelectItem>
              <SelectItem :value="100">100条/页</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>

    <!-- 新增人员对话框 -->
    <AddPersonDialogNew 
      v-model:open="showAddDialog" 
      @success="handleAddSuccess" 
    />

    <!-- 编辑人员对话框 -->
    <EditPersonDialog 
      v-model:open="showEditDialog" 
      :person="editingPerson"
      @success="handleEditSuccess" 
    />

    <!-- 删除确认对话框 -->
    <DeletePersonDialog 
      v-model:open="showDeleteDialog" 
      :person="deletingPerson"
      @success="handleDeleteSuccess" 
    />

    <!-- 导出对话框 -->
    <ExportDialogNew v-model:open="showExportDialog" :persons="allPersons" />

    <!-- 人员详情对话框 -->
    <PersonDetailDialog v-model:open="showDetailDialog" :person="selectedPerson" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Search, Plus, Download } from '@lucide/vue'
import PersonDetailDialog from '~/components/PersonDetailDialog.vue'
import AddPersonDialogNew from '~/components/AddPersonDialogNew.vue'
import EditPersonDialog from '~/components/EditPersonDialog.vue'
import DeletePersonDialog from '~/components/DeletePersonDialog.vue'
import ExportDialogNew from '~/components/ExportDialogNew.vue'

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

const persons = ref<Person[]>([])
const allPersons = ref<Person[]>([])
const showDetailDialog = ref(false)
const selectedPerson = ref<Person | null>(null)
const showAddDialog = ref(false)
const showExportDialog = ref(false)
const showEditDialog = ref(false)
const editingPerson = ref<Person | null>(null)
const showDeleteDialog = ref(false)
const deletingPerson = ref<Person | null>(null)
const pageSize = ref(10)
const orderSort = ref<'asc' | 'desc' | null>(null) // null = 不排序, 'asc' = 升序, 'desc' = 降序

const orderSortIcon = computed(() => {
  if (orderSort.value === 'asc') return '↑'
  if (orderSort.value === 'desc') return '↓'
  return '↕'
})

function toggleOrderSort() {
  if (orderSort.value === null) {
    orderSort.value = 'asc'
  } else if (orderSort.value === 'asc') {
    orderSort.value = 'desc'
  } else {
    orderSort.value = null
  }
  fetchPersons()
}

const filters = reactive({
  keyword: '',
  location: 'all',
  position: 'all',
  is_resign: 'all'
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 0
})

const positionOptions = ['管理', '架工', '普工', '监护人', '资料员']

let searchTimer: NodeJS.Timeout | null = null

function debounceSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    pagination.page = 1
    fetchPersons()
  }, 500)
}

function resetFilters() {
  filters.keyword = ''
  filters.location = 'all'
  filters.position = 'all'
  filters.is_resign = 'all'
  pagination.page = 1
  fetchPersons()
}

function changePage(page: number) {
  pagination.page = page
  fetchPersons()
}

function changePageSize(size: any) {
  const sizeNum = Number(size)
  pagination.pageSize = sizeNum
  pageSize.value = sizeNum
  pagination.page = 1
  fetchPersons()
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

function showPersonDetail(person: Person) {
  selectedPerson.value = person
  showDetailDialog.value = true
}

function handleEdit(person: Person) {
  editingPerson.value = person
  showEditDialog.value = true
}

function handleDelete(person: Person) {
  deletingPerson.value = person
  showDeleteDialog.value = true
}

function handleAddSuccess() {
  fetchPersons()
  fetchAllPersons()
}

function handleEditSuccess() {
  fetchPersons()
  fetchAllPersons()
}

function handleDeleteSuccess() {
  fetchPersons()
  fetchAllPersons()
}

async function updateOrder(person: Person, event: Event) {
  const input = event.target as HTMLInputElement
  const value = input.value.trim() === '' ? null : Number(input.value)
  
  try {
    const response = await $fetch('/api/person-update', {
      method: 'POST',
      body: {
        id: person.id,
        order: value
      }
    }) as any
    
    if (response.success) {
      person.order = value
    } else {
      alert(response.message || '更新失败')
      fetchPersons()
    }
  } catch (error: any) {
    alert(error.message || '更新失败')
    fetchPersons()
  }
}

async function fetchPersons() {
  try {
    const params = new URLSearchParams({
      page: String(pagination.page),
      pageSize: String(pagination.pageSize)
    })
    
    if (filters.keyword) params.append('keyword', filters.keyword)
    if (filters.location && filters.location !== 'all') params.append('location', filters.location)
    if (filters.position && filters.position !== 'all') params.append('position', filters.position)
    if (filters.is_resign && filters.is_resign !== 'all') params.append('is_resign', filters.is_resign)
    if (orderSort.value) params.append('orderSort', orderSort.value)
    
    const response = await $fetch(`/api/person-list?${params}`) as any
    console.log('API response:', response)
    
    if (response.success) {
      persons.value = response.data
      Object.assign(pagination, response.pagination)
      console.log('Loaded persons:', response.data.length)
    } else {
      console.error('API error:', response.message)
    }
  } catch (error) {
    console.error('获取人员列表失败:', error)
  }
}

async function fetchAllPersons() {
  try {
    const response = await $fetch('/api/person-list?pageSize=10000') as any
    if (response.success) {
      allPersons.value = response.data
    }
  } catch (error) {
    console.error('获取所有人员失败:', error)
  }
}

onMounted(() => {
  fetchPersons()
  fetchAllPersons()
})
</script>
