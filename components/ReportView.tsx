import { View, StyleSheet, ScrollView, Text, TouchableOpacity, Modal } from 'react-native';
import { Report } from '@/lib/supabase';
import { X, TrendingUp, BookOpen, Lightbulb, Star, Heart, Target } from 'lucide-react-native';

interface ReportViewProps {
  report: Report;
  onClose: () => void;
}

const TYPE_NAMES: Record<string, string> = {
  weekly: '周报',
  monthly: '月报',
  yearly: '年报',
};

const TYPE_COLORS: Record<string, string> = {
  weekly: '#0ea5e9',
  monthly: '#f59e0b',
  yearly: '#8b5cf6',
};

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      {icon}
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

export function ReportView({ report, onClose }: ReportViewProps) {
  const typeName = TYPE_NAMES[report.report_type] ?? '报告';
  const typeColor = TYPE_COLORS[report.report_type] ?? '#10b981';
  const generatedDate = new Date(report.created_at).toLocaleDateString('zh-CN');

  const suggestions = (report.suggestions ?? '')
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const hobbies = Array.isArray(report.hobbies)
    ? report.hobbies.filter(h => typeof h === 'string' && h.length > 0)
    : [];

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: typeColor }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={22} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{typeName}</Text>
            <Text style={styles.headerPeriod}>
              {report.period_start}  至  {report.period_end}
            </Text>
          </View>
          <View style={styles.closeBtn} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Generated time */}
          <Text style={styles.generatedText}>生成于 {generatedDate}</Text>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { borderTopColor: '#10b981' }]}>
              <TrendingUp size={20} color="#10b981" />
              <Text style={styles.statValue}>{report.completion_rate}%</Text>
              <Text style={styles.statLabel}>完成率</Text>
            </View>
            <View style={[styles.statCard, { borderTopColor: '#6366f1' }]}>
              <Target size={20} color="#6366f1" />
              <Text style={styles.statValue}>{report.completed_tasks}/{report.total_tasks}</Text>
              <Text style={styles.statLabel}>任务完成</Text>
            </View>
            <View style={[styles.statCard, { borderTopColor: '#0ea5e9' }]}>
              <BookOpen size={20} color="#0ea5e9" />
              <Text style={styles.statValue}>{report.total_diary_entries}</Text>
              <Text style={styles.statLabel}>日记篇</Text>
            </View>
          </View>

          {/* Summary */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>总结</Text>
            <Text style={styles.summaryText}>{report.summary}</Text>
          </View>

          {/* Characteristics */}
          {!!report.characteristics && (
            <View style={styles.card}>
              <SectionHeader
                icon={<Star size={16} color="#f59e0b" />}
                title="个人特征"
              />
              <View style={styles.characteristicsBox}>
                {report.characteristics.split('；').filter(s => s.trim().length > 0).map((item, i) => (
                  <View key={i} style={styles.characteristicItem}>
                    <View style={styles.characteristicDot} />
                    <Text style={styles.characteristicText}>{item.trim()}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Hobbies */}
          {hobbies.length > 0 && (
            <View style={styles.card}>
              <SectionHeader
                icon={<Lightbulb size={16} color="#ec4899" />}
                title="识别到的爱好"
              />
              <View style={styles.hobbiesRow}>
                {hobbies.map((h, i) => (
                  <View key={i} style={styles.hobbyTag}>
                    <Text style={styles.hobbyTagText}>{h}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Encouragement */}
          {!!report.encouragement && (
            <View style={[styles.card, styles.encouragementCard]}>
              <SectionHeader
                icon={<Heart size={16} color="#22c55e" />}
                title="鼓励"
              />
              <Text style={styles.encouragementText}>{report.encouragement}</Text>
            </View>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <View style={styles.card}>
              <SectionHeader
                icon={<Target size={16} color="#0ea5e9" />}
                title="改进建议"
              />
              <View style={styles.suggestionsBox}>
                {suggestions.map((s, i) => (
                  <View key={i} style={styles.suggestionRow}>
                    <Text style={styles.suggestionBullet}>{i + 1}</Text>
                    <Text style={styles.suggestionText}>{s}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: 16,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerPeriod: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  generatedText: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderTopWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 6,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  characteristicsBox: {
    gap: 8,
  },
  characteristicItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  characteristicDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f59e0b',
    marginTop: 7,
    flexShrink: 0,
  },
  characteristicText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  hobbiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hobbyTag: {
    backgroundColor: '#fce7f3',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#fbcfe8',
  },
  hobbyTagText: {
    fontSize: 13,
    color: '#831843',
    fontWeight: '500',
  },
  encouragementCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  encouragementText: {
    fontSize: 14,
    color: '#166534',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  suggestionsBox: {
    gap: 10,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  suggestionBullet: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0ea5e9',
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
    flexShrink: 0,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
});
