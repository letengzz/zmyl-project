<template>
  <div class="mb-6">
    <h3 class="text-lg font-semibold mb-3 text-gray-700 text-center">{{ position }} ({{ localPersons.length }}人)</h3>
    <draggable
      v-model="localPersons"
      item-key="id"
      class="flex flex-wrap gap-2 justify-center min-h-[36px]"
      ghost-class="opacity-30"
      chosen-class="scale-105"
      animation="200"
      :group="position"
      @start="isDragging = true"
      @end="handleDragEnd"
      @add="handleAdd"
      @move="handleMove"
    >
      <template #item="{ element: person }">
        <div class="relative group">
          <div 
            class="px-4 py-2 rounded-full font-medium transition-colors bg-primary/10 text-primary hover:bg-primary/20 cursor-move"
            @click="showPersonDetail(person)"
          >
            {{ person.name }}
          </div>
          <Button
            @click.stop="$emit('delete', person.id, props.location)"
            variant="ghost"
            size="sm"
            class="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 h-5 w-5 p-0 text-red-600 hover:text-red-700 hover:bg-red-100 rounded-full transition-opacity"
          >
            <X class="w-3 h-3" />
          </Button>
        </div>
      </template>
    </draggable>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import draggable from 'vuedraggable'
import { X } from '@lucide/vue'

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

const props = defineProps<{
  position: string
  persons: Person[]
  location: number
  duplicateIds?: Set<number>
}>()

const emit = defineEmits<{
  delete: [id: number, location: number]
  reorder: [position: string, location: number, persons: Person[]]
  detail: [person: Person]
  move: [personId: number, toLocation: number, insertIndex: number, targetPosition: string]
}>()

const localPersons = ref<Person[]>([...props.persons])
const isDragging = ref(false)
const preDragIds = ref<Set<number>>(new Set())

// 当 props.persons 变化时同步到本地
// 拖拽期间不重置，防止 watcher 撤销拖拽效果
watch(
  () => props.persons,
  (newVal) => {
    if (isDragging.value) return

    const newIds = newVal.map(p => p.id).join(',')
    const localIds = localPersons.value.map(p => p.id).join(',')
    if (newIds !== localIds) {
      localPersons.value = [...newVal]
    }
  },
  { immediate: true, deep: true }
)

function handleDragEnd(event: any) {
  if (event.to === event.from) {
    // 同列表拖拽：发送排序后的完整人员列表给父组件
    emit('reorder', props.position, props.location, [...localPersons.value])
    nextTick(() => {
      isDragging.value = false
    })
  }
  // 跨组拖拽由 handleAdd 处理
}

// 拖拽过程中的实时检查，返回 false 阻止拖拽
function handleMove(evt: any): boolean {
  // 不再在组件层检查重复，由父组件根据实际列表状态处理
  return true
}

function handleAdd() {
  // @add 只在跨组拖拽时触发，所有新增人员都需要通知父组件
  const propsIds = new Set(props.persons.map(p => p.id))
  const newPersons = localPersons.value.filter(p => !propsIds.has(p.id))

  for (const person of newPersons) {
    // 找到该人员在 localPersons 中的位置
    const insertIndex = localPersons.value.findIndex(p => p.id === person.id)
    emit('move', person.id, props.location, insertIndex, props.position)
  }

  // 跨列表拖拽后，等待父组件更新 props.persons，然后重置 isDragging
  nextTick(() => {
    isDragging.value = false
  })
}

function showPersonDetail(person: Person) {
  emit('detail', person)
}

// 在拖拽开始前保存当前人员 ID 快照
// 使用 watch 监听 localPersons 变化，在拖拽开始时记录
watch(localPersons, () => {
  if (isDragging.value && preDragIds.value.size === 0) {
    // 这是拖拽导致的第一次变化，但此时已经变了
    // 所以我们在 @start 中保存
  }
}, { deep: true })

// 监听 isDragging，在开始拖拽时保存快照
watch(isDragging, (val) => {
  if (val) {
    preDragIds.value = new Set(localPersons.value.map(p => p.id))
  } else {
    preDragIds.value = new Set()
  }
})
</script>
