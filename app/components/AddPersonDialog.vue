<template>
  <Dialog :open="open" @update:open="onOpenChange">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>恢复已删除人员到{{ location === 1 ? '一期' : '二期' }}</DialogTitle>
      </DialogHeader>
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-2">
            <Label>筛选职位</Label>
            <div class="flex flex-wrap gap-1">
              <Button
                v-for="pos in positionOptions"
                :key="pos"
                :variant="selectedPosition === pos ? 'default' : 'outline'"
                size="sm"
                @click="selectedPosition = selectedPosition === pos ? '' : pos"
              >
                {{ pos || '全部' }}
              </Button>
            </div>
          </div>
          <div class="space-y-2">
            <Label>搜索姓名</Label>
            <Input v-model="searchName" placeholder="输入姓名搜索..." />
          </div>
        </div>
        
        <div v-if="filteredPersons.length > 0" class="space-y-2">
          <Label>已删除人员（共 {{ filteredPersons.length }} 人）</Label>
          <div class="max-h-[300px] overflow-y-auto border rounded-md p-2 space-y-1">
            <div
              v-for="person in filteredPersons"
              :key="person.id"
              class="flex items-center justify-between p-2 hover:bg-gray-100 rounded cursor-pointer"
              @click="addPerson(person)"
            >
              <div>
                <div class="font-medium">{{ person.name }}</div>
                <div class="text-sm text-gray-500">{{ person.position }} · {{ person.phone }}</div>
              </div>
              <Button size="sm" variant="outline">恢复</Button>
            </div>
          </div>
        </div>
        
        <div v-else class="text-center py-8 text-gray-500">
          没有已删除的人员可恢复
        </div>
        
        <DialogFooter>
          <Button variant="outline" @click="onOpenChange(false)">关闭</Button>
        </DialogFooter>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

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
  location: number
  deletedPersons?: Person[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  success: []
  add: [personId: number, location: number]
}>()

const selectedPosition = ref('')
const searchName = ref('')
const positionOptions = ['', '管理', '架工', '普工', '监护人', '资料员']

const filteredPersons = computed(() => {
  let result = props.deletedPersons || []
  
  // 按职位筛选
  if (selectedPosition.value) {
    result = result.filter(p => p.position === selectedPosition.value)
  }
  
  // 按姓名搜索
  if (searchName.value.trim()) {
    const keyword = searchName.value.trim().toLowerCase()
    result = result.filter(p => p.name.toLowerCase().includes(keyword))
  }
  
  return result
})

function addPerson(person: Person) {
  emit('add', person.id, props.location)
}

function onOpenChange(value: boolean) {
  if (!value) {
    selectedPosition.value = ''
    searchName.value = ''
  }
  emit('update:open', value)
}
</script>
