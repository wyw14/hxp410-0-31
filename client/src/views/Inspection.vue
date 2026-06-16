<template>
  <div class="inspection-container">
    <div class="card inspection-card">
      <div class="card-header">
        <span class="icon">🔍</span>
        <h2>数据巡检中心</h2>
        <p class="subtitle">扫描并修复数据中的问题，确保数据完整性</p>
      </div>

      <div class="inspection-actions">
        <button 
          class="btn btn-primary" 
          @click="runInspection" 
          :disabled="inspecting"
        >
          <span v-if="inspecting">
            <span class="btn-spinner"></span>
            巡检中...
          </span>
          <span v-else>
            🔄 开始巡检
          </span>
        </button>
        <button 
          class="btn btn-secondary" 
          @click="fixAll" 
          :disabled="!lastResult || lastResult.stats.totalIssues === 0 || fixing"
        >
          <span v-if="fixing">
            <span class="btn-spinner"></span>
            修复中...
          </span>
          <span v-else>
            ✨ 一键修复
          </span>
        </button>
        <button 
          class="btn btn-secondary" 
          @click="loadHistory"
          :disabled="loadingHistory"
        >
          📋 巡检历史
        </button>
      </div>

      <div v-if="loadingData" class="loading-state">
        <div class="spinner"></div>
        <p>正在加载数据...</p>
      </div>

      <div v-else-if="dataSummary" class="data-summary">
        <h3 class="section-title">📊 数据概览</h3>
        <div class="summary-grid">
          <div 
            v-for="(info, key) in dataSummary" 
            :key="key" 
            class="summary-item"
          >
            <div class="summary-icon">{{ getCollectionIcon(key) }}</div>
            <div class="summary-info">
              <div class="summary-name">{{ info.displayName }}</div>
              <div class="summary-count">{{ info.count }} 条记录</div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="lastResult" class="inspection-result">
        <div class="result-header">
          <h3 class="section-title">
            <span>🛡️</span>
            巡检结果
          </h3>
          <div class="result-meta">
            <span class="result-time">{{ formatTime(lastResult.timestamp) }}</span>
            <span class="result-duration">耗时 {{ lastResult.duration }}ms</span>
          </div>
        </div>

        <div class="result-summary">
          <div class="summary-badge" :class="{ 'no-issues': lastResult.stats.totalIssues === 0 }">
            <span class="summary-number">{{ lastResult.stats.totalIssues }}</span>
            <span class="summary-label">问题总数</span>
          </div>
          <div class="summary-badge severity-high" v-if="lastResult.stats.bySeverity.high > 0">
            <span class="summary-number">{{ lastResult.stats.bySeverity.high }}</span>
            <span class="summary-label">严重</span>
          </div>
          <div class="summary-badge severity-medium" v-if="lastResult.stats.bySeverity.medium > 0">
            <span class="summary-number">{{ lastResult.stats.bySeverity.medium }}</span>
            <span class="summary-label">中等</span>
          </div>
          <div class="summary-badge severity-low" v-if="lastResult.stats.bySeverity.low > 0">
            <span class="summary-number">{{ lastResult.stats.bySeverity.low }}</span>
            <span class="summary-label">轻微</span>
          </div>
          <div class="summary-badge fixable" v-if="fixableCount > 0">
            <span class="summary-number">{{ fixableCount }}</span>
            <span class="summary-label">可修复</span>
          </div>
        </div>

        <div class="result-message">
          {{ lastResult.summary }}
        </div>

        <div class="filter-bar" v-if="lastResult.issues.length > 0">
          <div class="filter-group">
            <label>按集合筛选：</label>
            <select v-model="filterCollection" class="filter-select">
              <option value="">全部</option>
              <option 
                v-for="(info, key) in dataSummary" 
                :key="key" 
                :value="key"
              >
                {{ info.displayName }}
              </option>
            </select>
          </div>
          <div class="filter-group">
            <label>按严重程度：</label>
            <select v-model="filterSeverity" class="filter-select">
              <option value="">全部</option>
              <option value="critical">致命</option>
              <option value="high">严重</option>
              <option value="medium">中等</option>
              <option value="low">轻微</option>
            </select>
          </div>
          <div class="filter-group">
            <label>按类型：</label>
            <select v-model="filterType" class="filter-select">
              <option value="">全部</option>
              <option value="missing_field">缺少字段</option>
              <option value="type_mismatch">类型错误</option>
              <option value="invalid_id">无效ID</option>
              <option value="invalid_date">无效日期</option>
              <option value="empty_content">空内容</option>
              <option value="missing_reference">缺少引用</option>
              <option value="broken_reference">引用断裂</option>
              <option value="duplicate_id">ID重复</option>
              <option value="read_error">读取错误</option>
            </select>
          </div>
          <div class="filter-group">
            <label>
              <input type="checkbox" v-model="filterFixable" />
              仅显示可修复
            </label>
          </div>
        </div>

        <div class="batch-actions" v-if="filteredIssues.length > 0">
          <label class="select-all">
            <input 
              type="checkbox" 
              v-model="selectAll" 
              :indeterminate="isIndeterminate"
              @change="toggleSelectAll"
            />
            全选可修复项
          </label>
          <button 
            class="btn btn-primary btn-sm" 
            @click="fixSelected"
            :disabled="selectedIssues.length === 0 || fixing"
          >
            修复选中 ({{ selectedIssues.length }})
          </button>
        </div>

        <div class="issues-list" v-if="filteredIssues.length > 0">
          <div 
            v-for="(issue, index) in filteredIssues" 
            :key="getIssueKey(issue, index)"
            class="issue-item"
            :class="[`severity-${issue.severity}`, { 'selected': isSelected(issue), 'fixable': issue.fixable }]"
          >
            <div class="issue-header">
              <div class="issue-left">
                <input 
                  type="checkbox" 
                  v-if="issue.fixable"
                  :checked="isSelected(issue)"
                  @change="toggleIssue(issue)"
                />
                <span class="severity-badge" :class="`severity-${issue.severity}`">
                  {{ getSeverityLabel(issue.severity) }}
                </span>
                <span class="collection-badge">
                  {{ getCollectionIcon(issue.collection) }} {{ issue.collectionDisplayName }}
                </span>
                <span class="type-badge">{{ getTypeLabel(issue.type) }}</span>
              </div>
              <div class="issue-right">
                <span v-if="issue.fixable" class="fixable-badge">可修复</span>
                <span v-else class="unfixable-badge">需手动处理</span>
              </div>
            </div>
            
            <div class="issue-body">
              <p class="issue-message">{{ issue.message }}</p>
              <div class="issue-details" v-if="showDetails(issue)">
                <div class="detail-row">
                  <span class="detail-label">记录ID：</span>
                  <span class="detail-value">{{ issue.itemId }}</span>
                </div>
                <div class="detail-row" v-if="issue.field">
                  <span class="detail-label">字段：</span>
                  <span class="detail-value">{{ issue.field }}</span>
                </div>
                <div class="detail-row" v-if="issue.expectedType">
                  <span class="detail-label">期望类型：</span>
                  <span class="detail-value">{{ issue.expectedType }}</span>
                </div>
                <div class="detail-row" v-if="issue.actualType">
                  <span class="detail-label">实际类型：</span>
                  <span class="detail-value">{{ issue.actualType }}</span>
                </div>
                <div class="detail-row" v-if="issue.targetCollectionDisplayName">
                  <span class="detail-label">引用目标：</span>
                  <span class="detail-value">{{ issue.targetCollectionDisplayName }}</span>
                </div>
                <div class="detail-row" v-if="issue.referencedId">
                  <span class="detail-label">引用ID：</span>
                  <span class="detail-value">{{ issue.referencedId }}</span>
                </div>
                <div class="detail-row" v-if="issue.firstIndex !== undefined">
                  <span class="detail-label">首次出现位置：</span>
                  <span class="detail-value">索引 {{ issue.firstIndex }}</span>
                </div>
              </div>
            </div>

            <div class="issue-footer" v-if="issue.fixable">
              <div class="suggested-fix">
                <span class="fix-label">💡 建议修复：</span>
                <span class="fix-description">{{ getFixDescription(issue) }}</span>
              </div>
              <button 
                class="btn btn-primary btn-sm" 
                @click="fixSingle(issue)"
                :disabled="fixing"
              >
                修复此项
              </button>
            </div>
          </div>
        </div>

        <div v-else-if="lastResult.issues.length > 0" class="empty-filter">
          <p>没有符合筛选条件的问题</p>
        </div>
      </div>

      <div v-if="history.length > 0 && showHistory" class="history-section">
        <div class="history-header">
          <h3 class="section-title">📜 巡检历史</h3>
          <button class="btn btn-secondary btn-sm" @click="showHistory = false">
            关闭
          </button>
        </div>
        <div class="history-list">
          <div 
            v-for="(record, index) in history" 
            :key="record.id || index"
            class="history-item"
          >
            <div class="history-time">{{ formatTime(record.timestamp) }}</div>
            <div class="history-stats">
              <span>扫描 {{ record.totalItems }} 条记录</span>
              <span :class="{ 'has-issues': record.totalIssues > 0 }">
                发现 {{ record.totalIssues }} 个问题
              </span>
              <span>耗时 {{ record.duration }}ms</span>
            </div>
            <div class="history-summary">{{ record.summary }}</div>
          </div>
        </div>
      </div>

      <div v-if="fixResults.length > 0" class="fix-results">
        <div class="result-card" :class="fixResultClass">
          <div class="result-icon">{{ fixResultIcon }}</div>
          <div class="result-content">
            <h4>{{ fixResultMessage }}</h4>
            <div class="result-stats">
              <span class="success">成功 {{ fixSuccessCount }}</span>
              <span class="failed" v-if="fixFailedCount > 0">失败 {{ fixFailedCount }}</span>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" @click="clearFixResults">
            关闭
          </button>
        </div>
        <div class="result-details" v-if="fixResults.length > 0">
          <div 
            v-for="(result, index) in fixResults" 
            :key="index"
            class="result-detail-item"
            :class="{ success: result.success, failed: !result.success }"
          >
            <span class="result-status">{{ result.success ? '✅' : '❌' }}</span>
            <span class="result-message">{{ result.message }}</span>
          </div>
        </div>
      </div>

      <div v-if="confirmDialog.visible" class="modal-overlay" @click.self="cancelConfirm">
        <div class="modal-dialog">
          <div class="modal-header">
            <span class="modal-icon">{{ confirmDialog.icon }}</span>
            <h3>{{ confirmDialog.title }}</h3>
          </div>
          <div class="modal-body">
            <p>{{ confirmDialog.message }}</p>
            <div v-if="confirmDialog.details && confirmDialog.details.length > 0" class="modal-details">
              <h4>操作内容：</h4>
              <ul>
                <li v-for="(detail, idx) in confirmDialog.details" :key="idx">
                  {{ detail }}
                </li>
              </ul>
            </div>
            <div v-if="confirmDialog.warning" class="modal-warning">
              <span>⚠️</span>
              <p>{{ confirmDialog.warning }}</p>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="cancelConfirm">
              取消
            </button>
            <button 
              class="btn" 
              :class="confirmDialog.danger ? 'btn-danger' : 'btn-primary'"
              @click="executeConfirm"
              :disabled="fixing"
            >
              <span v-if="fixing">
                <span class="btn-spinner"></span>
                处理中...
              </span>
              <span v-else>
                {{ confirmDialog.confirmText || '确认' }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const loadingData = ref(false)
const inspecting = ref(false)
const fixing = ref(false)
const loadingHistory = ref(false)
const dataSummary = ref(null)
const lastResult = ref(null)
const history = ref([])
const showHistory = ref(false)
const fixResults = ref([])

const filterCollection = ref('')
const filterSeverity = ref('')
const filterType = ref('')
const filterFixable = ref(false)
const selectedIssueIds = ref(new Set())
const selectAll = ref(false)

const confirmDialog = ref({
  visible: false,
  icon: '',
  title: '',
  message: '',
  details: [],
  warning: '',
  danger: false,
  confirmText: '',
  onConfirm: null
})

let issueIdCounter = 0

function generateStableIssueId(issue) {
  const parts = [
    issue.collection,
    String(issue.itemId || `idx-${issue.index}`),
    issue.type,
    issue.field || ''
  ]
  return parts.join('|||')
}

function ensureIssueHasStableId(issue) {
  if (!issue._stableId) {
    issue._stableId = generateStableIssueId(issue)
    issue._uniqueId = `issue-${++issueIdCounter}-${Date.now()}`
  }
  return issue._stableId
}

onMounted(() => {
  loadDataSummary()
})

async function loadDataSummary() {
  loadingData.value = true
  try {
    const response = await fetch('/api/data/summary')
    dataSummary.value = await response.json()
  } catch (error) {
    console.error('加载数据摘要失败:', error)
  } finally {
    loadingData.value = false
  }
}

async function runInspection() {
  inspecting.value = true
  fixResults.value = []
  selectedIssueIds.value = new Set()
  selectAll.value = false
  try {
    const response = await fetch('/api/inspection')
    const result = await response.json()
    
    result.issues.forEach(issue => ensureIssueHasStableId(issue))
    
    lastResult.value = result
    resetFilters()
  } catch (error) {
    console.error('巡检失败:', error)
    alert('巡检失败，请稍后重试')
  } finally {
    inspecting.value = false
  }
}

async function loadHistory() {
  if (showHistory.value) {
    showHistory.value = false
    return
  }
  loadingHistory.value = true
  try {
    const response = await fetch('/api/inspection/history')
    history.value = await response.json()
    showHistory.value = true
  } catch (error) {
    console.error('加载历史失败:', error)
  } finally {
    loadingHistory.value = false
  }
}

function showConfirm(options) {
  confirmDialog.value = {
    visible: true,
    icon: options.icon || '❓',
    title: options.title || '确认操作',
    message: options.message || '确定要执行此操作吗？',
    details: options.details || [],
    warning: options.warning || '',
    danger: options.danger || false,
    confirmText: options.confirmText || '确认',
    onConfirm: options.onConfirm
  }
}

function cancelConfirm() {
  confirmDialog.value.visible = false
  confirmDialog.value.onConfirm = null
}

async function executeConfirm() {
  if (confirmDialog.value.onConfirm) {
    try {
      await confirmDialog.value.onConfirm()
    } finally {
      confirmDialog.value.visible = false
      confirmDialog.value.onConfirm = null
    }
  }
}

function analyzeFixActions(issues) {
  const actions = {
    set_default: 0,
    convert_type: 0,
    regenerate_id: 0,
    fix_date: 0,
    delete_item: 0,
    other: 0
  }
  
  issues.forEach(issue => {
    if (issue.suggestedFix) {
      const action = issue.suggestedFix.action
      if (actions[action] !== undefined) {
        actions[action]++
      } else {
        actions.other++
      }
    }
  })
  
  return actions
}

function getFixSummary(issues) {
  const actions = analyzeFixActions(issues)
  const details = []
  
  if (actions.set_default > 0) details.push(`设置默认值：${actions.set_default} 项`)
  if (actions.convert_type > 0) details.push(`类型转换：${actions.convert_type} 项`)
  if (actions.regenerate_id > 0) details.push(`重新生成ID：${actions.regenerate_id} 项`)
  if (actions.fix_date > 0) details.push(`修复日期：${actions.fix_date} 项`)
  if (actions.delete_item > 0) details.push(`删除数据：${actions.delete_item} 项`)
  
  return { actions, details, hasDelete: actions.delete_item > 0 }
}

async function fixSingle(issue) {
  const summary = getFixSummary([issue])
  const issueId = ensureIssueHasStableId(issue)
  
  showConfirm({
    icon: summary.hasDelete ? '⚠️' : '🔧',
    title: summary.hasDelete ? '危险操作确认' : '修复确认',
    message: summary.hasDelete 
      ? `此操作将删除「${issue.collectionDisplayName}」中的一条数据，删除后无法恢复。`
      : `确定要修复「${issue.collectionDisplayName}」的这个问题吗？`,
    details: [
      `问题：${issue.message}`,
      `建议修复：${getFixDescription(issue)}`
    ],
    warning: summary.hasDelete ? '删除操作不可撤销，请确认您了解后果！' : '',
    danger: summary.hasDelete,
    confirmText: summary.hasDelete ? '确认删除' : '确认修复',
    onConfirm: async () => {
      fixing.value = true
      try {
        const response = await fetch('/api/inspection/fix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ issues: [{ ...issue, _stableId: issueId }] })
        })
        const data = await response.json()
        fixResults.value = data.results
        showFixResults(data)
        await runInspection()
      } catch (error) {
        console.error('修复失败:', error)
        alert('修复失败，请稍后重试')
      } finally {
        fixing.value = false
      }
    }
  })
}

async function fixSelected() {
  const issues = getSelectedIssues()
  if (issues.length === 0) return
  
  const summary = getFixSummary(issues)
  
  showConfirm({
    icon: summary.hasDelete ? '⚠️' : '🔧',
    title: summary.hasDelete ? '危险操作确认' : '批量修复确认',
    message: `确定要修复选中的 ${issues.length} 个问题吗？`,
    details: summary.details,
    warning: summary.hasDelete ? '此操作包含删除操作，删除后无法恢复！' : '',
    danger: summary.hasDelete,
    confirmText: summary.hasDelete ? '确认修复并删除' : '确认修复',
    onConfirm: async () => {
      fixing.value = true
      try {
        const issuesWithIds = issues.map(i => ({ ...i, _stableId: ensureIssueHasStableId(i) }))
        const response = await fetch('/api/inspection/fix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ issues: issuesWithIds })
        })
        const data = await response.json()
        fixResults.value = data.results
        showFixResults(data)
        selectedIssueIds.value = new Set()
        selectAll.value = false
        await runInspection()
      } catch (error) {
        console.error('修复失败:', error)
        alert('修复失败，请稍后重试')
      } finally {
        fixing.value = false
      }
    }
  })
}

async function fixAll() {
  if (!lastResult.value) return
  
  const fixableIssues = lastResult.value.issues.filter(i => i.fixable)
  const summary = getFixSummary(fixableIssues)
  
  showConfirm({
    icon: summary.hasDelete ? '⚠️' : '✨',
    title: summary.hasDelete ? '危险操作确认' : '一键修复确认',
    message: `确定要修复所有可修复的 ${fixableIssues.length} 个问题吗？`,
    details: summary.details,
    warning: summary.hasDelete ? '此操作包含删除操作，删除后无法恢复！' : '',
    danger: summary.hasDelete,
    confirmText: summary.hasDelete ? '确认全部修复并删除' : '确认全部修复',
    onConfirm: async () => {
      fixing.value = true
      try {
        const response = await fetch('/api/inspection/fix-all', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
        const data = await response.json()
        fixResults.value = data.results
        showFixResults(data)
        selectedIssueIds.value = new Set()
        selectAll.value = false
        await runInspection()
      } catch (error) {
        console.error('一键修复失败:', error)
        alert('一键修复失败，请稍后重试')
      } finally {
        fixing.value = false
      }
    }
  })
}

function showFixResults(data) {
}

function clearFixResults() {
  fixResults.value = []
}

const filteredIssues = computed(() => {
  if (!lastResult.value) return []
  let issues = lastResult.value.issues
  
  if (filterCollection.value) {
    issues = issues.filter(i => i.collection === filterCollection.value)
  }
  if (filterSeverity.value) {
    issues = issues.filter(i => i.severity === filterSeverity.value)
  }
  if (filterType.value) {
    issues = issues.filter(i => i.type === filterType.value)
  }
  if (filterFixable.value) {
    issues = issues.filter(i => i.fixable)
  }
  
  return issues
})

const fixableCount = computed(() => {
  if (!lastResult.value) return 0
  return lastResult.value.issues.filter(i => i.fixable).length
})

const fixableIssues = computed(() => {
  return filteredIssues.value.filter(i => i.fixable)
})

function getSelectedIssues() {
  if (!lastResult.value) return []
  return lastResult.value.issues.filter(issue => {
    const stableId = ensureIssueHasStableId(issue)
    return selectedIssueIds.value.has(stableId)
  })
}

const isIndeterminate = computed(() => {
  if (fixableIssues.value.length === 0) return false
  const selectedCount = fixableIssues.value.filter(i => isSelected(i)).length
  return selectedCount > 0 && selectedCount < fixableIssues.value.length
})

const fixSuccessCount = computed(() => {
  return fixResults.value.filter(r => r.success).length
})

const fixFailedCount = computed(() => {
  return fixResults.value.filter(r => !r.success).length
})

const fixResultMessage = computed(() => {
  if (fixSuccessCount.value > 0 && fixFailedCount.value === 0) {
    return '所有修复操作成功完成！'
  } else if (fixSuccessCount.value > 0) {
    return '部分修复操作成功'
  } else {
    return '修复操作失败'
  }
})

const fixResultIcon = computed(() => {
  if (fixSuccessCount.value > 0 && fixFailedCount.value === 0) return '✅'
  if (fixSuccessCount.value > 0) return '⚠️'
  return '❌'
})

const fixResultClass = computed(() => {
  if (fixSuccessCount.value > 0 && fixFailedCount.value === 0) return 'all-success'
  if (fixSuccessCount.value > 0) return 'partial'
  return 'all-failed'
})

function getIssueKey(issue, index) {
  const stableId = ensureIssueHasStableId(issue)
  return `${issue._uniqueId || stableId}-${index}`
}

function isSelected(issue) {
  const stableId = ensureIssueHasStableId(issue)
  return selectedIssueIds.value.has(stableId)
}

function toggleIssue(issue) {
  const stableId = ensureIssueHasStableId(issue)
  const newSet = new Set(selectedIssueIds.value)
  
  if (newSet.has(stableId)) {
    newSet.delete(stableId)
  } else {
    newSet.add(stableId)
  }
  
  selectedIssueIds.value = newSet
  updateSelectAllState()
}

function updateSelectAllState() {
  const fixable = fixableIssues.value
  if (fixable.length === 0) {
    selectAll.value = false
    return
  }
  
  const selectedCount = fixable.filter(i => isSelected(i)).length
  selectAll.value = selectedCount === fixable.length
}

function toggleSelectAll() {
  const newSet = new Set()
  
  if (!selectAll.value) {
    fixableIssues.value.forEach(issue => {
      const stableId = ensureIssueHasStableId(issue)
      newSet.add(stableId)
    })
    selectAll.value = true
  } else {
    selectAll.value = false
  }
  
  selectedIssueIds.value = newSet
}

function resetFilters() {
  filterCollection.value = ''
  filterSeverity.value = ''
  filterType.value = ''
  filterFixable.value = false
}

function getCollectionIcon(collection) {
  const icons = {
    secrets: '💫',
    replies: '💬',
    reports: '🚨',
    likes: '❤️',
    topics: '📁'
  }
  return icons[collection] || '📄'
}

function getSeverityLabel(severity) {
  const labels = {
    critical: '致命',
    high: '严重',
    medium: '中等',
    low: '轻微'
  }
  return labels[severity] || severity
}

function getTypeLabel(type) {
  const labels = {
    missing_field: '缺少字段',
    type_mismatch: '类型错误',
    invalid_id: '无效ID',
    invalid_date: '无效日期',
    empty_content: '空内容',
    missing_reference: '缺少引用',
    broken_reference: '引用断裂',
    duplicate_id: 'ID重复',
    read_error: '读取错误',
    invalid_reference_target: '无效引用目标'
  }
  return labels[type] || type
}

function getFixDescription(issue) {
  if (!issue.suggestedFix) return '无可用修复方案'
  const fix = issue.suggestedFix
  const descriptions = {
    set_default: `为字段「${fix.field}」设置默认值`,
    convert_type: `将字段「${fix.field}」转换为${fix.targetType}类型`,
    regenerate_id: `重新生成ID`,
    fix_date: `修复日期字段「${fix.field}」`,
    delete_item: `删除此数据项（${fix.reason || '数据损坏'}）`
  }
  return descriptions[fix.action] || fix.action
}

function showDetails(issue) {
  return issue.field || issue.targetCollectionDisplayName || issue.referencedId || issue.firstIndex !== undefined
}

function formatTime(timestamp) {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}
</script>

<style scoped>
.inspection-container {
  width: 100%;
  max-width: 900px;
}

.inspection-card {
  animation: slideUp 0.6s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card-header {
  text-align: center;
  margin-bottom: 30px;
}

.icon {
  font-size: 56px;
  display: block;
  margin-bottom: 15px;
}

.card-header h2 {
  color: #333;
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 10px;
}

.subtitle {
  color: #666;
  font-size: 15px;
}

.inspection-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 30px;
}

.loading-state {
  text-align: center;
  padding: 60px 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(102, 126, 234, 0.3);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.btn-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 8px;
  vertical-align: middle;
}

.btn-sm {
  padding: 8px 20px;
  font-size: 14px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.data-summary {
  margin-bottom: 30px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 15px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.summary-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.summary-icon {
  font-size: 32px;
}

.summary-name {
  font-weight: 600;
  color: #333;
  font-size: 15px;
}

.summary-count {
  font-size: 13px;
  color: #666;
}

.inspection-result {
  margin-top: 30px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 20px;
}

.result-meta {
  display: flex;
  gap: 15px;
  font-size: 13px;
  color: #999;
}

.result-summary {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.summary-badge {
  flex: 1;
  min-width: 100px;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%);
}

.summary-badge.no-issues {
  background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
  color: #2d5a4a;
}

.summary-badge.severity-high {
  background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
  color: #9b2c2c;
}

.summary-badge.severity-medium {
  background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
  color: #92400e;
}

.summary-badge.severity-low {
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
  color: #2c5282;
}

.summary-badge.fixable {
  background: linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%);
  color: #276749;
}

.summary-number {
  display: block;
  font-size: 28px;
  font-weight: 700;
}

.summary-label {
  font-size: 13px;
  opacity: 0.9;
}

.result-message {
  padding: 15px 20px;
  background: linear-gradient(135deg, #fef9e7 0%, #fdf2e9 100%);
  border-radius: 10px;
  border-left: 4px solid #f59e0b;
  color: #78350f;
  margin-bottom: 20px;
  font-size: 15px;
}

.filter-bar {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
  margin-bottom: 20px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #555;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.filter-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.batch-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: #eef2ff;
  border-radius: 10px;
  margin-bottom: 20px;
}

.select-all {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #4338ca;
  cursor: pointer;
}

.issues-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.issue-item {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.issue-item:hover {
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.issue-item.severity-critical {
  border-left: 4px solid #991b1b;
}

.issue-item.severity-high {
  border-left: 4px solid #dc2626;
}

.issue-item.severity-medium {
  border-left: 4px solid #f59e0b;
}

.issue-item.severity-low {
  border-left: 4px solid #10b981;
}

.issue-item.selected {
  background: #eef2ff;
  border-color: #667eea;
}

.issue-item.fixable {
  cursor: pointer;
}

.issue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: #f9fafb;
  flex-wrap: wrap;
  gap: 10px;
}

.issue-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.issue-left input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.severity-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.severity-badge.severity-critical {
  background: #fee2e2;
  color: #991b1b;
}

.severity-badge.severity-high {
  background: #fee2e2;
  color: #dc2626;
}

.severity-badge.severity-medium {
  background: #fef3c7;
  color: #d97706;
}

.severity-badge.severity-low {
  background: #d1fae5;
  color: #059669;
}

.collection-badge {
  padding: 4px 12px;
  background: #e0e7ff;
  color: #4338ca;
  border-radius: 20px;
  font-size: 12px;
}

.type-badge {
  padding: 4px 12px;
  background: #f3e8ff;
  color: #7c3aed;
  border-radius: 20px;
  font-size: 12px;
}

.fixable-badge {
  padding: 4px 12px;
  background: #d1fae5;
  color: #059669;
  border-radius: 20px;
  font-size: 12px;
}

.unfixable-badge {
  padding: 4px 12px;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 20px;
  font-size: 12px;
}

.issue-body {
  padding: 20px;
}

.issue-message {
  color: #333;
  font-size: 15px;
  line-height: 1.6;
  margin-bottom: 15px;
}

.issue-details {
  padding: 15px;
  background: #f9fafb;
  border-radius: 8px;
}

.detail-row {
  display: flex;
  gap: 10px;
  margin-bottom: 8px;
  font-size: 13px;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.detail-label {
  color: #666;
  min-width: 80px;
}

.detail-value {
  color: #333;
  font-family: 'Consolas', monospace;
  word-break: break-all;
}

.issue-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: #f8fafc;
  border-top: 1px solid #e5e7eb;
  flex-wrap: wrap;
  gap: 15px;
}

.suggested-fix {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #555;
}

.fix-label {
  font-weight: 600;
  color: #667eea;
}

.empty-filter {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.history-section {
  margin-top: 30px;
  padding-top: 30px;
  border-top: 1px solid #e5e7eb;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 300px;
  overflow-y: auto;
}

.history-item {
  padding: 15px 20px;
  background: #f8fafc;
  border-radius: 10px;
  border-left: 3px solid #667eea;
}

.history-time {
  font-size: 13px;
  color: #666;
  margin-bottom: 5px;
}

.history-stats {
  display: flex;
  gap: 20px;
  font-size: 14px;
  margin-bottom: 5px;
}

.history-stats .has-issues {
  color: #dc2626;
  font-weight: 600;
}

.history-summary {
  font-size: 14px;
  color: #555;
}

.fix-results {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  max-width: 600px;
  width: calc(100% - 40px);
}

.result-card {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px;
  border-radius: 15px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  margin-bottom: 10px;
}

.result-card.all-success {
  background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
  color: #2d5a4a;
}

.result-card.partial {
  background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
  color: #92400e;
}

.result-card.all-failed {
  background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
  color: #9b2c2c;
}

.result-icon {
  font-size: 36px;
}

.result-content {
  flex: 1;
}

.result-content h4 {
  margin: 0 0 5px 0;
  font-size: 16px;
}

.result-stats {
  display: flex;
  gap: 15px;
  font-size: 13px;
}

.result-stats .success {
  color: #059669;
  font-weight: 600;
}

.result-stats .failed {
  color: #dc2626;
  font-weight: 600;
}

.result-details {
  max-height: 200px;
  overflow-y: auto;
  background: white;
  border-radius: 10px;
  padding: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.result-detail-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  font-size: 13px;
  border-radius: 6px;
  margin-bottom: 5px;
}

.result-detail-item:last-child {
  margin-bottom: 0;
}

.result-detail-item.success {
  background: #d1fae5;
  color: #065f46;
}

.result-detail-item.failed {
  background: #fee2e2;
  color: #991b1b;
}

@media (max-width: 600px) {
  .inspection-actions {
    flex-direction: column;
  }
  
  .inspection-actions .btn {
    width: 100%;
  }
  
  .result-summary {
    flex-direction: column;
  }
  
  .filter-bar {
    flex-direction: column;
  }
  
  .batch-actions {
    flex-direction: column;
    gap: 15px;
  }
  
  .issue-header,
  .issue-footer {
    flex-direction: column;
    align-items: flex-start;
  }
}

.btn-danger {
  background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(220, 38, 38, 0.4);
}

.btn-danger:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(220, 38, 38, 0.6);
}

.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-dialog {
  background: white;
  border-radius: 20px;
  max-width: 500px;
  width: calc(100% - 40px);
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  padding: 30px 30px 20px;
  text-align: center;
  border-bottom: 1px solid #eee;
}

.modal-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 15px;
}

.modal-header h3 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #333;
}

.modal-body {
  padding: 25px 30px;
  overflow-y: auto;
  flex: 1;
}

.modal-body p {
  color: #555;
  font-size: 15px;
  line-height: 1.7;
  margin-bottom: 20px;
}

.modal-details {
  background: #f8fafc;
  border-radius: 12px;
  padding: 15px 20px;
  margin-bottom: 20px;
}

.modal-details h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  font-weight: 600;
  color: #444;
}

.modal-details ul {
  margin: 0;
  padding-left: 20px;
}

.modal-details li {
  color: #555;
  font-size: 14px;
  line-height: 1.8;
  margin-bottom: 5px;
}

.modal-details li:last-child {
  margin-bottom: 0;
}

.modal-warning {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 15px 20px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 10px;
  border-left: 4px solid #dc2626;
}

.modal-warning span {
  font-size: 20px;
  flex-shrink: 0;
}

.modal-warning p {
  margin: 0;
  color: #991b1b;
  font-size: 14px;
  font-weight: 500;
}

.modal-footer {
  display: flex;
  gap: 15px;
  justify-content: flex-end;
  padding: 20px 30px 30px;
  border-top: 1px solid #eee;
  background: #fafafa;
}

.modal-footer .btn {
  min-width: 100px;
}
</style>
