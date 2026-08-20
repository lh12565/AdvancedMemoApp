import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase, type Report } from '@/lib/supabase';
import { ChevronRight, Calendar, FileText, RefreshCw } from 'lucide-react-native';
import { generateFullReport, getPeriodBounds } from '@/lib/reportGenerator';
import { ReportView } from '@/components/ReportView';

type PeriodType = 'weekly' | 'monthly' | 'yearly';

interface PeriodConfig {
  type: PeriodType;
  label: string;
  sublabel: string;
  color: string;
  bg: string;
}

const PERIODS: PeriodConfig[] = [
  { type: 'weekly', label: '周报', sublabel: '本周任务与日记总结', color: '#0ea5e9', bg: '#e0f2fe' },
  { type: 'monthly', label: '月报', sublabel: '本月整体回顾与分析', color: '#f59e0b', bg: '#fef3c7' },
  { type: 'yearly', label: '年报', sublabel: '全年成长轨迹与总结', color: '#8b5cf6', bg: '#ede9fe' },
];

export default function ReportsScreen() {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<PeriodType | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [])
  );

  async function loadReports() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .is('memo_id', null)
        .order('created_at', { ascending: false })
        .limit(60);
      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error('loadReports error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function generateReport(periodType: PeriodType) {
    setGenerating(periodType);
    try {
      const { start, end, key } = getPeriodBounds(periodType);

      // Fetch ALL tasks across all memos for this period
      const { data: tasks, error: tasksErr } = await supabase
        .from('tasks')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());
      if (tasksErr) throw tasksErr;

      // Fetch ALL diary entries across all memos for this period
      const { data: diaries, error: diariesErr } = await supabase
        .from('diary_entries')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());
      if (diariesErr) throw diariesErr;

      const reportData = generateFullReport(periodType, tasks ?? [], diaries ?? []);

      const row = {
        memo_id: null,
        report_type: periodType,
        period_key: key,
        period_start: start.toISOString().split('T')[0],
        period_end: end.toISOString().split('T')[0],
        summary: reportData.summary,
        completion_rate: reportData.completionRate,
        total_tasks: reportData.totalTasks,
        completed_tasks: reportData.completedTasks,
        total_diary_entries: reportData.totalDiaryEntries,
        characteristics: reportData.characteristics,
        hobbies: reportData.hobbies,
        encouragement: reportData.encouragement,
        suggestions: reportData.suggestions,
        full_report: reportData.fullReport,
      };

      // Upsert: replace any existing report for the same period_key + type
      const existing = reports.find(
        r => r.report_type === periodType && r.period_key === key
      );

      let savedReport: Report;
      if (existing) {
        const { data, error } = await supabase
          .from('reports')
          .update(row)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        savedReport = data as Report;
        setReports(prev => prev.map(r => (r.id === existing.id ? savedReport : r)));
      } else {
        const { data, error } = await supabase
          .from('reports')
          .insert([row])
          .select()
          .single();
        if (error) throw error;
        savedReport = data as Report;
        setReports(prev => [savedReport, ...prev]);
      }

      setSelectedReport(savedReport);
    } catch (err: any) {
      console.error('generateReport error:', err);
      Alert.alert('生成失败', err?.message ?? '请检查网络连接后重试');
    } finally {
      setGenerating(null);
    }
  }

  // Group reports by type for the history list
  const byType: Record<PeriodType, Report[]> = {
    weekly: reports.filter(r => r.report_type === 'weekly'),
    monthly: reports.filter(r => r.report_type === 'monthly'),
    yearly: reports.filter(r => r.report_type === 'yearly'),
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header description */}
        <View style={styles.descCard}>
          <FileText size={18} color="#6b7280" />
          <Text style={styles.descText}>
            汇总全部备忘录中的任务与日记，每个周期生成一份综合评估报告
          </Text>
        </View>

        {/* Generate buttons */}
        <View style={styles.generateRow}>
          {PERIODS.map(({ type, label, sublabel, color, bg }) => {
            const isGenerating = generating === type;
            return (
              <TouchableOpacity
                key={type}
                style={[styles.generateCard, { borderColor: color }]}
                onPress={() => generateReport(type)}
                disabled={generating !== null}
                activeOpacity={0.75}>
                <View style={[styles.generateCardBadge, { backgroundColor: bg }]}>
                  <Text style={[styles.generateCardBadgeText, { color }]}>{label}</Text>
                </View>
                <Text style={styles.generateCardSublabel}>{sublabel}</Text>
                {isGenerating ? (
                  <ActivityIndicator size="small" color={color} style={styles.generateIcon} />
                ) : (
                  <RefreshCw size={16} color={color} style={styles.generateIcon} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* History */}
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#10b981" />
          </View>
        ) : reports.length === 0 ? (
          <View style={styles.emptyBox}>
            <Calendar size={48} color="#d1d5db" />
            <Text style={styles.emptyTitle}>还没有报告</Text>
            <Text style={styles.emptySubtext}>点击上方按钮生成本周、本月或今年的报告</Text>
          </View>
        ) : (
          PERIODS.map(({ type, label, color }) => {
            const list = byType[type];
            if (list.length === 0) return null;
            return (
              <View key={type} style={styles.historySection}>
                <View style={styles.historySectionHeader}>
                  <View style={[styles.historyDot, { backgroundColor: color }]} />
                  <Text style={styles.historySectionTitle}>{label}历史</Text>
                </View>
                {list.map(report => (
                  <TouchableOpacity
                    key={report.id}
                    style={styles.reportCard}
                    onPress={() => setSelectedReport(report)}
                    activeOpacity={0.8}>
                    <View style={styles.reportCardBody}>
                      <Text style={styles.reportCardPeriod}>
                        {report.period_start}  至  {report.period_end}
                      </Text>
                      <Text style={styles.reportCardSummary} numberOfLines={2}>
                        {report.summary}
                      </Text>
                      <View style={styles.reportCardStats}>
                        <Text style={[styles.reportCardStatBadge, { backgroundColor: '#dcfce7', color: '#166534' }]}>
                          完成率 {report.completion_rate}%
                        </Text>
                        <Text style={[styles.reportCardStatBadge, { backgroundColor: '#e0f2fe', color: '#0369a1' }]}>
                          任务 {report.completed_tasks}/{report.total_tasks}
                        </Text>
                        <Text style={[styles.reportCardStatBadge, { backgroundColor: '#fce7f3', color: '#831843' }]}>
                          日记 {report.total_diary_entries} 篇
                        </Text>
                      </View>
                    </View>
                    <ChevronRight size={18} color="#9ca3af" />
                  </TouchableOpacity>
                ))}
              </View>
            );
          })
        )}
      </ScrollView>

      {selectedReport && (
        <ReportView report={selectedReport} onClose={() => setSelectedReport(null)} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  descCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  descText: {
    flex: 1,
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 19,
  },
  generateRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  generateCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  generateCardBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 6,
  },
  generateCardBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  generateCardSublabel: {
    fontSize: 10,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 14,
  },
  generateIcon: {
    marginTop: 8,
  },
  centerBox: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 6,
    textAlign: 'center',
  },
  historySection: {
    marginBottom: 24,
  },
  historySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  historyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  historySectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  reportCardBody: {
    flex: 1,
    marginRight: 8,
  },
  reportCardPeriod: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  reportCardSummary: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
    marginBottom: 8,
  },
  reportCardStats: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  reportCardStatBadge: {
    fontSize: 11,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
});
