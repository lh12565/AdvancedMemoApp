import { useState } from 'react';
import {
  View,
  Modal,
  Pressable,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  visible: boolean;
  onClose: () => void;
}

export function DatePicker({ value, onChange, visible, onClose }: DatePickerProps) {
  const [currentDate, setCurrentDate] = useState(
    value ? new Date(value) : new Date()
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: (number | null)[] = Array.from({ length: firstDay }, () => null);
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const weeks: (number | null)[][] = Array.from(
    { length: Math.ceil(days.length / 7) },
    (_, i) => days.slice(i * 7, (i + 1) * 7)
  );

  const handleSelectDate = (day: number) => {
    const selected = new Date(year, month, day);
    const isoDate = selected.toISOString().split('T')[0];
    onChange(isoDate);
    onClose();
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const selectedDay = value ? new Date(value).getDate() : -1;
  const selectedMonth = value ? new Date(value).getMonth() : -1;
  const selectedYear = value ? new Date(value).getFullYear() : -1;
  const isSelected = (day: number) =>
    day === selectedDay && month === selectedMonth && year === selectedYear;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handlePrevMonth}>
              <ChevronLeft size={24} color="#10b981" />
            </TouchableOpacity>
            <Text style={styles.title}>
              {year}年 {month + 1}月
            </Text>
            <TouchableOpacity onPress={handleNextMonth}>
              <ChevronRight size={24} color="#10b981" />
            </TouchableOpacity>
          </View>

          <View style={styles.weekdays}>
            {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
              <Text key={day} style={styles.weekday}>{day}</Text>
            ))}
          </View>

          {weeks.map((week, weekIdx) => (
            <View key={weekIdx} style={styles.week}>
              {week.map((day, dayIdx) => (
                <TouchableOpacity
                  key={dayIdx}
                  style={[
                    styles.day,
                    day !== null && isSelected(day) && styles.selectedDay,
                  ]}
                  onPress={() => day !== null && handleSelectDate(day)}
                  disabled={day === null}>
                  {day !== null && (
                    <Text style={[
                      styles.dayText,
                      isSelected(day) && styles.selectedDayText,
                    ]}>
                      {day}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ))}

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>关闭</Text>
          </TouchableOpacity>
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
  container: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  weekdays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  weekday: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    width: '14.28%',
    textAlign: 'center',
  },
  week: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  day: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  selectedDay: {
    backgroundColor: '#10b981',
  },
  dayText: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  selectedDayText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: '#10b981',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
