const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function post(url, body) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('========== 数据巡检模块测试 ==========\n');

  try {
    console.log('1. 测试数据摘要 API...');
    const summary = await get('http://localhost:41131/api/data/summary');
    console.log('   数据集合:', Object.keys(summary).join(', '));
    for (const [key, value] of Object.entries(summary)) {
      console.log(`   - ${value.displayName}: ${value.count} 条`);
    }
    console.log('   ✓ 数据摘要 API 正常\n');

    console.log('2. 测试巡检 API...');
    const result = await get('http://localhost:41131/api/inspection');
    console.log(`   扫描记录总数: ${result.stats.totalItems}`);
    console.log(`   发现问题总数: ${result.stats.totalIssues}`);
    console.log(`   巡检摘要: ${result.summary}`);
    console.log(`   耗时: ${result.duration}ms`);
    console.log('');
    
    console.log('   按集合统计:');
    for (const [key, value] of Object.entries(result.stats.byCollection)) {
      console.log(`   - ${key}: ${value.count}条, ${value.issues}个问题`);
    }
    console.log('');
    
    console.log('   按严重程度:');
    console.log(`   - 严重: ${result.stats.bySeverity.high}`);
    console.log(`   - 中等: ${result.stats.bySeverity.medium}`);
    console.log(`   - 轻微: ${result.stats.bySeverity.low}`);
    console.log('');
    
    console.log('   按问题类型:');
    for (const [type, count] of Object.entries(result.stats.byType)) {
      console.log(`   - ${type}: ${count}`);
    }
    console.log('');
    
    console.log('   前15个问题:');
    result.issues.slice(0, 15).forEach((issue, i) => {
      const fixable = issue.fixable ? '[可修复]' : '[需手动]';
      console.log(`   ${i+1}. [${issue.severity}] ${fixable} ${issue.collectionDisplayName} - ${issue.type}: ${issue.message}`);
    });
    if (result.issues.length > 15) {
      console.log(`   ... 还有 ${result.issues.length - 15} 个问题`);
    }
    console.log('   ✓ 巡检 API 正常\n');

    console.log('3. 测试一键修复 API...');
    const fixableIssues = result.issues.filter(i => i.fixable);
    console.log(`   可修复问题数: ${fixableIssues.length}`);
    
    if (fixableIssues.length > 0) {
      const fixResult = await post('http://localhost:41131/api/inspection/fix-all', {});
      console.log(`   修复结果: ${fixResult.message}`);
      console.log(`   总计: ${fixResult.stats.total}, 成功: ${fixResult.stats.success}, 失败: ${fixResult.stats.failed}`);
      
      if (fixResult.results.length > 0) {
        console.log('');
        console.log('   前10个修复结果:');
        fixResult.results.slice(0, 10).forEach((r, i) => {
          const status = r.success ? '✓' : '✗';
          console.log(`   ${i+1}. ${status} ${r.message}`);
        });
      }
      console.log('   ✓ 一键修复 API 正常\n');

      console.log('4. 验证修复后再次巡检...');
      const result2 = await get('http://localhost:41131/api/inspection');
      console.log(`   修复前问题数: ${result.stats.totalIssues}`);
      console.log(`   修复后问题数: ${result2.stats.totalIssues}`);
      console.log(`   减少问题数: ${result.stats.totalIssues - result2.stats.totalIssues}`);
      console.log(`   巡检摘要: ${result2.summary}`);
      console.log('   ✓ 修复验证完成\n');
    }

    console.log('5. 测试巡检历史 API...');
    const history = await get('http://localhost:41131/api/inspection/history');
    console.log(`   历史记录数: ${history.length}`);
    if (history.length > 0) {
      console.log(`   最近一次: ${history[0].summary}`);
    }
    console.log('   ✓ 巡检历史 API 正常\n');

    console.log('========== 所有测试通过！ ==========');
    
  } catch (error) {
    console.error('测试失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runTests();
