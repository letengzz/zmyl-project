<template>
  <Dialog :open="open" @update:open="onOpenChange">
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>确认删除</DialogTitle>
        <DialogDescription>
          此操作将删除人员 <strong class="text-red-600">{{ personName }}</strong>。
          <br />
          删除后可在新增对话框中恢复。
        </DialogDescription>
      </DialogHeader>
      <div class="flex justify-end gap-3 mt-4">
        <Button variant="outline" @click="handleCancel">取消</Button>
        <Button class="bg-red-600 hover:bg-red-700 text-white" @click="handleConfirm">确定删除</Button>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'

const props = defineProps<{
  open: boolean
  personId: number | null
  personName: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: [id: number]
}>()

function onOpenChange(value: boolean) {
  emit('update:open', value)
}

function handleCancel() {
  emit('update:open', false)
}

function handleConfirm() {
  if (props.personId !== null) {
    emit('confirm', props.personId)
  }
  emit('update:open', false)
}
</script>
