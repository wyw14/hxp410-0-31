const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 41131;

const DATA_DIR = path.join(__dirname, 'data');
const SECRETS_FILE = path.join(DATA_DIR, 'secrets.json');
const REPLIES_FILE = path.join(DATA_DIR, 'replies.json');
const REPORTS_FILE = path.join(DATA_DIR, 'reports.json');
const LIKES_FILE = path.join(DATA_DIR, 'likes.json');
const TOPICS_FILE = path.join(DATA_DIR, 'topics.json');
const INSPECTION_HISTORY_FILE = path.join(DATA_DIR, 'inspection-history.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(SECRETS_FILE)) {
  fs.writeFileSync(SECRETS_FILE, JSON.stringify([]));
}
if (!fs.existsSync(REPLIES_FILE)) {
  fs.writeFileSync(REPLIES_FILE, JSON.stringify([]));
}
if (!fs.existsSync(REPORTS_FILE)) {
  fs.writeFileSync(REPORTS_FILE, JSON.stringify([]));
}
if (!fs.existsSync(LIKES_FILE)) {
  fs.writeFileSync(LIKES_FILE, JSON.stringify([]));
}
if (!fs.existsSync(TOPICS_FILE)) {
  fs.writeFileSync(TOPICS_FILE, JSON.stringify([]));
}
if (!fs.existsSync(INSPECTION_HISTORY_FILE)) {
  fs.writeFileSync(INSPECTION_HISTORY_FILE, JSON.stringify([]));
}

app.use(cors());
app.use(express.json());

function readJSON(filePath) {
  const data = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(data);
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function readSecrets() {
  return readJSON(SECRETS_FILE);
}

function writeSecrets(secrets) {
  writeJSON(SECRETS_FILE, secrets);
}

function readReplies() {
  return readJSON(REPLIES_FILE);
}

function writeReplies(replies) {
  writeJSON(REPLIES_FILE, replies);
}

function readReports() {
  return readJSON(REPORTS_FILE);
}

function writeReports(reports) {
  writeJSON(REPORTS_FILE, reports);
}

function readLikes() {
  return readJSON(LIKES_FILE);
}

function writeLikes(likes) {
  writeJSON(LIKES_FILE, likes);
}

function readTopics() {
  return readJSON(TOPICS_FILE);
}

function writeTopics(topics) {
  writeJSON(TOPICS_FILE, topics);
}

function readInspectionHistory() {
  return readJSON(INSPECTION_HISTORY_FILE);
}

function writeInspectionHistory(history) {
  writeJSON(INSPECTION_HISTORY_FILE, history);
}

app.post('/api/secrets', (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: '秘密内容不能为空' });
    }

    const secrets = readSecrets();
    const newSecret = {
      id: uuidv4(),
      content: content.trim(),
      status: '已宽恕',
      createdAt: new Date().toISOString()
    };

    secrets.push(newSecret);
    writeSecrets(secrets);

    res.json({
      success: true,
      message: '你的秘密已被宽恕',
      secret: newSecret
    });
  } catch (error) {
    console.error('保存秘密时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/secrets/random', (req, res) => {
  try {
    const secrets = readSecrets();
    const forgivenSecrets = secrets.filter(s => s.status === '已宽恕');

    if (forgivenSecrets.length === 0) {
      return res.json({
        hasSecret: false,
        message: '还没有被宽恕的秘密，成为第一个分享的人吧'
      });
    }

    const randomIndex = Math.floor(Math.random() * forgivenSecrets.length);
    const randomSecret = forgivenSecrets[randomIndex];

    res.json({
      hasSecret: true,
      secret: {
        id: randomSecret.id,
        content: randomSecret.content,
        status: randomSecret.status
      }
    });
  } catch (error) {
    console.error('获取随机秘密时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const DATA_SCHEMAS = {
  secrets: {
    name: '秘密',
    requiredFields: ['id', 'content', 'status', 'createdAt'],
    fieldTypes: {
      id: 'string',
      content: 'string',
      status: 'string',
      createdAt: 'string',
      topicId: 'string'
    },
    references: {
      topicId: { collection: 'topics', field: 'id', optional: true }
    }
  },
  replies: {
    name: '回复',
    requiredFields: ['id', 'secretId', 'content', 'createdAt'],
    fieldTypes: {
      id: 'string',
      secretId: 'string',
      content: 'string',
      createdAt: 'string',
      status: 'string'
    },
    references: {
      secretId: { collection: 'secrets', field: 'id', optional: false }
    }
  },
  reports: {
    name: '举报',
    requiredFields: ['id', 'targetType', 'targetId', 'reason', 'createdAt'],
    fieldTypes: {
      id: 'string',
      targetType: 'string',
      targetId: 'string',
      reason: 'string',
      createdAt: 'string',
      status: 'string'
    },
    references: {
      targetId: { collectionRef: 'targetType', field: 'id', optional: false }
    }
  },
  likes: {
    name: '点亮',
    requiredFields: ['id', 'secretId', 'createdAt'],
    fieldTypes: {
      id: 'string',
      secretId: 'string',
      createdAt: 'string'
    },
    references: {
      secretId: { collection: 'secrets', field: 'id', optional: false }
    }
  },
  topics: {
    name: '专题',
    requiredFields: ['id', 'name', 'description', 'createdAt'],
    fieldTypes: {
      id: 'string',
      name: 'string',
      description: 'string',
      createdAt: 'string',
      status: 'string'
    },
    references: {}
  }
};

const DATA_READERS = {
  secrets: readSecrets,
  replies: readReplies,
  reports: readReports,
  likes: readLikes,
  topics: readTopics
};

const DATA_WRITERS = {
  secrets: writeSecrets,
  replies: writeReplies,
  reports: writeReports,
  likes: writeLikes,
  topics: writeTopics
};

const DATA_FILES = {
  secrets: SECRETS_FILE,
  replies: REPLIES_FILE,
  reports: REPORTS_FILE,
  likes: LIKES_FILE,
  topics: TOPICS_FILE
};

function isValidDateString(str) {
  if (typeof str !== 'string') return false;
  const date = new Date(str);
  return !isNaN(date.getTime());
}

function isValidUUID(str) {
  if (typeof str !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str) || /^\d+$/.test(str);
}

function checkMissingFields(item, schema, collectionName, index) {
  const issues = [];
  for (const field of schema.requiredFields) {
    if (item[field] === undefined || item[field] === null) {
      issues.push({
        type: 'missing_field',
        severity: 'high',
        collection: collectionName,
        collectionDisplayName: schema.name,
        index,
        itemId: item.id || `index-${index}`,
        field,
        message: `缺少必填字段「${field}」`,
        fixable: true,
        suggestedFix: {
          action: 'set_default',
          field,
          defaultValue: getDefaultValue(field, schema)
        }
      });
    }
  }
  return issues;
}

function getDefaultValue(field, schema) {
  const type = schema.fieldTypes[field];
  if (field === 'id') return uuidv4();
  if (field === 'createdAt') return new Date().toISOString();
  if (field === 'status') return '正常';
  if (type === 'string') return '';
  if (type === 'number') return 0;
  if (type === 'boolean') return false;
  if (type === 'array') return [];
  if (type === 'object') return {};
  return null;
}

function checkFieldTypes(item, schema, collectionName, index) {
  const issues = [];
  for (const [field, expectedType] of Object.entries(schema.fieldTypes)) {
    if (item[field] === undefined || item[field] === null) continue;
    
    const actualType = typeof item[field];
    let isValid = true;
    let typeMismatch = false;
    
    if (expectedType === 'string' && actualType !== 'string') {
      isValid = false;
      typeMismatch = true;
    } else if (expectedType === 'number' && actualType !== 'number') {
      isValid = false;
      typeMismatch = true;
    } else if (expectedType === 'boolean' && actualType !== 'boolean') {
      isValid = false;
      typeMismatch = true;
    } else if (expectedType === 'array' && !Array.isArray(item[field])) {
      isValid = false;
      typeMismatch = true;
    } else if (expectedType === 'object' && (actualType !== 'object' || Array.isArray(item[field]))) {
      isValid = false;
      typeMismatch = true;
    }
    
    if (!isValid) {
      issues.push({
        type: 'type_mismatch',
        severity: 'high',
        collection: collectionName,
        collectionDisplayName: schema.name,
        index,
        itemId: item.id || `index-${index}`,
        field,
        expectedType,
        actualType,
        message: `字段「${field}」类型错误，期望${expectedType}，实际${actualType}`,
        fixable: true,
        suggestedFix: {
          action: 'convert_type',
          field,
          targetType: expectedType
        }
      });
    }
    
    if (field === 'id' && typeof item[field] === 'string' && !isValidUUID(item[field])) {
      issues.push({
        type: 'invalid_id',
        severity: 'medium',
        collection: collectionName,
        collectionDisplayName: schema.name,
        index,
        itemId: item.id || `index-${index}`,
        field,
        message: `ID格式无效`,
        fixable: true,
        suggestedFix: {
          action: 'regenerate_id',
          field
        }
      });
    }
    
    if (field === 'createdAt' && typeof item[field] === 'string' && !isValidDateString(item[field])) {
      issues.push({
        type: 'invalid_date',
        severity: 'medium',
        collection: collectionName,
        collectionDisplayName: schema.name,
        index,
        itemId: item.id || `index-${index}`,
        field,
        message: `日期格式无效`,
        fixable: true,
        suggestedFix: {
          action: 'fix_date',
          field
        }
      });
    }
    
    if (field === 'content' && typeof item[field] === 'string' && item[field].trim() === '') {
      issues.push({
        type: 'empty_content',
        severity: 'low',
        collection: collectionName,
        collectionDisplayName: schema.name,
        index,
        itemId: item.id || `index-${index}`,
        field,
        message: `内容为空`,
        fixable: false
      });
    }
  }
  return issues;
}

function checkReferences(item, schema, collectionName, index, allData) {
  const issues = [];
  for (const [field, refConfig] of Object.entries(schema.references)) {
    if (item[field] === undefined || item[field] === null) {
      if (!refConfig.optional) {
        issues.push({
          type: 'missing_reference',
          severity: 'high',
          collection: collectionName,
          collectionDisplayName: schema.name,
          index,
          itemId: item.id || `index-${index}`,
          field,
          message: `缺少引用字段「${field}」`,
          fixable: false
        });
      }
      continue;
    }
    
    let targetCollection = refConfig.collection;
    if (refConfig.collectionRef) {
      targetCollection = item[refConfig.collectionRef];
      if (!targetCollection || !DATA_SCHEMAS[targetCollection]) {
        issues.push({
          type: 'invalid_reference_target',
          severity: 'high',
          collection: collectionName,
          collectionDisplayName: schema.name,
          index,
          itemId: item.id || `index-${index}`,
          field,
          targetType: item[refConfig.collectionRef],
          message: `无效的引用目标类型「${item[refConfig.collectionRef]}」`,
          fixable: false
        });
        continue;
      }
    }
    
    const targetData = allData[targetCollection];
    const referencedItem = targetData.find(t => t[refConfig.field] === item[field]);
    
    if (!referencedItem) {
      issues.push({
        type: 'broken_reference',
        severity: 'high',
        collection: collectionName,
        collectionDisplayName: schema.name,
        index,
        itemId: item.id || `index-${index}`,
        field,
        targetCollection,
        targetCollectionDisplayName: DATA_SCHEMAS[targetCollection]?.name || targetCollection,
        referencedId: item[field],
        message: `引用断裂：${DATA_SCHEMAS[targetCollection]?.name || targetCollection}中不存在ID为「${item[field]}」的记录`,
        fixable: true,
        suggestedFix: {
          action: 'delete_item',
          reason: '引用的目标记录不存在'
        }
      });
    }
  }
  return issues;
}

function checkDuplicateIds(items, collectionName, schema) {
  const issues = [];
  const idMap = new Map();
  
  items.forEach((item, index) => {
    const id = item.id;
    if (id === undefined || id === null) return;
    
    if (idMap.has(id)) {
      const firstIndex = idMap.get(id);
      issues.push({
        type: 'duplicate_id',
        severity: 'high',
        collection: collectionName,
        collectionDisplayName: schema.name,
        index,
        itemId: id,
        firstIndex,
        field: 'id',
        message: `ID重复：「${id}」已存在于索引${firstIndex}处`,
        fixable: true,
        suggestedFix: {
          action: 'regenerate_id',
          field: 'id'
        }
      });
    } else {
      idMap.set(id, index);
    }
  });
  
  return issues;
}

function runInspection() {
  const startTime = Date.now();
  const allData = {};
  const allIssues = [];
  const stats = {
    totalItems: 0,
    totalIssues: 0,
    byCollection: {},
    bySeverity: { high: 0, medium: 0, low: 0 },
    byType: {}
  };
  
  for (const [name, reader] of Object.entries(DATA_READERS)) {
    try {
      allData[name] = reader();
    } catch (e) {
      allData[name] = [];
      allIssues.push({
        type: 'read_error',
        severity: 'critical',
        collection: name,
        collectionDisplayName: DATA_SCHEMAS[name]?.name || name,
        message: `读取数据文件失败: ${e.message}`,
        fixable: false
      });
    }
  }
  
  for (const [collectionName, items] of Object.entries(allData)) {
    const schema = DATA_SCHEMAS[collectionName];
    if (!schema) continue;
    
    const collectionStats = {
      count: items.length,
      issues: 0,
      byType: {}
    };
    
    stats.totalItems += items.length;
    
    const duplicateIssues = checkDuplicateIds(items, collectionName, schema);
    allIssues.push(...duplicateIssues);
    
    items.forEach((item, index) => {
      const missingIssues = checkMissingFields(item, schema, collectionName, index);
      const typeIssues = checkFieldTypes(item, schema, collectionName, index);
      const refIssues = checkReferences(item, schema, collectionName, index, allData);
      
      allIssues.push(...missingIssues, ...typeIssues, ...refIssues);
    });
    
    const collectionIssues = allIssues.filter(i => i.collection === collectionName);
    collectionStats.issues = collectionIssues.length;
    
    collectionIssues.forEach(issue => {
      collectionStats.byType[issue.type] = (collectionStats.byType[issue.type] || 0) + 1;
      stats.bySeverity[issue.severity] = (stats.bySeverity[issue.severity] || 0) + 1;
      stats.byType[issue.type] = (stats.byType[issue.type] || 0) + 1;
    });
    
    stats.byCollection[collectionName] = collectionStats;
  }
  
  stats.totalIssues = allIssues.length;
  
  const result = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    duration: Date.now() - startTime,
    stats,
    issues: allIssues,
    summary: generateSummary(stats, allIssues)
  };
  
  const history = readInspectionHistory();
  history.unshift({
    id: result.id,
    timestamp: result.timestamp,
    duration: result.duration,
    totalIssues: result.stats.totalIssues,
    totalItems: result.stats.totalItems,
    summary: result.summary
  });
  if (history.length > 50) {
    history.pop();
  }
  writeInspectionHistory(history);
  
  return result;
}

function generateSummary(stats, issues) {
  const parts = [];
  
  if (stats.totalIssues === 0) {
    parts.push('所有数据检查通过，未发现问题');
  } else {
    parts.push(`共发现 ${stats.totalIssues} 个问题`);
    
    const severityLabels = { high: '严重', medium: '中等', low: '轻微', critical: '致命' };
    const severityParts = [];
    for (const [sev, count] of Object.entries(stats.bySeverity)) {
      if (count > 0) {
        severityParts.push(`${severityLabels[sev]}${count}个`);
      }
    }
    if (severityParts.length > 0) {
      parts.push(`（${severityParts.join('，')}）`);
    }
    
    const fixableCount = issues.filter(i => i.fixable).length;
    parts.push(`，其中可修复 ${fixableCount} 个`);
  }
  
  return parts.join('');
}

app.get('/api/inspection', (req, res) => {
  try {
    const result = runInspection();
    res.json(result);
  } catch (error) {
    console.error('执行巡检时出错:', error);
    res.status(500).json({ error: '执行巡检失败', details: error.message });
  }
});

app.get('/api/inspection/history', (req, res) => {
  try {
    const history = readInspectionHistory();
    res.json(history);
  } catch (error) {
    console.error('获取巡检历史时出错:', error);
    res.status(500).json({ error: '获取巡检历史失败' });
  }
});

app.post('/api/inspection/fix', (req, res) => {
  try {
    const { issues } = req.body;
    
    if (!Array.isArray(issues) || issues.length === 0) {
      return res.status(400).json({ error: '请提供要修复的问题列表' });
    }
    
    const allData = {};
    for (const [name, reader] of Object.entries(DATA_READERS)) {
      allData[name] = reader();
    }
    
    const results = [];
    
    for (const issue of issues) {
      try {
        const fixResult = applyFix(issue, allData);
        results.push(fixResult);
      } catch (e) {
        results.push({
          issueId: issue.id || `${issue.collection}-${issue.index}-${issue.type}`,
          success: false,
          message: `修复失败: ${e.message}`
        });
      }
    }
    
    for (const [name, writer] of Object.entries(DATA_WRITERS)) {
      if (allData[name] !== undefined) {
        writer(allData[name]);
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    res.json({
      success: true,
      message: `修复完成：成功${successCount}个，失败${failCount}个`,
      results,
      stats: {
        total: issues.length,
        success: successCount,
        failed: failCount
      }
    });
  } catch (error) {
    console.error('执行修复时出错:', error);
    res.status(500).json({ error: '执行修复失败', details: error.message });
  }
});

app.post('/api/inspection/fix-all', (req, res) => {
  try {
    const inspectionResult = runInspection();
    const fixableIssues = inspectionResult.issues.filter(i => i.fixable);
    
    if (fixableIssues.length === 0) {
      return res.json({
        success: true,
        message: '没有可自动修复的问题',
        results: [],
        stats: { total: 0, success: 0, failed: 0 }
      });
    }
    
    const allData = {};
    for (const [name, reader] of Object.entries(DATA_READERS)) {
      allData[name] = reader();
    }
    
    const results = [];
    
    for (const issue of fixableIssues) {
      try {
        const fixResult = applyFix(issue, allData);
        results.push(fixResult);
      } catch (e) {
        results.push({
          issueId: issue.id || `${issue.collection}-${issue.index}-${issue.type}`,
          success: false,
          message: `修复失败: ${e.message}`
        });
      }
    }
    
    for (const [name, writer] of Object.entries(DATA_WRITERS)) {
      if (allData[name] !== undefined) {
        writer(allData[name]);
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    res.json({
      success: true,
      message: `修复完成：成功${successCount}个，失败${failCount}个`,
      results,
      stats: {
        total: fixableIssues.length,
        success: successCount,
        failed: failCount
      }
    });
  } catch (error) {
    console.error('执行一键修复时出错:', error);
    res.status(500).json({ error: '执行一键修复失败', details: error.message });
  }
});

function findItemIndex(items, issue) {
  const { index, itemId, type, field } = issue;
  const itemIdStr = String(itemId);
  
  if (items[index]) {
    const item = items[index];
    if (item.id === itemId || 
        (itemIdStr && itemIdStr.startsWith('index-') && index === parseInt(itemIdStr.split('-')[1])) ||
        (field && item[field] !== undefined) ||
        type === 'duplicate_id') {
      return index;
    }
  }
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.id === itemId) {
      return i;
    }
    if (type === 'duplicate_id' && item.id === issue.itemId) {
      if (i !== issue.firstIndex) {
        return i;
      }
    }
    if (type === 'missing_field' && field && item[field] === undefined && item.id === itemId) {
      return i;
    }
  }
  
  return index;
}

function applyFix(issue, allData) {
  const { collection, field, suggestedFix, type, itemId } = issue;
  let { index } = issue;
  
  if (!suggestedFix) {
    return {
      issueId: itemId || `${collection}-${index}-${type}`,
      success: false,
      message: '没有可用的修复方案'
    };
  }
  
  const items = allData[collection];
  if (!items) {
    return {
      issueId: itemId || `${collection}-${index}-${type}`,
      success: false,
      message: '数据集合不存在'
    };
  }
  
  const actualIndex = findItemIndex(items, issue);
  if (!items[actualIndex]) {
    return {
      issueId: itemId || `${collection}-${index}-${type}`,
      success: false,
      message: '数据项不存在，可能已被修复或删除'
    };
  }
  
  const item = items[actualIndex];
  const fix = suggestedFix;
  
  switch (fix.action) {
    case 'set_default': {
      item[fix.field] = fix.defaultValue;
      return {
        issueId: itemId || `${collection}-${actualIndex}-${type}`,
        success: true,
        message: `已为字段「${fix.field}」设置默认值`
      };
    }
    
    case 'convert_type': {
      const value = item[fix.field];
      if (fix.targetType === 'string') {
        item[fix.field] = String(value);
      } else if (fix.targetType === 'number') {
        item[fix.field] = Number(value) || 0;
      } else if (fix.targetType === 'boolean') {
        item[fix.field] = Boolean(value);
      } else if (fix.targetType === 'array') {
        item[fix.field] = Array.isArray(value) ? value : [];
      } else if (fix.targetType === 'object') {
        item[fix.field] = typeof value === 'object' && value !== null ? value : {};
      }
      return {
        issueId: itemId || `${collection}-${actualIndex}-${type}`,
        success: true,
        message: `已将字段「${fix.field}」转换为${fix.targetType}类型`
      };
    }
    
    case 'regenerate_id': {
      const oldId = item.id;
      item.id = uuidv4();
      updateReferences(collection, oldId, item.id, allData);
      return {
        issueId: itemId || `${collection}-${actualIndex}-${type}`,
        success: true,
        message: `已重新生成ID：${oldId} → ${item.id}`
      };
    }
    
    case 'fix_date': {
      item[fix.field] = new Date().toISOString();
      return {
        issueId: itemId || `${collection}-${actualIndex}-${type}`,
        success: true,
        message: `已修复日期字段「${fix.field}」`
      };
    }
    
    case 'delete_item': {
      items.splice(actualIndex, 1);
      return {
        issueId: itemId || `${collection}-${actualIndex}-${type}`,
        success: true,
        message: `已删除数据项（${fix.reason || '引用断裂'}）`
      };
    }
    
    default:
      return {
        issueId: itemId || `${collection}-${actualIndex}-${type}`,
        success: false,
        message: `未知的修复操作：${fix.action}`
      };
  }
}

function updateReferences(collection, oldId, newId, allData) {
  for (const [schemaName, schema] of Object.entries(DATA_SCHEMAS)) {
    for (const [field, refConfig] of Object.entries(schema.references)) {
      if (refConfig.collection === collection || 
          (refConfig.collectionRef && schemaName === 'reports')) {
        const items = allData[schemaName];
        if (items) {
          for (const item of items) {
            if (item[field] === oldId) {
              if (refConfig.collectionRef && item[refConfig.collectionRef] !== collection) {
                continue;
              }
              item[field] = newId;
            }
          }
        }
      }
    }
  }
}

app.get('/api/data/summary', (req, res) => {
  try {
    const summary = {};
    
    for (const [name, reader] of Object.entries(DATA_READERS)) {
      const data = reader();
      summary[name] = {
        displayName: DATA_SCHEMAS[name]?.name || name,
        count: data.length,
        file: DATA_FILES[name]
      };
    }
    
    res.json(summary);
  } catch (error) {
    console.error('获取数据摘要时出错:', error);
    res.status(500).json({ error: '获取数据摘要失败' });
  }
});

app.get('/api/data/:collection', (req, res) => {
  try {
    const { collection } = req.params;
    const reader = DATA_READERS[collection];
    
    if (!reader) {
      return res.status(404).json({ error: '未知的数据集合' });
    }
    
    const data = reader();
    res.json({
      collection,
      displayName: DATA_SCHEMAS[collection]?.name || collection,
      count: data.length,
      data
    });
  } catch (error) {
    console.error('获取数据时出错:', error);
    res.status(500).json({ error: '获取数据失败' });
  }
});

app.listen(PORT, () => {
  console.log(`忏悔室后端服务运行在 http://localhost:${PORT}`);
});
