import { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase, type Memo } from '@/lib/supabase';
import { Plus, Trash2, ChevronRight, Search, Calendar, Tag, Share2, Download, BookOpen, SquareCheck as CheckSquare } from 'lucide-react-native';
import { PRIORITY_COLORS, calculateSuggestedTime, formatDeadline } from '@/lib/utils';
import { useCallback } from 'react';
import { TagsEditor } from '@/components/TagsEditor';
import { DatePicker } from '@/components/DatePicker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { exportToCSV, exportToJSON, exportToText, exportToHTML, exportToExcel, exportDiaryToText } from '@/lib/export';
import { type DiaryEntry } from '@/lib/supabase';

export default function HomeScreen() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [tagsModalVisible, setTagsModalVisible] = useState<string | null>(null);
  const [newMemoName, setNewMemoName] = useState('');
  const [newMemoType, setNewMemoType] = useState<'task' | 'diary'>('task');
  const [newMemoPriority, setNewMemoPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newMemoDeadline, setNewMemoDeadline] = useState('');
  const [newMemoTags, setNewMemoTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      loadMemos();
    }, [])
  );

  async function loadMemos() {
    try {
      const { data, error } = await supabase
        .from('memos')
        .select('*')
        .order('sort_order, created_at', { ascending: false });

      if (error) throw error;
      setMemos(data || []);
    } catch (error) {
      console.error('Error loading memos:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createOrUpdateMemo() {
    if (!newMemoName.trim()) {
      Alert.alert('提示', '请输入备忘录名称');
      return;
    }

    try {
      const deadlineDate = newMemoDeadline
        ? new Date(newMemoDeadline).toISOString()
        : null;

      const memoData: Record<string, any> = {
        name: newMemoName.trim(),
        type: newMemoType,
        priority: newMemoPriority,
        deadline: deadlineDate,
        suggested_time: calculateSuggestedTime(newMemoPriority, deadlineDate),
        tags: newMemoTags,
      };

      if (editingMemoId) {
        const { error } = await supabase
          .from('memos')
          .update(memoData)
          .eq('id', editingMemoId);

        if (error) throw error;
        setMemos(
          memos.map((m) =>
            m.id === editingMemoId ? { ...m, ...memoData } : m
          )
        );
      } else {
        const { data, error } = await supabase
          .from('memos')
          .insert([memoData])
          .select()
          .single();

        if (error) throw error;
        setMemos([data, ...memos]);
      }

      resetModal();
    } catch (error) {
      console.error('Error saving memo:', error);
      Alert.alert('错误', editingMemoId ? '更新备忘录失败' : '创建备忘录失败');
    }
  }

  function resetModal() {
    setNewMemoName('');
    setNewMemoType('task');
    setNewMemoPriority('medium');
    setNewMemoDeadline('');
    setNewMemoTags([]);
    setEditingMemoId(null);
    setModalVisible(false);
  }

  async function deleteMemo(id: string) {
    Alert.alert('确认删除', '确定要删除这个备忘录吗？此操作不可恢复。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('memos').delete().eq('id', id);

            if (error) throw error;
            setMemos(memos.filter((memo) => memo.id !== id));
          } catch (error) {
            console.error('Error deleting memo:', error);
            Alert.alert('错误', '删除备忘录失败');
          }
        },
      },
    ]);
  }

  async function shareMemo(memo: Memo) {
    try {
      const { data: tasks } = await supabase.from('tasks').select('*').eq('memo_id', memo.id);
      const { data: entries } = await supabase.from('diary_entries').select('*').eq('memo_id', memo.id);

      let content: string;
      if (memo.type === 'diary') {
        content = exportDiaryToText(memo, (entries || []) as DiaryEntry[]);
      } else {
        const completedCount = tasks?.filter((t) => t.completed).length || 0;
        const totalCount = tasks?.length || 0;
        content = `【${memo.name}】\n\n进度: ${completedCount}/${totalCount}\n\n${
          tasks?.map((t) => `${t.completed ? '✅' : '⭕'} ${t.content}`).join('\n') ?? ''
        }`;
      }

      if (Platform.OS === 'web') {
        downloadFile(content, `${memo.name}.txt`, 'text/plain');
        Alert.alert('成功', `文件已下载: ${memo.name}.txt`);
      } else {
        await shareFileNative(content, `${memo.name}.txt`, 'text/plain', `分享: ${memo.name}`);
      }
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('错误', '分享失败，请使用导出功能');
    }
  }

  async function exportMemo(memo: Memo, format: 'csv' | 'json' | 'text' | 'pdf' | 'excel') {
    try {
      const { data: tasks } = await supabase.from('tasks').select('*').eq('memo_id', memo.id);
      const { data: entries } = await supabase.from('diary_entries').select('*').eq('memo_id', memo.id);
      const isDiary = memo.type === 'diary';

      if (format === 'pdf') {
        const html = exportToHTML(memo, tasks || [], (entries || []) as DiaryEntry[]);
        if (Platform.OS === 'web') {
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            setTimeout(() => printWindow.print(), 500);
            Alert.alert('提示', '请在打印对话框中选择"另存为PDF"');
          } else {
            downloadFile(html, `${memo.name}.html`, 'text/html');
            Alert.alert('成功', 'HTML文件已下载，可在浏览器中打开后打印为PDF');
          }
        } else {
          await shareFileNative(html, `${memo.name}.html`, 'text/html', `导出: ${memo.name}`);
        }
        return;
      }

      if (format === 'excel') {
        if (isDiary) {
          const csv = await exportToCSV(memo, []);
          const filename = `${memo.name}.csv`;
          if (Platform.OS === 'web') {
            downloadFile(csv, filename, 'text/csv');
          } else {
            await shareFileNative(csv, filename, 'text/csv', `导出: ${memo.name}`);
          }
          Alert.alert('成功', `文件已${Platform.OS === 'web' ? '下载' : '分享'}: ${filename}`);
        } else {
          const xls = exportToExcel(memo, tasks || []);
          const filename = `${memo.name}.xls`;
          if (Platform.OS === 'web') {
            downloadFile(xls, filename, 'application/vnd.ms-excel');
          } else {
            await shareFileNative(xls, filename, 'application/vnd.ms-excel', `导出: ${memo.name}`);
          }
          Alert.alert('成功', `文件已${Platform.OS === 'web' ? '下载' : '分享'}: ${filename}`);
        }
        return;
      }

      let content: string;
      let filename: string;
      let mimeType: string;

      if (isDiary) {
        if (format === 'json') {
          content = JSON.stringify({ memo, entries }, null, 2);
          filename = `${memo.name}.json`;
          mimeType = 'application/json';
        } else {
          content = exportDiaryToText(memo, (entries || []) as DiaryEntry[]);
          filename = `${memo.name}.txt`;
          mimeType = 'text/plain';
        }
      } else {
        if (format === 'csv') {
          content = await exportToCSV(memo, tasks || []);
          filename = `${memo.name}.csv`;
          mimeType = 'text/csv';
        } else if (format === 'json') {
          content = await exportToJSON(memo, tasks || []);
          filename = `${memo.name}.json`;
          mimeType = 'application/json';
        } else {
          content = await exportToText(memo, tasks || []);
          filename = `${memo.name}.txt`;
          mimeType = 'text/plain';
        }
      }

      if (Platform.OS === 'web') {
        downloadFile(content, filename, mimeType);
        Alert.alert('成功', `文件已下载: ${filename}`);
      } else {
        await shareFileNative(content, filename, mimeType, `导出: ${filename}`);
      }
    } catch (error) {
      console.error('Error exporting:', error);
      Alert.alert('错误', '导出失败，请重试');
    }
  }

  // Write content to a temp file and share it (native only).
  async function shareFileNative(content: string, filename: string, mimeType: string, dialogTitle: string) {
    const path = FileSystem.cacheDirectory + filename;
    await FileSystem.writeAsStringAsync(path, content, { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(path, { mimeType, dialogTitle, UTI: mimeType });
  }

  // Web-only: trigger a browser download via a data: URI anchor.
  function downloadFile(content: string, filename: string, mimeType: string) {
    const encoded = encodeURIComponent(content);
    const a = document.createElement('a');
    a.href = `data:${mimeType};charset=utf-8,${encoded}`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function editMemo(memo: Memo) {
    setEditingMemoId(memo.id);
    setNewMemoName(memo.name);
    setNewMemoType((memo.type || 'task') as 'task' | 'diary');
    setNewMemoPriority((memo.priority || 'medium') as 'low' | 'medium' | 'high');
    setNewMemoDeadline(
      memo.deadline
        ? new Date(memo.deadline).toISOString().split('T')[0]
        : ''
    );
    setNewMemoTags(memo.tags || []);
    setModalVisible(true);
  }

  const filteredMemos = useMemo(() => {
    if (!searchQuery.trim()) return memos;

    const query = searchQuery.toLowerCase();
    return memos.filter(
      (memo) =>
        memo.name.toLowerCase().includes(query) ||
        (memo.tags && memo.tags.some((tag: string) => tag.toLowerCase().includes(query)))
    );
  }, [memos, searchQuery]);

  function renderMemoItem({ item }: { item: Memo }) {
    const priority = (item.priority || 'medium') as 'low' | 'medium' | 'high';
    const priorityColor = PRIORITY_COLORS[priority];
    const deadlineText = formatDeadline(item.deadline || null);
    const isDiary = item.type === 'diary';

    return (
      <TouchableOpacity
        style={styles.memoCard}
        onPress={() => router.push(`/memo/${item.id}`)}
        activeOpacity={0.7}>
        <View style={[styles.priorityBar, { backgroundColor: isDiary ? '#0ea5e9' : priorityColor }]} />
        <View style={styles.memoContent}>
          <View style={styles.memoHeader}>
            <View style={styles.memoTitleRow}>
              {isDiary ? (
                <BookOpen size={18} color="#0ea5e9" style={styles.typeIcon} />
              ) : (
                <CheckSquare size={18} color="#10b981" style={styles.typeIcon} />
              )}
              <Text style={styles.memoTitle} numberOfLines={1}>
                {item.name}
              </Text>
            </View>
            <ChevronRight size={20} color="#10b981" />
          </View>

          <View style={styles.memoMetaContainer}>
            <Text style={styles.memoDate}>
              {new Date(item.created_at).toLocaleDateString('zh-CN', {
                month: 'short',
                day: 'numeric',
              })}
            </Text>
            <View style={[styles.typeBadge, isDiary ? styles.diaryBadge : styles.taskBadge]}>
              <Text style={[styles.typeBadgeText, isDiary ? styles.diaryBadgeText : styles.taskBadgeText]}>
                {isDiary ? '日记' : '任务'}
              </Text>
            </View>
            {item.suggested_time && !isDiary && (
              <Text style={styles.suggestedTime}>
                建议: {item.suggested_time}
              </Text>
            )}
          </View>

          {deadlineText && !isDiary && (
            <View style={styles.deadlineContainer}>
              <Calendar size={14} color="#f59e0b" />
              <Text style={styles.deadlineText}>{deadlineText}</Text>
            </View>
          )}

          {item.tags && item.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {item.tags.map((tag: string) => (
                <View key={tag} style={styles.tagBadge}>
                  <Text style={styles.tagBadgeText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setTagsModalVisible(item.id)}>
            <Tag size={18} color="#10b981" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => shareMemo(item)}>
            <Share2 size={18} color="#3b82f6" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              Alert.alert('导出备忘录', '选择导出格式', [
                { text: '取消', style: 'cancel' },
                { text: 'PDF', onPress: () => exportMemo(item, 'pdf') },
                { text: 'Excel', onPress: () => exportMemo(item, 'excel') },
                { text: '文本 (TXT)', onPress: () => exportMemo(item, 'text') },
                { text: 'CSV', onPress: () => exportMemo(item, 'csv') },
                { text: 'JSON', onPress: () => exportMemo(item, 'json') },
              ]);
            }}>
            <Download size={18} color="#0ea5e9" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => deleteMemo(item.id)}>
            <Trash2 size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Search size={20} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="搜索备忘录..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9ca3af"
        />
      </View>

      {filteredMemos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchQuery ? '未找到匹配的备忘录' : '还没有备忘录'}
          </Text>
          <Text style={styles.emptySubtext}>
            {searchQuery ? '试试其他搜索词' : '点击下方按钮创建第一个备忘录'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredMemos}
          renderItem={renderMemoItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          resetModal();
          setModalVisible(true);
        }}
        activeOpacity={0.8}>
        <Plus size={28} color="#ffffff" />
      </TouchableOpacity>

      {/* Date Picker */}
      <DatePicker
        value={newMemoDeadline}
        onChange={setNewMemoDeadline}
        visible={datePickerVisible}
        onClose={() => setDatePickerVisible(false)}
      />

      {/* Tags Editor Modal */}
      {tagsModalVisible && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={true}
          onRequestClose={() => setTagsModalVisible(null)}>
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setTagsModalVisible(null)}>
            <Pressable
              style={styles.modalContent}
              onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>编辑标签</Text>
              <TagsEditor
                tags={memos.find((m) => m.id === tagsModalVisible)?.tags || []}
                onTagsChange={async (newTags) => {
                  try {
                    await supabase
                      .from('memos')
                      .update({ tags: newTags })
                      .eq('id', tagsModalVisible);

                    setMemos(
                      memos.map((m) =>
                        m.id === tagsModalVisible ? { ...m, tags: newTags } : m
                      )
                    );
                  } catch (error) {
                    console.error('Error updating tags:', error);
                  }
                }}
              />
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setTagsModalVisible(null)}>
                <Text style={styles.closeButtonText}>完成</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Create/Edit Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => resetModal()}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => resetModal()}>
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editingMemoId ? '编辑备忘录' : '新建备忘录'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="请输入备忘录名称"
                value={newMemoName}
                onChangeText={setNewMemoName}
                autoFocus
                placeholderTextColor="#9ca3af"
              />

              <Text style={styles.fieldLabel}>类型</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    newMemoType === 'task' && styles.typeOptionActive,
                  ]}
                  onPress={() => setNewMemoType('task')}>
                  <CheckSquare size={20} color={newMemoType === 'task' ? '#10b981' : '#6b7280'} />
                  <Text style={[styles.typeOptionText, newMemoType === 'task' && styles.typeOptionTextActive]}>
                    任务
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    newMemoType === 'diary' && styles.typeOptionDiaryActive,
                  ]}
                  onPress={() => setNewMemoType('diary')}>
                  <BookOpen size={20} color={newMemoType === 'diary' ? '#0ea5e9' : '#6b7280'} />
                  <Text style={[styles.typeOptionText, newMemoType === 'diary' && styles.typeOptionDiaryTextActive]}>
                    日记
                  </Text>
                </TouchableOpacity>
              </View>

              {newMemoType === 'task' && (
                <>
                  <Text style={styles.fieldLabel}>优先级</Text>
                  <View style={styles.prioritySelector}>
                    {(['low', 'medium', 'high'] as const).map((p) => (
                      <TouchableOpacity
                        key={p}
                        style={[
                          styles.priorityOption,
                          newMemoPriority === p && styles.priorityOptionActive,
                          { borderBottomColor: PRIORITY_COLORS[p] },
                        ]}
                        onPress={() => setNewMemoPriority(p)}>
                        <View
                          style={[
                            styles.priorityDot,
                            { backgroundColor: PRIORITY_COLORS[p] },
                          ]}
                        />
                        <Text
                          style={[
                            styles.priorityOptionText,
                            newMemoPriority === p && styles.priorityOptionTextActive,
                          ]}>
                          {p === 'low' ? '低' : p === 'medium' ? '中' : '高'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Text style={styles.fieldLabel}>截止日期</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setDatePickerVisible(true)}>
                <Text style={{ color: newMemoDeadline ? '#1f2937' : '#9ca3af', fontSize: 16 }}>
                  {newMemoDeadline || '选择日期（可选）'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>标签</Text>
              <TagsEditor
                tags={newMemoTags}
                onTagsChange={setNewMemoTags}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => resetModal()}>
                  <Text style={styles.cancelButtonText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, newMemoType === 'diary' ? styles.createDiaryButton : styles.createButton]}
                  onPress={createOrUpdateMemo}>
                  <Text style={styles.createButtonText}>
                    {editingMemoId ? '更新' : '创建'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  listContent: {
    padding: 16,
  },
  memoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  priorityBar: {
    width: 4,
  },
  memoContent: {
    flex: 1,
    padding: 16,
  },
  memoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  memoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  typeIcon: {
    flexShrink: 0,
  },
  memoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  memoMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  memoDate: {
    fontSize: 13,
    color: '#6b7280',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  taskBadge: {
    backgroundColor: '#d1fae5',
  },
  diaryBadge: {
    backgroundColor: '#e0f2fe',
  },
  taskBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  diaryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0369a1',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  suggestedTime: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  deadlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  deadlineText: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tagBadge: {
    backgroundColor: '#d1fae5',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagBadgeText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    paddingRight: 12,
    paddingVertical: 8,
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 16,
    justifyContent: 'center',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  typeOptionActive: {
    backgroundColor: '#f0fdf4',
    borderColor: '#10b981',
  },
  typeOptionDiaryActive: {
    backgroundColor: '#f0f9ff',
    borderColor: '#0ea5e9',
  },
  typeOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  typeOptionTextActive: {
    color: '#10b981',
  },
  typeOptionDiaryTextActive: {
    color: '#0ea5e9',
  },
  prioritySelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  priorityOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 2,
  },
  priorityOptionActive: {
    backgroundColor: '#f0fdf4',
  },
  priorityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  priorityOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  priorityOptionTextActive: {
    color: '#10b981',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#10b981',
  },
  createDiaryButton: {
    backgroundColor: '#0ea5e9',
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
