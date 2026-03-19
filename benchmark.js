/**
 * SpecSync 性能基准测试套件
 * 测试场景：
 * 1. 小规模（10个API）- 响应时间
 * 2. 中规模（100个API）- 响应时间和内存占用
 * 3. 大规模（1000个API）- 响应时间、内存占用、CPU使用率
 * 4. 大文件测试（单个文件 >1MB）- 解析性能
 * 5. 频繁保存场景 - 重复扫描性能
 */

const { SpecParser } = require('./out/parser/specParser');
const { CodeParser } = require('./out/parser/codeParser');
const { SyncEngine } = require('./out/sync/syncEngine');
const fs = require('fs');
const path = require('path');
const os = require('os');

// 性能测试结果存储
const results = {
  scenarios: [],
  summary: {}
};

// 工具函数：格式化字节
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 工具函数：获取内存使用
function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    rss: usage.rss,
    heapTotal: usage.heapTotal,
    heapUsed: usage.heapUsed,
    external: usage.external
  };
}

// 工具函数：获取CPU使用率
function getCPUUsage() {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;
  
  cpus.forEach(cpu => {
    for (let type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });
  
  return {
    idle: totalIdle / cpus.length,
    total: totalTick / cpus.length
  };
}

// 生成测试数据
function generateSpec(apiCount, includeRules = true) {
  let spec = `---
title: Performance Test API
version: 1.0.0
---

# API 文档

`;
  
  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
  const types = ['string', 'number', 'boolean', 'array', 'object'];
  
  for (let i = 0; i < apiCount; i++) {
    const method = methods[i % methods.length];
    const apiNum = i + 1;
    
    spec += `## API: ${method} /api/resource${apiNum}

### Request
`;
    
    // 每个API有5-10个字段
    const fieldCount = 5 + (i % 6);
    for (let j = 0; j < fieldCount; j++) {
      const type = types[j % types.length];
      const constraints = j % 3 === 0 ? ' (required, min: 1, max: 100)' : '';
      spec += `- field${j}: ${type}${constraints}\n`;
    }
    
    spec += `\n### Response
`;
    for (let j = 0; j < fieldCount; j++) {
      const type = types[(j + 1) % types.length];
      spec += `- result${j}: ${type}\n`;
    }
    
    if (includeRules) {
      spec += `\n### 业务规则
`;
      spec += `- 规则${apiNum}: 用户名不能为空\n`;
      spec += `- 规则${apiNum}b: 密码长度必须大于6位\n`;
    }
    
    spec += `\n`;
  }
  
  return spec;
}

function generateCode(apiCount) {
  let code = `// Auto-generated test code
// API Count: ${apiCount}

`;
  
  // 生成接口定义
  for (let i = 0; i < apiCount; i++) {
    const apiNum = i + 1;
    const fieldCount = 5 + (i % 6);
    
    code += `interface Request${apiNum} {\n`;
    for (let j = 0; j < fieldCount; j++) {
      const types = ['string', 'number', 'boolean', 'any[]', 'object'];
      const type = types[j % types.length];
      code += `  field${j}: ${type};\n`;
    }
    code += `}\n\n`;
    
    code += `interface Response${apiNum} {\n`;
    for (let j = 0; j < fieldCount; j++) {
      const types = ['string', 'number', 'boolean', 'any[]', 'object'];
      const type = types[(j + 1) % types.length];
      code += `  result${j}: ${type};\n`;
    }
    code += `}\n\n`;
  }
  
  // 生成函数实现
  const methods = ['get', 'post', 'put', 'delete', 'patch'];
  for (let i = 0; i < apiCount; i++) {
    const method = methods[i % methods.length];
    const apiNum = i + 1;
    
    code += `@Spec('${method.toUpperCase()}', '/api/resource${apiNum}')\n`;
    code += `@Rule('用户名不能为空')\n`;
    code += `async function ${method}Resource${apiNum}(req: Request${apiNum}): Promise<Response${apiNum}> {\n`;
    code += `  // Validation\n`;
    code += `  if (!req.field0) throw new Error('Required');\n`;
    code += `  if (req.field0 && req.field0.length < 6) throw new Error('Too short');\n`;
    code += `  return { result0: 'test' } as Response${apiNum};\n`;
    code += `}\n\n`;
  }
  
  return code;
}

// 运行单个测试场景
async function runScenario(name, apiCount, iterations = 5) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`场景: ${name} (${apiCount} 个API)`);
  console.log('='.repeat(60));
  
  const spec = generateSpec(apiCount);
  const code = generateCode(apiCount);
  
  console.log(`Spec 大小: ${formatBytes(Buffer.byteLength(spec, 'utf8'))}`);
  console.log(`Code 大小: ${formatBytes(Buffer.byteLength(code, 'utf8'))}`);
  
  const specParser = new SpecParser();
  const codeParser = new CodeParser();
  const syncEngine = new SyncEngine();
  
  // 预热
  console.log('\n[预热阶段...]');
  for (let i = 0; i < 3; i++) {
    specParser.parse(spec);
    codeParser.parse(code, 'test.ts');
  }
  
  // 强制垃圾回收（如果可用）
  if (global.gc) {
    global.gc();
  }
  
  // 测量内存基线
  const memoryBaseline = getMemoryUsage();
  console.log(`内存基线: RSS ${formatBytes(memoryBaseline.rss)}, Heap ${formatBytes(memoryBaseline.heapUsed)}`);
  
  // 执行多次测量
  const measurements = [];
  
  for (let iter = 0; iter < iterations; iter++) {
    const iterStart = process.hrtime.bigint();
    const memBefore = getMemoryUsage();
    const cpuBefore = process.cpuUsage();
    
    // Spec 解析
    const specStart = process.hrtime.bigint();
    const specDoc = specParser.parse(spec);
    const specTime = Number(process.hrtime.bigint() - specStart) / 1_000_000; // ms
    
    // Code 解析
    const codeStart = process.hrtime.bigint();
    const codeDoc = codeParser.parse(code, 'test.ts');
    const codeTime = Number(process.hrtime.bigint() - codeStart) / 1_000_000; // ms
    
    // 同步检测
    const syncStart = process.hrtime.bigint();
    const report = syncEngine.check(specDoc, codeDoc);
    const syncTime = Number(process.hrtime.bigint() - syncStart) / 1_000_000; // ms
    
    const iterEnd = process.hrtime.bigint();
    const totalTime = Number(iterEnd - iterStart) / 1_000_000; // ms
    
    const memAfter = getMemoryUsage();
    const cpuAfter = process.cpuUsage(cpuBefore);
    
    measurements.push({
      iteration: iter + 1,
      specTime,
      codeTime,
      syncTime,
      totalTime,
      memoryDelta: {
        rss: memAfter.rss - memBefore.rss,
        heapUsed: memAfter.heapUsed - memBefore.heapUsed
      },
      cpuTime: (cpuAfter.user + cpuAfter.system) / 1000 // microseconds to ms
    });
  }
  
  // 计算统计数据
  const stats = {
    specTime: {
      min: Math.min(...measurements.map(m => m.specTime)),
      max: Math.max(...measurements.map(m => m.specTime)),
      avg: measurements.reduce((a, m) => a + m.specTime, 0) / measurements.length
    },
    codeTime: {
      min: Math.min(...measurements.map(m => m.codeTime)),
      max: Math.max(...measurements.map(m => m.codeTime)),
      avg: measurements.reduce((a, m) => a + m.codeTime, 0) / measurements.length
    },
    syncTime: {
      min: Math.min(...measurements.map(m => m.syncTime)),
      max: Math.max(...measurements.map(m => m.syncTime)),
      avg: measurements.reduce((a, m) => a + m.syncTime, 0) / measurements.length
    },
    totalTime: {
      min: Math.min(...measurements.map(m => m.totalTime)),
      max: Math.max(...measurements.map(m => m.totalTime)),
      avg: measurements.reduce((a, m) => a + m.totalTime, 0) / measurements.length
    },
    cpuTime: {
      avg: measurements.reduce((a, m) => a + m.cpuTime, 0) / measurements.length
    },
    memoryDelta: {
      rss: measurements.reduce((a, m) => a + m.memoryDelta.rss, 0) / measurements.length,
      heapUsed: measurements.reduce((a, m) => a + m.memoryDelta.heapUsed, 0) / measurements.length
    }
  };
  
  // 最终内存状态
  const memoryFinal = getMemoryUsage();
  
  // 获取最后一次检测的问题数
  const lastReport = syncEngine.check(specParser.parse(spec), codeParser.parse(code, 'test.ts'));
  
  console.log('\n[性能指标]');
  console.log(`Spec 解析时间: ${stats.specTime.avg.toFixed(2)}ms (min: ${stats.specTime.min.toFixed(2)}, max: ${stats.specTime.max.toFixed(2)})`);
  console.log(`Code 解析时间: ${stats.codeTime.avg.toFixed(2)}ms (min: ${stats.codeTime.min.toFixed(2)}, max: ${stats.codeTime.max.toFixed(2)})`);
  console.log(`同步检测时间: ${stats.syncTime.avg.toFixed(2)}ms (min: ${stats.syncTime.min.toFixed(2)}, max: ${stats.syncTime.max.toFixed(2)})`);
  console.log(`总响应时间: ${stats.totalTime.avg.toFixed(2)}ms (min: ${stats.totalTime.min.toFixed(2)}, max: ${stats.totalTime.max.toFixed(2)})`);
  console.log(`CPU 时间: ${stats.cpuTime.avg.toFixed(2)}ms`);
  console.log(`内存增量 (RSS): ${formatBytes(stats.memoryDelta.rss)}`);
  console.log(`内存增量 (Heap): ${formatBytes(stats.memoryDelta.heapUsed)}`);
  console.log(`检测到问题: ${lastReport.summary.total} 个`);
  
  return {
    name,
    apiCount,
    specSize: Buffer.byteLength(spec, 'utf8'),
    codeSize: Buffer.byteLength(code, 'utf8'),
    stats,
    report: lastReport,
    memoryFinal,
    measurements
  };
}

// 大文件测试
async function runLargeFileTest() {
  console.log(`\n${'='.repeat(60)}`);
  console.log('场景: 大文件测试 (>1MB)');
  console.log('='.repeat(60));
  
  // 生成大于1MB的spec文件
  const targetSize = 1.5 * 1024 * 1024; // 1.5MB
  let apiCount = 0;
  let spec = '';
  
  while (Buffer.byteLength(spec, 'utf8') < targetSize) {
    apiCount += 10;
    spec = generateSpec(apiCount, false);
  }
  
  const specSize = Buffer.byteLength(spec, 'utf8');
  console.log(`生成 Spec: ${apiCount} 个API, ${formatBytes(specSize)}`);
  
  const code = generateCode(apiCount);
  const codeSize = Buffer.byteLength(code, 'utf8');
  console.log(`生成 Code: ${formatBytes(codeSize)}`);
  
  const specParser = new SpecParser();
  const codeParser = new CodeParser();
  const syncEngine = new SyncEngine();
  
  // 测量解析性能
  const measurements = [];
  const iterations = 3;
  
  for (let iter = 0; iter < iterations; iter++) {
    if (global.gc) global.gc();
    
    const memBefore = getMemoryUsage();
    const start = process.hrtime.bigint();
    
    const specDoc = specParser.parse(spec);
    const codeDoc = codeParser.parse(code, 'test.ts');
    const report = syncEngine.check(specDoc, codeDoc);
    
    const totalTime = Number(process.hrtime.bigint() - start) / 1_000_000;
    const memAfter = getMemoryUsage();
    
    measurements.push({
      totalTime,
      memoryDelta: memAfter.heapUsed - memBefore.heapUsed
    });
  }
  
  const avgTime = measurements.reduce((a, m) => a + m.totalTime, 0) / measurements.length;
  const avgMemory = measurements.reduce((a, m) => a + m.memoryDelta, 0) / measurements.length;
  const throughput = (specSize / 1024 / 1024) / (avgTime / 1000); // MB/s
  
  console.log('\n[性能指标]');
  console.log(`平均解析时间: ${avgTime.toFixed(2)}ms`);
  console.log(`平均内存增量: ${formatBytes(avgMemory)}`);
  console.log(`解析吞吐量: ${throughput.toFixed(2)} MB/s`);
  console.log(`每100KB耗时: ${(avgTime / (specSize / 1024 / 1024) * 0.1).toFixed(2)}ms`);
  
  return {
    name: '大文件测试',
    apiCount,
    specSize,
    codeSize,
    avgTime,
    avgMemory,
    throughput
  };
}

// 频繁保存场景测试
async function runFrequentSaveTest() {
  console.log(`\n${'='.repeat(60)}`);
  console.log('场景: 频繁保存（重复扫描性能）');
  console.log('='.repeat(60));
  
  const apiCount = 50;
  const saveCount = 20;
  
  const spec = generateSpec(apiCount);
  const code = generateCode(apiCount);
  
  console.log(`API数量: ${apiCount}, 保存次数: ${saveCount}`);
  
  const specParser = new SpecParser();
  const codeParser = new CodeParser();
  const syncEngine = new SyncEngine();
  
  // 模拟频繁保存
  const times = [];
  const memUsages = [];
  
  for (let i = 0; i < saveCount; i++) {
    if (global.gc) global.gc();
    
    const memBefore = getMemoryUsage();
    const start = process.hrtime.bigint();
    
    // 模拟小修改后重新解析
    const modifiedCode = code + `\n// Save ${i}\n`;
    
    const specDoc = specParser.parse(spec);
    const codeDoc = codeParser.parse(modifiedCode, 'test.ts');
    const report = syncEngine.check(specDoc, codeDoc);
    
    const time = Number(process.hrtime.bigint() - start) / 1_000_000;
    const memAfter = getMemoryUsage();
    
    times.push(time);
    memUsages.push(memAfter.heapUsed - memBefore.heapUsed);
    
    if (i === 0) {
      console.log(`\n首次扫描: ${time.toFixed(2)}ms`);
    }
  }
  
  // 计算统计数据
  const firstScan = times[0];
  const subsequentScans = times.slice(1);
  const avgSubsequent = subsequentScans.reduce((a, t) => a + t, 0) / subsequentScans.length;
  
  console.log(`后续扫描平均: ${avgSubsequent.toFixed(2)}ms`);
  console.log(`性能衰减: ${((firstScan - avgSubsequent) / firstScan * 100).toFixed(1)}%`);
  console.log(`最小/最大: ${Math.min(...times).toFixed(2)}ms / ${Math.max(...times).toFixed(2)}ms`);
  console.log(`标准差: ${Math.sqrt(times.reduce((a, t) => a + Math.pow(t - times.reduce((a, t) => a + t, 0) / times.length, 2), 0) / times.length).toFixed(2)}ms`);
  
  return {
    name: '频繁保存测试',
    apiCount,
    saveCount,
    firstScan,
    avgSubsequent,
    minTime: Math.min(...times),
    maxTime: Math.max(...times),
    times
  };
}

// 生成报告
function generateReport(allResults) {
  console.log(`\n${'='.repeat(70)}`);
  console.log('                     SpecSync 性能基准测试报告');
  console.log('='.repeat(70));
  
  // 表格1: 测试规模 vs 响应时间
  console.log('\n📊 表1: 测试规模 vs 响应时间');
  console.log('-'.repeat(70));
  console.log('测试场景          API数量    Spec解析    Code解析    同步检测    总时间');
  console.log('-'.repeat(70));
  
  for (const r of allResults.scenarios) {
    if (r.stats) {
      const name = r.name.padEnd(16);
      const count = r.apiCount.toString().padStart(6);
      const spec = r.stats.specTime.avg.toFixed(1).padStart(8) + 'ms';
      const code = r.stats.codeTime.avg.toFixed(1).padStart(8) + 'ms';
      const sync = r.stats.syncTime.avg.toFixed(1).padStart(8) + 'ms';
      const total = r.stats.totalTime.avg.toFixed(1).padStart(8) + 'ms';
      console.log(`${name} ${count}  ${spec}  ${code}  ${sync}  ${total}`);
    }
  }
  console.log('-'.repeat(70));
  
  // 表格2: 内存占用分析
  console.log('\n📊 表2: 内存占用分析');
  console.log('-'.repeat(70));
  console.log('测试场景          API数量    Spec大小    Code大小    内存增量(RSS)  内存增量(Heap)');
  console.log('-'.repeat(70));
  
  for (const r of allResults.scenarios) {
    if (r.stats) {
      const name = r.name.padEnd(16);
      const count = r.apiCount.toString().padStart(6);
      const specSize = formatBytes(r.specSize).padStart(10);
      const codeSize = formatBytes(r.codeSize).padStart(10);
      const rss = formatBytes(r.stats.memoryDelta.rss).padStart(12);
      const heap = formatBytes(r.stats.memoryDelta.heapUsed).padStart(14);
      console.log(`${name} ${count}  ${specSize}  ${codeSize}  ${rss}  ${heap}`);
    }
  }
  console.log('-'.repeat(70));
  
  // 表格3: CPU使用率分析
  console.log('\n📊 表3: CPU使用率分析');
  console.log('-'.repeat(70));
  console.log('测试场景          API数量    CPU时间(ms)  总时间(ms)   CPU效率(%)');
  console.log('-'.repeat(70));
  
  for (const r of allResults.scenarios) {
    if (r.stats && r.stats.cpuTime) {
      const name = r.name.padEnd(16);
      const count = r.apiCount.toString().padStart(6);
      const cpu = r.stats.cpuTime.avg.toFixed(1).padStart(11);
      const total = r.stats.totalTime.avg.toFixed(1).padStart(10);
      const efficiency = ((r.stats.cpuTime.avg / r.stats.totalTime.avg) * 100).toFixed(1).padStart(9);
      console.log(`${name} ${count}  ${cpu}  ${total}  ${efficiency}`);
    }
  }
  console.log('-'.repeat(70));
  
  // 性能瓶颈识别
  console.log('\n🔍 性能瓶颈识别');
  console.log('-'.repeat(70));
  
  const smallScale = allResults.scenarios.find(s => s.apiCount === 10);
  const mediumScale = allResults.scenarios.find(s => s.apiCount === 100);
  const largeScale = allResults.scenarios.find(s => s.apiCount === 1000);
  
  if (smallScale && mediumScale && largeScale) {
    // 计算增长趋势
    const specGrowth10_100 = mediumScale.stats.specTime.avg / smallScale.stats.specTime.avg;
    const specGrowth100_1000 = largeScale.stats.specTime.avg / mediumScale.stats.specTime.avg;
    
    console.log(`1. Spec 解析性能:`);
    console.log(`   - 10→100 API: ${specGrowth10_100.toFixed(1)}x (理想: 10x)`);
    console.log(`   - 100→1000 API: ${specGrowth100_1000.toFixed(1)}x (理想: 10x)`);
    console.log(`   - 复杂度趋势: ${specGrowth100_1000 > specGrowth10_100 ? '⚠️ 非线性增长' : '✅ 接近线性'}`);
    
    const codeGrowth10_100 = mediumScale.stats.codeTime.avg / smallScale.stats.codeTime.avg;
    const codeGrowth100_1000 = largeScale.stats.codeTime.avg / mediumScale.stats.codeTime.avg;
    
    console.log(`\n2. Code 解析性能:`);
    console.log(`   - 10→100 API: ${codeGrowth10_100.toFixed(1)}x`);
    console.log(`   - 100→1000 API: ${codeGrowth100_1000.toFixed(1)}x`);
    console.log(`   - 复杂度趋势: ${codeGrowth100_1000 > codeGrowth10_100 ? '⚠️ 非线性增长' : '✅ 接近线性'}`);
    
    const syncGrowth10_100 = mediumScale.stats.syncTime.avg / smallScale.stats.syncTime.avg;
    const syncGrowth100_1000 = largeScale.stats.syncTime.avg / mediumScale.stats.syncTime.avg;
    
    console.log(`\n3. 同步检测性能:`);
    console.log(`   - 10→100 API: ${syncGrowth10_100.toFixed(1)}x`);
    console.log(`   - 100→1000 API: ${syncGrowth100_1000.toFixed(1)}x`);
    console.log(`   - 复杂度趋势: ${syncGrowth100_1000 > 15 ? '⚠️ 高复杂度增长' : syncGrowth100_1000 > 10 ? '⚠️ 超线性增长' : '✅ 接近线性'}`);
    
    // 内存分析
    console.log(`\n4. 内存占用分析:`);
    const memPerApiSmall = smallScale.stats.memoryDelta.heapUsed / smallScale.apiCount;
    const memPerApiLarge = largeScale.stats.memoryDelta.heapUsed / largeScale.apiCount;
    console.log(`   - 小规模每个API: ${formatBytes(memPerApiSmall)}`);
    console.log(`   - 大规模每个API: ${formatBytes(memPerApiLarge)}`);
    console.log(`   - 内存效率: ${memPerApiLarge > memPerApiSmall * 2 ? '⚠️ 内存效率下降' : '✅ 内存效率稳定'}`);
  }
  
  // 大文件测试结果
  if (allResults.largeFile) {
    console.log(`\n5. 大文件解析性能:`);
    console.log(`   - 文件大小: ${formatBytes(allResults.largeFile.specSize)}`);
    console.log(`   - 解析时间: ${allResults.largeFile.avgTime.toFixed(1)}ms`);
    console.log(`   - 吞吐量: ${allResults.largeFile.throughput.toFixed(2)} MB/s`);
    console.log(`   - 评级: ${allResults.largeFile.throughput > 10 ? '✅ 优秀' : allResults.largeFile.throughput > 5 ? '⚠️ 良好' : '❌ 需优化'}`);
  }
  
  // 频繁保存测试结果
  if (allResults.frequentSave) {
    console.log(`\n6. 频繁保存性能:`);
    console.log(`   - 首次扫描: ${allResults.frequentSave.firstScan.toFixed(1)}ms`);
    console.log(`   - 后续平均: ${allResults.frequentSave.avgSubsequent.toFixed(1)}ms`);
    console.log(`   - 稳定性: ${allResults.frequentSave.avgSubsequent < allResults.frequentSave.firstScan * 1.5 ? '✅ 稳定' : '⚠️ 有波动'}`);
  }
  
  // 优化建议
  console.log('\n💡 优化建议');
  console.log('-'.repeat(70));
  
  console.log(`1. 解析优化:`);
  console.log(`   - 考虑使用流式解析处理大文件`);
  console.log(`   - 对重复解析启用缓存机制`);
  console.log(`   - 使用 Worker 线程避免阻塞主线程`);
  
  console.log(`\n2. 同步检测优化:`);
  console.log(`   - 实现增量检测，只检测变更部分`);
  console.log(`   - 使用索引加速字段匹配`);
  console.log(`   - 对大型项目考虑分片处理`);
  
  console.log(`\n3. 内存优化:`);
  console.log(`   - 及时释放解析后的AST`);
  console.log(`   - 使用对象池减少GC压力`);
  console.log(`   - 对超大文件启用流式处理`);
  
  console.log(`\n4. 用户体验优化:`);
  console.log(`   - 添加进度指示器`);
  console.log(`   - 支持取消长时间运行的操作`);
  console.log(`   - 提供并行扫描选项`);
  
  console.log('\n' + '='.repeat(70));
  
  // 保存详细报告到文件
  const reportPath = path.join(__dirname, 'performance-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(allResults, null, 2));
  console.log(`\n📄 详细报告已保存: ${reportPath}`);
}

// 主函数
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║           SpecSync 性能基准测试套件 v1.0                              ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  
  console.log(`\n系统信息:`);
  console.log(`  Node.js: ${process.version}`);
  console.log(`  平台: ${process.platform} ${process.arch}`);
  console.log(`  CPU: ${os.cpus()[0].model}`);
  console.log(`  内存: ${formatBytes(os.totalmem())}`);
  
  try {
    // 场景1: 小规模（10个API）
    const smallResult = await runScenario('小规模测试', 10, 10);
    results.scenarios.push(smallResult);
    
    // 场景2: 中规模（100个API）
    const mediumResult = await runScenario('中规模测试', 100, 5);
    results.scenarios.push(mediumResult);
    
    // 场景3: 大规模（1000个API）
    const largeResult = await runScenario('大规模测试', 1000, 3);
    results.scenarios.push(largeResult);
    
    // 场景4: 大文件测试
    const largeFileResult = await runLargeFileTest();
    results.largeFile = largeFileResult;
    
    // 场景5: 频繁保存场景
    const frequentSaveResult = await runFrequentSaveTest();
    results.frequentSave = frequentSaveResult;
    
    // 生成报告
    generateReport(results);
    
  } catch (error) {
    console.error('❌ 测试执行失败:', error);
    process.exit(1);
  }
}

// 运行测试
main().catch(console.error);
