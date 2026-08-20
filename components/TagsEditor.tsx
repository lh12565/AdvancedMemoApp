import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { X, Plus } from 'lucide-react-native';

interface TagsEditorProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  suggestedTags?: string[];
}

const PRESET_TAGS = [
  '工作',
  '个人',
  '学习',
  '健身',
  '购物',
  '旅游',
  '家务',
  '紧急',
  '重要',
  '定期',
];

export function TagsEditor({ tags, onTagsChange, suggestedTags = [] }: TagsEditorProps) {
  const [inputValue, setInputValue] = React.useState('');
  const allSuggested = [...new Set([...PRESET_TAGS, ...suggestedTags])];

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onTagsChange([...tags, trimmed]);
      setInputValue('');
    }
  }

  function removeTag(tag: string) {
    onTagsChange(tags.filter((t) => t !== tag));
  }

  return (
    <View style={styles.container}>
      <View style={styles.tagsContainer}>
        {tags.map((tag) => (
          <View key={tag} style={styles.tagChip}>
            <Text style={styles.tagText}>{tag}</Text>
            <TouchableOpacity
              onPress={() => removeTag(tag)}
              style={styles.removeButton}>
              <X size={14} color="#10b981" />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="输入标签名称..."
          value={inputValue}
          onChangeText={setInputValue}
          onSubmitEditing={() => addTag(inputValue)}
          placeholderTextColor="#9ca3af"
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => addTag(inputValue)}>
          <Plus size={18} color="#10b981" />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.suggestedContainer}
        contentContainerStyle={styles.suggestedContent}>
        {allSuggested.map((tag) => (
          <TouchableOpacity
            key={tag}
            style={[
              styles.suggestedTag,
              tags.includes(tag) && styles.suggestedTagSelected,
            ]}
            onPress={() =>
              tags.includes(tag) ? removeTag(tag) : addTag(tag)
            }>
            <Text
              style={[
                styles.suggestedTagText,
                tags.includes(tag) && styles.suggestedTagTextSelected,
              ]}>
              {tag}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

import React from 'react';

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    backgroundColor: '#d1fae5',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tagText: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '500',
  },
  removeButton: {
    padding: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1f2937',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  suggestedContainer: {
    marginTop: 4,
  },
  suggestedContent: {
    gap: 8,
    paddingHorizontal: 0,
  },
  suggestedTag: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  suggestedTagSelected: {
    backgroundColor: '#d1fae5',
    borderColor: '#10b981',
  },
  suggestedTagText: {
    fontSize: 12,
    color: '#6b7280',
  },
  suggestedTagTextSelected: {
    color: '#059669',
    fontWeight: '600',
  },
});
