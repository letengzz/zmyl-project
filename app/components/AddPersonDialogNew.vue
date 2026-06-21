<template>
  <Dialog :open="open" @update:open="onOpenChange">
    <DialogContent class="sm:max-w-[700px]">
      <DialogHeader>
        <DialogTitle>新增人员</DialogTitle>
      </DialogHeader>
      <div class="space-y-4">
        <div class="grid grid-cols-3 gap-4">
          <div class="space-y-2">
            <Label>姓名 <span class="text-red-500">*</span></Label>
            <Input v-model="form.name" placeholder="请输入姓名" />
          </div>
          <div class="space-y-2">
            <Label>身份证号 <span class="text-red-500">*</span></Label>
            <Input v-model="form.id_card" placeholder="请输入身份证号" />
          </div>
          <div class="space-y-2">
            <Label>电话</Label>
            <Input v-model="form.phone" placeholder="请输入电话" />
          </div>
          <div class="space-y-2">
            <Label>职位</Label>
            <Select v-model="form.position">
              <SelectTrigger>
                <SelectValue placeholder="选择职位" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="pos in positionOptions" :key="pos" :value="pos">{{ pos }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label>所属期 <span class="text-red-500">*</span></Label>
            <Select v-model="form.location">
              <SelectTrigger>
                <SelectValue placeholder="选择所属期" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="1">一期</SelectItem>
                <SelectItem :value="2">二期</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div></div>
          <div class="space-y-2">
            <Label>入职时间</Label>
            <Input type="date" v-model="form.entry_time" />
          </div>
          <div class="space-y-2">
            <Label>离场时间</Label>
            <Input type="date" v-model="form.departure_time" />
          </div>
          <div></div>
          <div class="space-y-2 col-span-3">
            <Label>地址</Label>
            <Input v-model="form.address" placeholder="请输入地址" />
          </div>
          <div class="space-y-2">
            <Label>紧急联系人</Label>
            <Input v-model="form.emer_person" placeholder="请输入紧急联系人" />
          </div>
          <div class="space-y-2">
            <Label>紧急联系人电话</Label>
            <Input v-model="form.emer_phone" placeholder="请输入紧急联系人电话" />
          </div>
          <div></div>
          <div class="space-y-2">
            <Label>银行卡号</Label>
            <Input v-model="form.bank_num" placeholder="请输入银行卡号" />
          </div>
          <div class="space-y-2">
            <Label>开户行名称</Label>
            <Input v-model="form.bank_name" placeholder="请输入开户行名称" />
          </div>
          <div class="space-y-2">
            <Label>银行行号</Label>
            <Input v-model="form.bank_code" placeholder="请输入银行行号" />
          </div>
          <div class="space-y-2">
            <Label>考勤工资</Label>
            <Input v-model="form.attendance_salary" type="number" placeholder="请输入考勤工资" />
          </div>
          <div class="space-y-2">
            <Label>实际工资</Label>
            <Input v-model="form.actual_salary" type="number" placeholder="请输入实际工资" />
          </div>
        </div>
        
        <div v-if="error" class="text-red-500 text-sm">{{ error }}</div>
        
        <DialogFooter>
          <Button variant="outline" @click="onOpenChange(false)">取消</Button>
          <Button @click="handleSubmit" :disabled="submitting" class="bg-primary text-white">
            {{ submitting ? '提交中...' : '确定' }}
          </Button>
        </DialogFooter>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  success: []
}>()

const positionOptions = ['管理', '架工', '普工', '监护人', '资料员']

const form = reactive({
  name: '',
  id_card: '',
  phone: '',
  position: '',
  location: null as number | null,
  address: '',
  entry_time: '',
  departure_time: '',
  emer_person: '',
  emer_phone: '',
  bank_num: '',
  bank_name: '',
  bank_code: '',
  attendance_salary: '' as string | number,
  actual_salary: '' as string | number
})

const error = ref('')
const submitting = ref(false)

function resetForm() {
  form.name = ''
  form.id_card = ''
  form.phone = ''
  form.position = ''
  form.location = null
  form.address = ''
  form.entry_time = ''
  form.departure_time = ''
  form.emer_person = ''
  form.emer_phone = ''
  form.bank_num = ''
  form.bank_name = ''
  form.bank_code = ''
  error.value = ''
}

function onOpenChange(value: boolean) {
  if (!value) {
    resetForm()
  }
  emit('update:open', value)
}

async function handleSubmit() {
  error.value = ''
  
  if (!form.name.trim()) {
    error.value = '请输入姓名'
    return
  }
  if (!form.id_card.trim()) {
    error.value = '请输入身份证号'
    return
  }
  if (!form.location) {
    error.value = '请选择所属期'
    return
  }
  
  submitting.value = true
  
  try {
    const response = await $fetch('/api/person-add', {
      method: 'POST',
      body: {
        name: form.name.trim(),
        id_card: form.id_card.trim(),
        phone: form.phone.trim(),
        position: form.position,
        location: form.location,
        address: form.address.trim(),
        entry_time: form.entry_time || null,
        departure_time: form.departure_time || null,
        emer_person: form.emer_person.trim(),
        emer_phone: form.emer_phone.trim(),
        bank_num: form.bank_num.trim(),
        bank_name: form.bank_name.trim(),
        bank_code: form.bank_code.trim(),
        attendance_salary: form.attendance_salary,
        actual_salary: form.actual_salary
      }
    }) as any
    
    if (response.success) {
      emit('success')
      onOpenChange(false)
    } else {
      error.value = response.message || '添加失败'
    }
  } catch (err: any) {
    error.value = err.message || '添加失败'
  } finally {
    submitting.value = false
  }
}
</script>
