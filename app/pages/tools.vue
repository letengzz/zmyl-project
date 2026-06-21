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
import { ref, computed } from 'vue'
import { Banknote, GitCompare, Copy, Calculator, ArrowRightLeft } from '@lucide/vue'

const tabs = [
  { id: 'rmb', label: '人民币转大写', icon: Banknote },
  { id: 'compare', label: '内容对比', icon: GitCompare },
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
