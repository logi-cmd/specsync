/**
 * SpecSync 性能数据可视化分析
 * 生成 ASCII 图表和关键指标分析
 */

const fs = require('fs');
const path = require('path');

// 读取性能报告数据
const reportPath = path.join(__dirname, 'performance-report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

console.log('╔══════════════════════════════════════════════════════════════════════╗');
console.log('║              SpecSync 性能数据可视化分析                              ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

// 工具函数：生成简单条形图
function drawBar(label, value, max, width = 40) {
  const filled = Math.round((value / max) * width);
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
  const valueStr = typeof value === 'number' ? value.toFixed(1) : value;
  console.log(`${label.padEnd(12)} │${bar}│ ${valueStr}`);
}

// 工具函数：生成比例条形图
function drawComparison(label, val1, val2, width = 30) {
  const total = val1 + val2;
  const p1 = Math.round((val1 / total) * width);
  const p2 = width - p1;
  const bar = '▓'.repeat(p1) + '░'.repeat(p2);
  console.log(`${label.padEnd(12)} │${bar}│ ${val1.toFixed(0)}/${val2.toFixed(0)}`);
}

// 获取场景数据
const small = report.scenarios.find(s => s.apiCount === 10);
const medium = report.scenarios.find(s => s.apiCount === 100);
const large = report.scenarios.find(s => s.apiCount === 1000);

// 图表1: 响应时间对比
console.log('📊 图表1: 响应时间对比 (ms)');
console.log('─'.repeat(70));
const maxTime = large.stats.totalTime.avg;
drawBar('小规模(10)', small.stats.totalTime.avg, maxTime);
drawBar('中规模(100)', medium.stats.totalTime.avg, maxTime);
drawBar('大规模(1000)', large.stats.totalTime.avg, maxTime);
console.log('─'.repeat(70));
console.log(`规模增长: 10→100→1000 (${(large.apiCount/small.apiCount).toFixed(0)}x)`);
console.log(`时间增长: ${small.stats.totalTime.avg.toFixed(1)}→${medium.stats.totalTime.avg.toFixed(1)}→${large.stats.totalTime.avg.toFixed(1)} (${(large.stats.totalTime.avg/small.stats.totalTime.avg).toFixed(0)}x)\n`);

// 图表2: 各阶段耗时占比
console.log('📊 图表2: 各阶段耗时占比 (大规模 1000 API)');
console.log('─'.repeat(70));
const specTime = large.stats.specTime.avg;
const codeTime = large.stats.codeTime.avg;
const syncTime = large.stats.syncTime.avg;
const total = specTime + codeTime + syncTime;

console.log('Spec 解析:  ' + '█'.repeat(Math.round(specTime/total*40)).padEnd(40) + ` ${(specTime/total*100).toFixed(1)}%`);
console.log('Code 解析:  ' + '█'.repeat(Math.round(codeTime/total*40)).padEnd(40) + ` ${(codeTime/total*100).toFixed(1)}%`);
console.log('同步检测:  ' + '█'.repeat(Math.round(syncTime/total*40)).padEnd(40) + ` ${(syncTime/total*100).toFixed(1)}%`);
console.log('─'.repeat(70));
console.log(`⚠️ 同步检测占总时间的 ${(syncTime/large.stats.totalTime.avg*100).toFixed(1)}% - 这是主要瓶颈\n`);

// 图表3: 内存占用增长
console.log('📊 图表3: 内存占用增长 (KB)');
console.log('─'.repeat(70));
const maxMem = Math.max(
  small.stats.memoryDelta.heapUsed,
  medium.stats.memoryDelta.heapUsed,
  large.stats.memoryDelta.heapUsed
) / 1024;

drawBar('小规模(10)', small.stats.memoryDelta.heapUsed / 1024, maxMem);
drawBar('中规模(100)', medium.stats.memoryDelta.heapUsed / 1024, maxMem);
drawBar('大规模(1000)', large.stats.memoryDelta.heapUsed / 1024, maxMem);
console.log('─'.repeat(70));
console.log(`内存效率: 小规模 ${(small.stats.memoryDelta.heapUsed/small.apiCount/1024).toFixed(2)}KB/API`);
console.log(`          大规模 ${(large.stats.memoryDelta.heapUsed/large.apiCount/1024).toFixed(2)}KB/API`);
console.log(`          趋势: ${(large.stats.memoryDelta.heapUsed/large.apiCount < small.stats.memoryDelta.heapUsed/small.apiCount) ? '✅ 效率提升' : '⚠️ 效率下降'}\n`);

// 图表4: 性能增长曲线
console.log('📊 图表4: 性能增长曲线 (对数坐标)');
console.log('─'.repeat(70));
const apiCounts = [10, 100, 1000];
const times = [small.stats.totalTime.avg, medium.stats.totalTime.avg, large.stats.totalTime.avg];
const logMax = Math.log10(Math.max(...times));

apiCounts.forEach((count, i) => {
  const logVal = Math.log10(times[i]);
  const barLen = Math.round((logVal / logMax) * 35);
  const bar = '█'.repeat(barLen);
  console.log(`${count.toString().padStart(4)} API │${bar.padEnd(35)}│ ${times[i].toFixed(1)}ms`);
});
console.log('─'.repeat(70));

// 计算复杂度
const growth10_100 = times[1] / times[0] / 10;
const growth100_1000 = times[2] / times[1] / 10;
console.log(`复杂度分析:`);
console.log(`  10→100 API: 时间增长 ${(times[1]/times[0]).toFixed(1)}x (规模增长 10x)`);
console.log(`              复杂度: ${growth10_100 > 1.5 ? '⚠️ O(n^1.5+)' : growth10_100 > 1.2 ? '⚠️ O(n log n)' : '✅ O(n)'}`);
console.log(`  100→1000 API: 时间增长 ${(times[2]/times[1]).toFixed(1)}x (规模增长 10x)`);
console.log(`              复杂度: ${growth100_1000 > 1.5 ? '⚠️ O(n^1.5+)' : growth100_1000 > 1.2 ? '⚠️ O(n log n)' : '✅ O(n)'}`);
console.log();

// 图表5: 大文件吞吐量对比
console.log('📊 图表5: 大文件解析性能');
console.log('─'.repeat(70));
const throughput = report.largeFile.throughput;
const targetThroughput = 5; // 目标 5 MB/s
const throughputRatio = Math.min(throughput / targetThroughput, 1);
const barLen = Math.round(throughputRatio * 40);
const bar = '█'.repeat(barLen) + '░'.repeat(40 - barLen);
console.log(`当前吞吐量: │${bar}│ ${throughput.toFixed(2)} MB/s`);
console.log(`目标吞吐量: │${'█'.repeat(40)}│ 5.00 MB/s`);
console.log('─'.repeat(70));
console.log(`差距: ${((targetThroughput - throughput)/targetThroughput*100).toFixed(0)}% 低于目标`);
console.log(`需要提升: ${(targetThroughput/throughput).toFixed(1)}x 才能达到目标\n`);

// 图表6: 频繁保存稳定性
console.log('📊 图表6: 频繁保存稳定性测试');
console.log('─'.repeat(70));
const saveTimes = report.frequentSave.times;
const saveMinTime = Math.min(...saveTimes);
const saveMaxTime = Math.max(...saveTimes);
const saveAvgTime = report.frequentSave.avgSubsequent;

console.log('响应时间分布:');
saveTimes.forEach((t, i) => {
  const normalized = (t - saveMinTime) / (saveMaxTime - saveMinTime || 1);
  const barLen = Math.round(normalized * 30);
  const marker = i === 0 ? '▲' : '●';
  console.log(`  保存 ${(i+1).toString().padStart(2)}: ${marker} ${'─'.repeat(barLen).padEnd(30)} ${t.toFixed(1)}ms`);
});
console.log('─'.repeat(70));
console.log(`波动范围: ${saveMinTime.toFixed(1)}ms ~ ${saveMaxTime.toFixed(1)}ms`);
console.log(`标准差: ${Math.sqrt(saveTimes.reduce((a, t) => a + Math.pow(t - saveAvgTime, 2), 0) / saveTimes.length).toFixed(2)}ms`);
console.log(`稳定性评级: ${(saveMaxTime - saveMinTime) / saveAvgTime < 0.3 ? '✅ 优秀' : (saveMaxTime - saveMinTime) / saveAvgTime < 0.5 ? '⚠️ 良好' : '❌ 需优化'}\n`);

// 性能瓶颈热力图
console.log('📊 图表7: 性能瓶颈热力图 (大规模场景)');
console.log('─'.repeat(70));
const components = [
  { name: 'Spec解析', time: specTime, threshold: 10 },
  { name: 'Code解析', time: codeTime, threshold: 100 },
  { name: '同步检测', time: syncTime, threshold: 500 }
];

components.forEach(c => {
  const severity = c.time > c.threshold * 5 ? '🔴 严重' : 
                   c.time > c.threshold * 2 ? '🟠 高' : 
                   c.time > c.threshold ? '🟡 中' : '🟢 正常';
  const bar = c.time > c.threshold * 5 ? '🔴🔴🔴🔴🔴' :
              c.time > c.threshold * 4 ? '🔴🔴🔴🔴' :
              c.time > c.threshold * 3 ? '🔴🔴🔴' :
              c.time > c.threshold * 2 ? '🟠🟠' :
              c.time > c.threshold ? '🟡' : '🟢';
  console.log(`${c.name.padEnd(10)} │ ${bar.padEnd(10)} │ ${c.time.toFixed(1).padStart(8)}ms │ ${severity}`);
});
console.log('─'.repeat(70));
console.log('阈值说明: 正常<阈值<中<高<严重');
console.log();

// 优化效果预估
console.log('📊 图表8: 优化效果预估');
console.log('─'.repeat(70));
console.log('优化方案                          预期提升        优化后时间(1000 API)');
console.log('─'.repeat(70));

const currentTime = large.stats.totalTime.avg;
const optimizations = [
  { name: '同步检测算法优化 (O(n²)→O(n))', factor: 0.2, desc: '5x' },
  { name: '字段索引缓存', factor: 0.15, desc: '1.2x' },
  { name: '并行解析', factor: 0.3, desc: '2x' },
  { name: '增量检测', factor: 0.1, desc: '10x(重复)' },
];

optimizations.forEach((opt, i) => {
  const newTime = currentTime * (1 - opt.factor);
  const bar = '█'.repeat(Math.round((1 - opt.factor) * 20));
  console.log(`${opt.name.padEnd(30)} ${opt.desc.padStart(6)}    ${newTime.toFixed(0).padStart(6)}ms ${bar}`);
});

console.log('─'.repeat(70));
console.log(`综合优化后预计: ${(currentTime * 0.2 * 0.85 * 0.7).toFixed(0)}ms (提升 ${(currentTime / (currentTime * 0.2 * 0.85 * 0.7)).toFixed(1)}x)\n`);

// 总结
console.log('╔══════════════════════════════════════════════════════════════════════╗');
console.log('║                           总结与建议                                  ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝');
console.log();
console.log('🔴 关键发现:');
console.log('   1. 同步检测是最大瓶颈，占大规模场景 94% 时间');
console.log('   2. 当前复杂度接近 O(n^1.8)，远超理想的 O(n)');
console.log('   3. 大文件吞吐量仅 0.04 MB/s，需提升 125x 才能达标');
console.log();
console.log('🟢 优势:');
console.log('   1. 小规模场景响应极快 (<5ms)');
console.log('   2. 内存使用合理，随规模线性增长');
console.log('   3. 频繁保存性能稳定');
console.log();
console.log('💡 优先行动:');
console.log('   1. 立即: 优化 SyncEngine.check 中的双重循环');
console.log('   2. 本周: 实现字段索引和缓存机制');
console.log('   3. 本月: 添加增量检测和并行处理');
console.log();
