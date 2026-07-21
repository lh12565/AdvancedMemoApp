import { type Memo, type Task, type DiaryEntry } from '@/lib/supabase';

// --- CSV ---
export async function exportToCSV(memo: Memo, tasks: Task[]): Promise<string> {
  const headers = ['任务', '优先级', '状态', '环境', '位置', '心情', '创建日期'];
  const rows = tasks.map((task) => [
    task.content,
    getPriorityLabel(task.priority || 'medium'),
    task.completed ? '已完成' : '未完成',
    getEnvironmentLabel(task.environment || 'home'),
    task.location || '-',
    getMoodLabel(task.mood),
    new Date(task.created_at).toLocaleDateString('zh-CN'),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}

// --- JSON ---
export async function exportToJSON(memo: Memo, tasks: Task[]) {
  const data = {
    memo: {
      id: memo.id,
      name: memo.name,
      type: memo.type || 'task',
      priority: memo.priority || 'medium',
      deadline: memo.deadline,
      tags: memo.tags || [],
      created_at: memo.created_at,
    },
    tasks: tasks.map((task) => ({
      id: task.id,
      content: task.content,
      priority: task.priority || 'medium',
      environment: task.environment || 'home',
      location: task.location,
      mood: task.mood,
      completed: task.completed,
      completed_at: task.completed_at,
      image_url: task.image_url,
      created_at: task.created_at,
    })),
    stats: {
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t) => t.completed).length,
      completionRate: tasks.length > 0 ? (tasks.filter((t) => t.completed).length / tasks.length) * 100 : 0,
      export_date: new Date().toISOString(),
    },
  };

  return JSON.stringify(data, null, 2);
}

// --- Text ---
export async function exportToText(memo: Memo, tasks: Task[]): Promise<string> {
  const completed = tasks.filter((t) => t.completed).length;
  const total = tasks.length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return `${memo.name}
========================================

  创建时间: ${new Date(memo.created_at).toLocaleDateString('zh-CN')}
  标签: ${memo.tags?.length ? memo.tags.join(', ') : '无'}
  ${memo.deadline ? `截止日期: ${new Date(memo.deadline).toLocaleDateString('zh-CN')}` : ''}

========================================
  统计信息
========================================
  总任务数: ${total}
  已完成: ${completed}
  未完成: ${total - completed}
  完成度: ${completionRate}%

========================================
  任务列表
========================================
${tasks
  .map((task, index) => {
    const status = task.completed ? '✓' : '○';
    const priority = getPriorityLabel(task.priority || 'medium');
    const env = getEnvironmentLabel(task.environment || 'home');
    const mood = getMoodLabel(task.mood);
    return `${index + 1}. [${status}] ${task.content}
   优先级: ${priority} | 环境: ${env} | 心情: ${mood}${task.location ? ` | 位置: ${task.location}` : ''}
   ${new Date(task.created_at).toLocaleDateString('zh-CN')}`;
  })
  .join('\n\n')}

========================================
  导出时间: ${new Date().toLocaleString('zh-CN')}
========================================`;
}

// --- Diary Text ---
export function exportDiaryToText(memo: Memo, entries: DiaryEntry[]): string {
  const totalWords = entries.reduce((sum, e) => sum + e.content.length, 0);
  return `${memo.name}
========================================

  创建时间: ${new Date(memo.created_at).toLocaleDateString('zh-CN')}
  标签: ${memo.tags?.length ? memo.tags.join(', ') : '无'}

========================================
  统计信息
========================================
  日记篇数: ${entries.length}
  总字数: ${totalWords}
  平均字数: ${entries.length > 0 ? Math.round(totalWords / entries.length) : 0}

========================================
  日记内容
========================================

${entries
  .map((entry, index) => {
    const date = new Date(entry.created_at).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
    return `--- 第 ${index + 1} 篇 ---\n日期: ${date}${entry.updated_at !== entry.created_at ? `\n编辑于: ${new Date(entry.updated_at).toLocaleDateString('zh-CN')}` : ''}\n\n${entry.content}`;
  })
  .join('\n\n')}

========================================
  导出时间: ${new Date().toLocaleString('zh-CN')}
========================================`;
}

// --- HTML (for PDF conversion) ---
export function exportToHTML(memo: Memo, tasks: Task[], entries: DiaryEntry[]): string {
  const isDiary = memo.type === 'diary';
  const completed = tasks.filter((t) => t.completed).length;
  const total = tasks.length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const totalWords = entries.reduce((sum, e) => sum + e.content.length, 0);

  const priorityColor = (p: string) => p === 'high' ? '#ef4444' : p === 'medium' ? '#f59e0b' : '#10b981';

  let bodyContent = '';

  if (isDiary) {
    bodyContent = `
      <div class="stats-row">
        <div class="stat-box"><div class="stat-num">${entries.length}</div><div class="stat-label">日记篇数</div></div>
        <div class="stat-box"><div class="stat-num">${totalWords}</div><div class="stat-label">总字数</div></div>
        <div class="stat-box"><div class="stat-num">${entries.length > 0 ? Math.round(totalWords / entries.length) : 0}</div><div class="stat-label">平均字数</div></div>
      </div>
      ${entries.map((entry, i) => {
        const date = new Date(entry.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
        return `<div class="diary-entry">
          <div class="diary-date">${date}</div>
          <div class="diary-body">${renderMarkdownToHTML(entry.content)}</div>
        </div>`;
      }).join('')}`;
  } else {
    bodyContent = `
      <div class="stats-row">
        <div class="stat-box"><div class="stat-num">${total}</div><div class="stat-label">总任务</div></div>
        <div class="stat-box"><div class="stat-num" style="color:#10b981">${completed}</div><div class="stat-label">已完成</div></div>
        <div class="stat-box"><div class="stat-num">${completionRate}%</div><div class="stat-label">完成度</div></div>
      </div>
      <div class="task-list">
        ${tasks.map((task, i) => {
          const pColor = priorityColor(task.priority || 'medium');
          return `<div class="task-item ${task.completed ? 'completed' : ''}">
            <div class="task-header">
              <span class="priority-dot" style="background:${pColor}"></span>
              <span class="task-status">${task.completed ? '✓' : '○'}</span>
              <span class="task-text ${task.completed ? 'task-done' : ''}">${escapeHTML(task.content)}</span>
            </div>
            <div class="task-meta">
              <span class="tag">${getPriorityLabel(task.priority || 'medium')}</span>
              <span class="tag">${getEnvironmentLabel(task.environment || 'home')}</span>
              ${task.mood ? `<span class="tag">${getMoodLabel(task.mood)}</span>` : ''}
              ${task.location ? `<span class="tag">📍 ${escapeHTML(task.location)}</span>` : ''}
            </div>
            ${task.image_url ? `<div class="task-image"><img src="${task.image_url}" /></div>` : ''}
          </div>`;
        }).join('')}
      </div>`;
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${escapeHTML(memo.name)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", "Helvetica Neue", sans-serif; color: #1f2937; padding: 40px; line-height: 1.6; }
    .header { border-bottom: 3px solid ${isDiary ? '#0ea5e9' : '#10b981'}; padding-bottom: 16px; margin-bottom: 24px; }
    .title { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
    .meta { font-size: 13px; color: #6b7280; }
    .meta span { margin-right: 16px; }
    .stats-row { display: flex; gap: 16px; margin-bottom: 24px; }
    .stat-box { flex: 1; background: #f9fafb; border-radius: 12px; padding: 16px; text-align: center; border-left: 3px solid ${isDiary ? '#0ea5e9' : '#10b981'}; }
    .stat-num { font-size: 28px; font-weight: 700; color: #374151; }
    .stat-label { font-size: 12px; color: #9ca3af; margin-top: 4px; }
    .task-list { display: flex; flex-direction: column; gap: 12px; }
    .task-item { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; }
    .task-item.completed { background: #f0fdf4; }
    .task-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .priority-dot { width: 8px; height: 8px; border-radius: 50%; }
    .task-status { font-size: 16px; }
    .task-text { font-size: 16px; flex: 1; }
    .task-done { text-decoration: line-through; color: #9ca3af; }
    .task-meta { display: flex; gap: 8px; flex-wrap: wrap; }
    .tag { background: #f3f4f6; padding: 4px 10px; border-radius: 6px; font-size: 12px; color: #6b7280; }
    .task-image img { max-width: 100%; border-radius: 8px; margin-top: 8px; }
    .diary-entry { background: #fff; border: 1px solid #e5e7eb; border-left: 3px solid #0ea5e9; border-radius: 12px; padding: 20px; margin-bottom: 16px; }
    .diary-date { font-size: 14px; font-weight: 600; color: #0369a1; margin-bottom: 12px; }
    .diary-body { font-size: 16px; line-height: 1.8; }
    .diary-body h1 { font-size: 24px; font-weight: 700; margin: 16px 0 8px; }
    .diary-body h2 { font-size: 20px; font-weight: 700; margin: 12px 0 6px; }
    .diary-body h3 { font-size: 18px; font-weight: 600; margin: 8px 0 4px; }
    .diary-body p { margin-bottom: 8px; }
    .diary-body blockquote { border-left: 3px solid #0ea5e9; padding-left: 12px; color: #4b5563; font-style: italic; margin: 8px 0; }
    .diary-body ul { padding-left: 20px; margin-bottom: 8px; }
    .diary-body li { margin-bottom: 4px; }
    .diary-body hr { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0; }
    .diary-body code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 14px; color: #dc2626; }
    .diary-body strong { font-weight: 700; }
    .diary-body em { font-style: italic; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center; }
    @media print { body { padding: 20px; } .task-item, .diary-entry { break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">${escapeHTML(memo.name)}</div>
    <div class="meta">
      <span>创建时间: ${new Date(memo.created_at).toLocaleDateString('zh-CN')}</span>
      ${memo.deadline ? `<span>截止日期: ${new Date(memo.deadline!).toLocaleDateString('zh-CN')}</span>` : ''}
      ${memo.tags?.length ? `<span>标签: ${memo.tags.map(t => escapeHTML(t)).join(', ')}</span>` : ''}
    </div>
  </div>
  ${bodyContent}
  <div class="footer">导出时间: ${new Date().toLocaleString('zh-CN')}</div>
</body>
</html>`;
}

// --- Excel (XML Spreadsheet format, no dependency needed) ---
export function exportToExcel(memo: Memo, tasks: Task[]): string {
  const headers = ['任务', '优先级', '状态', '环境', '位置', '心情', '创建日期'];
  const rows = tasks.map((task) => [
    task.content,
    getPriorityLabel(task.priority || 'medium'),
    task.completed ? '已完成' : '未完成',
    getEnvironmentLabel(task.environment || 'home'),
    task.location || '',
    getMoodLabel(task.mood),
    new Date(task.created_at).toLocaleDateString('zh-CN'),
  ]);

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1" ss:Size="12" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#10b981" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Completed">
   <Font ss:Color="#9ca3af"/>
   <Font ss:Strikethrough="1"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${escapeXML(memo.name)}">
  <Table>
   <Column ss:Width="200"/>
   <Column ss:Width="80"/>
   <Column ss:Width="80"/>
   <Column ss:Width="80"/>
   <Column ss:Width="120"/>
   <Column ss:Width="60"/>
   <Column ss:Width="120"/>
   <Row>
    ${headers.map(h => `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXML(h)}</Data></Cell>`).join('\n    ')}
   </Row>
   ${rows.map(row => `<Row>
    ${row.map((cell, i) => `<Cell${i === 2 && cell === '已完成' ? ' ss:StyleID="Completed"' : ''}><Data ss:Type="String">${escapeXML(cell)}</Data></Cell>`).join('\n    ')}
   </Row>`).join('\n   ')}
  </Table>
 </Worksheet>
</Workbook>`;
}

// --- Helpers ---
export function getPriorityLabel(priority: string): string {
  return priority === 'low' ? '低' : priority === 'high' ? '高' : '中';
}

export function getEnvironmentLabel(env: string): string {
  return env === 'home' ? '家' : env === 'office' ? '办公室' : env === 'cafe' ? '咖啡馆' : '其他';
}

export function getMoodLabel(mood: string | null | undefined): string {
  return mood === 'happy' ? '😊' : mood === 'neutral' ? '😐' : mood === 'sad' ? '😫' : '-';
}

function escapeHTML(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeXML(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function renderMarkdownToHTML(md: string): string {
  const lines = md.split('\n');
  let html = '';
  let inList = false;

  for (const line of lines) {
    if (line.match(/^---+$/)) {
      if (inList) { html += '</ul>'; inList = false; }
      html += '<hr>';
      continue;
    }
    if (line.startsWith('### ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h3>${formatInline(line.slice(4))}</h3>`;
      continue;
    }
    if (line.startsWith('## ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h2>${formatInline(line.slice(3))}</h2>`;
      continue;
    }
    if (line.startsWith('# ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h1>${formatInline(line.slice(2))}</h1>`;
      continue;
    }
    if (line.startsWith('> ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<blockquote>${formatInline(line.slice(2))}</blockquote>`;
      continue;
    }
    if (line.match(/^[-*] /)) {
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${formatInline(line.replace(/^[-*] /, ''))}</li>`;
      continue;
    }
    if (inList) { html += '</ul>'; inList = false; }
    if (line.trim() === '') { html += '<br>'; continue; }
    html += `<p>${formatInline(line)}</p>`;
  }
  if (inList) html += '</ul>';

  return html;
}

function formatInline(text: string): string {
  return text
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/~~(.*?)~~/g, '<del>$1</del>')
    .replace(/`(.*?)`/g, '<code>$1</code>');
}
