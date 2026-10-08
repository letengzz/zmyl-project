<template>
  <div class="p-6 min-h-screen bg-gray-50">
    <!-- 顶部标题和按钮 -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-3xl font-bold">考勤管理</h1>
      <div class="flex gap-2 items-center">
        <!-- 对比不一致提示图标 -->
        <div v-if="hasMismatch || hasOvertimeMismatch" class="relative group">
          <AlertCircle class="w-5 h-5 text-red-500 cursor-pointer animate-pulse" />
          <div class="absolute right-0 top-7 hidden group-hover:block z-50 bg-white border border-red-200 rounded-lg shadow-lg p-3 min-w-[240px] max-w-[320px]">
            <p v-if="hasMismatch" class="text-sm font-medium text-red-600 mb-2">金额不一致</p>
            <ul class="text-xs text-gray-600 space-y-1">
              <li v-if="diff.workDaysDiff" class="flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-red-400 inline-block"></span>
                考勤天数：系统 {{ diff.ourWorkDays }}天 / 工资表 {{ diff.salaryWorkDays }}天
              </li>
              <li v-if="diff.dailySalaryDiff" class="flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-red-400 inline-block"></span>
                每日工资：系统 ¥{{ diff.ourDailySalary }} / 工资表 ¥{{ diff.salaryDailySalary }}
              </li>
              <li v-if="diff.netSalaryDiff" class="flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-red-400 inline-block"></span>
                税后金额：系统 ¥{{ diff.ourNetSalary }} / 工资表 ¥{{ diff.salaryNetSalary }}
              </li>
            </ul>
            <p v-if="hasOvertimeMismatch" class="text-sm font-medium text-red-600 mb-2 mt-2" :class="{ 'border-t pt-2': hasMismatch }">加班-考勤不一致</p>
            <ul class="text-xs text-gray-600 space-y-1">
              <li v-if="overtimeOnlyDates.length > 0" class="flex items-start gap-1">
                <span class="w-2 h-2 rounded-full bg-red-400 inline-block mt-0.5 shrink-0"></span>
                <span>加班有但考勤无（{{ overtimeOnlyDates.length }}天）：<br/>{{ overtimeOnlyDates.join('、') }}</span>
              </li>
              <li v-if="attendanceOnlyDates.length > 0" class="flex items-start gap-1">
                <span class="w-2 h-2 rounded-full bg-purple-400 inline-block mt-0.5 shrink-0"></span>
                <span>考勤有但加班无（{{ attendanceOnlyDates.length }}天）：<br/>{{ attendanceOnlyDates.join('、') }}</span>
              </li>
            </ul>
          </div>
        </div>
        <Button @click="showPunchImportDialog = true" class="bg-primary text-white" size="sm">
          <Upload class="w-4 h-4 mr-1" />
          导入打卡时间
        </Button>
        <Button @click="showImportDialog = true" class="bg-primary text-white" size="sm">
          <Upload class="w-4 h-4 mr-1" />
          导入初始考勤
        </Button>
        <Button @click="exportOwner" variant="outline" size="sm" :disabled="!selectedPerson">
          <Download class="w-4 h-4 mr-1" />
          导出为业主考勤
        </Button>
        <Button @click="exportProxy" variant="outline" size="sm" :disabled="!selectedPerson">
          <Download class="w-4 h-4 mr-1" />
          导出为代发考勤
        </Button>
        <Button @click="exportHtml" variant="outline" size="sm">
          <Download class="w-4 h-4 mr-1" />
          导出当月考勤
        </Button>
        <Button @click="openRuleDialog" variant="outline" size="sm" title="设置标准打卡时间与允许时间">
          <Settings class="w-4 h-4 mr-1" />
          设置
        </Button>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow p-6">
      <!-- 人员切换栏 -->
      <div class="flex items-center justify-center gap-4 mb-4">
        <Button @click="prevPerson" variant="ghost" size="sm" :disabled="!persons.length || currentIndex <= 0">
          <ChevronLeft class="w-5 h-5" />
        </Button>
        <div class="relative">
          <button
            @click="openPersonDialog"
            class="text-xl font-semibold text-primary hover:text-primary/80 cursor-pointer border-b-2 border-dashed border-primary px-6 py-1 min-w-[120px] text-center"
          >
            {{ selectedPerson ? selectedPerson.name : '请选择人员' }}
          </button>
        </div>
        <Button @click="nextPerson" variant="ghost" size="sm" :disabled="!persons.length || currentIndex >= persons.length - 1">
          <ChevronRight class="w-5 h-5" />
        </Button>
      </div>

      <!-- 年月选择 -->
      <div class="flex items-center justify-center gap-4 mb-6">
        <Button @click="prevMonth" variant="ghost" size="sm">
          <ChevronLeft class="w-4 h-4" />
        </Button>
        <span class="text-lg font-medium min-w-[140px] text-center">{{ currentYear }}年 {{ currentMonth }}月</span>
        <Button @click="nextMonth" variant="ghost" size="sm">
          <ChevronRight class="w-4 h-4" />
        </Button>
      </div>

      <!-- 考勤汇总数据 -->
      <div class="mb-6">
        <button
          @click="showSummary = !showSummary"
          class="flex items-center gap-2 w-full px-3 py-2 bg-blue-50 rounded-t-lg border border-blue-100 hover:bg-blue-100 transition-colors"
          :class="showSummary ? 'rounded-b-none' : 'rounded-b-lg'"
        >
          <ChevronDown
            class="w-4 h-4 transition-transform duration-200"
            :class="showSummary ? '' : '-rotate-90'"
          />
          <span class="text-sm font-medium text-blue-800">考勤汇总数据</span>
        </button>
        <div
          v-show="showSummary"
          class="grid grid-cols-3 sm:grid-cols-7 gap-4 p-4 bg-blue-50 rounded-b-lg border border-t-0 border-blue-100"
        >
          <div class="text-center">
            <div class="text-sm text-gray-600">考勤工时</div>
            <div class="text-2xl font-bold text-primary">{{ summary.totalHours }}h</div>
          </div>
          <div class="text-center">
            <div class="text-sm text-gray-600">考勤天数</div>
            <div class="text-2xl font-bold" :class="diff.workDaysDiff ? 'text-red-600' : 'text-primary'">{{ summary.attendanceDays.toFixed(2) }}天</div>
            <div v-if="diff.workDaysDiff" class="text-xs text-red-500">工资表: {{ salaryEntry?.workDays }}天</div>
          </div>
          <div class="text-center">
            <div class="text-sm text-gray-600">考勤工资</div>
            <div class="text-2xl font-bold" :class="diff.dailySalaryDiff ? 'text-red-600' : 'text-green-600'">{{ selectedPerson?.attendance_salary != null ? '¥' + selectedPerson.attendance_salary : '-' }}</div>
            <div v-if="diff.dailySalaryDiff" class="text-xs text-red-500">工资表: ¥{{ salaryEntry?.dailySalary }}</div>
          </div>
          <div class="text-center">
            <div class="text-sm text-gray-600">考勤收入</div>
            <div class="text-2xl font-bold" :class="diff.netSalaryDiff ? 'text-red-600' : 'text-green-700'">{{ summary.attendanceIncome !== null ? '¥' + summary.attendanceIncome : '-' }}</div>
            <div v-if="diff.netSalaryDiff" class="text-xs text-red-500">工资表: ¥{{ salaryEntry?.netSalary }}</div>
          </div>
          <div class="text-center">
            <div class="text-sm text-gray-600">实际工资</div>
            <div class="text-2xl font-bold text-orange-600">{{ selectedPerson?.actual_salary != null ? '¥' + selectedPerson.actual_salary : '-' }}</div>
          </div>
          <div class="text-center">
            <div class="text-sm text-gray-600">实际收入</div>
            <div class="text-2xl font-bold text-orange-700">{{ summary.actualIncome !== null ? '¥' + summary.actualIncome : '-' }}</div>
          </div>
          <div class="text-center">
            <div class="text-sm text-gray-600">差额</div>
            <div class="text-2xl font-bold" :class="summary.incomeDiff !== null ? (summary.incomeDiff > 0 ? 'text-green-600' : summary.incomeDiff < 0 ? 'text-red-600' : '') : ''">{{ summary.incomeDiff !== null ? '¥' + (summary.incomeDiff >= 0 ? '+' : '') + summary.incomeDiff : '-' }}</div>
          </div>
        </div>
      </div>

      <!-- 图例 -->
      <div class="flex items-center justify-end gap-4 mb-2 text-xs text-gray-500">
        <span class="inline-flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-sm bg-blue-100 border border-blue-300"></span>导入考勤</span>
        <span class="inline-flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-sm bg-green-100 border border-green-300"></span>手动输入</span>
        <span class="inline-flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-sm bg-red-100 border border-red-300"></span>两者不一致</span>
      </div>

      <!-- 日历区域 -->
      <div class="border rounded-lg overflow-hidden">
        <!-- 星期头 -->
        <div class="grid grid-cols-7 bg-gray-100">
          <div v-for="day in weekDays" :key="day" class="py-2 text-center text-sm font-medium text-gray-600 border-b">
            {{ day }}
          </div>
        </div>
        <!-- 日历格子 -->
        <div class="grid grid-cols-7">
          <div
            v-for="(cell, idx) in calendarCells"
            :key="idx"
            class="border-b border-r min-h-[90px] p-1"
            :class="[
              cell!.isCurrentMonth ? (overtimeOnlyDates.includes(cell!.date) ? 'bg-red-100' : attendanceOnlyDates.includes(cell!.date) ? 'bg-purple-100' : 'bg-white') : 'bg-gray-50 text-gray-400',
              cell!.isToday ? 'bg-blue-50' : '',
              idx % 7 === 6 ? 'border-r-0' : '',
              cell!.isCurrentMonth && selectedPerson ? 'cursor-pointer hover:bg-blue-100 transition-colors' : ''
            ]"
            @click="cell!.isCurrentMonth && openTimeDialog(cell!.date)"
          >
            <div class="flex items-center justify-between mb-1">
              <span
                class="text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full"
                :class="cell!.isToday ? 'bg-primary text-white' : ''"
              >
                {{ cell!.day }}
              </span>
            </div>
            <div v-if="cell!.isCurrentMonth && (cell!.importedHours > 0 || cell!.manualHours > 0)" class="space-y-0.5">
         
              <div v-if="cell!.importedHours > 9" class="text-xs bg-orange-100 text-orange-700 rounded px-1 py-0.5 text-center">
                 {{ (cell!.importedHours - 9).toFixed(1) }}h
              </div>
              <div v-if="cell!.importedHours > 0" class="text-xs bg-blue-100 text-blue-700 rounded px-1 py-0.5 text-center">
                 {{ cell!.importedHours }}h
              </div>
              <div v-if="cell!.manualHours > 0" class="text-xs bg-green-100 text-green-700 rounded px-1 py-0.5 text-center">
                 {{ cell!.manualHours }}h<template v-if="cell!.manualHours > 9">（加班 {{ (cell!.manualHours - 9).toFixed(1) }}h）</template>
              </div>
              <div v-if="cellDiff(cell!) !== null" class="text-xs bg-red-100 text-red-700 rounded px-1 py-0.5 text-center font-medium">
                 {{ cellDiff(cell!)!.toFixed(1) }}h
              </div>
            </div>
            <div v-else-if="cell!.isCurrentMonth && !cell!.hours" class="text-xs text-gray-400 text-center mt-2">
              休息
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 导入打卡时间对话框 -->
    <Dialog :open="showPunchImportDialog" @update:open="showPunchImportDialog = $event">
      <DialogContent class="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>导入打卡时间</DialogTitle>
          <DialogDescription>
            上传考勤报表（含打卡时间的 .xlsx），系统自动识别标题中的日期范围，解析每天的上下班时间并按打卡规则折算为手动考勤
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-4">
          <div class="space-y-2">
            <Label>选择考勤报表文件</Label>
            <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer"
              @click="triggerPunchFileInput"
              @dragover.prevent
              @drop.prevent="handlePunchFileDrop"
            >
              <Upload class="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p v-if="!punchImportFile" class="text-sm text-gray-500">点击选择文件或拖拽文件到此处</p>
              <p v-else class="text-sm text-primary font-medium">{{ punchImportFile.name }}</p>
              <p class="text-xs text-gray-400 mt-1">支持 .xls、.xlsx 格式（考勤报表-打卡时间）</p>
              <input
                ref="punchFileInputRef"
                type="file"
                accept=".xls,.xlsx"
                class="hidden"
                @change="handlePunchFileSelect"
              />
            </div>
          </div>
          <div v-if="punchImportResult" class="text-sm p-3 rounded-md" :class="punchImportResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'">
            <p class="font-medium mb-1">{{ punchImportResult.message }}</p>
            <ul v-if="punchImportResult.results && punchImportResult.results.length > 0" class="mt-2 space-y-1 max-h-40 overflow-y-auto">
              <li v-for="(r, idx) in punchImportResult.results" :key="idx" class="flex items-center gap-2">
                <span :class="r.success ? 'text-green-500' : 'text-red-500'">{{ r.success ? '✓' : '✗' }}</span>
                <span>{{ r.name }}</span>
                <span v-if="r.success" class="text-gray-400 text-xs">{{ r.days }}天 {{ r.hours }}h</span>
                <span v-else class="text-red-400 text-xs">{{ r.error }}</span>
              </li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" @click="showPunchImportDialog = false">取消</Button>
            <Button @click="doPunchImport" :disabled="!punchImportFile || punchImporting" class="bg-primary text-white">
              {{ punchImporting ? '导入中...' : '开始导入' }}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>

    <!-- 导入考勤对话框 -->
    <Dialog :open="showImportDialog" @update:open="showImportDialog = $event">
      <DialogContent class="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>导入初始考勤</DialogTitle>
          <DialogDescription>
            上传 Excel 考勤表（.xls/.xlsx），系统将自动识别标题中的年月并导入考勤数据
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-4">
          <div class="space-y-2">
            <Label>选择考勤表文件</Label>
            <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer"
              @click="triggerFileInput"
              @dragover.prevent
              @drop.prevent="handleFileDrop"
            >
              <Upload class="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p v-if="!importFile" class="text-sm text-gray-500">点击选择文件或拖拽文件到此处</p>
              <p v-else class="text-sm text-primary font-medium">{{ importFile.name }}</p>
              <p class="text-xs text-gray-400 mt-1">支持 .xls、.xlsx 格式</p>
              <input
                ref="fileInputRef"
                type="file"
                accept=".xls,.xlsx"
                class="hidden"
                @change="handleFileSelect"
              />
            </div>
          </div>
          <div v-if="importResult" class="text-sm p-3 rounded-md" :class="importResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'">
            <p class="font-medium mb-1">{{ importResult.message }}</p>
            <ul v-if="importResult.results && importResult.results.length > 0" class="mt-2 space-y-1 max-h-40 overflow-y-auto">
              <li v-for="(r, idx) in importResult.results" :key="idx" class="flex items-center gap-2">
                <span :class="r.success ? 'text-green-500' : 'text-red-500'">{{ r.success ? '✓' : '✗' }}</span>
                <span>{{ r.name }}</span>
                <span v-if="r.success" class="text-gray-400 text-xs">{{ r.days }}天 {{ r.hours }}h</span>
                <span v-else class="text-red-400 text-xs">{{ r.error }}</span>
              </li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" @click="showImportDialog = false">取消</Button>
            <Button @click="doImport" :disabled="!importFile || importing" class="bg-primary text-white">
              {{ importing ? '导入中...' : '开始导入' }}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>

    <!-- 手动录入考勤时间弹窗 -->
    <Dialog :open="showTimeDialog" @update:open="showTimeDialog = $event">
      <DialogContent class="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>手动录入考勤时间</DialogTitle>
          <DialogDescription>
            {{ editingDate }} {{ selectedPerson ? '· ' + selectedPerson.name : '' }}
            <span v-if="existingImported !== null || existingManual !== null" class="ml-1">
              （已导入 {{ existingImported ?? 0 }}h<template v-if="existingManual !== null">，手动 {{ existingManual }}h</template>）
            </span>
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-4">
          <!-- 导入打卡记录 -->
          <div class="space-y-1.5">
            <Label>导入打卡记录（可选）</Label>
            <div class="flex gap-2">
              <textarea
                v-model="punchText"
                rows="1"
                placeholder="粘贴打卡时间，如：07:13 11:26 11:53 19:30"
                class="flex min-h-9 w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              ></textarea>
              <Button variant="outline" size="sm" class="shrink-0" @click="applyPunchText" :disabled="!punchText.trim()">填入</Button>
            </div>
            <p class="text-xs text-gray-400">自动识别文本中的时间，取前两次和后两次打卡分别填入上/下班时间</p>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <Label>上午上班时间</Label>
              <div class="flex gap-1.5">
                <input
                  v-model="timeForm.morningStart"
                  type="time"
                  step="60"
                  class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <Button type="button" variant="outline" size="sm" class="shrink-0 h-9 px-2 text-xs text-gray-500" title="清空（该时段不计工时）" @click="timeForm.morningStart = ''">空</Button>
              </div>
            </div>
            <div class="space-y-1.5">
              <Label>上午下班时间</Label>
              <div class="flex gap-1.5">
                <input
                  v-model="timeForm.morningEnd"
                  type="time"
                  step="60"
                  class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <Button type="button" variant="outline" size="sm" class="shrink-0 h-9 px-2 text-xs text-gray-500" title="清空（该时段不计工时）" @click="timeForm.morningEnd = ''">空</Button>
              </div>
            </div>
            <div class="space-y-1.5">
              <Label>下午上班时间</Label>
              <div class="flex gap-1.5">
                <input
                  v-model="timeForm.afternoonStart"
                  type="time"
                  step="60"
                  class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <Button type="button" variant="outline" size="sm" class="shrink-0 h-9 px-2 text-xs text-gray-500" title="清空（该时段不计工时）" @click="timeForm.afternoonStart = ''">空</Button>
              </div>
            </div>
            <div class="space-y-1.5">
              <Label>下午下班时间</Label>
              <div class="flex gap-1.5">
                <input
                  v-model="timeForm.afternoonEnd"
                  type="time"
                  step="60"
                  class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <Button type="button" variant="outline" size="sm" class="shrink-0 h-9 px-2 text-xs text-gray-500" title="清空（该时段不计工时）" @click="timeForm.afternoonEnd = ''">空</Button>
              </div>
            </div>
          </div>
          <!-- 手动工时 -->
          <div class="space-y-1.5">
            <Label>工时（小时）</Label>
            <div class="flex items-center gap-2">
              <Input v-model="manualHoursInput" type="number" step="0.1" min="0" placeholder="自动折算" class="w-32" />
              <span class="text-xs text-gray-400">留空自动按打卡时间折算，可手动修改</span>
            </div>
          </div>
          <!-- 工时预览 -->
          <div class="flex items-center justify-center gap-4 bg-blue-50 rounded-lg p-3">
            <span v-if="finalHours > 0" class="text-sm text-blue-800">
              共计 <span class="font-bold text-lg">{{ finalHours.toFixed(1) }}h</span>
              （上班 {{ Math.min(finalHours, 9).toFixed(1) }}h<template v-if="finalHours > 9">，加班 {{ (finalHours - 9).toFixed(1) }}h</template>）
            </span>
            <span v-else class="text-sm text-gray-400">未选择时间或时间无效</span>
          </div>
          <div v-if="effectiveTimeText" class="text-xs text-gray-500 text-center">
            生效打卡时间：{{ effectiveTimeText }}
          </div>
          <div class="text-xs text-gray-400 leading-5">
            打卡规则：{{ ruleHelp }}
          </div>
          <DialogFooter class="!justify-between">
            <Button variant="outline" @click="saveManualAttendance(0)" :disabled="savingAttendance">设为休息</Button>
            <div class="flex gap-2">
              <Button variant="outline" @click="showTimeDialog = false">取消</Button>
              <Button @click="saveManualAttendance(finalHours)" :disabled="finalHours <= 0 || savingAttendance" class="bg-primary text-white">
                {{ savingAttendance ? '保存中...' : '保存' }}
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>

    <!-- 打卡规则设置弹窗 -->
    <Dialog :open="showRuleDialog" @update:open="showRuleDialog = $event">
      <DialogContent class="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>打卡规则设置</DialogTitle>
          <DialogDescription>
            设置上/下班的「标准打卡时间」与「允许时间」，用于导入打卡时间与手动录入时的工时折算
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-4 max-h-[62vh] overflow-y-auto pr-1">
          <!-- 上午 -->
          <div class="rounded-lg border p-3 space-y-3">
            <p class="text-sm font-semibold text-gray-700">上午</p>
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1.5">
                <Label>上班标准时间</Label>
                <input
                  v-model="ruleForm.morningStart"
                  type="time"
                  step="60"
                  class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div class="space-y-1.5">
                <Label>上班允许提前（分钟）</Label>
                <Input v-model="ruleForm.morningEarly" type="number" min="0" step="5" />
              </div>
              <div class="space-y-1.5">
                <Label>下班标准时间</Label>
                <input
                  v-model="ruleForm.morningEnd"
                  type="time"
                  step="60"
                  class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div class="space-y-1.5">
                <Label>下班允许提前（分钟）</Label>
                <Input v-model="ruleForm.morningEndEarly" type="number" min="0" step="5" />
              </div>
            </div>
          </div>
          <!-- 下午 -->
          <div class="rounded-lg border p-3 space-y-3">
            <p class="text-sm font-semibold text-gray-700">下午</p>
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1.5">
                <Label>上班标准时间</Label>
                <input
                  v-model="ruleForm.afternoonStart"
                  type="time"
                  step="60"
                  class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div class="space-y-1.5">
                <Label>上班允许提前（分钟）</Label>
                <Input v-model="ruleForm.afternoonEarly" type="number" min="0" step="5" />
              </div>
              <div class="space-y-1.5">
                <Label>上班迟到宽限（分钟）</Label>
                <Input v-model="ruleForm.afternoonGrace" type="number" min="0" step="5" />
              </div>
              <div class="space-y-1.5">
                <Label>下班标准时间</Label>
                <input
                  v-model="ruleForm.afternoonEnd"
                  type="time"
                  step="60"
                  class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div class="space-y-1.5">
                <Label>下班允许提前（分钟）</Label>
                <Input v-model="ruleForm.afternoonEndEarly" type="number" min="0" step="5" />
              </div>
            </div>
          </div>
          <!-- 生效预览 -->
          <div class="text-xs text-gray-500 leading-5 bg-gray-50 rounded-lg p-3 space-y-1">
            <p class="font-medium text-gray-600">生效规则预览</p>
            <p>上午：{{ ruleFormPreview.morning }}</p>
            <p>下午：{{ ruleFormPreview.afternoon }}</p>
          </div>
        </div>
        <DialogFooter class="!justify-between">
          <Button variant="outline" @click="resetRuleForm">恢复默认</Button>
          <div class="flex gap-2">
            <Button variant="outline" @click="showRuleDialog = false">取消</Button>
            <Button @click="saveRule" :disabled="savingRule" class="bg-primary text-white">
              {{ savingRule ? '保存中...' : '保存' }}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 人员选择弹窗 -->
    <Dialog :open="showPersonDialog" @update:open="showPersonDialog = $event">
      <DialogContent class="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>选择人员</DialogTitle>
        </DialogHeader>
        <div class="space-y-3">
          <Input v-model="personSearch" placeholder="搜索姓名或职位..." class="w-full" />
          <!-- 状态筛选标签 -->
          <div class="flex gap-2">
            <button
              v-for="tab in personStatusTabs"
              :key="tab.value"
              @click="personStatusFilter = tab.value"
              class="px-3 py-1 text-sm rounded-full border transition-colors"
              :class="personStatusFilter === tab.value ? 'bg-primary text-white border-primary' : 'border-gray-300 text-gray-600 hover:bg-gray-100'"
            >{{ tab.label }}</button>
          </div>
          <div class="max-h-[360px] overflow-y-auto space-y-1">
            <div
              v-for="p in filteredPersons"
              :key="p.id"
              @click="selectPerson(p)"
              class="flex items-center justify-between px-3 py-2 rounded-md cursor-pointer hover:bg-gray-100"
              :class="selectedPerson?.id === p.id ? 'bg-blue-50 text-primary font-medium' : ''"
            >
              <span>
                {{ p.name }}
                <span v-if="p.is_resign === 1" class="text-xs text-orange-400 ml-1">(已离职)</span>
                <span v-else-if="p.is_resign === 2" class="text-xs text-amber-500 ml-1">(回家)</span>
              </span>
              <span class="text-xs text-gray-400">{{ p.position }}</span>
            </div>
            <div v-if="filteredPersons.length === 0" class="text-center text-gray-400 py-4">
              无匹配人员
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { ChevronLeft, ChevronRight, ChevronDown, Upload, Download, AlertCircle, Settings } from '@lucide/vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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

interface Person {
  id: number
  name: string
  id_card: string
  position: string
  location: number
  order: number | null
  attendance_salary: number | null
  actual_salary: number | null
  is_resign: number
}

interface AttendanceRecord {
  id: number
  person_id: number
  attendance_date: string
  hours: number
  manual_hours?: number | string | null
  manual_times?: string | null
}

interface CalendarCell {
  day: number
  isCurrentMonth: boolean
  isToday: boolean
  hours: number
  normalHours: number
  overtimeHours: number
  importedHours: number
  manualHours: number
  date: string
}

const weekDays = ['日', '一', '二', '三', '四', '五', '六']

// 人员相关
const persons = ref<Person[]>([])
const selectedPerson = ref<Person | null>(null)
const currentIndex = ref(0)
const showPersonDialog = ref(false)
const personSearch = ref('')
const personStatusFilter = ref<string>('all')
const showSummary = ref(true)

const personStatusTabs = [
  { label: '全部', value: 'all' },
  { label: '在职', value: 'active' },
  { label: '已离职', value: 'resigned' },
  { label: '回家', value: 'home' },
]

const filteredPersons = computed(() => {
  const keyword = personSearch.value.trim().toLowerCase()
  let list = persons.value
  // 状态筛选
  if (personStatusFilter.value === 'active') {
    list = list.filter(p => !p.is_resign)
  } else if (personStatusFilter.value === 'resigned') {
    list = list.filter(p => p.is_resign === 1)
  } else if (personStatusFilter.value === 'home') {
    list = list.filter(p => p.is_resign === 2)
  }
  // 搜索
  if (keyword) {
    list = list.filter(p =>
      p.name.toLowerCase().includes(keyword) ||
      (p.position && p.position.toLowerCase().includes(keyword))
    )
  }
  return list
})

// 年月相关
const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth() + 1)

// 考勤数据
const attendanceRecords = ref<AttendanceRecord[]>([])

// 加班数据（当前人员当月的加班日期集合）
const overtimeDates = ref<Set<string>>(new Set())

// 手动录入考勤时间相关
const showTimeDialog = ref(false)
const editingDate = ref('')
const existingImported = ref<number | null>(null)
const existingManual = ref<number | null>(null)
const savingAttendance = ref(false)
// ===== 打卡规则（可在右上角「设置」中配置） =====
interface AttendanceRule {
  morningStart: string      // 上午上班标准时间
  morningEarly: number      // 上午上班允许提前（分钟）
  morningEnd: string        // 上午下班标准时间
  morningEndEarly: number   // 上午下班允许提前（分钟）
  afternoonStart: string    // 下午上班标准时间
  afternoonEarly: number    // 下午上班允许提前（分钟）
  afternoonGrace: number    // 下午上班迟到宽限（分钟）
  afternoonEnd: string      // 下午下班标准时间
  afternoonEndEarly: number // 下午下班允许提前（分钟）
}

// 默认规则（与历史硬编码一致：上午 08:00/11:30，下午 13:30/18:00）
const DEFAULT_RULE: AttendanceRule = {
  morningStart: '08:00',
  morningEarly: 30,
  morningEnd: '11:30',
  morningEndEarly: 10,
  afternoonStart: '13:30',
  afternoonEarly: 30,
  afternoonGrace: 10,
  afternoonEnd: '18:00',
  afternoonEndEarly: 10
}

const attendanceRule = ref<AttendanceRule>({ ...DEFAULT_RULE })

// HH:MM → 分钟
function parseHMRule(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '').trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

// 分钟 → HH:MM
function fmtHMRule(min: number): string {
  const v = Math.max(0, Math.min(24 * 60 - 1, Math.round(min)))
  return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`
}

// 由规则推导各时段判定边界（分钟）
const minuteRules = computed(() => {
  const r = attendanceRule.value
  const ms = parseHMRule(r.morningStart) ?? 8 * 60
  const me = parseHMRule(r.morningEnd) ?? 11 * 60 + 30
  const as_ = parseHMRule(r.afternoonStart) ?? 13 * 60 + 30
  const ae = parseHMRule(r.afternoonEnd) ?? 18 * 60
  return {
    morning: {
      earlyBase: ms - r.morningEarly,
      lateLimit: ms - r.morningEarly,
      stdStart: ms,
      stdEnd: me,
      endEarlyFrom: me - r.morningEndEarly
    },
    afternoon: {
      earlyBase: as_ - r.afternoonEarly,
      lateLimit: as_ - r.afternoonGrace,
      stdStart: as_,
      stdEnd: ae,
      endEarlyFrom: ae - r.afternoonEndEarly
    }
  }
})
const MORNING_RULE = computed(() => minuteRules.value.morning)
const AFTERNOON_RULE = computed(() => minuteRules.value.afternoon)

// 默认打卡时间（手动录入弹窗初始化）：上午早到~标准下班；下午早到~下班允许提前起点
const DEFAULT_TIMES = computed(() => ({
  morningStart: fmtHMRule(MORNING_RULE.value.earlyBase),
  morningEnd: fmtHMRule(MORNING_RULE.value.stdEnd),
  afternoonStart: fmtHMRule(AFTERNOON_RULE.value.earlyBase),
  afternoonEnd: fmtHMRule(AFTERNOON_RULE.value.endEarlyFrom)
}))
const timeForm = reactive({ ...DEFAULT_TIMES.value })

// 导入打卡记录文本
const punchText = ref('')

// 从文本中识别打卡时间并填入四个时间字段
// 规则：识别所有 HH:MM 时间并排序；4 次按顺序填入，多于 4 次取前两次和后两次
function applyPunchText() {
  const times: string[] = []
  const re = /(?:^|\D)(\d{1,2}):(\d{2})(?=\D|$)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(punchText.value)) !== null) {
    const h = Number(m[1])
    const min = Number(m[2])
    if (h <= 23 && min <= 59) {
      times.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`)
    }
  }
  if (times.length < 4) {
    alert('至少需要识别出 4 个时间（上午上/下班、下午上/下班）')
    return
  }
  times.sort()
  const picked = times.length === 4
    ? times
    : [times[0]!, times[1]!, times[times.length - 2]!, times[times.length - 1]!]
  timeForm.morningStart = picked[0]!
  timeForm.morningEnd = picked[1]!
  timeForm.afternoonStart = picked[2]!
  timeForm.afternoonEnd = picked[3]!
}

// 上午上班：就近取整到整点/半点后限制在 [早到计入, 标准上班]（早到保底、迟到封顶）
function effectiveMorningStart(t: number): number {
  const rounded = roundToHalfHour(t)
  if (rounded <= MORNING_RULE.value.earlyBase) return MORNING_RULE.value.earlyBase
  if (rounded > MORNING_RULE.value.stdStart) return MORNING_RULE.value.stdStart
  return rounded
}

// 下午上班：不晚于迟到宽限点（含）按早到计入时间算，之后按标准上班时间算
function effectiveAfternoonStart(t: number): number {
  if (t <= AFTERNOON_RULE.value.lateLimit) return AFTERNOON_RULE.value.earlyBase
  return AFTERNOON_RULE.value.stdStart
}

// 生效下班时间：不低于（标准下班 - 10分钟）时按标准下班算；
// allowOvertime 为 true 时，晚于标准下班的时间取最接近的整点/半点（加班），距离相等时向下；
// 为 false 时封顶按标准下班时间算（如上午下班超过 11:30 不计加班）
function effectiveEnd(t: number, rule: { stdEnd: number; endEarlyFrom: number }, allowOvertime: boolean): number {
  if (t >= rule.endEarlyFrom) {
    if (!allowOvertime) return rule.stdEnd
    if (t <= rule.stdEnd) return rule.stdEnd
    return roundToHalfHour(t)
  }
  return t
}

// 取最接近的整点/半点（30分钟刻度），距离相等时向下取整（如 18:15→18:00、18:22→18:30）
function roundToHalfHour(t: number): number {
  const lower = Math.floor(t / 30) * 30
  const upper = lower + 30
  return (t - lower) <= (upper - t) ? lower : upper
}

// 解析 HH:MM 为分钟数
function parseTime(t: string): number | null {
  const m = t.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

// 根据打卡规则折算四个时间点的生效时间
const effectiveTimes = computed(() => {
  const ms = parseTime(timeForm.morningStart)
  const me = parseTime(timeForm.morningEnd)
  const as_ = parseTime(timeForm.afternoonStart)
  const ae = parseTime(timeForm.afternoonEnd)
  // 半天模式：上午上班打卡不早于上午下班点说明上午未出勤，
  // 按“半天（下午早到~标准下班）+ 加班”计算，上午打卡忽略（需下午下班完整，否则整体为空）
  if (ms !== null && ms >= MORNING_RULE.value.endEarlyFrom) {
    if (ae === null) return null
    return {
      isHalfDay: true,
      morningStart: 0,
      morningEnd: 0,
      afternoonStart: AFTERNOON_RULE.value.earlyBase,
      afternoonEnd: effectiveEnd(ae, AFTERNOON_RULE.value, true)
    }
  }
  return {
    isHalfDay: false,
    // 任一时间为空（值为 0）则对应时段不计工时（手动可选择空）
    morningStart: ms !== null ? effectiveMorningStart(ms) : 0,
    morningEnd: me !== null ? effectiveEnd(me, MORNING_RULE.value, false) : 0,
    afternoonStart: as_ !== null ? effectiveAfternoonStart(as_) : 0,
    afternoonEnd: ae !== null ? effectiveEnd(ae, AFTERNOON_RULE.value, true) : 0
  }
})

// 分钟数格式化为 H:MM
function fmtMin(min: number): string {
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`
}

// 生效时间描述
const effectiveTimeText = computed(() => {
  const e = effectiveTimes.value
  if (!e) return ''
  if (e.isHalfDay) {
    const overtime = Math.max(0, e.afternoonEnd - AFTERNOON_RULE.value.stdEnd)
    return `半天 ${fmtMin(AFTERNOON_RULE.value.earlyBase)}-${fmtMin(AFTERNOON_RULE.value.stdEnd)}${overtime > 0 ? ` + 加班至 ${fmtMin(e.afternoonEnd)}` : ''}`
  }
  const morningText = e.morningStart > 0 && e.morningEnd > 0 ? `${fmtMin(e.morningStart)}-${fmtMin(e.morningEnd)}` : '上午空'
  const afternoonText = e.afternoonStart > 0 && e.afternoonEnd > 0 ? `${fmtMin(e.afternoonStart)}-${fmtMin(e.afternoonEnd)}` : '下午空'
  return `${morningText} / ${afternoonText}`
})

// 打卡规则说明（随设置变化）
const ruleHelp = computed(() => {
  const m = MORNING_RULE.value
  const a = AFTERNOON_RULE.value
  const halfDay = ((a.stdEnd - a.earlyBase) / 60).toFixed(1)
  return `上午上班就近取整到整点/半点后限制在 ${fmtHMRule(m.earlyBase)}~${fmtHMRule(m.stdStart)}；上午下班 ${fmtHMRule(m.endEarlyFrom)} 后按 ${fmtHMRule(m.stdEnd)} 算，不计加班；`
    + `下午上班 ${fmtHMRule(a.lateLimit)} 前按 ${fmtHMRule(a.earlyBase)} 算，之后按 ${fmtHMRule(a.stdStart)} 算；下午下班 ${fmtHMRule(a.endEarlyFrom)} 后按 ${fmtHMRule(a.stdEnd)} 算，`
    + `加班打卡按最接近的整点/半点取整（如 18:15 按 18:00 算，18:22 按 18:30 算）；`
    + `上午上班不早于 ${fmtHMRule(m.endEarlyFrom)} 视为半天，按 ${halfDay}h + 加班计算`
})

// 根据生效时间计算工时：
// 半天模式 = 半天固定时长（下午早到~标准下班）+ 标准下班后的加班（下班打卡按最接近整点/半点取整）；
// 正常模式 = 上午时段 + 下午时段，取各时段有效时长
const manualHours = computed(() => {
  const e = effectiveTimes.value
  if (!e) return 0
  if (e.isHalfDay) {
    const halfDay = (AFTERNOON_RULE.value.stdEnd - AFTERNOON_RULE.value.earlyBase) / 60
    const overtime = Math.max(0, (e.afternoonEnd - AFTERNOON_RULE.value.stdEnd) / 60)
    return Math.round((halfDay + overtime) * 10) / 10
  }
  // 上午上班/下午下班为空（值为 0）时该时段不计工时
  const morning = e.morningStart > 0 && e.morningEnd > e.morningStart ? (e.morningEnd - e.morningStart) / 60 : 0
  const afternoon = e.afternoonStart > 0 && e.afternoonEnd > e.afternoonStart ? (e.afternoonEnd - e.afternoonStart) / 60 : 0
  return Math.round((morning + afternoon) * 10) / 10
})

// 手动工时输入（留空自动折算，可手动修改）
const manualHoursInput = ref('')

// 时间字段变化时同步折算工时到输入框；
// 仅当输入框处于“自动状态”（为空或等于上次自动折算值）才同步，避免覆盖用户手动输入的值
let lastAutoHours = -1
watch(
  () => [timeForm.morningStart, timeForm.morningEnd, timeForm.afternoonStart, timeForm.afternoonEnd],
  () => {
    const auto = manualHours.value > 0 ? manualHours.value : 0
    // type=number 的 v-model 会自动转 number，统一转字符串再处理
    const raw = String(manualHoursInput.value ?? '').trim()
    const cur = raw === '' ? NaN : parseFloat(raw)
    const isAutoState = raw === '' || (lastAutoHours >= 0 && !isNaN(cur) && Math.abs(cur - lastAutoHours) < 0.001)
    if (isAutoState) {
      manualHoursInput.value = auto > 0 ? String(auto) : ''
    }
    lastAutoHours = auto
  }
)

// 最终生效工时：输入框有值用手动值，否则用自动折算值
const finalHours = computed(() => {
  // type=number 的 v-model 会自动转 number，统一转字符串再处理
  const raw = String(manualHoursInput.value ?? '').trim()
  if (raw !== '') {
    const v = parseFloat(raw)
    if (!isNaN(v) && v >= 0) return Math.round(v * 10) / 10
  }
  return manualHours.value
})

// 点击日历格子，打开手动录入弹窗
function openTimeDialog(date: string) {
  if (!selectedPerson.value) return
  editingDate.value = date
  punchText.value = ''
  // 查询当日已有考勤记录，用于提示
  existingImported.value = null
  existingManual.value = null
  let savedTimes: string | null = null
  for (const r of attendanceRecords.value) {
    const raw = r.attendance_date as string | Date
    let d: string
    if (typeof raw === 'string') {
      if (raw.includes('T')) {
        const dt = new Date(raw)
        d = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
      } else {
        d = raw.slice(0, 10)
      }
    } else if (raw instanceof Date) {
      d = `${raw.getFullYear()}-${String(raw.getMonth() + 1).padStart(2, '0')}-${String(raw.getDate()).padStart(2, '0')}`
    } else {
      d = String(raw).slice(0, 10)
    }
    if (d === date) {
      existingImported.value = Number(r.hours) || 0
      existingManual.value = r.manual_hours != null ? Number(r.manual_hours) || 0 : null
      savedTimes = r.manual_times ?? null
      break
    }
  }
  // 重置为默认时间；有已保存的手动打卡时间则回填
  Object.assign(timeForm, DEFAULT_TIMES.value)
  // 回填已保存的手动工时（若有）；否则留空由时间变化自动折算
  manualHoursInput.value = existingManual.value !== null && existingManual.value > 0 ? String(existingManual.value) : ''
  if (savedTimes) {
    try {
      const t = JSON.parse(savedTimes)
      // 空值也要覆盖，显示为空（漏打卡的上午上班/下午下班存空）
      if (t.morningStart !== undefined) timeForm.morningStart = String(t.morningStart || '')
      if (t.morningEnd !== undefined) timeForm.morningEnd = String(t.morningEnd || '')
      if (t.afternoonStart !== undefined) timeForm.afternoonStart = String(t.afternoonStart || '')
      if (t.afternoonEnd !== undefined) timeForm.afternoonEnd = String(t.afternoonEnd || '')
    } catch {
      // JSON 解析失败则保持默认时间
    }
  }
  showTimeDialog.value = true
}

// 保存手动录入的考勤（hours 传 0 表示设为休息）
async function saveManualAttendance(hours: number) {
  if (!selectedPerson.value || !editingDate.value) return
  savingAttendance.value = true
  try {
    const response = await $fetch('/api/attendance', {
      method: 'POST',
      body: {
        person_id: selectedPerson.value.id,
        records: [{
          attendance_date: editingDate.value,
          hours,
          // 保存打卡时间（设为休息时清空）
          times: hours > 0 ? { ...timeForm } : null
        }]
      }
    }) as any
    if (response.success) {
      showTimeDialog.value = false
      await fetchAttendance()
    } else {
      alert(response.message || '保存失败')
    }
  } catch (error: any) {
    console.error('保存考勤失败:', error)
    alert(error.message || '保存失败')
  } finally {
    savingAttendance.value = false
  }
}

// ===== 打卡规则设置 =====
const showRuleDialog = ref(false)
const savingRule = ref(false)
const ruleForm = reactive<Record<keyof AttendanceRule, string>>({
  morningStart: DEFAULT_RULE.morningStart,
  morningEarly: String(DEFAULT_RULE.morningEarly),
  morningEnd: DEFAULT_RULE.morningEnd,
  morningEndEarly: String(DEFAULT_RULE.morningEndEarly),
  afternoonStart: DEFAULT_RULE.afternoonStart,
  afternoonEarly: String(DEFAULT_RULE.afternoonEarly),
  afternoonGrace: String(DEFAULT_RULE.afternoonGrace),
  afternoonEnd: DEFAULT_RULE.afternoonEnd,
  afternoonEndEarly: String(DEFAULT_RULE.afternoonEndEarly)
})

// 用规则填充表单
function fillRuleForm(r: AttendanceRule) {
  ruleForm.morningStart = r.morningStart
  ruleForm.morningEarly = String(r.morningEarly)
  ruleForm.morningEnd = r.morningEnd
  ruleForm.morningEndEarly = String(r.morningEndEarly)
  ruleForm.afternoonStart = r.afternoonStart
  ruleForm.afternoonEarly = String(r.afternoonEarly)
  ruleForm.afternoonGrace = String(r.afternoonGrace)
  ruleForm.afternoonEnd = r.afternoonEnd
  ruleForm.afternoonEndEarly = String(r.afternoonEndEarly)
}

function openRuleDialog() {
  fillRuleForm(attendanceRule.value)
  showRuleDialog.value = true
}

function resetRuleForm() {
  fillRuleForm(DEFAULT_RULE)
}

function numOr(v: string, def: number): number {
  const n = Math.round(Number(v))
  return Number.isFinite(n) && n >= 0 ? n : def
}

// 表单 → 规则对象
function ruleFormToRule(): AttendanceRule {
  return {
    morningStart: parseHMRule(ruleForm.morningStart) !== null ? ruleForm.morningStart : DEFAULT_RULE.morningStart,
    morningEarly: numOr(ruleForm.morningEarly, DEFAULT_RULE.morningEarly),
    morningEnd: parseHMRule(ruleForm.morningEnd) !== null ? ruleForm.morningEnd : DEFAULT_RULE.morningEnd,
    morningEndEarly: numOr(ruleForm.morningEndEarly, DEFAULT_RULE.morningEndEarly),
    afternoonStart: parseHMRule(ruleForm.afternoonStart) !== null ? ruleForm.afternoonStart : DEFAULT_RULE.afternoonStart,
    afternoonEarly: numOr(ruleForm.afternoonEarly, DEFAULT_RULE.afternoonEarly),
    afternoonGrace: numOr(ruleForm.afternoonGrace, DEFAULT_RULE.afternoonGrace),
    afternoonEnd: parseHMRule(ruleForm.afternoonEnd) !== null ? ruleForm.afternoonEnd : DEFAULT_RULE.afternoonEnd,
    afternoonEndEarly: numOr(ruleForm.afternoonEndEarly, DEFAULT_RULE.afternoonEndEarly)
  }
}

// 表单预览（展示生效边界）
const ruleFormPreview = computed(() => {
  const r = ruleFormToRule()
  const ms = parseHMRule(r.morningStart) ?? 8 * 60
  const me = parseHMRule(r.morningEnd) ?? 11 * 60 + 30
  const as_ = parseHMRule(r.afternoonStart) ?? 13 * 60 + 30
  const ae = parseHMRule(r.afternoonEnd) ?? 18 * 60
  return {
    morning: `上班 ${fmtHMRule(ms - r.morningEarly)}~${fmtHMRule(ms)}；下班 ${fmtHMRule(me - r.morningEndEarly)} 后按 ${fmtHMRule(me)} 算`,
    afternoon: `上班 ${fmtHMRule(as_ - r.afternoonGrace)} 前按 ${fmtHMRule(as_ - r.afternoonEarly)} 算，之后按 ${fmtHMRule(as_)} 算；下班 ${fmtHMRule(ae - r.afternoonEndEarly)} 后按 ${fmtHMRule(ae)} 算`
  }
})

// 保存打卡规则
async function saveRule() {
  savingRule.value = true
  try {
    const payload = ruleFormToRule()
    const response = await $fetch('/api/attendance-rule', { method: 'POST', body: payload }) as any
    if (response.success) {
      attendanceRule.value = response.data || payload
      showRuleDialog.value = false
    } else {
      alert(response.message || '保存失败')
    }
  } catch (error: any) {
    console.error('保存打卡规则失败:', error)
    alert(error.message || '保存失败')
  } finally {
    savingRule.value = false
  }
}

// 加载打卡规则
async function fetchRule() {
  try {
    const response = await $fetch('/api/attendance-rule') as any
    if (response.success && response.data) {
      attendanceRule.value = response.data
    }
  } catch (error) {
    console.error('获取打卡规则失败:', error)
  }
}

// 导入相关
const showImportDialog = ref(false)
const importFile = ref<File | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const importing = ref(false)
const importResult = ref<{ success: boolean; message: string; results?: any[]; salaryData?: { idCard: string; name: string; workDays: number; dailySalary: number; netSalary: number }[] } | null>(null)

// 工资表对比数据（按身份证号索引），仅对导入时的年月有效
const salaryDataMap = ref<Record<string, { idCard: string; name: string; workDays: number; dailySalary: number; netSalary: number }>>({})
const salaryDataYear = ref<number | null>(null)
const salaryDataMonth = ref<number | null>(null)

// 日历数据
const calendarCells = computed<CalendarCell[]>((): CalendarCell[] => {
  const year = currentYear.value
  const month = currentMonth.value

  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const daysInMonth = lastDay.getDate()
  const startDayOfWeek = firstDay.getDay() // 0=周日

  // 构建日期->工时映射
  // mysql2 返回的 DATE 经 JSON 序列化后是 ISO 字符串（如 "2026-04-30T16:00:00.000Z"），
  // 不能直接 slice(0,10)，需用 Date 解析后取本地日期
  const hoursMap: Record<string, { imported: number; manual: number }> = {}
  for (const r of attendanceRecords.value) {
    const raw = r.attendance_date as string | Date
    let d: string
    if (typeof raw === 'string') {
      if (raw.includes('T')) {
        const dt = new Date(raw)
        d = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
      } else {
        d = raw.slice(0, 10)
      }
    } else if (raw instanceof Date) {
      d = `${raw.getFullYear()}-${String(raw.getMonth() + 1).padStart(2, '0')}-${String(raw.getDate()).padStart(2, '0')}`
    } else {
      d = String(raw).slice(0, 10)
    }
    hoursMap[d] = {
      imported: Number(r.hours) || 0,
      manual: r.manual_hours != null ? Number(r.manual_hours) || 0 : 0
    }
  }

  const cells: CalendarCell[] = []
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  // 填充上月空白格子
  const prevMonthLastDay = new Date(year, month - 1, 0).getDate()
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i
    const m = month === 1 ? 12 : month - 1
    const y = month === 1 ? year - 1 : year
    cells.push({
      day: d,
      isCurrentMonth: false,
      isToday: false,
      hours: 0,
      normalHours: 0,
      overtimeHours: 0,
      importedHours: 0,
      manualHours: 0,
      date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    })
  }

  // 填充当月格子
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const rec = hoursMap[dateStr] || { imported: 0, manual: 0 }
    // 生效工时：导入优先，无导入时用手动录入
    const hours = rec.imported > 0 ? rec.imported : rec.manual
    const normalHours = Math.min(hours, 9)
    const overtimeHours = Math.max(0, hours - 9)

    cells.push({
      day: d,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      hours,
      normalHours,
      overtimeHours,
      importedHours: rec.imported,
      manualHours: rec.manual,
      date: dateStr
    })
  }

  // 填充下月空白格子（补齐到7的倍数）
  const remaining = 7 - (cells.length % 7)
  if (remaining < 7) {
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    for (let d = 1; d <= remaining; d++) {
      cells.push({
        day: d,
        isCurrentMonth: false,
        isToday: false,
        hours: 0,
        normalHours: 0,
        overtimeHours: 0,
        importedHours: 0,
        manualHours: 0,
        date: `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      })
    }
  }

  return cells
})

// 记录的生效工时：导入优先，无导入时用手动录入
function recordHours(r: AttendanceRecord): number {
  const imported = Number(r.hours) || 0
  if (imported > 0) return imported
  return Number(r.manual_hours) || 0
}

// 日历格子中导入与手动工时的差值（两者都有且不一致时返回差值，否则返回 null）
function cellDiff(cell: CalendarCell): number | null {
  if (cell.importedHours > 0 && cell.manualHours > 0 && Math.abs(cell.importedHours - cell.manualHours) >= 0.05) {
    return Math.round((cell.importedHours - cell.manualHours) * 10) / 10
  }
  return null
}

// 汇总数据
const summary = computed(() => {
  let totalHours = 0

  for (const r of attendanceRecords.value) {
    totalHours += recordHours(r)
  }

  const totalHoursRounded = Math.round(totalHours * 10) / 10
  const attendanceDays = Math.round((totalHoursRounded / 9) * 100) / 100

  const attendanceSalary = selectedPerson.value?.attendance_salary
  const actualSalary = selectedPerson.value?.actual_salary
  const attendanceIncome = attendanceSalary != null ? Math.round(attendanceDays * attendanceSalary) : null
  const actualIncome = actualSalary != null ? Math.round(attendanceDays * actualSalary) : null

  return {
    totalHours: totalHoursRounded,
    attendanceDays,
    attendanceIncome,
    actualIncome,
    incomeDiff: attendanceIncome != null && actualIncome != null ? attendanceIncome - actualIncome : null,
    totalNormalHours: 0,
    totalOvertimeHours: 0
  }
})

// 当前人员的工资表数据（仅当月/年匹配时才生效）
const salaryEntry = computed(() => {
  if (!selectedPerson.value) return null
  if (salaryDataYear.value !== currentYear.value || salaryDataMonth.value !== currentMonth.value) return null
  return salaryDataMap.value[selectedPerson.value.id_card] || null
})

// 对比差异
const diff = computed(() => {
  const entry = salaryEntry.value
  const days = summary.value.attendanceDays
  const ourSalary = selectedPerson.value?.attendance_salary ?? 0
  const ourIncome = summary.value.attendanceIncome ?? 0

  if (!entry) {
    return { workDaysDiff: false, dailySalaryDiff: false, netSalaryDiff: false, ourWorkDays: '', ourDailySalary: '', ourNetSalary: '', salaryWorkDays: '', salaryDailySalary: '', salaryNetSalary: '' }
  }

  const workDaysDiff = Math.abs(days - entry.workDays) >= 0.01
  const dailySalaryDiff = Math.abs(ourSalary - entry.dailySalary) >= 0.01
  const netSalaryDiff = Math.abs(ourIncome - entry.netSalary) >= 0.01

  return {
    workDaysDiff,
    dailySalaryDiff,
    netSalaryDiff,
    ourWorkDays: days.toFixed(2),
    ourDailySalary: String(ourSalary),
    ourNetSalary: String(ourIncome),
    salaryWorkDays: String(entry.workDays),
    salaryDailySalary: String(entry.dailySalary),
    salaryNetSalary: String(entry.netSalary)
  }
})

const hasMismatch = computed(() => {
  return diff.value.workDaysDiff || diff.value.dailySalaryDiff || diff.value.netSalaryDiff
})

// 加班-考勤对比（仅对比有加班的情况，即考勤工时 > 9h）
const attendanceDateSet = computed(() => {
  const s = new Set<string>()
  for (const r of attendanceRecords.value) {
    if (recordHours(r) <= 9) continue
    const raw = r.attendance_date as string | Date
    let d: string
    if (typeof raw === 'string') {
      if (raw.includes('T')) {
        const dt = new Date(raw)
        d = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
      } else {
        d = raw.slice(0, 10)
      }
    } else if (raw instanceof Date) {
      d = `${raw.getFullYear()}-${String(raw.getMonth() + 1).padStart(2, '0')}-${String(raw.getDate()).padStart(2, '0')}`
    } else {
      d = String(raw).slice(0, 10)
    }
    s.add(d)
  }
  return s
})

// 加班有但考勤没有的日期
const overtimeOnlyDates = computed(() => {
  const result: string[] = []
  overtimeDates.value.forEach(d => {
    if (!attendanceDateSet.value.has(d)) result.push(d)
  })
  return result.sort()
})

// 考勤有但加班没有的日期
const attendanceOnlyDates = computed(() => {
  const result: string[] = []
  attendanceDateSet.value.forEach(d => {
    if (!overtimeDates.value.has(d)) result.push(d)
  })
  return result.sort()
})

const hasOvertimeMismatch = computed(() => {
  return overtimeOnlyDates.value.length > 0 || attendanceOnlyDates.value.length > 0
})

// 切换人员
function openPersonDialog() {
  personSearch.value = ''
  personStatusFilter.value = 'all'
  showPersonDialog.value = true
}

function prevPerson() {
  if (currentIndex.value > 0) {
    currentIndex.value--
    selectedPerson.value = persons.value[currentIndex.value]!
    fetchAttendance()
    fetchOvertimeDates()
  }
}

function nextPerson() {
  if (currentIndex.value < persons.value.length - 1) {
    currentIndex.value++
    selectedPerson.value = persons.value[currentIndex.value]!
    fetchAttendance()
    fetchOvertimeDates()
  }
}

function selectPerson(person: Person) {
  selectedPerson.value = person
  currentIndex.value = persons.value.findIndex(p => p.id === person.id)
  showPersonDialog.value = false
  fetchAttendance()
  fetchOvertimeDates()
}

// 切换月份
function prevMonth() {
  if (currentMonth.value === 1) {
    currentMonth.value = 12
    currentYear.value--
  } else {
    currentMonth.value--
  }
  fetchPersons()
  fetchAttendance()
  fetchOvertimeDates()
  fetchSalaryCompare()
}

function nextMonth() {
  if (currentMonth.value === 12) {
    currentMonth.value = 1
    currentYear.value++
  } else {
    currentMonth.value++
  }
  fetchPersons()
  fetchAttendance()
  fetchOvertimeDates()
  fetchSalaryCompare()
}

// 获取当月有考勤记录的人员列表（含离职，保持考勤导入顺序）
async function fetchPersons() {
  try {
    const response = await $fetch(`/api/attendance-persons?year=${currentYear.value}&month=${currentMonth.value}`) as any
    if (response.success) {
      persons.value = response.data || []
      // 如果已选人员在列表中，保持选中；否则选第一个
      if (selectedPerson.value) {
        const idx = persons.value.findIndex(p => p.id === selectedPerson.value!.id)
        if (idx >= 0) {
          currentIndex.value = idx
          selectedPerson.value = persons.value[idx]!
        } else if (persons.value.length > 0) {
          selectedPerson.value = persons.value[0]!
          currentIndex.value = 0
          fetchAttendance()
          fetchOvertimeDates()
          fetchSalaryCompare()
        } else {
          selectedPerson.value = null
        }
      } else if (persons.value.length > 0) {
        selectedPerson.value = persons.value[0]!
        currentIndex.value = 0
        fetchAttendance()
        fetchOvertimeDates()
        fetchSalaryCompare()
      }
    }
  } catch (error) {
    console.error('获取人员列表失败:', error)
  }
}

// 获取考勤数据
async function fetchAttendance() {
  if (!selectedPerson.value) return

  try {
    const response = await $fetch('/api/attendance', {
      params: {
        person_id: selectedPerson.value.id,
        year: currentYear.value,
        month: currentMonth.value
      }
    }) as any
    if (response.success) {
      attendanceRecords.value = response.data || []
    }
  } catch (error) {
    console.error('获取考勤数据失败:', error)
  }
}

// 从数据库加载工资表对比数据
async function fetchSalaryCompare() {
  try {
    const response = await $fetch('/api/salary-compare', {
      params: { year: currentYear.value, month: currentMonth.value }
    }) as any
    if (response.success && response.data) {
      const map: Record<string, any> = {}
      for (const item of response.data) {
        map[item.id_card] = {
          idCard: item.id_card,
          name: item.name,
          workDays: Number(item.work_days),
          dailySalary: Number(item.daily_salary),
          netSalary: Number(item.net_salary)
        }
      }
      salaryDataMap.value = map
      salaryDataYear.value = currentYear.value
      salaryDataMonth.value = currentMonth.value
    }
  } catch (error) {
    console.error('获取工资表对比数据失败:', error)
  }
}

// 获取当前人员当月的加班日期
async function fetchOvertimeDates() {
  if (!selectedPerson.value) {
    overtimeDates.value = new Set()
    return
  }
  try {
    const response = await $fetch('/api/overtime-person', {
      params: {
        person_id: selectedPerson.value.id,
        year: currentYear.value,
        month: currentMonth.value
      }
    }) as any
    if (response.success && response.data) {
      const s = new Set<string>()
      for (const r of response.data) {
        const raw = r.task_date
        let d: string
        if (typeof raw === 'string') {
          if (raw.includes('T')) {
            const dt = new Date(raw)
            d = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
          } else {
            d = raw.slice(0, 10)
          }
        } else if (raw instanceof Date) {
          d = `${raw.getFullYear()}-${String(raw.getMonth() + 1).padStart(2, '0')}-${String(raw.getDate()).padStart(2, '0')}`
        } else {
          d = String(raw).slice(0, 10)
        }
        s.add(d)
      }
      overtimeDates.value = s
    } else {
      overtimeDates.value = new Set()
    }
  } catch (error) {
    console.error('获取加班日期失败:', error)
    overtimeDates.value = new Set()
  }
}

// 文件选择
function triggerFileInput() {
  fileInputRef.value?.click()
}
function handleFileSelect(e: Event) {
  const target = e.target as HTMLInputElement
  const f = target.files?.[0]
  if (f) {
    importFile.value = f
    importResult.value = null
  }
}

function handleFileDrop(e: DragEvent) {
  const f = e.dataTransfer?.files?.[0]
  if (f) {
    importFile.value = f
    importResult.value = null
  }
}

// 导入考勤
async function doImport() {
  if (!importFile.value) {
    importResult.value = { success: false, message: '请选择考勤表文件' }
    return
  }

  importing.value = true
  importResult.value = null

  try {
    const formData = new FormData()
    formData.append('file', importFile.value)

    const response = await $fetch('/api/attendance-import', {
      method: 'POST',
      body: formData
    }) as any
    importResult.value = { success: response.success, message: response.message, results: response.results, salaryData: response.salaryData }
    if (response.success) {
      // 存储工资表对比数据
      if (response.salaryData && Array.isArray(response.salaryData)) {
        const map: Record<string, any> = {}
        for (const item of response.salaryData) {
          map[item.idCard] = item
        }
        salaryDataMap.value = map
        salaryDataYear.value = response.year
        salaryDataMonth.value = response.month
      }
      // 更新年月到导入的月份
      currentYear.value = response.year
      currentMonth.value = response.month
      importFile.value = null
      // 重新加载人员列表（导入会写入 punch_seq 顺序）
      await fetchPersons()
      if (selectedPerson.value) {
        await fetchAttendance()
      }
      // 延迟关闭弹窗，让用户看到结果
      setTimeout(() => {
        showImportDialog.value = false
        importResult.value = null
      }, 2000)
    }
  } catch (error: any) {
    importResult.value = { success: false, message: error.message || '导入失败' }
  } finally {
    importing.value = false
  }
}

// 打卡时间导入相关
const showPunchImportDialog = ref(false)
const punchImportFile = ref<File | null>(null)
const punchFileInputRef = ref<HTMLInputElement | null>(null)
const punchImporting = ref(false)
const punchImportResult = ref<{ success: boolean; message: string; results?: any[]; dateRange?: string } | null>(null)

function triggerPunchFileInput() {
  punchFileInputRef.value?.click()
}

function handlePunchFileSelect(e: Event) {
  const target = e.target as HTMLInputElement
  const f = target.files?.[0]
  if (f) {
    punchImportFile.value = f
    punchImportResult.value = null
  }
}

function handlePunchFileDrop(e: DragEvent) {
  const f = e.dataTransfer?.files?.[0]
  if (f) {
    punchImportFile.value = f
    punchImportResult.value = null
  }
}

// 导入打卡时间（上下班时间 → 手动考勤）
async function doPunchImport() {
  if (!punchImportFile.value) {
    punchImportResult.value = { success: false, message: '请选择考勤报表文件' }
    return
  }

  punchImporting.value = true
  punchImportResult.value = null

  try {
    const formData = new FormData()
    formData.append('file', punchImportFile.value)

    const response = await $fetch('/api/attendance-punch-import', {
      method: 'POST',
      body: formData
    }) as any
    punchImportResult.value = { success: response.success, message: response.message, results: response.results, dateRange: response.dateRange }
    if (response.success) {
      punchImportFile.value = null
      // 切换到打卡报表所在月份，使导入的人员与数据可见
      if (response.dateRange) {
        const dm = String(response.dateRange).match(/(\d{4})-(\d{2})-\d{2}/)
        if (dm) {
          currentYear.value = Number(dm[1])
          currentMonth.value = Number(dm[2])
        }
      }
      // 刷新人员列表（只有打卡时间、无初始考勤的人员也要出现在列表中）并刷新当前人员日历
      await fetchPersons()
      await fetchAttendance()
      fetchOvertimeDates()
      fetchSalaryCompare()
    }
  } catch (error: any) {
    punchImportResult.value = { success: false, message: error.message || '导入失败' }
  } finally {
    punchImporting.value = false
  }
}

// 导出业主考勤
async function exportOwner() {
  try {
    const url = `/api/attendance-export-owner?year=${currentYear.value}&month=${currentMonth.value}`
    window.open(url, '_blank')
  } catch (error) {
    console.error('导出失败:', error)
    alert('导出失败')
  }
}

// 导出代发考勤
async function exportProxy() {
  try {
    const url = `/api/attendance-export-proxy?year=${currentYear.value}&month=${currentMonth.value}`
    window.open(url, '_blank')
  } catch (error) {
    console.error('导出失败:', error)
    alert('导出失败')
  }
}

// 导出当月所有人员考勤为单个 HTML 文件（固定快照）
async function exportHtml() {
  try {
    const url = `/api/attendance-export-html?year=${currentYear.value}&month=${currentMonth.value}`
    window.open(url, '_blank')
  } catch (error) {
    console.error('导出失败:', error)
    alert('导出失败')
  }
}

onMounted(() => {
  fetchRule()
  fetchPersons()
})
</script>