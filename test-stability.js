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

async function runStabilityTests() {
  console.log('========== 问题定位稳定性测试 ==========\n');

  try {
    console.log('1. 第一次巡检...');
    const result1 = await get('http://localhost:41131/api/inspection');
    console.log(`   发现问题: ${result1.stats.totalIssues} 个`);
    console.log(`   可修复问题: ${result1.issues.filter(i => i.fixable).length} 个`);
    console.log('');

    console.log('2. 测试问题定位 - 选择5个问题进行修复...');
    const issuesToFix = result1.issues
      .filter(i => i.fixable && i.suggestedFix?.action !== 'delete_item')
      .slice(0, 5);
    
    console.log(`   选择的问题:`);
    issuesToFix.forEach((issue, i) => {
      console.log(`   ${i+1}. [${issue.collection}] ${issue.type}: ${issue.message.substring(0, 50)}...`);
      console.log(`      itemId: ${issue.itemId}, index: ${issue.index}`);
    });
    console.log('');

    console.log('3. 执行修复（非删除操作）...');
    const fixResult1 = await post('http://localhost:41131/api/inspection/fix', { issues: issuesToFix });
    console.log(`   修复结果: ${fixResult1.message}`);
    console.log(`   成功: ${fixResult1.stats.success}, 失败: ${fixResult1.stats.failed}`);
    if (fixResult1.stats.failed > 0) {
      console.log('   失败详情:');
      fixResult1.results.filter(r => !r.success).forEach(r => {
        console.log(`   - ${r.message}`);
      });
    }
    console.log('');

    console.log('4. 第二次巡检...');
    const result2 = await get('http://localhost:41131/api/inspection');
    console.log(`   发现问题: ${result2.stats.totalIssues} 个`);
    console.log(`   问题减少: ${result1.stats.totalIssues - result2.stats.totalIssues} 个`);
    console.log('');

    console.log('5. 测试删除操作的定位...');
    const deleteIssues = result2.issues
      .filter(i => i.fixable && i.suggestedFix?.action === 'delete_item')
      .slice(0, 3);
    
    if (deleteIssues.length > 0) {
      console.log(`   找到 ${deleteIssues.length} 个需要删除的问题:`);
      deleteIssues.forEach((issue, i) => {
        console.log(`   ${i+1}. [${issue.collection}] ${issue.type}: ${issue.message.substring(0, 60)}...`);
        console.log(`      itemId: ${issue.itemId}, index: ${issue.index}`);
      });
      console.log('');

      console.log('6. 执行删除操作修复...');
      const fixResult2 = await post('http://localhost:41131/api/inspection/fix', { issues: deleteIssues });
      console.log(`   修复结果: ${fixResult2.message}`);
      console.log(`   成功: ${fixResult2.stats.success}, 失败: ${fixResult2.stats.failed}`);
      console.log('');
    } else {
      console.log('   没有需要删除的问题，跳过');
      console.log('');
    }

    console.log('7. 第三次巡检验证...');
    const result3 = await get('http://localhost:41131/api/inspection');
    console.log(`   发现问题: ${result3.stats.totalIssues} 个`);
    console.log(`   可修复: ${result3.issues.filter(i => i.fixable).length} 个`);
    console.log(`   需手动: ${result3.issues.filter(i => !i.fixable).length} 个`);
    console.log('');

    console.log('8. 测试剩余问题的定位稳定性...');
    const remainingIssues = result3.issues.filter(i => i.fixable).slice(0, 10);
    const locationTests = [];
    
    for (const issue of remainingIssues) {
      const testResult = await post('http://localhost:41131/api/inspection/fix', { issues: [issue] });
      locationTests.push({
        issue: `${issue.collection}-${issue.type}-${issue.itemId}`,
        success: testResult.stats.success === 1,
        message: testResult.results[0]?.message
      });
    }
    
    const successCount = locationTests.filter(t => t.success).length;
    console.log(`   测试 ${locationTests.length} 个问题的定位:`);
    console.log(`   成功: ${successCount}, 失败: ${locationTests.length - successCount}`);
    locationTests.filter(t => !t.success).forEach(t => {
      console.log(`   ✗ ${t.issue}: ${t.message}`);
    });
    locationTests.filter(t => t.success).slice(0, 3).forEach(t => {
      console.log(`   ✓ ${t.issue}: ${t.message.substring(0, 50)}...`);
    });
    console.log('');

    console.log('9. 最终巡检...');
    const result4 = await get('http://localhost:41131/api/inspection');
    console.log(`   初始问题: ${result1.stats.totalIssues}`);
    console.log(`   最终问题: ${result4.stats.totalIssues}`);
    console.log(`   累计修复: ${result1.stats.totalIssues - result4.stats.totalIssues} 个问题`);
    console.log(`   成功率: ${((result1.stats.totalIssues - result4.stats.totalIssues) / result1.stats.totalIssues * 100).toFixed(1)}%`);
    console.log('');

    console.log('10. 检查巡检历史...');
    const history = await get('http://localhost:41131/api/inspection/history');
    console.log(`   历史记录数: ${history.length}`);
    if (history.length > 0) {
      console.log(`   最近记录: ${history[0].summary}`);
    }
    console.log('');

    if (successCount === locationTests.length) {
      console.log('✅ 所有测试通过！问题定位稳定。');
    } else {
      console.log(`⚠️  部分测试失败：${successCount}/${locationTests.length} 成功`);
    }
    
    console.log('\n========== 测试完成 ==========');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runStabilityTests();
