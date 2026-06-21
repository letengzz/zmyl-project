<template>
  <div class="space-y-6 p-6 min-h-screen bg-gray-50">
    <h1 class="text-3xl font-bold">脚手架管理</h1>

    <!-- 功能切换标签 -->
    <div class="flex gap-2">
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

    <!-- Tab 1: 架设委托 -->
    <div v-if="activeTab === 'commission'">
      <div class="bg-white rounded-xl border border-gray-200 p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-700">架设委托记录</h2>
          <div class="flex gap-2">
            <Input 
              v-model="commissionSearch" 
              placeholder="搜索编号或单位..." 
              class="w-48"
              @input="debouncedFetchCommission"
            />
            <Button @click="openCommissionDialog" class="bg-primary text-white">
              <Plus class="w-4 h-4 mr-1" />
              新增委托
            </Button>
          </div>
        </div>
        
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-100 border-b">
              <tr>
                <th class="px-4 py-3 text-left font-medium text-gray-700">委托单编号</th>
                <th class="px-4 py-3 text-left font-medium text-gray-700">电子版</th>
                <th class="px-4 py-3 text-left font-medium text-gray-700">审批</th>
                <th class="px-4 py-3 text-left font-medium text-gray-700">搭设</th>
                <th class="px-4 py-3 text-left font-medium text-gray-700">申请单位</th>
                <th class="px-4 py-3 text-left font-medium text-gray-700">录入时间</th>
                <th class="px-4 py-3 text-left font-medium text-gray-700">照片</th>
                <th class="px-4 py-3 text-left font-medium text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr v-if="commissionList.length === 0">
                <td colspan="8" class="px-4 py-8 text-center text-gray-500">暂无数据</td>
              </tr>
              <tr v-for="item in commissionList" :key="item.id" class="hover:bg-gray-50">
                <td class="px-4 py-3 font-medium">{{ item.commission_no }}</td>
                <td class="px-4 py-3">
                  <button
                    type="button"
                    :class="[
                      'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
                      item.has_electronic ? 'bg-green-500' : 'bg-gray-300'
                    ]"
                    @click="toggleElectronic(item)"
                  >
                    <span
                      :class="[
                        'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200',
                        item.has_electronic ? 'translate-x-4' : 'translate-x-0'
                      ]"
                    />
                  </button>
                </td>
                <td class="px-4 py-3">
                  <button
                    type="button"
                    :class="[
                      'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
                      item.is_approved ? 'bg-green-500' : 'bg-gray-300'
                    ]"
                    @click="toggleApproved(item)"
                  >
                    <span
                      :class="[
                        'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200',
                        item.is_approved ? 'translate-x-4' : 'translate-x-0'
                      ]"
                    />
                  </button>
                </td>
                <td class="px-4 py-3">
                  <button
                    type="button"
                    :class="[
                      'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
                      item.is_erected ? 'bg-green-500' : 'bg-gray-300'
                    ]"
                    @click="toggleErected(item)"
                  >
                    <span
                      :class="[
                        'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200',
                        item.is_erected ? 'translate-x-4' : 'translate-x-0'
                      ]"
                    />
                  </button>
                </td>
                <td class="px-4 py-3">{{ item.applicant_unit }}</td>
                <td class="px-4 py-3 text-gray-500">{{ formatDateTime(item.entry_time) }}</td>
                <td class="px-4 py-3">
                  <div v-if="item.photo_urls && item.photo_urls.length > 0" class="flex gap-1">
                    <div 
                      v-for="(url, idx) in item.photo_urls" 
                      :key="idx" 
                      class="w-10 h-10 rounded border overflow-hidden cursor-pointer"
                      @click="openImagePreview(url)"
                    >
                      <img :src="url" :alt="`照片${idx + 1}`" class="w-full h-full object-cover" />
                    </div>
                  </div>
                  <span v-else class="text-gray-400">无</span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex gap-1">
                    <Button 
                      @click="openEditCommissionDialog(item)" 
                      variant="outline" 
                      size="sm" 
                      class="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Pencil class="w-3 h-3 mr-1" />
                      编辑
                    </Button>
                    <Button 
                      @click="openCommissionDeleteDialog(item)" 
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
      </div>
    </div>

    <!-- Tab 2: 价格计算 -->
    <div v-if="activeTab === 'calc'">
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
          <div v-if="showField('长度')" class="space-y-2">
            <Label>长度 (m)</Label>
            <Input type="number" v-model="calcForm.length" placeholder="输入长度" min="0" step="0.1" />
          </div>
          <div v-if="showField('宽度')" class="space-y-2">
            <Label>宽度 (m)</Label>
            <Input type="number" v-model="calcForm.width" placeholder="输入宽度" min="0" step="0.1" />
          </div>
          <div v-if="showField('高度')" class="space-y-2">
            <Label>高度 (m)</Label>
            <Input type="number" v-model="calcForm.height" placeholder="输入高度" min="0" step="0.1" />
          </div>
          <div v-if="showField('周长')" class="space-y-2">
            <Label>周长 (m)</Label>
            <Input type="number" v-model="calcForm.perimeter" placeholder="输入周长" min="0" step="0.1" />
          </div>
          <div v-if="showField('斜道长度')" class="space-y-2">
            <Label>斜道长度 (m)</Label>
            <Input type="number" v-model="calcForm.rampLength" placeholder="输入斜道长度" min="0" step="0.1" />
          </div>
          <div v-if="showField('斜道宽度')" class="space-y-2">
            <Label>斜道宽度 (m)</Label>
            <Input type="number" v-model="calcForm.rampWidth" placeholder="输入斜道宽度" min="0" step="0.1" />
          </div>
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
      <div v-if="result" class="bg-white rounded-xl border border-gray-200 p-6 mt-6">
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
      <div class="bg-white rounded-xl border border-gray-200 p-6 mt-6">
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
    </div>

    <!-- Tab 3: 架设单位 -->
    <div v-if="activeTab === 'unit'">
      <div class="bg-white rounded-xl border border-gray-200 p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-700">架设单位管理</h2>
          <div class="flex gap-2">
            <Input 
              v-model="newUnitName" 
              placeholder="输入单位名称..." 
              class="w-48"
              @keyup.enter="addUnit"
            />
            <Button @click="addUnit" class="bg-primary text-white">
              <Plus class="w-4 h-4 mr-1" />
              添加单位
            </Button>
          </div>
        </div>
        
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-100 border-b">
              <tr>
                <th class="px-4 py-3 text-left font-medium text-gray-700">单位名称</th>
                <th class="px-4 py-3 text-center font-medium text-gray-700">委托数量</th>
                <th class="px-4 py-3 text-center font-medium text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="unitList.length === 0">
                <td colspan="3" class="px-4 py-8 text-center text-gray-500">暂无单位，请先添加</td>
              </tr>
              <tr v-for="unit in unitList" :key="unit.id" class="hover:bg-gray-50">
                <td class="px-4 py-3 font-medium">{{ unit.name }}</td>
                <td class="px-4 py-3 text-center">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {{ unit.commission_count }}
                  </span>
                </td>
                <td class="px-4 py-3 text-center">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    class="text-red-500 hover:text-red-700 hover:bg-red-50"
                    @click="deleteUnit(unit)"
                  >
                    <Trash2 class="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 脚手架 添加/编辑 对话框 -->
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

    <!-- 脚手架 删除确认对话框 -->
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

    <!-- 架设委托 新增对话框 -->
    <Dialog v-model:open="showCommissionDialog">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{{ editingCommission ? '编辑架设委托' : '新增架设委托' }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <Label>委托单编号 *</Label>
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-600 whitespace-nowrap">JSWT</span>
              <Input 
                type="date" 
                v-model="commissionForm.commission_date" 
                class="w-40"
              />
              <Input 
                v-model="commissionForm.commission_seq" 
                placeholder="序号" 
                class="w-24"
              />
            </div>
            <p class="text-xs text-gray-500">生成编号：<span class="font-mono font-medium text-primary">{{ generatedCommissionNo }}</span></p>
          </div>
          <div class="grid grid-cols-3 gap-4">
            <div class="space-y-2">
              <Label>是否存在电子版</Label>
              <Select v-model="commissionForm.has_electronic">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">否</SelectItem>
                  <SelectItem value="1">是</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-2">
              <Label>是否审批</Label>
              <Select v-model="commissionForm.is_approved">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">否</SelectItem>
                  <SelectItem value="1">是</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-2">
              <Label>是否搭设</Label>
              <Select v-model="commissionForm.is_erected">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">否</SelectItem>
                  <SelectItem value="1">是</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div class="space-y-2">
            <Label>申请单位 *</Label>
            <Select v-model="commissionForm.applicant_unit">
              <SelectTrigger>
                <SelectValue placeholder="选择架设单位" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem 
                  v-for="unit in unitList" 
                  :key="unit.id" 
                  :value="unit.name"
                >
                  {{ unit.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label>录入时间</Label>
            <Input type="datetime-local" v-model="commissionForm.entry_time" />
          </div>
          <div class="space-y-2">
            <Label>上传照片</Label>
            <div 
              class="border-2 border-dashed rounded-lg p-4 transition-colors"
              :class="isDragging ? 'border-primary bg-blue-50' : 'border-gray-300'"
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="handleDrop"
            >
              <input 
                type="file" 
                ref="fileInputRef"
                accept="image/*" 
                multiple 
                class="hidden" 
                @change="handleFileSelect"
              />
              <div class="text-center">
                <button 
                  @click="triggerFileInput"
                  class="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
                >
                  <UploadIcon class="w-4 h-4 inline mr-2" />
                  选择图片
                </button>
                <p class="text-xs text-gray-500 mt-2">支持多张图片，可拖拽上传</p>
              </div>
              
              <!-- 图片预览 -->
              <div v-if="uploadPreviews.length > 0" class="mt-4 flex flex-wrap gap-2">
                <div 
                  v-for="(preview, idx) in uploadPreviews" 
                  :key="idx" 
                  class="relative w-16 h-16"
                >
                  <img 
                    :src="preview.localUrl || preview.url" 
                    :alt="`预览${idx + 1}`" 
                    class="w-16 h-16 object-cover rounded border cursor-pointer"
                    @click="openImagePreview(preview.localUrl || preview.url)"
                  />
                  <button 
                    @click="removePreview(idx)"
                    class="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] leading-none hover:bg-red-600 z-10"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div v-if="commissionError" class="text-sm text-red-600">{{ commissionError }}</div>
        </div>
        <DialogFooter>
          <Button @click="showCommissionDialog = false" variant="outline">取消</Button>
          <Button @click="saveCommission" class="bg-primary text-white" :disabled="commissionSaving">
            {{ commissionSaving ? '保存中...' : '保存' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 架设委托 删除确认对话框 -->
    <Dialog v-model:open="showCommissionDeleteDialog">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>确认删除</DialogTitle>
        </DialogHeader>
        <div class="py-4">
          <p>确定要删除委托单 <strong>{{ deletingCommission?.commission_no }}</strong> 吗？</p>
          <p class="text-sm text-gray-500 mt-2">此操作不可撤销。</p>
        </div>
        <DialogFooter>
          <Button @click="showCommissionDeleteDialog = false" variant="outline">取消</Button>
          <Button @click="confirmCommissionDelete" class="bg-red-600 text-white hover:bg-red-700">删除</Button>
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

    <!-- 图片放大预览 Lightbox -->
    <Teleport to="body">
      <div 
        v-if="showLightbox" 
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80"
        @click="showLightbox = false"
      >
        <button 
          class="absolute top-4 right-4 text-white text-3xl hover:text-gray-300 z-10"
          @click="showLightbox = false"
        >
          ×
        </button>
        <img 
          :src="lightboxImage" 
          class="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
          @click.stop
        />
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { Plus, Calculator, ClipboardList, Upload as UploadIcon, Building2, Trash2, Pencil } from '@lucide/vue'
import { ref, reactive, computed, onMounted } from 'vue'

// ==================== Tab 切换 ====================
const tabs = [
  { id: 'commission', label: '架设委托', icon: ClipboardList },
  { id: 'calc', label: '价格计算', icon: Calculator },
  { id: 'unit', label: '架设单位', icon: Building2 },
]
const activeTab = ref('commission')

// ==================== 价格计算相关 ====================
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

const selectedFormula = computed(() => {
  if (!calcForm.scaffoldId) return ''
  const scaffold = scaffoldList.value.find(s => s.id === Number(calcForm.scaffoldId))
  return scaffold?.formula || ''
})

function showField(fieldName: string): boolean {
  const formula = selectedFormula.value.toLowerCase()
  if (!formula) return false
  return formula.includes(fieldName)
}

const showFormDialog = ref(false)
const showDeleteDialog = ref(false)
const editingItem = ref<ScaffoldInfo | null>(null)
const deletingItem = ref<ScaffoldInfo | null>(null)
const formError = ref('')

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

// ==================== 架设委托相关 ====================
interface CommissionItem {
  id: number
  commission_no: string
  has_electronic: number
  is_approved: number
  is_erected: number
  applicant_unit: string
  entry_time: string
  photo_urls: string[]
}

interface UploadPreview {
  localUrl: string
  url: string
  file?: File
  uploading: boolean
  uploaded: boolean
}

const commissionList = ref<CommissionItem[]>([])
const commissionSearch = ref('')
const showCommissionDialog = ref(false)
const showCommissionDeleteDialog = ref(false)
const deletingCommission = ref<CommissionItem | null>(null)
const editingCommission = ref<CommissionItem | null>(null)
const commissionError = ref('')
const commissionSaving = ref(false)

const commissionForm = reactive({
  commission_date: '',
  commission_seq: '',
  has_electronic: '0',
  is_approved: '0',
  is_erected: '0',
  applicant_unit: '',
  entry_time: '',
})

// 生成委托单编号
const generatedCommissionNo = computed(() => {
  if (!commissionForm.commission_date) return 'JSWT------------'
  const dateStr = commissionForm.commission_date.replace(/-/g, '')
  const seq = (commissionForm.commission_seq || '00001').padStart(5, '0')
  return `JSWT${dateStr}${seq}`
})

const uploadPreviews = ref<UploadPreview[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)

// 图片放大预览
const lightboxImage = ref('')
const showLightbox = ref(false)

function openImagePreview(src: string) {
  lightboxImage.value = src
  showLightbox.value = true
}

// 拖拽上传
async function handleDrop(event: DragEvent) {
  isDragging.value = false
  const files = event.dataTransfer?.files
  if (!files || files.length === 0) return
  
  const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
  for (const file of imageFiles) {
    const localUrl = URL.createObjectURL(file)
    const base64 = await fileToBase64(file)
    const preview: UploadPreview = {
      localUrl,
      url: base64,
      file,
      uploading: false,
      uploaded: true
    }
    uploadPreviews.value.push(preview)
  }
}

// 获取当前北京时间的 datetime-local 格式
function getBeijingTime(): string {
  const now = new Date()
  const bj = new Date(now.getTime() + (now.getTimezoneOffset() + 480) * 60000) // UTC+8
  const y = bj.getFullYear()
  const m = String(bj.getMonth() + 1).padStart(2, '0')
  const d = String(bj.getDate()).padStart(2, '0')
  const h = String(bj.getHours()).padStart(2, '0')
  const min = String(bj.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d}T${h}:${min}`
}

// 格式化日期时间
function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 防抖搜索
let searchTimer: ReturnType<typeof setTimeout> | null = null
function debouncedFetchCommission() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    fetchCommissionList()
  }, 300)
}

// 获取委托列表
async function fetchCommissionList() {
  try {
    const params: Record<string, string> = {}
    if (commissionSearch.value) {
      params.search = commissionSearch.value
    }
    const response = await $fetch('/api/commission-list', { params }) as any
    if (response.success) {
      commissionList.value = response.data
    }
  } catch (error) {
    console.error('获取架设委托列表失败:', error)
  }
}

// 切换电子版状态
async function toggleElectronic(item: any) {
  const newValue = item.has_electronic ? 0 : 1
  try {
    const response = await $fetch('/api/commission-toggle-electronic', {
      method: 'POST',
      body: { id: item.id, has_electronic: newValue }
    }) as any
    if (response.success) {
      item.has_electronic = newValue
    } else {
      showTip('切换失败: ' + response.message, '错误')
    }
  } catch (error: any) {
    showTip('切换失败: ' + error.message, '错误')
  }
}

// 切换审批状态
async function toggleApproved(item: any) {
  const newValue = item.is_approved ? 0 : 1
  try {
    const response = await $fetch('/api/commission-toggle-approved', {
      method: 'POST',
      body: { id: item.id, is_approved: newValue }
    }) as any
    if (response.success) {
      item.is_approved = newValue
    } else {
      showTip('切换失败: ' + response.message, '错误')
    }
  } catch (error: any) {
    showTip('切换失败: ' + error.message, '错误')
  }
}

// 切换搭设状态
async function toggleErected(item: any) {
  const newValue = item.is_erected ? 0 : 1
  try {
    const response = await $fetch('/api/commission-toggle-erected', {
      method: 'POST',
      body: { id: item.id, is_erected: newValue }
    }) as any
    if (response.success) {
      item.is_erected = newValue
    } else {
      showTip('切换失败: ' + response.message, '错误')
    }
  } catch (error: any) {
    showTip('切换失败: ' + error.message, '错误')
  }
}

// 打开新增对话框
function openCommissionDialog() {
  editingCommission.value = null
  const today = new Date()
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  commissionForm.commission_date = `${y}-${m}-${d}`
  commissionForm.commission_seq = ''
  commissionForm.has_electronic = '0'
  commissionForm.is_approved = '0'
  commissionForm.is_erected = '0'
  commissionForm.applicant_unit = ''
  commissionForm.entry_time = getBeijingTime()
  uploadPreviews.value = []
  commissionError.value = ''
  showCommissionDialog.value = true
}

// 编辑委托
function openEditCommissionDialog(item: CommissionItem) {
  editingCommission.value = item
  // 解析现有编号 JSWT2026062100001
  const match = item.commission_no.match(/^JSWT(\d{8})(\d{5})$/)
  if (match) {
    const dateStr = match[1] ?? ''
    commissionForm.commission_date = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
    commissionForm.commission_seq = match[2] ?? '00001'
  } else {
    const today = new Date()
    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const d = String(today.getDate()).padStart(2, '0')
    commissionForm.commission_date = `${y}-${m}-${d}`
    commissionForm.commission_seq = '00001'
  }
  commissionForm.has_electronic = String(item.has_electronic)
  commissionForm.is_approved = String(item.is_approved)
  commissionForm.is_erected = String(item.is_erected)
  commissionForm.applicant_unit = item.applicant_unit
  commissionForm.entry_time = item.entry_time ? item.entry_time.slice(0, 16) : getBeijingTime()
  uploadPreviews.value = []
  commissionError.value = ''
  showCommissionDialog.value = true
}

// 触发文件选择
function triggerFileInput() {
  fileInputRef.value?.click()
}

// 处理文件选择（转为 base64 存储）
async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files) return
  
  const files = Array.from(input.files)
  
  for (const file of files) {
    const localUrl = URL.createObjectURL(file)
    const base64 = await fileToBase64(file)
    const preview: UploadPreview = {
      localUrl,
      url: base64,
      file,
      uploading: false,
      uploaded: true
    }
    uploadPreviews.value.push(preview)
  }
  
  // 清空 input，允许重复选择同一文件
  input.value = ''
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// 移除预览
function removePreview(idx: number) {
  const preview = uploadPreviews.value[idx]
  if (preview?.localUrl?.startsWith('blob:')) {
    URL.revokeObjectURL(preview.localUrl)
  }
  uploadPreviews.value.splice(idx, 1)
}

// 保存委托
async function saveCommission() {
  if (!commissionForm.commission_date || !commissionForm.commission_seq || !commissionForm.applicant_unit) {
    commissionError.value = '委托单编号和申请单位为必填项'
    return
  }
  
  commissionSaving.value = true
  commissionError.value = ''
  
  try {
    const photoUrls = uploadPreviews.value
      .filter(p => p.uploaded && p.url)
      .map(p => p.url)
    
    const commissionNo = generatedCommissionNo.value
    
    if (editingCommission.value) {
      // 编辑模式
      const response = await $fetch('/api/commission-update', {
        method: 'POST',
        body: {
          id: editingCommission.value.id,
          commission_no: commissionNo,
          has_electronic: Number(commissionForm.has_electronic),
          is_approved: Number(commissionForm.is_approved),
          is_erected: Number(commissionForm.is_erected),
          applicant_unit: commissionForm.applicant_unit,
          entry_time: commissionForm.entry_time ? new Date(commissionForm.entry_time).toISOString() : null,
          photo_urls: photoUrls
        }
      }) as any
      
      if (response.success) {
        showCommissionDialog.value = false
        fetchCommissionList()
      } else {
        commissionError.value = response.message || '保存失败'
      }
    } else {
      // 新增模式
      const response = await $fetch('/api/commission-add', {
        method: 'POST',
        body: {
          commission_no: commissionNo,
          has_electronic: Number(commissionForm.has_electronic),
          is_approved: Number(commissionForm.is_approved),
          is_erected: Number(commissionForm.is_erected),
          applicant_unit: commissionForm.applicant_unit,
          entry_time: commissionForm.entry_time ? new Date(commissionForm.entry_time).toISOString() : null,
          photo_urls: photoUrls
        }
      }) as any
      
      if (response.success) {
        showCommissionDialog.value = false
        fetchCommissionList()
      } else {
        commissionError.value = response.message || '保存失败'
      }
    }
  } catch (error: any) {
    commissionError.value = error.message || '保存失败'
  } finally {
    commissionSaving.value = false
  }
}

// 打开删除对话框
function openCommissionDeleteDialog(item: CommissionItem) {
  deletingCommission.value = item
  showCommissionDeleteDialog.value = true
}

// 确认删除委托
async function confirmCommissionDelete() {
  if (!deletingCommission.value) return
  
  try {
    const response = await $fetch('/api/commission-delete', {
      method: 'POST',
      body: { id: deletingCommission.value.id }
    }) as any
    
    if (response.success) {
      showCommissionDeleteDialog.value = false
      fetchCommissionList()
    } else {
      showTip(response.message || '删除失败', '错误')
    }
  } catch (error: any) {
    showTip(error.message || '删除失败', '错误')
  }
}

// ==================== 架设单位相关 ====================
interface UnitItem {
  id: number
  name: string
  commission_count: number
}

const unitList = ref<UnitItem[]>([])
const newUnitName = ref('')

async function fetchUnitList() {
  try {
    const response = await $fetch('/api/unit-list') as any
    if (response.success) {
      unitList.value = response.data
    }
  } catch (error) {
    console.error('获取单位列表失败:', error)
  }
}

async function addUnit() {
  const name = newUnitName.value.trim()
  if (!name) {
    showTip('请输入单位名称', '错误')
    return
  }
  try {
    const response = await $fetch('/api/unit-add', {
      method: 'POST',
      body: { name }
    }) as any
    if (response.success) {
      newUnitName.value = ''
      showTip('添加成功', '成功')
      fetchUnitList()
    } else {
      showTip(response.message || '添加失败', '错误')
    }
  } catch (error: any) {
    showTip(error.message || '添加失败', '错误')
  }
}

async function deleteUnit(unit: UnitItem) {
  if (unit.commission_count > 0) {
    showTip(`该单位有 ${unit.commission_count} 条委托记录，无法删除`, '警告')
    return
  }
  if (!confirm(`确定删除单位「${unit.name}」？`)) return
  try {
    const response = await $fetch('/api/unit-delete', {
      method: 'POST',
      body: { id: unit.id }
    }) as any
    if (response.success) {
      showTip('删除成功', '成功')
      fetchUnitList()
    } else {
      showTip(response.message || '删除失败', '错误')
    }
  } catch (error: any) {
    showTip(error.message || '删除失败', '错误')
  }
}

// ==================== 初始化 ====================
onMounted(() => {
  fetchScaffoldList()
  fetchCommissionList()
  fetchUnitList()
})
</script>
