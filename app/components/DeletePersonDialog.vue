<template>
  <Dialog :open="open" @update:open="onOpenChange">
    <DialogContent class="sm:max-w-[400px]">
      <DialogHeader>
        <DialogTitle>确认删除</DialogTitle>
        <DialogDescription>
          确定要删除人员 <span class="font-semibold text-red-600">{{ person?.name }}</span> 吗？
          <br />
          <span class="text-sm text-gray-500 mt-2 block">此操作不可恢复</span>
        </DialogDescription>
      </DialogHeader>
      
      <div v-if="error" class="text-red-500 text-sm">{{ error }}</div>
      
      <DialogFooter>
        <Button variant="outline" @click="onOpenChange(false)" :disabled="submitting">取消</Button>
        <Button 
          @click="handleDelete" 
          :disabled="submitting" 
          class="bg-red-600 hover:bg-red-700 text-white"
        >
          {{ submitting ? '删除中...' : '确认删除' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'

interface Person {
  id: number
  name: string
}

const props = defineProps<{
  open: boolean
  person: Person | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  success: []
}>()

const error = ref('')
const submitting = ref(false)

function onOpenChange(value: boolean) {
  if (!value) {
    error.value = ''
  }
  emit('update:open', value)
}

async function handleDelete() {
  if (!props.person) return
  
  error.value = ''
  submitting.value = true
  
  try {
    const response = await $fetch('/api/person-delete', {
      method: 'POST',
      body: {
        id: props.person.id
      }
    }) as any
    
    if (response.success) {
      emit('success')
      onOpenChange(false)
    } else {
      error.value = response.message || '删除失败'
    }
  } catch (err: any) {
    error.value = err.message || '删除失败'
  } finally {
    submitting.value = false
  }
}
</script>
