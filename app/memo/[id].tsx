import { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  ScrollView,
  Platform,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  View as RNView,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack, useFocusEffect } from 'expo-router';
import { supabase, type Memo, type Task, type DiaryEntry } from '@/lib/supabase';
import { Plus, Trash2, Square, SquareCheck as CheckSquare, Image as ImageIcon, Share2, ArrowLeft, Trash, Settings, BookOpen, CreditCard as Edit3, Download, Bell, Maximize2, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { PRIORITY_COLORS, PRIORITY_LABELS, ENVIRONMENT_LABELS, MOOD_EMOJI, calculateSuggestedTime } from '@/lib/utils';
import { exportToCSV, exportToJSON, exportToText, exportToHTML, exportToExcel, exportDiaryToText } from '@/lib/export';
import { useCallback } from 'react';
import { CelebrationOverlay } from '@/components/CelebrationOverlay';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { ReminderModal } from '@/components/ReminderModal';

type Priority = 'low' | 'medium' | 'high';
type Environment = 'home' | 'office' | 'cafe' | 'other';
type Mood = 'happy' | 'neutral' | 'sad';

export default function MemoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [memo, setMemo] = useState<Memo | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskContent, setNewTaskContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [diaryImages, setDiaryImages] = useState<string[]>([]);
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('medium');
  const [newTaskEnvironment, setNewTaskEnvironment] = useState<Environment>('home');
  const [showCelebration, setShowCelebration] = useState(false);
  const [taskSettingsModal, setTaskSettingsModal] = useState<string | null>(null);
  const [taskSettingsEnv, setTaskSettingsEnv] = useState<Environment | 'custom'>('home');
  const [taskSettingsCustomEnv, setTaskSettingsCustomEnv] = useState('');
  const [taskSettingsMood, setTaskSettingsMood] = useState<Mood | 'custom' | null>(null);
  const [taskSettingsCustomMood, setTaskSettingsCustomMood] = useState('');
  const [taskSettingsLocation, setTaskSettingsLocation] = useState('');
  const [taskSettingsLat, setTaskSettingsLat] = useState<number | null>(null);
  const [taskSettingsLng, setTaskSettingsLng] = useState<number | null>(null);
  const [diaryModalVisible, setDiaryModalVisible] = useState(false);
  const [newDiaryContent, setNewDiaryContent] = useState('');
  const [editingDiaryId, setEditingDiaryId] = useState<string | null>(null);
  const [editTaskModal, setEditTaskModal] = useState<string | null>(null);
  const [editTaskContent, setEditTaskContent] = useState('');
  const [diaryCursorPos, setDiaryCursorPos] = useState({ start: 0, end: 0 });
  const [diarySettingsModal, setDiarySettingsModal] = useState<string | null>(null);
  const [diarySettingsEnv, setDiarySettingsEnv] = useState<Environment | 'custom'>('home');
  const [diarySettingsCustomEnv, setDiarySettingsCustomEnv] = useState('');
  const [diarySettingsMood, setDiarySettingsMood] = useState<Mood | 'custom' | null>(null);
  const [diarySettingsCustomMood, setDiarySettingsCustomMood] = useState('');
  const [diarySettingsLocation, setDiarySettingsLocation] = useState('');
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [taskReminderVisible, setTaskReminderVisible] = useState(false);
  const [selectedTaskForReminder, setSelectedTaskForReminder] = useState<Task | null>(null);
  const [diaryReminderVisible, setDiaryReminderVisible] = useState(false);
  const [selectedDiaryForReminder, setSelectedDiaryForReminder] = useState<DiaryEntry | null>(null);
  const [diarySettingsLat, setDiarySettingsLat] = useState<number | null>(null);
  const [diarySettingsLng, setDiarySettingsLng] = useState<number | null>(null);
  const [diaryEditMode, setDiaryEditMode] = useState<'markdown' | 'rich'>('markdown');
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [colorPickerTarget, setColorPickerTarget] = useState<'text' | 'bg'>('text');
  const [viewingDiaryEntry, setViewingDiaryEntry] = useState<DiaryEntry | null>(null);

  const isDiary = memo?.type === 'diary';

  useFocusEffect(
    useCallback(() => {
      loadMemoAndTasks();
    }, [id])
  );

  async function loadMemoAndTasks() {
    try {
      const { data: memoData, error: memoError } = await supabase
        .from('memos')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (memoError) throw memoError;
      if (!memoData) {
        Alert.alert('错误', '备忘录不存在');
        router.back();
        return;
      }
      setMemo(memoData);

      if (memoData.type === 'diary') {
        const { data: diaryData, error: diaryError } = await supabase
          .from('diary_entries')
          .select('*')
          .eq('memo_id', id)
          .order('created_at', { ascending: false });

        if (diaryError) throw diaryError;
        setDiaryEntries(diaryData || []);
      } else {
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .eq('memo_id', id)
          .order('sort_order, created_at', { ascending: false });

        if (tasksError) throw tasksError;
        setTasks(tasksData || []);
      }
    } catch (error) {
      console.error('Error loading memo:', error);
      Alert.alert('错误', '加载失败');
    } finally {
      setLoading(false);
    }
  }

  // --- Task functions ---
  async function pickImage() {
    if (Platform.OS === 'web') {
      Alert.alert('提示', '网页版暂不支持图片上传');
      return;
    }
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('提示', '需要相册权限');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  }

  async function pickDiaryImage() {
    if (Platform.OS === 'web') {
      Alert.alert('提示', '网页版暂不支持图片上传');
      return;
    }
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('提示', '需要相册权限');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setDiaryImages([...diaryImages, result.assets[0].uri]);
    }
  }

  async function addTask() {
    if (!newTaskContent.trim() && !selectedImage) {
      Alert.alert('提示', '请输入任务内容或选择图片');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          memo_id: id,
          content: newTaskContent.trim() || '图片任务',
          image_url: selectedImage,
          completed: false,
          priority: newTaskPriority,
          environment: newTaskEnvironment,
          sort_order: tasks.length,
        }])
        .select()
        .single();

      if (error) throw error;
      setTasks([data, ...tasks]);
      setNewTaskContent('');
      setSelectedImage(null);
      setNewTaskPriority('medium');
      setNewTaskEnvironment('home');
    } catch (error) {
      console.error('Error adding task:', error);
      Alert.alert('错误', '添加任务失败');
    }
  }

  async function updateTask(taskId: string, updates: Partial<Task>) {
    try {
      const { error } = await supabase.from('tasks').update(updates).eq('id', taskId);
      if (error) throw error;
      setTasks(tasks.map((t) => t.id === taskId ? { ...t, ...updates } : t));
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('错误', '更新任务失败');
    }
  }

  async function saveTaskReminder(taskId: string, reminderTime: Date | null, enabled: boolean) {
    try {
      await updateTask(taskId, {
        reminder_time: reminderTime?.toISOString() || null,
        reminder_enabled: enabled,
      });
      Alert.alert('成功', enabled ? '提醒已设置' : '提醒已清除');
    } catch (error) {
      console.error('Error saving reminder:', error);
      Alert.alert('错误', '保存提醒失败');
    }
  }

  async function saveDiaryReminder(diaryId: string, reminderTime: Date | null, enabled: boolean) {
    try {
      const { error } = await supabase
        .from('diary_entries')
        .update({
          reminder_time: reminderTime?.toISOString() || null,
          reminder_enabled: enabled,
        })
        .eq('id', diaryId);
      if (error) throw error;
      setDiaryEntries(diaryEntries.map((d) =>
        d.id === diaryId
          ? { ...d, reminder_time: reminderTime?.toISOString() || null, reminder_enabled: enabled }
          : d
      ));
      Alert.alert('成功', enabled ? '提醒已设置' : '提醒已清除');
    } catch (error) {
      console.error('Error saving diary reminder:', error);
      Alert.alert('错误', '保存提醒失败');
    }
  }

  async function toggleTask(task: Task) {
    const newCompleted = !task.completed;
    await updateTask(task.id, {
      completed: newCompleted,
      completed_at: newCompleted ? new Date().toISOString() : null,
    });
    const updatedTasks = tasks.map((t) =>
      t.id === task.id ? { ...t, completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null } : t
    );
    if (newCompleted && updatedTasks.every((t) => t.completed)) {
      setShowCelebration(true);
    }
  }

  async function deleteTask(taskId: string) {
    Alert.alert('确认删除', '确定要删除这个任务吗？', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: async () => {
        try {
          const { error } = await supabase.from('tasks').delete().eq('id', taskId);
          if (error) throw error;
          setTasks(tasks.filter((t) => t.id !== taskId));
        } catch (error) {
          console.error('Error deleting task:', error);
          Alert.alert('错误', '删除任务失败');
        }
      }},
    ]);
  }

  async function clearAllTasks() {
    Alert.alert('确认清空', '确定要删除所有任务吗？此操作不可恢复。', [
      { text: '取消', style: 'cancel' },
      { text: '清空', style: 'destructive', onPress: async () => {
        try {
          const { error } = await supabase.from('tasks').delete().eq('memo_id', id);
          if (error) throw error;
          setTasks([]);
        } catch (error) {
          console.error('Error clearing tasks:', error);
          Alert.alert('错误', '清空任务失败');
        }
      }},
    ]);
  }

  // --- Diary functions ---
  async function addDiaryEntry() {
    if (!newDiaryContent.trim()) {
      Alert.alert('提示', '请输入日记内容');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('diary_entries')
        .insert([{
          memo_id: id,
          content: newDiaryContent.trim(),
          image_urls: diaryImages.length > 0 ? diaryImages : null,
        }])
        .select()
        .single();

      if (error) throw error;
      setDiaryEntries([data, ...diaryEntries]);
      setNewDiaryContent('');
      setDiaryImages([]);
      setEditingDiaryId(null);
      setDiaryModalVisible(false);
    } catch (error) {
      console.error('Error adding diary entry:', error);
      Alert.alert('错误', '添加日记失败');
    }
  }

  async function updateDiaryEntry() {
    if (!editingDiaryId || !newDiaryContent.trim()) return;
    try {
      const { error } = await supabase
        .from('diary_entries')
        .update({
          content: newDiaryContent.trim(),
          image_urls: diaryImages.length > 0 ? diaryImages : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingDiaryId);
      if (error) throw error;
      setDiaryEntries(diaryEntries.map((e) =>
        e.id === editingDiaryId ? {
          ...e,
          content: newDiaryContent.trim(),
          image_urls: diaryImages.length > 0 ? diaryImages : null,
        } : e
      ));
      setNewDiaryContent('');
      setDiaryImages([]);
      setEditingDiaryId(null);
      setDiaryModalVisible(false);
    } catch (error) {
      console.error('Error updating diary entry:', error);
      Alert.alert('错误', '更新日记失败');
    }
  }

  async function deleteDiaryEntry(entryId: string) {
    Alert.alert('确认删除', '确定要删除这个日记吗？', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: async () => {
        try {
          const { error } = await supabase.from('diary_entries').delete().eq('id', entryId);
          if (error) throw error;
          setDiaryEntries(diaryEntries.filter((e) => e.id !== entryId));
        } catch (error) {
          console.error('Error deleting diary entry:', error);
          Alert.alert('错误', '删除失败');
        }
      }},
    ]);
  }

  async function updateDiarySettings(entryId: string, updates: Partial<DiaryEntry>) {
    try {
      const { error } = await supabase
        .from('diary_entries')
        .update(updates)
        .eq('id', entryId);
      if (error) throw error;
      setDiaryEntries(diaryEntries.map((e) =>
        e.id === entryId ? { ...e, ...updates } : e
      ));
    } catch (error) {
      console.error('Error updating diary settings:', error);
      Alert.alert('错误', '更新失败');
    }
  }

  async function getCurrentLocation(isTask: boolean) {
    if (Platform.OS === 'web') {
      if (!navigator.geolocation) {
        Alert.alert('提示', '您的浏览器不支持定位功能');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
            );
            const data = await response.json();
            const locationName = data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            if (isTask) {
              setTaskSettingsLat(latitude);
              setTaskSettingsLng(longitude);
              setTaskSettingsLocation(locationName);
            } else {
              setDiarySettingsLat(latitude);
              setDiarySettingsLng(longitude);
              setDiarySettingsLocation(locationName);
            }
          } catch {
            const locationName = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            if (isTask) {
              setTaskSettingsLat(latitude);
              setTaskSettingsLng(longitude);
              setTaskSettingsLocation(locationName);
            } else {
              setDiarySettingsLat(latitude);
              setDiarySettingsLng(longitude);
              setDiarySettingsLocation(locationName);
            }
          }
        },
        (error) => {
          Alert.alert('定位失败', '请检查定位权限设置');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      Alert.alert('提示', '请在网页版使用定位功能');
    }
  }

  function openDiaryEditor(entry?: DiaryEntry) {
    if (entry) {
      setEditingDiaryId(entry.id);
      setNewDiaryContent(entry.content);
      setDiaryImages(entry.image_urls || []);
    } else {
      setEditingDiaryId(null);
      setNewDiaryContent('');
      setDiaryImages([]);
    }
    setDiaryModalVisible(true);
  }

  function insertFormat(prefix: string) {
    const { start } = diaryCursorPos;
    const before = newDiaryContent.slice(0, start);
    const after = newDiaryContent.slice(start);

    // If cursor is at start of line or line is empty, insert prefix at cursor
    // Otherwise, insert on a new line
    const lineStart = before.lastIndexOf('\n') + 1;
    const currentLinePrefix = before.slice(lineStart);
    const needsNewLine = currentLinePrefix.trim().length > 0;

    if (needsNewLine) {
      setNewDiaryContent(before + '\n' + prefix + after);
    } else {
      setNewDiaryContent(before + prefix + after);
    }
  }

  function insertWrapFormat(beforeFmt: string, afterFmt: string) {
    const { start, end } = diaryCursorPos;
    const before = newDiaryContent.slice(0, start);
    const selected = newDiaryContent.slice(start, end);
    const after = newDiaryContent.slice(end);

    if (selected.length > 0) {
      setNewDiaryContent(before + beforeFmt + selected + afterFmt + after);
    } else {
      setNewDiaryContent(before + beforeFmt + '文本' + afterFmt + after);
    }
  }

  function insertRichTag(tag: string) {
    const { start, end } = diaryCursorPos;
    const before = newDiaryContent.slice(0, start);
    const selected = newDiaryContent.slice(start, end);
    const after = newDiaryContent.slice(end);

    const tagMap: Record<string, { open: string; close: string }> = {
      'h1': { open: '# ', close: '' },
      'h2': { open: '## ', close: '' },
      'h3': { open: '### ', close: '' },
      'b': { open: '**', close: '**' },
      'i': { open: '*', close: '*' },
      'u': { open: '_', close: '_' },
      's': { open: '~~', close: '~~' },
      'ul': { open: '\n- ', close: '' },
      'ol': { open: '\n1. ', close: '' },
      'quote': { open: '\n> ', close: '' },
      'code': { open: '\n```\n', close: '\n```\n' },
      'link': { open: '[', close: '](URL)' },
      'img': { open: '![', close: '](图片URL)' },
    };

    const { open, close } = tagMap[tag] || { open: '', close: '' };
    const text = selected.length > 0 ? selected : '文本';
    setNewDiaryContent(before + open + text + close + after);
  }

  // --- Share ---
  async function shareMemo() {
    try {
      let content: string;
      if (isDiary) {
        content = exportDiaryToText(memo!, diaryEntries);
      } else {
        const completedCount = tasks.filter((t) => t.completed).length;
        content = `【${memo?.name}】\n\n进度: ${completedCount}/${tasks.length}\n\n${tasks
          .map((t) => `${t.completed ? '✅' : '⭕'} ${t.content}`)
          .join('\n')}`;
      }

      if (Platform.OS === 'web') {
        downloadFile(content, `${memo?.name}.txt`, 'text/plain');
        Alert.alert('成功', `文件已下载: ${memo?.name}.txt`);
      } else {
        const base64 = stringToBase64(content);
        await Sharing.shareAsync('data:text/plain;base64,' + base64, {
          mimeType: 'text/plain',
          dialogTitle: `分享: ${memo?.name}`,
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('错误', '分享失败，请使用导出功能');
    }
  }

  async function exportFromDetail(format: 'csv' | 'json' | 'text' | 'pdf' | 'excel') {
    if (!memo) return;
    try {
      if (format === 'pdf') {
        const html = exportToHTML(memo, tasks, diaryEntries);
        if (Platform.OS === 'web') {
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            setTimeout(() => { printWindow.print(); }, 500);
            Alert.alert('提示', '请在打印对话框中选择"另存为PDF"');
          } else {
            downloadFile(html, `${memo.name}.html`, 'text/html');
            Alert.alert('成功', 'HTML文件已下载，可在浏览器中打开后打印为PDF');
          }
        } else {
          const base64 = stringToBase64(html);
          await Sharing.shareAsync('data:text/html;base64,' + base64, {
            mimeType: 'text/html',
            dialogTitle: `导出: ${memo.name}.html`,
          });
        }
        return;
      }

      if (format === 'excel') {
        if (isDiary) {
          const csv = await exportToCSV(memo, []);
          downloadFile(csv, `${memo.name}.csv`, 'text/csv');
        } else {
          const xls = exportToExcel(memo, tasks);
          downloadFile(xls, `${memo.name}.xls`, 'application/vnd.ms-excel');
        }
        Alert.alert('成功', `文件已下载: ${memo.name}.${isDiary ? 'csv' : 'xls'}`);
        return;
      }

      let content: string;
      let filename: string;
      let mimeType: string;

      if (isDiary) {
        if (format === 'json') {
          content = JSON.stringify({ memo, entries: diaryEntries }, null, 2);
          filename = `${memo.name}.json`;
          mimeType = 'application/json';
        } else {
          content = exportDiaryToText(memo, diaryEntries);
          filename = `${memo.name}.txt`;
          mimeType = 'text/plain';
        }
      } else {
        if (format === 'csv') {
          content = await exportToCSV(memo, tasks);
          filename = `${memo.name}.csv`;
          mimeType = 'text/csv';
        } else if (format === 'json') {
          content = await exportToJSON(memo, tasks);
          filename = `${memo.name}.json`;
          mimeType = 'application/json';
        } else {
          content = await exportToText(memo, tasks);
          filename = `${memo.name}.txt`;
          mimeType = 'text/plain';
        }
      }

      if (Platform.OS === 'web') {
        downloadFile(content, filename, mimeType);
        Alert.alert('成功', `文件已下载: ${filename}`);
      } else {
        const base64 = stringToBase64(content);
        await Sharing.shareAsync('data:' + mimeType + ';base64,' + base64, {
          mimeType,
          dialogTitle: `导出: ${filename}`,
        });
      }
    } catch (error) {
      console.error('Error exporting:', error);
      Alert.alert('错误', '导出失败，请重试');
    }
  }

  function downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function stringToBase64(str: string): string {
    const bytes = new TextEncoder().encode(str);
    const binString = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
    return btoa(binString);
  }

  const completedCount = useMemo(() => tasks.filter((t) => t.completed).length, [tasks]);
  const totalCount = tasks.length;

  function renderTaskItem({ item }: { item: Task }) {
    const priority = item.priority || 'medium';
    const priorityColor = PRIORITY_COLORS[priority];

    return (
      <View style={[styles.taskCard, item.completed && styles.taskCardCompleted]}>
        <TouchableOpacity style={styles.checkbox} onPress={() => toggleTask(item)}>
          {item.completed ? (
            <CheckSquare size={24} color="#10b981" />
          ) : (
            <Square size={24} color="#9ca3af" />
          )}
        </TouchableOpacity>

        <View style={styles.taskContent}>
          <View style={styles.taskTitleContainer}>
            <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
            <Text style={[styles.taskText, item.completed && styles.taskTextCompleted]} numberOfLines={2}>
              {item.content}
            </Text>
          </View>

          {item.image_url && (
            <Image source={{ uri: item.image_url }} style={styles.taskImage} />
          )}

          {(item.environment || item.custom_environment || item.location || item.mood || item.custom_mood) && (
            <View style={styles.taskMeta}>
              {(item.environment || item.custom_environment) && (
                <Text style={styles.taskEnvironment}>
                  {item.custom_environment || ENVIRONMENT_LABELS[item.environment as Environment]}
                </Text>
              )}
              {item.location && (
                <Text style={styles.taskLocation}>📍 {item.location}</Text>
              )}
              {(item.mood || item.custom_mood) && (
                <Text style={styles.taskMood}>{item.custom_mood || MOOD_EMOJI[item.mood as Mood]}</Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.taskActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              setSelectedTaskForReminder(item);
              setTaskReminderVisible(true);
            }}>
            <Bell size={16} color={item.reminder_enabled ? '#0ea5e9' : '#9ca3af'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              setTaskSettingsModal(item.id);
              if (item.custom_environment) {
                setTaskSettingsEnv('custom');
                setTaskSettingsCustomEnv(item.custom_environment);
              } else {
                setTaskSettingsEnv((item.environment as Environment) || 'home');
                setTaskSettingsCustomEnv('');
              }
              if (item.custom_mood) {
                setTaskSettingsMood('custom');
                setTaskSettingsCustomMood(item.custom_mood);
              } else {
                setTaskSettingsMood((item.mood as Mood) || null);
                setTaskSettingsCustomMood('');
              }
              setTaskSettingsLocation(item.location || '');
              setTaskSettingsLat(item.latitude || null);
              setTaskSettingsLng(item.longitude || null);
            }}>
            <Settings size={16} color="#6366f1" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              setEditTaskModal(item.id);
              setEditTaskContent(item.content);
            }}>
            <Edit3 size={16} color="#0ea5e9" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => deleteTask(item.id)}>
            <Trash size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderDiaryEntry({ item }: { item: DiaryEntry }) {
    return (
      <View style={styles.diaryCard}>
        <View style={styles.diaryHeader}>
          <View style={styles.diaryDateRow}>
            <BookOpen size={14} color="#0ea5e9" />
            <Text style={styles.diaryDate}>
              {new Date(item.created_at).toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })}
            </Text>
          </View>
          <View style={styles.diaryActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setSelectedDiaryForReminder(item);
                setDiaryReminderVisible(true);
              }}>
              <Bell size={16} color={item.reminder_enabled ? '#0ea5e9' : '#9ca3af'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setDiarySettingsModal(item.id);
                if (item.custom_environment) {
                  setDiarySettingsEnv('custom');
                  setDiarySettingsCustomEnv(item.custom_environment);
                } else {
                  setDiarySettingsEnv((item.environment as Environment) || 'home');
                  setDiarySettingsCustomEnv('');
                }
                if (item.custom_mood) {
                  setDiarySettingsMood('custom');
                  setDiarySettingsCustomMood(item.custom_mood);
                } else {
                  setDiarySettingsMood((item.mood as Mood) || null);
                  setDiarySettingsCustomMood('');
                }
                setDiarySettingsLocation(item.location || '');
                setDiarySettingsLat(item.latitude || null);
                setDiarySettingsLng(item.longitude || null);
              }}>
              <Settings size={16} color="#6366f1" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => openDiaryEditor(item)}>
              <Edit3 size={16} color="#0ea5e9" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => setViewingDiaryEntry(item)}>
              <Maximize2 size={16} color="#10b981" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => deleteDiaryEntry(item.id)}>
              <Trash size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        {(item.environment || item.custom_environment || item.location || item.mood || item.custom_mood || (item.tags && item.tags.length > 0)) && (
          <View style={styles.diaryMeta}>
            {(item.environment || item.custom_environment) && (
              <Text style={styles.diaryEnvironment}>
                {item.custom_environment || ENVIRONMENT_LABELS[item.environment as Environment]}
              </Text>
            )}
            {item.location && (
              <Text style={styles.diaryLocation}>📍 {item.location}</Text>
            )}
            {(item.mood || item.custom_mood) && (
              <Text style={styles.diaryMood}>{item.custom_mood || MOOD_EMOJI[item.mood as Mood]}</Text>
            )}
            {item.tags && item.tags.map((tag) => (
              <View key={tag} style={styles.diaryTag}>
                <Text style={styles.diaryTagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity activeOpacity={0.85} onPress={() => setViewingDiaryEntry(item)}>
          <MarkdownRenderer content={item.content} style={styles.diaryContent} />
        </TouchableOpacity>

        {item.image_urls && item.image_urls.length > 0 && (
          <View style={styles.diaryImagesContainer}>
            {item.image_urls.map((imageUrl, index) => (
              <Image
                key={index}
                source={{ uri: imageUrl }}
                style={styles.diaryDisplayImage}
              />
            ))}
          </View>
        )}

        {item.updated_at !== item.created_at && (
          <Text style={styles.diaryUpdated}>
            编辑于 {new Date(item.updated_at).toLocaleDateString('zh-CN')}
          </Text>
        )}
      </View>
    );
  }

  if (loading || !memo) {
    return (
      <>
        <Stack.Screen
          options={{
            title: '加载中...',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
                <ArrowLeft size={24} color="#ffffff" />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <CelebrationOverlay
        visible={showCelebration}
        onDismiss={() => setShowCelebration(false)}
      />
      <Stack.Screen
        options={{
          title: memo.name,
          headerStyle: { backgroundColor: isDiary ? '#0ea5e9' : '#10b981' },
          headerTintColor: '#ffffff',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <ArrowLeft size={24} color="#ffffff" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={styles.headerButtons}>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert('导出', '选择导出格式', [
                    { text: '取消', style: 'cancel' },
                    { text: 'PDF', onPress: () => exportFromDetail('pdf') },
                    { text: 'Excel', onPress: () => exportFromDetail('excel') },
                    { text: 'TXT', onPress: () => exportFromDetail('text') },
                    { text: 'CSV', onPress: () => exportFromDetail('csv') },
                    { text: 'JSON', onPress: () => exportFromDetail('json') },
                  ]);
                }}
                style={styles.headerButton}>
                <Download size={22} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={shareMemo} style={styles.headerButton}>
                <Share2 size={22} color="#ffffff" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      <View style={styles.container}>
        {isDiary ? (
          // --- Diary View ---
          <>
            <View style={styles.taskViewHeader}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButtonTask}>
                <ArrowLeft size={24} color="#0ea5e9" />
                <Text style={[styles.backButtonText, { color: '#0ea5e9' }]}>返回</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.diaryStatsContainer}>
              <View style={styles.diaryStatBox}>
                <Text style={styles.diaryStatNumber}>{diaryEntries.length}</Text>
                <Text style={styles.diaryStatLabel}>日记篇数</Text>
              </View>
              <View style={styles.diaryStatBox}>
                <Text style={styles.diaryStatNumber}>
                  {diaryEntries.length > 0
                    ? Math.round(diaryEntries.reduce((sum, e) => sum + e.content.length, 0) / diaryEntries.length)
                    : 0}
                </Text>
                <Text style={styles.diaryStatLabel}>平均字数</Text>
              </View>
              <View style={styles.diaryStatBox}>
                <Text style={styles.diaryStatNumber}>
                  {diaryEntries.reduce((sum, e) => sum + e.content.length, 0)}
                </Text>
                <Text style={styles.diaryStatLabel}>总字数</Text>
              </View>
            </View>

            <View style={styles.addDiaryContainer}>
              <TouchableOpacity
                style={styles.addDiaryButton}
                onPress={() => openDiaryEditor()}>
                <Plus size={20} color="#0ea5e9" />
                <Text style={styles.addDiaryButtonText}>写日记</Text>
              </TouchableOpacity>
            </View>

            {diaryEntries.length === 0 ? (
              <View style={styles.emptyContainer}>
                <BookOpen size={48} color="#d1d5db" />
                <Text style={styles.emptyText}>还没有日记</Text>
                <Text style={styles.emptySubtext}>开始记录你的日常生活</Text>
              </View>
            ) : (
              <FlatList
                data={diaryEntries}
                renderItem={renderDiaryEntry}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
              />
            )}
          </>
        ) : (
          // --- Task View ---
          <>
            <View style={styles.taskViewHeader}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButtonTask}>
                <ArrowLeft size={24} color="#10b981" />
                <Text style={styles.backButtonText}>返回</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{totalCount - completedCount}</Text>
                <Text style={styles.statLabel}>未完成</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, styles.completedNumber]}>
                  {completedCount}
                </Text>
                <Text style={styles.statLabel}>已完成</Text>
              </View>
              {totalCount > 0 && (
                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>
                    {Math.round((completedCount / totalCount) * 100)}%
                  </Text>
                  <Text style={styles.statLabel}>完成度</Text>
                </View>
              )}
            </View>

            <View style={styles.addTaskContainer}>
              <TextInput
                style={styles.taskInput}
                placeholder="输入任务内容..."
                value={newTaskContent}
                onChangeText={setNewTaskContent}
                placeholderTextColor="#9ca3af"
                multiline
              />
              <View style={styles.addTaskButtons}>
                <TouchableOpacity
                  style={styles.imageButton}
                  onPress={pickImage}
                  disabled={Platform.OS === 'web'}>
                  <ImageIcon size={20} color={Platform.OS === 'web' ? '#d1d5db' : '#10b981'} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.addButton} onPress={addTask}>
                  <Plus size={20} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>

            {selectedImage && (
              <View style={styles.selectedImageContainer}>
                <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setSelectedImage(null)}>
                  <Text style={styles.removeImageText}>移除</Text>
                </TouchableOpacity>
              </View>
            )}

            {tasks.length > 0 && (
              <View style={styles.controlsContainer}>
                <TouchableOpacity style={styles.clearButton} onPress={clearAllTasks}>
                  <Trash2 size={16} color="#ef4444" />
                  <Text style={styles.clearButtonText}>全部清空</Text>
                </TouchableOpacity>
              </View>
            )}

            {tasks.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>还没有任务</Text>
                <Text style={styles.emptySubtext}>添加第一个任务开始计划</Text>
              </View>
            ) : (
              <FlatList
                data={tasks}
                renderItem={renderTaskItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
              />
            )}
          </>
        )}
      </View>

      {/* Diary Editor Modal — fullscreen so keyboard never covers input */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={diaryModalVisible}
        onRequestClose={() => setDiaryModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.fsEditorContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}>
          {/* Header */}
          <View style={styles.fsEditorHeader}>
            <TouchableOpacity onPress={() => setDiaryModalVisible(false)} style={styles.fsEditorBack}>
              <ArrowLeft size={24} color="#1f2937" />
            </TouchableOpacity>
            <Text style={styles.fsEditorTitle}>
              {editingDiaryId ? '编辑日记' : '写日记'}
            </Text>
            <TouchableOpacity
              style={styles.fsEditorSaveBtn}
              onPress={editingDiaryId ? updateDiaryEntry : addDiaryEntry}>
              <Text style={styles.fsEditorSaveBtnText}>
                {editingDiaryId ? '更新' : '保存'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Mode switcher */}
          <View style={styles.modeSwitcher}>
            <TouchableOpacity
              style={[styles.modeBtn, diaryEditMode === 'markdown' && styles.modeBtnActive]}
              onPress={() => setDiaryEditMode('markdown')}>
              <Text style={[styles.modeBtnText, diaryEditMode === 'markdown' && styles.modeBtnTextActive]}>Markdown</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, diaryEditMode === 'rich' && styles.modeBtnActive]}
              onPress={() => setDiaryEditMode('rich')}>
              <Text style={[styles.modeBtnText, diaryEditMode === 'rich' && styles.modeBtnTextActive]}>富文本</Text>
            </TouchableOpacity>
          </View>

          {/* Markdown Toolbar */}
          {diaryEditMode === 'markdown' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.formatToolbarScroll}>
              <View style={styles.formatToolbar}>
                <TouchableOpacity style={styles.formatButton} onPress={() => insertFormat('# ')}>
                  <Text style={styles.formatButtonText}>H1</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.formatButton} onPress={() => insertFormat('## ')}>
                  <Text style={styles.formatButtonText}>H2</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.formatButton} onPress={() => insertFormat('### ')}>
                  <Text style={styles.formatButtonText}>H3</Text>
                </TouchableOpacity>
                <View style={styles.toolbarDivider} />
                <TouchableOpacity style={styles.formatButton} onPress={() => insertWrapFormat('**', '**')}>
                  <Text style={styles.formatButtonTextBold}>B</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.formatButton} onPress={() => insertWrapFormat('*', '*')}>
                  <Text style={styles.formatButtonTextItalic}>I</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.formatButton} onPress={() => insertWrapFormat('~~', '~~')}>
                  <Text style={styles.formatButtonTextStrike}>S</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.formatButton} onPress={() => insertWrapFormat('`', '`')}>
                  <Text style={styles.formatButtonTextMono}>&lt;/&gt;</Text>
                </TouchableOpacity>
                <View style={styles.toolbarDivider} />
                <TouchableOpacity style={styles.formatButton} onPress={() => insertFormat('- ')}>
                  <Text style={styles.formatButtonText}>列表</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.formatButton} onPress={() => insertFormat('1. ')}>
                  <Text style={styles.formatButtonText}>序号</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.formatButton} onPress={() => insertFormat('> ')}>
                  <Text style={styles.formatButtonText}>引用</Text>
                </TouchableOpacity>
                <View style={styles.toolbarDivider} />
                <TouchableOpacity style={styles.formatButton} onPress={() => insertFormat('```\n\n```\n')}>
                  <Text style={styles.formatButtonText}>代码</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.formatButton} onPress={() => insertFormat('| 列1 | 列2 | 列3 |\n|---|---|---|\n| 内容 | 内容 | 内容 |\n')}>
                  <Text style={styles.formatButtonText}>表格</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.formatButton} onPress={() => insertFormat('![图片描述](图片URL)\n')}>
                  <Text style={styles.formatButtonText}>图片</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.formatButton} onPress={() => insertWrapFormat('{color:#ef4444}', '{/color}')}>
                  <Text style={[styles.formatButtonText, { color: '#ef4444' }]}>颜色</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.formatButton} onPress={() => insertFormat('---\n')}>
                  <Text style={styles.formatButtonText}>分割线</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {/* Rich Text Toolbar */}
          {diaryEditMode === 'rich' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.formatToolbarScroll}>
              <View style={styles.formatToolbar}>
                <TouchableOpacity style={styles.formatButton} onPress={() => insertRichTag('h1')}>
                  <Text style={styles.formatButtonText}>H1</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.formatButton} onPress={() => insertRichTag('h2')}>
                  <Text style={styles.formatButtonText}>H2</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.formatButton} onPress={() => insertRichTag('h3')}>
                  <Text style={styles.formatButtonText}>H3</Text>
                </TouchableOpacity>
                <View style={styles.toolbarDivider} />
                <TouchableOpacity style={styles.formatButton} onPress={() => insertRichTag('b')}>
                  <Text style={styles.formatButtonTextBold}>B</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.formatButton} onPress={() => insertRichTag('i')}>
                  <Text style={styles.formatButtonTextItalic}>I</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.formatButton} onPress={() => insertRichTag('u')}>
                  <Text style={styles.formatButtonTextUnderline}>U</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.formatButton} onPress={() => insertRichTag('s')}>
                  <Text style={styles.formatButtonTextStrike}>S</Text>
                </TouchableOpacity>
                <View style={styles.toolbarDivider} />
                <TouchableOpacity style={styles.formatButton} onPress={() => insertRichTag('ul')}>
                  <Text style={styles.formatButtonText}>列表</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.formatButton} onPress={() => insertRichTag('ol')}>
                  <Text style={styles.formatButtonText}>序号</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.formatButton} onPress={() => insertRichTag('quote')}>
                  <Text style={styles.formatButtonText}>引用</Text>
                </TouchableOpacity>
                <View style={styles.toolbarDivider} />
                <TouchableOpacity style={styles.formatButton} onPress={() => insertRichTag('code')}>
                  <Text style={styles.formatButtonText}>代码</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.formatButton} onPress={() => insertRichTag('link')}>
                  <Text style={styles.formatButtonText}>链接</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.formatButton} onPress={() => insertRichTag('img')}>
                  <Text style={styles.formatButtonText}>图片</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.formatButton}
                  onPress={() => {
                    setColorPickerTarget('text');
                    setColorPickerVisible(true);
                  }}>
                  <Text style={[styles.formatButtonText, { color: '#ef4444' }]}>A</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.formatButton}
                  onPress={() => {
                    setColorPickerTarget('bg');
                    setColorPickerVisible(true);
                  }}>
                  <View style={styles.highlightBtn}>
                    <Text style={styles.formatButtonText}>高亮</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {/* Input area — flex:1 so it fills all remaining space above keyboard */}
          <TextInput
            style={styles.fsEditorInput}
            placeholder={diaryEditMode === 'markdown'
              ? "记录你的每一刻...\n\n支持 Markdown 格式：\n# 标题  ## 副标题\n**粗体** *斜体*\n- 列表项  1. 序号\n> 引用"
              : "记录你的每一刻...\n\n富文本编辑模式：\n选中文字后点击工具栏按钮应用格式"}
            value={newDiaryContent}
            onChangeText={setNewDiaryContent}
            onSelectionChange={(e) => setDiaryCursorPos(e.nativeEvent.selection)}
            placeholderTextColor="#9ca3af"
            multiline
            textAlignVertical="top"
            autoFocus
          />

          {/* Bottom bar: char count + image upload */}
          <View style={styles.fsEditorBottomBar}>
            <Text style={styles.diaryCharText}>{newDiaryContent.length} 字</Text>
            <TouchableOpacity
              style={styles.fsEditorImageBtn}
              onPress={pickDiaryImage}
              disabled={Platform.OS === 'web'}>
              <ImageIcon size={18} color={Platform.OS === 'web' ? '#d1d5db' : '#0ea5e9'} />
              <Text style={[styles.diaryImageUploadText, Platform.OS === 'web' && { color: '#d1d5db' }]}>添加图片</Text>
            </TouchableOpacity>
          </View>

          {/* Image preview */}
          {diaryImages.length > 0 && (
            <View style={styles.diaryImagePreviewContainer}>
              <Text style={styles.diaryImagePreviewTitle}>已添加 {diaryImages.length} 张图片</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.diaryImagePreviewScroll}>
                {diaryImages.map((imageUri, index) => (
                  <View key={index} style={styles.diaryImagePreviewItem}>
                    <Image source={{ uri: imageUri }} style={styles.diaryImagePreview} />
                    <TouchableOpacity
                      style={styles.diaryImageRemoveBtn}
                      onPress={() => {
                        setDiaryImages(diaryImages.filter((_, i) => i !== index));
                      }}>
                      <Text style={styles.diaryImageRemoveBtnText}>删除</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </KeyboardAvoidingView>
      </Modal>

      {/* Fullscreen Diary Viewer */}
      {viewingDiaryEntry && (
        <Modal
          animationType="slide"
          transparent={false}
          visible={true}
          onRequestClose={() => setViewingDiaryEntry(null)}>
          <View style={styles.fsViewerContainer}>
            <View style={styles.fsViewerHeader}>
              <View style={styles.fsViewerHeaderLeft}>
                <BookOpen size={16} color="#0ea5e9" />
                <Text style={styles.fsViewerDate}>
                  {new Date(viewingDiaryEntry.created_at).toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long',
                  })}
                </Text>
              </View>
              <View style={styles.fsViewerHeaderRight}>
                <TouchableOpacity
                  style={styles.fsViewerEditBtn}
                  onPress={() => {
                    setViewingDiaryEntry(null);
                    openDiaryEditor(viewingDiaryEntry);
                  }}>
                  <Edit3 size={18} color="#0ea5e9" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.fsViewerCloseBtn}
                  onPress={() => setViewingDiaryEntry(null)}>
                  <X size={22} color="#6b7280" />
                </TouchableOpacity>
              </View>
            </View>

            {(viewingDiaryEntry.environment || viewingDiaryEntry.custom_environment ||
              viewingDiaryEntry.location || viewingDiaryEntry.mood || viewingDiaryEntry.custom_mood ||
              (viewingDiaryEntry.tags && viewingDiaryEntry.tags.length > 0)) && (
              <View style={[styles.diaryMeta, styles.fsViewerMeta]}>
                {(viewingDiaryEntry.environment || viewingDiaryEntry.custom_environment) && (
                  <Text style={styles.diaryEnvironment}>
                    {viewingDiaryEntry.custom_environment || ENVIRONMENT_LABELS[viewingDiaryEntry.environment as Environment]}
                  </Text>
                )}
                {viewingDiaryEntry.location && (
                  <Text style={styles.diaryLocation}>📍 {viewingDiaryEntry.location}</Text>
                )}
                {(viewingDiaryEntry.mood || viewingDiaryEntry.custom_mood) && (
                  <Text style={styles.diaryMood}>{viewingDiaryEntry.custom_mood || MOOD_EMOJI[viewingDiaryEntry.mood as Mood]}</Text>
                )}
                {viewingDiaryEntry.tags?.map((tag) => (
                  <View key={tag} style={styles.diaryTag}>
                    <Text style={styles.diaryTagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            <ScrollView style={styles.fsViewerScroll} contentContainerStyle={styles.fsViewerScrollContent}>
              <MarkdownRenderer content={viewingDiaryEntry.content} style={styles.fsViewerContent} />

              {viewingDiaryEntry.image_urls && viewingDiaryEntry.image_urls.length > 0 && (
                <View style={styles.diaryImagesContainer}>
                  {viewingDiaryEntry.image_urls.map((url, i) => (
                    <Image key={i} source={{ uri: url }} style={styles.diaryDisplayImage} />
                  ))}
                </View>
              )}

              {viewingDiaryEntry.updated_at !== viewingDiaryEntry.created_at && (
                <Text style={styles.diaryUpdated}>
                  编辑于 {new Date(viewingDiaryEntry.updated_at).toLocaleDateString('zh-CN')}
                </Text>
              )}
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* Color Picker Modal */}
      {colorPickerVisible && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={true}
          onRequestClose={() => setColorPickerVisible(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setColorPickerVisible(false)}>
            <Pressable style={styles.colorPickerContent} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>选择颜色</Text>
              <View style={styles.colorGrid}>
                {['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#1f2937', '#4b5563', '#6b7280', '#9ca3af'].map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[styles.colorSwatch, { backgroundColor: color }]}
                    onPress={() => {
                      if (colorPickerTarget === 'text') {
                        insertWrapFormat(`{color:${color}}`, '{/color}');
                      } else {
                        insertWrapFormat(`{bg:${color}}`, '{/bg}');
                      }
                      setColorPickerVisible(false);
                    }}
                  />
                ))}
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Task Settings Modal */}
      {taskSettingsModal && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={true}
          onRequestClose={() => setTaskSettingsModal(null)}>
          <Pressable style={styles.modalOverlay} onPress={() => setTaskSettingsModal(null)}>
            <Pressable style={styles.settingsModalContent} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>任务设置</Text>

              <Text style={styles.fieldLabel}>环境</Text>
              <View style={styles.environmentSelector}>
                {(['home', 'office', 'cafe', 'other'] as const).map((env) => (
                  <TouchableOpacity
                    key={env}
                    style={[styles.envOption, taskSettingsEnv === env && styles.envOptionActive]}
                    onPress={() => { setTaskSettingsEnv(env); setTaskSettingsCustomEnv(''); }}>
                    <Text style={styles.envOptionText}>
                      {ENVIRONMENT_LABELS[env]}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.envOption, taskSettingsEnv === 'custom' && styles.envOptionActive]}
                  onPress={() => setTaskSettingsEnv('custom')}>
                  <Text style={styles.envOptionText}>自定义</Text>
                </TouchableOpacity>
              </View>
              {taskSettingsEnv === 'custom' && (
                <TextInput
                  style={styles.settingsInput}
                  placeholder="输入自定义环境"
                  value={taskSettingsCustomEnv}
                  onChangeText={setTaskSettingsCustomEnv}
                  placeholderTextColor="#9ca3af"
                />
              )}

              <Text style={styles.fieldLabel}>心情</Text>
              <View style={styles.moodSelectorRow}>
                {(['happy', 'neutral', 'sad'] as const).map((mood) => (
                  <TouchableOpacity
                    key={mood}
                    style={[styles.moodOptionBtn, taskSettingsMood === mood && styles.moodOptionBtnActive]}
                    onPress={() => { setTaskSettingsMood(mood); setTaskSettingsCustomMood(''); }}>
                    <Text style={styles.moodOptionEmoji}>{MOOD_EMOJI[mood]}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.moodOptionBtn, taskSettingsMood === 'custom' && styles.moodOptionBtnActive]}
                  onPress={() => setTaskSettingsMood('custom')}>
                  <Text style={styles.moodOptionEmoji}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.moodOptionBtn, taskSettingsMood === null && styles.moodOptionBtnActive]}
                  onPress={() => setTaskSettingsMood(null)}>
                  <Text style={styles.moodOptionEmoji}>-</Text>
                </TouchableOpacity>
              </View>
              {taskSettingsMood === 'custom' && (
                <TextInput
                  style={styles.settingsInput}
                  placeholder="输入任意表情或文字"
                  value={taskSettingsCustomMood}
                  onChangeText={setTaskSettingsCustomMood}
                  placeholderTextColor="#9ca3af"
                />
              )}

              <Text style={styles.fieldLabel}>位置</Text>
              <View style={styles.locationRow}>
                <TextInput
                  style={[styles.settingsInput, styles.locationInput]}
                  placeholder="输入位置（可选）"
                  value={taskSettingsLocation}
                  onChangeText={setTaskSettingsLocation}
                  placeholderTextColor="#9ca3af"
                />
                <TouchableOpacity
                  style={styles.locationBtn}
                  onPress={() => getCurrentLocation(true)}>
                  <Text style={styles.locationBtnText}>📍定位</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.settingsButtons}>
                <TouchableOpacity
                  style={[styles.settingsButton, styles.cancelSettingsButton]}
                  onPress={() => setTaskSettingsModal(null)}>
                  <Text style={styles.cancelSettingsButtonText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.settingsButton, styles.saveSettingsButton]}
                  onPress={async () => {
                    if (taskSettingsModal) {
                      await updateTask(taskSettingsModal, {
                        environment: taskSettingsEnv === 'custom' ? undefined : taskSettingsEnv as Environment,
                        custom_environment: taskSettingsEnv === 'custom' ? taskSettingsCustomEnv || null : null,
                        mood: taskSettingsMood === 'custom' ? undefined : taskSettingsMood as Mood,
                        custom_mood: taskSettingsMood === 'custom' ? taskSettingsCustomMood || null : null,
                        location: taskSettingsLocation || null,
                        latitude: taskSettingsLat,
                        longitude: taskSettingsLng,
                      });
                      setTaskSettingsModal(null);
                    }
                  }}>
                  <Text style={styles.saveSettingsButtonText}>保存</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Edit Task Modal */}
      {editTaskModal && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={true}
          onRequestClose={() => setEditTaskModal(null)}>
          <Pressable style={styles.modalOverlay} onPress={() => setEditTaskModal(null)}>
            <Pressable style={styles.settingsModalContent} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>编辑任务</Text>
              <TextInput
                style={styles.settingsInput}
                placeholder="任务内容"
                value={editTaskContent}
                onChangeText={setEditTaskContent}
                placeholderTextColor="#9ca3af"
                autoFocus
              />
              <View style={styles.settingsButtons}>
                <TouchableOpacity
                  style={[styles.settingsButton, styles.cancelSettingsButton]}
                  onPress={() => setEditTaskModal(null)}>
                  <Text style={styles.cancelSettingsButtonText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.settingsButton, styles.saveSettingsButton]}
                  onPress={async () => {
                    if (editTaskModal && editTaskContent.trim()) {
                      await updateTask(editTaskModal, { content: editTaskContent.trim() });
                      setEditTaskModal(null);
                    }
                  }}>
                  <Text style={styles.saveSettingsButtonText}>保存</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Diary Settings Modal */}
      {diarySettingsModal && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={true}
          onRequestClose={() => setDiarySettingsModal(null)}>
          <Pressable style={styles.modalOverlay} onPress={() => setDiarySettingsModal(null)}>
            <Pressable style={styles.settingsModalContent} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>日记设置</Text>

              <Text style={styles.fieldLabel}>环境</Text>
              <View style={styles.environmentSelector}>
                {(['home', 'office', 'cafe', 'other'] as const).map((env) => (
                  <TouchableOpacity
                    key={env}
                    style={[styles.envOption, diarySettingsEnv === env && styles.envOptionActive]}
                    onPress={() => { setDiarySettingsEnv(env); setDiarySettingsCustomEnv(''); }}>
                    <Text style={styles.envOptionText}>
                      {ENVIRONMENT_LABELS[env]}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.envOption, diarySettingsEnv === 'custom' && styles.envOptionActive]}
                  onPress={() => setDiarySettingsEnv('custom')}>
                  <Text style={styles.envOptionText}>自定义</Text>
                </TouchableOpacity>
              </View>
              {diarySettingsEnv === 'custom' && (
                <TextInput
                  style={styles.settingsInput}
                  placeholder="输入自定义环境"
                  value={diarySettingsCustomEnv}
                  onChangeText={setDiarySettingsCustomEnv}
                  placeholderTextColor="#9ca3af"
                />
              )}

              <Text style={styles.fieldLabel}>心情</Text>
              <View style={styles.moodSelectorRow}>
                {(['happy', 'neutral', 'sad'] as const).map((mood) => (
                  <TouchableOpacity
                    key={mood}
                    style={[styles.moodOptionBtn, diarySettingsMood === mood && styles.moodOptionBtnActive]}
                    onPress={() => { setDiarySettingsMood(mood); setDiarySettingsCustomMood(''); }}>
                    <Text style={styles.moodOptionEmoji}>{MOOD_EMOJI[mood]}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.moodOptionBtn, diarySettingsMood === 'custom' && styles.moodOptionBtnActive]}
                  onPress={() => setDiarySettingsMood('custom')}>
                  <Text style={styles.moodOptionEmoji}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.moodOptionBtn, diarySettingsMood === null && styles.moodOptionBtnActive]}
                  onPress={() => setDiarySettingsMood(null)}>
                  <Text style={styles.moodOptionEmoji}>-</Text>
                </TouchableOpacity>
              </View>
              {diarySettingsMood === 'custom' && (
                <TextInput
                  style={styles.settingsInput}
                  placeholder="输入任意表情或文字"
                  value={diarySettingsCustomMood}
                  onChangeText={setDiarySettingsCustomMood}
                  placeholderTextColor="#9ca3af"
                />
              )}

              <Text style={styles.fieldLabel}>位置</Text>
              <View style={styles.locationRow}>
                <TextInput
                  style={[styles.settingsInput, styles.locationInput]}
                  placeholder="输入位置（可选）"
                  value={diarySettingsLocation}
                  onChangeText={setDiarySettingsLocation}
                  placeholderTextColor="#9ca3af"
                />
                <TouchableOpacity
                  style={styles.locationBtn}
                  onPress={() => getCurrentLocation(false)}>
                  <Text style={styles.locationBtnText}>📍定位</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.settingsButtons}>
                <TouchableOpacity
                  style={[styles.settingsButton, styles.cancelSettingsButton]}
                  onPress={() => setDiarySettingsModal(null)}>
                  <Text style={styles.cancelSettingsButtonText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.settingsButton, styles.saveSettingsButton]}
                  onPress={async () => {
                    if (diarySettingsModal) {
                      await updateDiarySettings(diarySettingsModal, {
                        environment: diarySettingsEnv === 'custom' ? undefined : diarySettingsEnv as Environment,
                        custom_environment: diarySettingsEnv === 'custom' ? diarySettingsCustomEnv || null : null,
                        mood: diarySettingsMood === 'custom' ? undefined : diarySettingsMood as Mood,
                        custom_mood: diarySettingsMood === 'custom' ? diarySettingsCustomMood || null : null,
                        location: diarySettingsLocation || null,
                        latitude: diarySettingsLat,
                        longitude: diarySettingsLng,
                      });
                      setDiarySettingsModal(null);
                    }
                  }}>
                  <Text style={styles.saveSettingsButtonText}>保存</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Task Reminder Modal */}
      {selectedTaskForReminder && (
        <ReminderModal
          visible={taskReminderVisible}
          onClose={() => {
            setTaskReminderVisible(false);
            setSelectedTaskForReminder(null);
          }}
          onSave={(reminderTime, enabled) =>
            saveTaskReminder(selectedTaskForReminder.id, reminderTime, enabled)
          }
          currentReminderTime={selectedTaskForReminder.reminder_time}
          currentReminderEnabled={selectedTaskForReminder.reminder_enabled}
        />
      )}

      {/* Diary Reminder Modal */}
      {selectedDiaryForReminder && (
        <ReminderModal
          visible={diaryReminderVisible}
          onClose={() => {
            setDiaryReminderVisible(false);
            setSelectedDiaryForReminder(null);
          }}
          onSave={(reminderTime, enabled) =>
            saveDiaryReminder(selectedDiaryForReminder.id, reminderTime, enabled)
          }
          currentReminderTime={selectedDiaryForReminder.reminder_time}
          currentReminderEnabled={selectedDiaryForReminder.reminder_enabled}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
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
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  // --- Stats ---
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#6b7280',
    marginBottom: 4,
  },
  completedNumber: {
    color: '#10b981',
  },
  statLabel: {
    fontSize: 13,
    color: '#9ca3af',
  },
  // --- Diary Stats ---
  diaryStatsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  diaryStatBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 3,
    borderLeftColor: '#0ea5e9',
  },
  diaryStatNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0369a1',
    marginBottom: 4,
  },
  diaryStatLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
  // --- Add Task ---
  addTaskContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    alignItems: 'flex-end',
  },
  taskInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
    maxHeight: 120,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  addTaskButtons: {
    gap: 8,
  },
  imageButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10b981',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedImageContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
  },
  removeImageButton: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  removeImageText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  controlsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    gap: 8,
  },
  clearButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  clearButtonText: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 14,
  },
  listContent: {
    padding: 16,
  },
  // --- Task Card ---
  taskCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  taskCardCompleted: {
    backgroundColor: '#f0fdf4',
  },
  checkbox: {
    marginRight: 12,
    paddingTop: 2,
  },
  taskContent: {
    flex: 1,
  },
  taskTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  taskText: {
    fontSize: 16,
    color: '#1f2937',
    lineHeight: 24,
    flex: 1,
  },
  taskTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
  taskImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 8,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  taskEnvironment: {
    fontSize: 12,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  taskLocation: {
    fontSize: 12,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  taskMood: {
    fontSize: 14,
  },
  taskActions: {
    marginLeft: 8,
    gap: 6,
    flexDirection: 'column',
    alignItems: 'center',
  },
  actionButton: {
    padding: 4,
  },
  // --- Diary Card ---
  diaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 3,
    borderLeftColor: '#0ea5e9',
  },
  diaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  diaryDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  diaryDate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0369a1',
  },
  diaryActions: {
    flexDirection: 'row',
    gap: 4,
  },
  diaryContent: {
    fontSize: 16,
    color: '#1f2937',
    lineHeight: 26,
  },
  diaryUpdated: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 8,
    fontStyle: 'italic',
  },
  diaryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  diaryEnvironment: {
    fontSize: 12,
    color: '#0ea5e9',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  diaryLocation: {
    fontSize: 12,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  diaryMood: {
    fontSize: 14,
  },
  diaryTag: {
    backgroundColor: '#e0f2fe',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  diaryTagText: {
    fontSize: 11,
    color: '#0369a1',
    fontWeight: '500',
  },
  // --- Add Diary Button ---
  addDiaryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addDiaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#0ea5e9',
    borderRadius: 16,
    paddingVertical: 14,
  },
  addDiaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0ea5e9',
  },
  // --- Empty ---
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
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  // --- Modal common ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
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
    marginTop: 12,
  },
  // --- Diary Modal ---
  diaryModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    width: '92%',
    maxWidth: 500,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  diaryModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  diaryModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  diaryModalClose: {
    fontSize: 16,
    color: '#6b7280',
  },
  diaryModalBackButton: {
    padding: 8,
  },
  taskViewHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButtonTask: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#10b981',
  },
  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  modeBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  modeBtnTextActive: {
    color: '#0ea5e9',
  },
  formatToolbarScroll: {
    marginBottom: 12,
  },
  formatToolbar: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  toolbarDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 4,
  },
  formatButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  formatButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  formatButtonTextBold: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
  },
  formatButtonTextItalic: {
    fontSize: 14,
    fontWeight: '400',
    fontStyle: 'italic',
    color: '#1f2937',
  },
  formatButtonTextStrike: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    textDecorationLine: 'line-through',
  },
  formatButtonTextUnderline: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    textDecorationLine: 'underline',
  },
  formatButtonTextMono: {
    fontSize: 11,
    fontWeight: '600',
    color: '#b45309',
  },
  highlightBtn: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  colorPickerContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  diaryScrollInput: {
    maxHeight: 300,
  },
  diaryInput: {
    minHeight: 240,
    fontSize: 16,
    color: '#1f2937',
    lineHeight: 26,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    textAlignVertical: 'top',
  },
  diaryCharCount: {
    alignItems: 'flex-end',
    marginTop: 4,
    marginRight: 4,
  },
  diaryCharText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  diarySaveButton: {
    backgroundColor: '#0ea5e9',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  diarySaveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // --- Task Settings Modal ---
  settingsModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  environmentSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  envOption: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  envOptionActive: {
    backgroundColor: '#d1fae5',
    borderColor: '#10b981',
  },
  envOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  moodSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  moodOptionBtn: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  moodOptionBtnActive: {
    backgroundColor: '#d1fae5',
    borderColor: '#10b981',
  },
  moodOptionEmoji: {
    fontSize: 28,
  },
  settingsInput: {
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  locationInput: {
    flex: 1,
    marginBottom: 0,
  },
  locationBtn: {
    backgroundColor: '#0ea5e9',
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  settingsButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  settingsButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelSettingsButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelSettingsButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  saveSettingsButton: {
    backgroundColor: '#10b981',
  },
  saveSettingsButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // --- Diary Images ---
  diaryImageUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginBottom: 12,
  },
  diaryImageUploadText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0ea5e9',
  },
  diaryImagePreviewContainer: {
    marginBottom: 16,
  },
  diaryImagePreviewTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 8,
  },
  diaryImagePreviewScroll: {
    marginBottom: 8,
  },
  diaryImagePreviewItem: {
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  diaryImagePreview: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  diaryImageRemoveBtn: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  diaryImageRemoveBtnText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
  diaryImagesContainer: {
    marginTop: 12,
    marginBottom: 12,
    gap: 12,
  },
  diaryDisplayImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  // --- Fullscreen Editor ---
  fsEditorContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  fsEditorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  fsEditorBack: {
    padding: 4,
  },
  fsEditorTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1f2937',
  },
  fsEditorSaveBtn: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  fsEditorSaveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  fsEditorInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    lineHeight: 26,
    padding: 16,
    textAlignVertical: 'top',
    backgroundColor: '#ffffff',
  },
  fsEditorBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    backgroundColor: '#ffffff',
  },
  fsEditorImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  // --- Fullscreen Viewer ---
  fsViewerContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  fsViewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  fsViewerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  fsViewerHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fsViewerDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    flexShrink: 1,
  },
  fsViewerEditBtn: {
    padding: 8,
  },
  fsViewerCloseBtn: {
    padding: 8,
  },
  fsViewerMeta: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  fsViewerScroll: {
    flex: 1,
  },
  fsViewerScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  fsViewerContent: {
    fontSize: 17,
    lineHeight: 28,
  },
});
