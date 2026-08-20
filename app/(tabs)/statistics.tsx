import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase, type Memo, type Task, type DiaryEntry } from '@/lib/supabase';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { ChevronRight, BookOpen, SquareCheck as CheckSquare } from 'lucide-react-native';
import { useCallback } from 'react';

type MemoStats = {
  memo: Memo;
  totalTasks: number;
  completedTasks: number;
  progress: number;
  environmentStats: Record<string, number>;
  moodStats: Record<string, number>;
};

type DiaryStats = {
  memo: Memo;
  entryCount: number;
  totalWords: number;
  avgWords: number;
};

type MonthlyData = {
  month: string;
  completed: number;
  total: number;
};

export default function StatisticsScreen() {
  const [memoStats, setMemoStats] = useState<MemoStats[]>([]);
  const [diaryStats, setDiaryStats] = useState<DiaryStats[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const screenWidth = Dimensions.get('window').width;

  useFocusEffect(
    useCallback(() => {
      loadStatistics();
    }, [])
  );

  async function loadStatistics() {
    try {
      const { data: memos, error: memosError } = await supabase
        .from('memos')
        .select('*')
        .order('created_at', { ascending: false });

      if (memosError) throw memosError;

      if (!memos || memos.length === 0) {
        setMemoStats([]);
        setDiaryStats([]);
        setMonthlyData([]);
        setLoading(false);
        return;
      }

      const taskMemos = memos.filter((m) => m.type !== 'diary');
      const diaryMemos = memos.filter((m) => m.type === 'diary');

      // Process task memos
      const stats: MemoStats[] = [];
      const monthlyTasksMap: Record<string, { completed: number; total: number }> = {};

      for (const memo of taskMemos) {
        const { data: tasks, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .eq('memo_id', memo.id);

        if (tasksError) throw tasksError;

        const totalTasks = tasks?.length || 0;
        const completedTasks = tasks?.filter((t) => t.completed).length || 0;
        const progress = totalTasks > 0 ? completedTasks / totalTasks : 0;

        const environmentStats: Record<string, number> = {};
        const moodStats: Record<string, number> = {};

        tasks?.forEach((task) => {
          if (task.environment) {
            environmentStats[task.environment] = (environmentStats[task.environment] || 0) + 1;
          }
          if (task.mood) {
            moodStats[task.mood] = (moodStats[task.mood] || 0) + 1;
          }

          if (task.completed_at) {
            const date = new Date(task.completed_at);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyTasksMap[monthKey]) {
              monthlyTasksMap[monthKey] = { completed: 0, total: 0 };
            }
            monthlyTasksMap[monthKey].completed++;
          }

          const createdDate = new Date(task.created_at);
          const monthKey = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`;
          if (!monthlyTasksMap[monthKey]) {
            monthlyTasksMap[monthKey] = { completed: 0, total: 0 };
          }
          monthlyTasksMap[monthKey].total++;
        });

        stats.push({ memo, totalTasks, completedTasks, progress, environmentStats, moodStats });
      }

      setMemoStats(stats);

      // Process diary memos
      const dStats: DiaryStats[] = [];
      for (const memo of diaryMemos) {
        const { data: entries, error: diaryError } = await supabase
          .from('diary_entries')
          .select('*')
          .eq('memo_id', memo.id);

        if (diaryError) throw diaryError;

        const entryCount = entries?.length || 0;
        const totalWords = entries?.reduce((sum, e) => sum + e.content.length, 0) || 0;
        const avgWords = entryCount > 0 ? Math.round(totalWords / entryCount) : 0;

        dStats.push({ memo, entryCount, totalWords, avgWords });
      }

      setDiaryStats(dStats);

      // Monthly data
      const monthlyArray = Object.entries(monthlyTasksMap)
        .map(([month, data]) => ({ month, completed: data.completed, total: data.total }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-6);

      setMonthlyData(monthlyArray);
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  }

  const totalTasks = memoStats.reduce((sum, stat) => sum + stat.totalTasks, 0);
  const totalCompleted = memoStats.reduce((sum, stat) => sum + stat.completedTasks, 0);
  const totalPending = totalTasks - totalCompleted;
  const totalDiaryMemos = diaryStats.length;
  const totalDiaryEntries = diaryStats.reduce((sum, s) => sum + s.entryCount, 0);
  const totalDiaryWords = diaryStats.reduce((sum, s) => sum + s.totalWords, 0);

  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.7,
    useShadowColorFromDataset: false,
  };

  const pieData = [
    { name: '已完成', population: totalCompleted || 1, color: '#10b981', legendFontColor: '#1f2937', legendFontSize: 14 },
    { name: '未完成', population: totalPending || 1, color: '#f59e0b', legendFontColor: '#1f2937', legendFontSize: 14 },
  ];

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  if (memoStats.length === 0 && diaryStats.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>暂无统计数据</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.cardTitle}>总览</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{memoStats.length + diaryStats.length}</Text>
            <Text style={styles.summaryLabel}>备忘录</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{totalTasks}</Text>
            <Text style={styles.summaryLabel}>总任务</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, styles.completedText]}>{totalCompleted}</Text>
            <Text style={styles.summaryLabel}>已完成</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>
              {totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0}%
            </Text>
            <Text style={styles.summaryLabel}>完成率</Text>
          </View>
        </View>
      </View>

      {/* Charts */}
      {monthlyData.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>月度完成情况</Text>
          <BarChart
            data={{
              labels: monthlyData.map((d) => d.month.split('-')[1]),
              datasets: [
                { data: monthlyData.map((d) => d.completed), color: () => '#10b981' },
                { data: monthlyData.map((d) => d.total), color: () => '#e5e7eb' },
              ],
            }}
            width={screenWidth - 32}
            height={220}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={chartConfig}
            showValuesOnTopOfBars={false}
          />
        </View>
      )}

      {totalTasks > 0 && (
        <View style={styles.chartCard}>
          <PieChart
            data={pieData}
            width={screenWidth - 32}
            height={220}
            chartConfig={chartConfig}
            accessor={'population'}
            backgroundColor={'transparent'}
            paddingLeft={'15'}
          />
        </View>
      )}

      {/* Task Stats */}
      {memoStats.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>任务备忘录</Text>
          {memoStats.map((stat) => (
            <TouchableOpacity
              key={stat.memo.id}
              style={styles.memoCard}
              onPress={() => router.push(`/memo/${stat.memo.id}`)}>
              <View style={styles.memoHeader}>
                <View style={styles.memoNameContainer}>
                  <Text style={styles.memoName}>{stat.memo.name}</Text>
                  <Text style={styles.memoProgress}>
                    {stat.completedTasks}/{stat.totalTasks}
                  </Text>
                </View>
                <View
                  style={[
                    styles.progressBar,
                    { width: `${stat.progress * 100}%` },
                    { backgroundColor: '#10b981' },
                  ]}
                />
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <CheckSquare size={16} color="#10b981" />
                  <Text style={styles.statValue}>{Math.round(stat.progress * 100)}%</Text>
                </View>
              </View>

              {Object.keys(stat.environmentStats).length > 0 && (
                <View style={styles.environmentItem}>
                  <Text style={styles.environmentTitle}>工作环境</Text>
                  <View style={styles.environmentList}>
                    {Object.entries(stat.environmentStats).map(([env, count]) => (
                      <View key={env} style={styles.environmentTag}>
                        <Text style={styles.environmentTagText}>{env} ({count})</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {Object.keys(stat.moodStats).length > 0 && (
                <View style={styles.moodItem}>
                  <Text style={styles.moodTitle}>心情统计</Text>
                  <View style={styles.moodList}>
                    {Object.entries(stat.moodStats).map(([mood, count]) => (
                      <View key={mood} style={styles.moodTag}>
                        <Text style={styles.moodEmoji}>
                          {mood === 'happy' ? '😊' : mood === 'neutral' ? '😐' : '😫'}
                        </Text>
                        <Text style={styles.moodCount}>{count}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* Diary Stats */}
      {diaryStats.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>日记本</Text>
          {diaryStats.map((stat) => (
            <TouchableOpacity
              key={stat.memo.id}
              style={styles.diaryCard}
              onPress={() => router.push(`/memo/${stat.memo.id}`)}>
              <View style={styles.diaryHeader}>
                <View>
                  <Text style={styles.diaryName}>{stat.memo.name}</Text>
                  <Text style={styles.diaryMeta}>{stat.entryCount} 篇</Text>
                </View>
                <ChevronRight size={20} color="#9ca3af" />
              </View>
              <View style={styles.diaryStats}>
                <View style={styles.diaryStat}>
                  <BookOpen size={16} color="#0ea5e9" />
                  <Text style={styles.diaryStatText}>{stat.entryCount} 篇</Text>
                </View>
                <View style={styles.diaryStat}>
                  <Text style={styles.diaryStatText}>{stat.totalWords} 字</Text>
                </View>
                <View style={styles.diaryStat}>
                  <Text style={styles.diaryStatText}>平均 {stat.avgWords} 字/篇</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  content: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6b7280',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10b981',
    marginBottom: 4,
  },
  completedText: {
    color: '#10b981',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
    marginTop: 8,
  },
  memoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  memoHeader: {
    marginBottom: 12,
  },
  memoNameContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  memoName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  memoProgress: {
    fontSize: 12,
    color: '#6b7280',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  environmentItem: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  environmentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  environmentList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  environmentTag: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  environmentTagText: {
    fontSize: 12,
    color: '#0369a1',
    fontWeight: '500',
  },
  moodItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  moodTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  moodList: {
    flexDirection: 'row',
    gap: 12,
  },
  moodTag: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  moodEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  moodCount: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '600',
  },
  diaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  diaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  diaryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  diaryMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  diaryStats: {
    flexDirection: 'row',
    gap: 16,
  },
  diaryStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  diaryStatText: {
    fontSize: 12,
    color: '#6b7280',
  },
});
