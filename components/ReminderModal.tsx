import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Modal, Pressable, Platform, ScrollView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Bell, X } from 'lucide-react-native';

interface ReminderModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (reminderTime: Date | null, enabled: boolean) => void;
  currentReminderTime?: string | null;
  currentReminderEnabled?: boolean;
}

export function ReminderModal({
  visible,
  onClose,
  onSave,
  currentReminderTime,
  currentReminderEnabled = false,
}: ReminderModalProps) {
  const [reminderEnabled, setReminderEnabled] = useState(currentReminderEnabled);
  const [reminderTime, setReminderTime] = useState<Date>(
    currentReminderTime ? new Date(currentReminderTime) : new Date()
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setReminderTime(selectedDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedTime) {
      const newTime = new Date(reminderTime);
      newTime.setHours(selectedTime.getHours());
      newTime.setMinutes(selectedTime.getMinutes());
      setReminderTime(newTime);
    }
  };

  const handleSave = () => {
    onSave(reminderEnabled ? reminderTime : null, reminderEnabled);
    onClose();
  };

  const handleClear = () => {
    setReminderEnabled(false);
    onSave(null, false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <Pressable
        style={styles.overlay}
        onPress={onClose}>
        <Pressable
          style={styles.content}
          onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>设置提醒</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#1f2937" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body}>
            <View style={styles.toggleContainer}>
              <Text style={styles.toggleLabel}>启用提醒</Text>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  reminderEnabled && styles.toggleButtonActive,
                ]}
                onPress={() => setReminderEnabled(!reminderEnabled)}>
                <View
                  style={[
                    styles.toggleCircle,
                    reminderEnabled && styles.toggleCircleActive,
                  ]}
                />
              </TouchableOpacity>
            </View>

            {reminderEnabled && (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>选择日期</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowDatePicker(true)}>
                    <Text style={styles.dateButtonText}>
                      {reminderTime.toLocaleDateString('zh-CN')}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>选择时间</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowTimePicker(true)}>
                    <Text style={styles.dateButtonText}>
                      {reminderTime.toLocaleTimeString('zh-CN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.previewContainer}>
                  <Bell size={20} color="#0ea5e9" />
                  <Text style={styles.previewText}>
                    提醒时间: {reminderTime.toLocaleString('zh-CN')}
                  </Text>
                </View>
              </>
            )}

            {showDatePicker && (
              <DateTimePicker
                value={reminderTime}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
              />
            )}

            {showTimePicker && (
              <DateTimePicker
                value={reminderTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTimeChange}
              />
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClear}>
              <Text style={styles.cancelButtonText}>清除提醒</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}>
              <Text style={styles.saveButtonText}>保存</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  body: {
    paddingHorizontal: 20,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  toggleButton: {
    width: 56,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleButtonActive: {
    backgroundColor: '#0ea5e9',
  },
  toggleCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
  },
  toggleCircleActive: {
    alignSelf: 'flex-end',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 12,
  },
  dateButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#cffafe',
    borderRadius: 12,
    marginVertical: 20,
  },
  previewText: {
    fontSize: 14,
    color: '#0e7490',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
  saveButton: {
    backgroundColor: '#0ea5e9',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
});
