<template>
  <div class="p-6 min-h-screen">
    <div class="mb-6">
      <h1 class="text-3xl font-bold">工具箱</h1>
    </div>

    <!-- 功能切换标签 -->
    <div class="flex gap-2 mb-6">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="activeTab = tab.id"
        class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
        :class="activeTab === tab.id
          ? 'bg-primary text-white shadow-sm'
          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'"
      >
        <component :is="tab.icon" class="w-4 h-4" />
        {{ tab.label }}
      </button>
    </div>

    <!-- 人民币转大写 -->
    <div v-if="activeTab === 'rmb'" class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 class="text-lg font-semibold mb-4 flex items-center gap-2">
        <Banknote class="w-5 h-5 text-primary" />
        人民币数字转大写金额
      </h2>
      
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- 输入区域 -->
        <div>
          <Label class="mb-2 block">输入数字金额</Label>
          <Input
            v-model="rmbInput"
            placeholder="例如：123456.78"
            class="text-lg h-12"
            @input="convertRmb"
          />
          <div class="mt-4 p-4 bg-gray-50 rounded-lg">
            <div class="text-sm text-gray-500 mb-1">原始数字</div>
            <div class="text-2xl font-mono font-bold text-gray-900">
              {{ rmbInput ? `¥${formatNumber(rmbInput)}` : '¥0.00' }}
            </div>
          </div>
        </div>

        <!-- 输出区域 -->
        <div>
          <Label class="mb-2 block">大写金额</Label>
          <div class="relative">
            <div class="min-h-[48px] p-3 bg-green-50 border border-green-200 rounded-lg text-lg font-medium text-green-800 break-all">
              {{ rmbResult || '请输入数字金额' }}
            </div>
            <button
              v-if="rmbResult"
              @click="copyToClipboard(rmbResult)"
              class="absolute top-2 right-2 p-2 rounded-md hover:bg-green-100 transition-colors"
              title="复制"
            >
              <Copy class="w-4 h-4 text-green-600" />
            </button>
          </div>
          <div class="mt-4 flex gap-2">
            <button
              v-for="example in rmbExamples"
              :key="example"
              @click="rmbInput = example; convertRmb()"
              class="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            >
              {{ example }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 内容对比 -->
    <div v-if="activeTab === 'compare'" class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 class="text-lg font-semibold mb-4 flex items-center gap-2">
        <GitCompare class="w-5 h-5 text-primary" />
        内容对比（按行比较）
      </h2>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <!-- 左侧输入 -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <Label>左侧内容</Label>
            <span class="text-xs text-gray-500">{{ leftLines.length }} 行</span>
          </div>
          <textarea
            v-model="leftContent"
            placeholder="每行一个内容..."
            class="w-full h-48 p-3 border border-gray-200 rounded-lg text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            @input="compareContent"
          ></textarea>
        </div>

        <!-- 右侧输入 -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <Label>右侧内容</Label>
            <span class="text-xs text-gray-500">{{ rightLines.length }} 行</span>
          </div>
          <textarea
            v-model="rightContent"
            placeholder="每行一个内容..."
            class="w-full h-48 p-3 border border-gray-200 rounded-lg text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            @input="compareContent"
          ></textarea>
        </div>
      </div>

      <!-- 对比结果 -->
      <div v-if="hasCompareResult" class="space-y-4">
        <!-- 统计 -->
        <div class="flex gap-4 p-4 bg-gray-50 rounded-lg">
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full bg-blue-500"></div>
            <span class="text-sm">相同：{{ compareResult.same.length }} 项</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full bg-orange-500"></div>
            <span class="text-sm">仅左侧：{{ compareResult.leftOnly.length }} 项</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full bg-purple-500"></div>
            <span class="text-sm">仅右侧：{{ compareResult.rightOnly.length }} 项</span>
          </div>
        </div>

        <!-- 结果详情 -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <!-- 相同项 -->
          <div class="border border-blue-200 rounded-lg overflow-hidden">
            <div class="bg-blue-50 px-4 py-2 border-b border-blue-200 flex items-center justify-between">
              <span class="text-sm font-medium text-blue-800">相同内容</span>
              <button
                v-if="compareResult.same.length > 0"
                @click="copyToClipboard(compareResult.same.join('\n'))"
                class="p-1 rounded hover:bg-blue-100 transition-colors"
                title="复制全部"
              >
                <Copy class="w-4 h-4 text-blue-600" />
              </button>
            </div>
            <div class="p-3 max-h-60 overflow-y-auto">
              <div v-if="compareResult.same.length === 0" class="text-gray-400 text-sm text-center py-4">
                无
              </div>
              <div
                v-for="(item, idx) in compareResult.same"
                :key="'same-' + idx"
                class="px-2 py-1 text-sm bg-blue-50 rounded mb-1 last:mb-0"
              >
                {{ item }}
              </div>
            </div>
          </div>

          <!-- 仅左侧 -->
          <div class="border border-orange-200 rounded-lg overflow-hidden">
            <div class="bg-orange-50 px-4 py-2 border-b border-orange-200 flex items-center justify-between">
              <span class="text-sm font-medium text-orange-800">仅左侧有</span>
              <button
                v-if="compareResult.leftOnly.length > 0"
                @click="copyToClipboard(compareResult.leftOnly.join('\n'))"
                class="p-1 rounded hover:bg-orange-100 transition-colors"
                title="复制全部"
              >
                <Copy class="w-4 h-4 text-orange-600" />
              </button>
            </div>
            <div class="p-3 max-h-60 overflow-y-auto">
              <div v-if="compareResult.leftOnly.length === 0" class="text-gray-400 text-sm text-center py-4">
                无
              </div>
              <div
                v-for="(item, idx) in compareResult.leftOnly"
                :key="'left-' + idx"
                class="px-2 py-1 text-sm bg-orange-50 rounded mb-1 last:mb-0"
              >
                {{ item }}
              </div>
            </div>
          </div>

          <!-- 仅右侧 -->
          <div class="border border-purple-200 rounded-lg overflow-hidden">
            <div class="bg-purple-50 px-4 py-2 border-b border-purple-200 flex items-center justify-between">
              <span class="text-sm font-medium text-purple-800">仅右侧有</span>
              <button
                v-if="compareResult.rightOnly.length > 0"
                @click="copyToClipboard(compareResult.rightOnly.join('\n'))"
                class="p-1 rounded hover:bg-purple-100 transition-colors"
                title="复制全部"
              >
                <Copy class="w-4 h-4 text-purple-600" />
              </button>
            </div>
            <div class="p-3 max-h-60 overflow-y-auto">
              <div v-if="compareResult.rightOnly.length === 0" class="text-gray-400 text-sm text-center py-4">
                无
              </div>
              <div
                v-for="(item, idx) in compareResult.rightOnly"
                :key="'right-' + idx"
                class="px-2 py-1 text-sm bg-purple-50 rounded mb-1 last:mb-0"
              >
                {{ item }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 笔记 -->
    <div v-if="activeTab === 'notes'" class="bg-white rounded-xl shadow-sm border border-gray-200 flex" style="height: calc(100vh - 200px); min-height: 500px;">
      <!-- 左侧列表 -->
      <div class="w-64 border-r border-gray-200 flex flex-col flex-shrink-0">
        <div class="p-3 border-b border-gray-100">
          <Button @click="createNote" class="w-full gap-1" size="sm">
            <Plus class="w-4 h-4" />
            新建笔记
          </Button>
        </div>
        <div class="flex-1 overflow-y-auto">
          <div
            v-for="note in notes"
            :key="note.id"
            @click="selectNote(note)"
            class="px-3 py-3 cursor-pointer border-b border-gray-50 transition-colors"
            :class="selectedNote?.id === note.id ? 'bg-blue-50 border-l-2 border-l-primary' : 'hover:bg-gray-50 border-l-2 border-l-transparent'"
          >
            <div class="text-sm font-medium text-gray-800 truncate">{{ note.title || '无标题' }}</div>
            <div class="text-xs text-gray-400 mt-1">{{ formatNoteDate(note.updated_at) }}</div>
          </div>
          <div v-if="notes.length === 0" class="p-6 text-center text-sm text-gray-400">
            暂无笔记，点击上方按钮创建
          </div>
        </div>
      </div>

      <!-- 右侧编辑区 -->
      <div class="flex-1 flex flex-col min-w-0" v-if="selectedNote">
        <!-- 工具栏 -->
        <div class="flex items-center gap-2 px-4 py-2 border-b border-gray-100">
          <Input
            v-model="editingTitle"
            placeholder="笔记标题"
            class="flex-1 border-none shadow-none text-base font-medium focus-visible:ring-0 px-0"
          />
          <Button
            @click="isPreview = !isPreview"
            variant="ghost"
            size="sm"
            :class="isPreview ? 'text-blue-600' : ''"
          >
            <Eye v-if="!isPreview" class="w-4 h-4" />
            <Edit3 v-else class="w-4 h-4" />
            {{ isPreview ? '编辑' : '预览' }}
          </Button>
          <Button @click="saveNote" size="sm" class="gap-1">
            <Save class="w-4 h-4" />
            保存
          </Button>
          <Button @click="deleteCurrentNote" variant="ghost" size="sm" class="text-red-500 hover:text-red-600">
            <Trash2 class="w-4 h-4" />
          </Button>
        </div>

        <!-- 编辑/预览区 -->
        <div class="flex-1 overflow-hidden" v-if="isPreview">
          <div
            class="prose prose-sm max-w-none p-6 overflow-y-auto h-full"
            v-html="renderedMarkdown"
          ></div>
        </div>
        <div v-else class="flex-1 flex flex-col min-h-0">
          <!-- Markdown 格式工具栏 -->
          <div class="flex items-center gap-0.5 px-4 py-1.5 border-b border-gray-100 bg-gray-50 flex-wrap">
            <button
              v-for="btn in formatButtons"
              :key="btn.label"
              @click="insertMarkdown(btn.before, btn.after, btn.placeholder)"
              class="p-1.5 rounded hover:bg-gray-200 transition-colors text-gray-600"
              :title="btn.label"
            >
              <component :is="btn.icon" class="w-3.5 h-3.5" />
            </button>
          </div>
          <textarea
            ref="textareaRef"
            v-model="editingContent"
            placeholder="支持 Markdown 格式..."
            class="flex-1 p-6 resize-none border-none focus:outline-none text-sm font-mono leading-relaxed"
            @keydown.tab.prevent="insertMarkdown('\t', '', '')"
          ></textarea>
        </div>
      </div>

      <!-- 未选中笔记时的提示 -->
      <div v-else class="flex-1 flex items-center justify-center text-gray-400">
        <div class="text-center">
          <StickyNote class="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>选择一个笔记 或 创建新笔记</p>
        </div>
      </div>
    </div>

    <!-- 复制提示 -->
    <div
      v-if="showCopyToast"
      class="fixed bottom-6 right-6 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg transition-all"
    >
      已复制到剪贴板
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { Banknote, GitCompare, Copy, StickyNote, Plus, Trash2, Edit3, Eye, Save, Bold, Italic, Strikethrough, Heading1, Heading2, List, ListOrdered, Quote, Code2, Link, Image, Table, Minus } from '@lucide/vue'
import { marked } from 'marked'

const tabs = [
  { id: 'rmb', label: '人民币转大写', icon: Banknote },
  { id: 'compare', label: '内容对比', icon: GitCompare },
  { id: 'notes', label: '笔记', icon: StickyNote },
]

const activeTab = ref('rmb')

// ==================== 人民币转大写 ====================
const rmbInput = ref('')
const rmbResult = ref('')
const rmbExamples = ['1234.56', '10000', '99999999.99', '0.01']

function formatNumber(num: string): string {
  const n = parseFloat(num)
  if (isNaN(n)) return '0.00'
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function convertRmb() {
  const num = rmbInput.value.trim()
  if (!num) {
    rmbResult.value = ''
    return
  }

  const n = parseFloat(num)
  if (isNaN(n) || n < 0) {
    rmbResult.value = '请输入有效的正数'
    return
  }

  rmbResult.value = numberToChinese(n)
}

function numberToChinese(num: number): string {
  const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
  const units = ['', '拾', '佰', '仟']
  const bigUnits = ['', '万', '亿', '兆']
  
  if (num === 0) return '零元整'

  // 分离整数和小数部分
  const str = num.toFixed(2)
  const parts = str.split('.')
  const intPart = parts[0] ?? '0'
  const decPart = parts[1] ?? '00'
  const intNum = parseInt(intPart)
  const jiao = parseInt(decPart[0] ?? '0')
  const fen = parseInt(decPart[1] ?? '0')

  let result = ''

  // 处理整数部分
  if (intNum > 0) {
    const intStr = intNum.toString()
    const len = intStr.length
    let zeroFlag = false

    for (let i = 0; i < len; i++) {
      const char = intStr[i] ?? '0'
      const digit = parseInt(char)
      const pos = len - 1 - i
      const unitIndex = pos % 4
      const bigUnitIndex = Math.floor(pos / 4)

      if (digit === 0) {
        zeroFlag = true
        if (unitIndex === 0 && bigUnitIndex > 0) {
          result += bigUnits[bigUnitIndex] ?? ''
          zeroFlag = false
        }
      } else {
        if (zeroFlag) {
          result += '零'
          zeroFlag = false
        }
        result += (digits[digit] ?? '') + (units[unitIndex] ?? '')
        if (unitIndex === 0 && bigUnitIndex > 0) {
          result += bigUnits[bigUnitIndex] ?? ''
        }
      }
    }
    result += '元'
  }

  // 处理小数部分
  if (jiao === 0 && fen === 0) {
    result += '整'
  } else {
    if (intNum > 0 && jiao === 0) {
      result += '零'
    }
    if (jiao > 0) {
      result += digits[jiao] + '角'
    }
    if (fen > 0) {
      result += digits[fen] + '分'
    }
  }

  return result || '零元整'
}

// ==================== 内容对比 ====================
const leftContent = ref('')
const rightContent = ref('')

const leftLines = computed(() => {
  return leftContent.value.split('\n').filter(line => line.trim() !== '')
})

const rightLines = computed(() => {
  return rightContent.value.split('\n').filter(line => line.trim() !== '')
})

const compareResult = ref({
  same: [] as string[],
  leftOnly: [] as string[],
  rightOnly: [] as string[]
})

const hasCompareResult = computed(() => {
  return leftContent.value.trim() !== '' || rightContent.value.trim() !== ''
})

function compareContent() {
  const leftSet = new Set(leftLines.value.map(l => l.trim()))
  const rightSet = new Set(rightLines.value.map(l => l.trim()))

  const same: string[] = []
  const leftOnly: string[] = []
  const rightOnly: string[] = []

  // 找相同和仅左侧
  leftSet.forEach(item => {
    if (rightSet.has(item)) {
      same.push(item)
    } else {
      leftOnly.push(item)
    }
  })

  // 找仅右侧
  rightSet.forEach(item => {
    if (!leftSet.has(item)) {
      rightOnly.push(item)
    }
  })

  compareResult.value = { same, leftOnly, rightOnly }
}

// ==================== 笔记 ====================
interface Note {
  id: number
  title: string
  content: string
  created_at: string
  updated_at: string
}

const notes = ref<Note[]>([])
const selectedNote = ref<Note | null>(null)
const editingTitle = ref('')
const editingContent = ref('')
const isPreview = ref(false)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

const formatButtons = [
  { label: '粗体', icon: Bold, before: '**', after: '**', placeholder: '粗体文字' },
  { label: '斜体', icon: Italic, before: '*', after: '*', placeholder: '斜体文字' },
  { label: '删除线', icon: Strikethrough, before: '~~', after: '~~', placeholder: '删除文字' },
  { label: '标题1', icon: Heading1, before: '# ', after: '', placeholder: '' },
  { label: '标题2', icon: Heading2, before: '## ', after: '', placeholder: '' },
  { label: '无序列表', icon: List, before: '- ', after: '', placeholder: '' },
  { label: '有序列表', icon: ListOrdered, before: '1. ', after: '', placeholder: '' },
  { label: '引用', icon: Quote, before: '> ', after: '', placeholder: '' },
  { label: '行内代码', icon: Code2, before: '`', after: '`', placeholder: 'code' },
  { label: '链接', icon: Link, before: '[', after: '](url)', placeholder: '链接文字' },
  { label: '图片', icon: Image, before: '![', after: '](url)', placeholder: '图片描述' },
  { label: '表格', icon: Table, before: '| 列1 | 列2 |\n| --- | --- |\n| ', after: ' |\n', placeholder: '内容' },
  { label: '分割线', icon: Minus, before: '\n---\n', after: '', placeholder: '' },
]

function insertMarkdown(before: string, after: string, placeholder: string) {
  const textarea = textareaRef.value
  if (!textarea) return

  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selectedText = editingContent.value.substring(start, end)

  const insertText = selectedText || placeholder
  const newText = before + insertText + after

  editingContent.value = editingContent.value.substring(0, start) + newText + editingContent.value.substring(end)

  nextTick(() => {
    const newCursorPos = start + before.length + insertText.length + after.length
    textarea.setSelectionRange(newCursorPos, newCursorPos)
    textarea.focus()
  })
}

const renderedMarkdown = computed(() => {
  if (!editingContent.value) return '<p class="text-gray-400">暂无内容</p>'
  return marked.parse(editingContent.value) as string
})

async function fetchNotes() {
  try {
    const res = await $fetch('/api/notes')
    if ((res as any).success) {
      notes.value = (res as any).data
    }
  } catch (e) {
    console.error('获取笔记失败:', e)
  }
}

async function createNote() {
  try {
    const res = await $fetch('/api/notes', {
      method: 'POST',
      body: { title: '新建笔记', content: '' }
    })
    if ((res as any).success) {
      await fetchNotes()
      // 选中新建的笔记
      const newId = (res as any).data.id
      const found = notes.value.find(n => n.id === newId)
      if (found) selectNote(found)
    }
  } catch (e) {
    console.error('创建笔记失败:', e)
  }
}

function selectNote(note: Note) {
  selectedNote.value = note
  editingTitle.value = note.title
  editingContent.value = note.content || ''
  isPreview.value = false
}

async function saveNote() {
  if (!selectedNote.value) return
  try {
    await $fetch(`/api/notes/${selectedNote.value.id}`, {
      method: 'PUT',
      body: { title: editingTitle.value, content: editingContent.value }
    })
    // 更新本地状态
    selectedNote.value.title = editingTitle.value
    selectedNote.value.content = editingContent.value
    selectedNote.value.updated_at = new Date().toISOString()
    // 重新排序列表
    const idx = notes.value.findIndex(n => n.id === selectedNote.value!.id)
    if (idx > -1) {
      notes.value[idx]!.title = editingTitle.value
      notes.value[idx]!.updated_at = selectedNote.value.updated_at
      notes.value.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    }
  } catch (e) {
    console.error('保存笔记失败:', e)
  }
}

async function deleteCurrentNote() {
  if (!selectedNote.value) return
  if (!confirm('确定删除这条笔记吗？')) return
  try {
    await $fetch(`/api/notes/${selectedNote.value.id}`, { method: 'DELETE' })
    const id = selectedNote.value.id
    selectedNote.value = null
    notes.value = notes.value.filter(n => n.id !== id)
  } catch (e) {
    console.error('删除笔记失败:', e)
  }
}

function formatNoteDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 86400000) {
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  if (diff < 604800000) {
    const days = ['日', '一', '二', '三', '四', '五', '六']
    return '周' + days[d.getDay()]
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 初始化加载笔记
onMounted(() => {
  if (activeTab.value === 'notes') fetchNotes()
})
watch(activeTab, (val) => {
  if (val === 'notes') fetchNotes()
})

// ==================== 通用功能 ====================
const showCopyToast = ref(false)

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    showCopyToast.value = true
    setTimeout(() => {
      showCopyToast.value = false
    }, 2000)
  } catch (err) {
    console.error('复制失败:', err)
  }
}
</script>
