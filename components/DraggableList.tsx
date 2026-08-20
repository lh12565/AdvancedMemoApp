import React, { useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Text, Alert } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { GripVertical } from 'lucide-react-native';

interface DraggableItem {
  id: string;
  [key: string]: any;
}

interface DraggableListProps<T extends DraggableItem> {
  data: T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number) => React.ReactElement;
  keyExtractor?: (item: T) => string;
}

export function DraggableList<T extends DraggableItem>({
  data,
  onReorder,
  renderItem,
  keyExtractor = (item) => item.id,
}: DraggableListProps<T>) {
  const [orderedData, setOrderedData] = useState<T[]>(data);
  const draggedIndex = useSharedValue<number | null>(null);

  const handleDragStart = (index: number) => {
    draggedIndex.value = index;
  };

  const handleDragEnd = async () => {
    if (draggedIndex.value !== null) {
      draggedIndex.value = null;
      await onReorder(orderedData);
    }
  };

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= orderedData.length) return;

    const newData = [...orderedData];
    const [movedItem] = newData.splice(fromIndex, 1);
    newData.splice(toIndex, 0, movedItem);
    setOrderedData(newData);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={orderedData}
        renderItem={({ item, index }) => (
          <View style={styles.itemWrapper}>
            <TouchableOpacity
              onLongPress={() => handleDragStart(index)}
              onPressOut={handleDragEnd}
              delayLongPress={200}
              style={styles.dragHandle}>
              <GripVertical size={20} color="#9ca3af" />
            </TouchableOpacity>
            <View style={styles.itemContent}>
              {renderItem(item, index)}
            </View>
          </View>
        )}
        keyExtractor={keyExtractor}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  itemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  dragHandle: {
    padding: 8,
    marginRight: 8,
  },
  itemContent: {
    flex: 1,
  },
});
