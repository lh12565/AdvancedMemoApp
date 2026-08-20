import { Task, DiaryEntry } from './supabase';

export interface ReportData {
  summary: string;
  completionRate: number;
  totalTasks: number;
  completedTasks: number;
  totalDiaryEntries: number;
  characteristics: string;
  hobbies: string[];
  encouragement: string;
  suggestions: string;
  fullReport: Record<string, any>;
}

export function getPeriodBounds(
  reportType: 'weekly' | 'monthly' | 'yearly',
): { start: Date; end: Date; key: string } {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (reportType === 'weekly') {
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(now.getDate() + diff);
    start.setHours(0, 0, 0, 0);
    const w = getISOWeek(now);
    return { start, end, key: `${now.getFullYear()}-W${String(w).padStart(2, '0')}` };
  } else if (reportType === 'monthly') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return {
      start,
      end,
      key: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    };
  } else {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    return { start, end, key: `${now.getFullYear()}` };
  }
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function calculateCompletionRate(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  return Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100);
}

export function extractCharacteristics(tasks: Task[], diaries: DiaryEntry[]): string {
  if (tasks.length === 0 && diaries.length === 0) {
    return '本期暂无足够数据，请继续记录以获得更准确的分析';
  }

  const parts: string[] = [];
  const rate = calculateCompletionRate(tasks);

  if (tasks.length > 0) {
    if (rate >= 80) parts.push('高效执行者：任务完成率高，执行力强');
    else if (rate >= 60) parts.push('稳步推进者：大部分任务按计划完成');
    else if (rate >= 30) parts.push('计划先行者：任务规划较多，执行力有提升空间');
    else parts.push('规划积累期：已开始任务记录，建议分解任务逐步完成');

    const envCounts = tasks.reduce<Record<string, number>>((acc, t) => {
      if (t.environment) acc[t.environment] = (acc[t.environment] || 0) + 1;
      return acc;
    }, {});
    const topEnv = Object.entries(envCounts).sort((a, b) => b[1] - a[1])[0];
    const envLabels: Record<string, string> = {
      home: '居家',
      office: '办公室',
      cafe: '咖啡馆',
      other: '其他场所',
    };
    if (topEnv) parts.push(`常用环境：${envLabels[topEnv[0]] ?? topEnv[0]}`);

    const moodCounts = tasks.reduce<Record<string, number>>((acc, t) => {
      if (t.mood) acc[t.mood] = (acc[t.mood] || 0) + 1;
      return acc;
    }, {});
    const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];
    const moodLabels: Record<string, string> = {
      happy: '积极乐观',
      neutral: '平稳中立',
      sad: '情绪低落',
    };
    if (topMood) parts.push(`主要情绪：${moodLabels[topMood[0]] ?? topMood[0]}`);
  }

  if (diaries.length >= 7) parts.push('记录达人：养成了高频日记的好习惯');
  else if (diaries.length >= 3) parts.push('定期反思者：保持一定频率的日记记录');
  else if (diaries.length > 0) parts.push('开始记录：已建立日记习惯的雏形');

  return parts.join('；');
}

export function identifyHobbies(tasks: Task[], diaries: DiaryEntry[]): string[] {
  const allText = [...tasks.map(t => t.content), ...diaries.map(d => d.content)]
    .join(' ')
    .toLowerCase();

  const hobbyMap: Record<string, string[]> = {
    '阅读': ['读书', '阅读', '小说', '文章', '书籍'],
    '运动健身': ['跑步', '健身', '瑜伽', '游泳', '篮球', '足球', '锻炼'],
    '写作': ['写作', '写文章', '博客', '创作'],
    '编程开发': ['代码', '编程', '开发', '程序', 'bug', '项目'],
    '摄影': ['照片', '摄影', '拍照', '相机'],
    '烹饪': ['做饭', '烹饪', '料理', '美食', '菜'],
    '音乐': ['音乐', '听歌', '乐器', '唱歌', '歌曲'],
    '旅行': ['旅游', '旅行', '出行', '景点'],
    '设计': ['设计', 'ui', 'ux', '界面', '排版'],
    '学习成长': ['学习', '课程', '培训', '笔记', '考试'],
  };

  return Object.entries(hobbyMap)
    .filter(([, kws]) => kws.some(kw => allText.includes(kw)))
    .map(([hobby]) => hobby)
    .slice(0, 5);
}

export function generateEncouragement(
  rate: number,
  tasks: number,
  diaries: number,
): string {
  if (tasks === 0 && diaries === 0) {
    return '本期还没有记录，开始记录第一条任务或日记，养成好习惯！';
  }
  if (rate === 100 && tasks > 0) return `太棒了！本期 ${tasks} 个任务全部完成，完美收官！`;
  if (rate >= 80) return `非常出色！完成率高达 ${rate}%，继续保持这种高效状态！`;
  if (rate >= 60) return `做得不错！完成率 ${rate}%，稳步前进中，再接再厉！`;
  if (rate >= 30) return `已经迈出了重要的步伐，完成率 ${rate}%，每一个小进步都值得肯定！`;
  if (diaries > 0) return `记录了 ${diaries} 篇日记，反思是进步的开始，继续坚持！`;
  return '万事开头难，已经开始规划是最大的进步，加油！';
}

export function generateSuggestions(rate: number, tasks: Task[], diaries: DiaryEntry[]): string {
  const items: string[] = [];

  if (tasks.length === 0) {
    items.push('建议：开始记录日常任务，哪怕是小事，让每天的努力可见');
  } else {
    if (rate < 50) items.push('建议：将大任务拆分成更小的步骤，每天完成 1-2 件，逐步提升完成率');
    if (rate < 70) items.push('建议：每天早晨回顾待完成任务，晚上复盘完成情况，形成闭环');
    const highCount = tasks.filter(t => t.priority === 'high' && !t.completed).length;
    if (highCount > 3) {
      items.push(`建议：有 ${highCount} 个高优先级任务未完成，优先处理重要事项`);
    }
  }

  if (diaries.length === 0) {
    items.push('建议：养成日记习惯，每周至少记录 2-3 篇，帮助梳理思路和情绪');
  } else if (diaries.length < 3) {
    items.push('建议：尝试增加日记频率，记录日常感受和思考，积累更丰富的自我认知');
  }

  if (items.length === 0) {
    items.push('建议：当前状态良好，可以尝试提高任务挑战度，突破舒适区');
  }

  return items.join('\n');
}

export function generateSummary(
  type: 'weekly' | 'monthly' | 'yearly',
  rate: number,
  total: number,
  completed: number,
  diaries: number,
): string {
  const period = type === 'weekly' ? '本周' : type === 'monthly' ? '本月' : '今年';
  if (total === 0 && diaries === 0) {
    return `${period}尚未记录任何任务或日记，建议从小事开始，逐步养成记录习惯。`;
  }
  const parts: string[] = [];
  if (total > 0) parts.push(`共创建 ${total} 个任务，完成 ${completed} 个，完成率 ${rate}%`);
  if (diaries > 0) parts.push(`记录日记 ${diaries} 篇`);
  const verdict = rate >= 70 ? '整体执行状态良好。' : '继续努力，下期会更好。';
  return `${period}${parts.join('，')}。${verdict}`;
}

export function generateFullReport(
  reportType: 'weekly' | 'monthly' | 'yearly',
  tasks: Task[],
  diaries: DiaryEntry[],
): ReportData {
  const completionRate = calculateCompletionRate(tasks);
  const completedTasks = tasks.filter(t => t.completed).length;

  return {
    summary: generateSummary(reportType, completionRate, tasks.length, completedTasks, diaries.length),
    completionRate,
    totalTasks: tasks.length,
    completedTasks,
    totalDiaryEntries: diaries.length,
    characteristics: extractCharacteristics(tasks, diaries),
    hobbies: identifyHobbies(tasks, diaries),
    encouragement: generateEncouragement(completionRate, tasks.length, diaries.length),
    suggestions: generateSuggestions(completionRate, tasks, diaries),
    fullReport: {
      reportType,
      generatedAt: new Date().toISOString(),
      tasksBreakdown: {
        total: tasks.length,
        completed: completedTasks,
        pending: tasks.length - completedTasks,
        completionRate,
        byPriority: {
          high: tasks.filter(t => t.priority === 'high').length,
          medium: tasks.filter(t => t.priority === 'medium').length,
          low: tasks.filter(t => t.priority === 'low').length,
        },
        byEnvironment: tasks.reduce<Record<string, number>>((acc, t) => {
          if (t.environment) acc[t.environment] = (acc[t.environment] || 0) + 1;
          return acc;
        }, {}),
        byMood: tasks.reduce<Record<string, number>>((acc, t) => {
          if (t.mood) acc[t.mood] = (acc[t.mood] || 0) + 1;
          return acc;
        }, {}),
      },
      diariesBreakdown: {
        total: diaries.length,
        totalChars: diaries.reduce((s, d) => s + d.content.length, 0),
      },
    },
  };
}
