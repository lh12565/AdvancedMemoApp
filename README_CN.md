# 高级备忘录应用 (Advanced Memo App)

一款功能强大的待办事项和备忘录管理应用，支持优先级管理、任务追踪、数据分析等高级功能。

## 🌟 主要功能

### 核心功能
- ✅ **优先级管理** - 为备忘录和任务设置低/中/高优先级，用颜色标识
- 📅 **截止日期** - 设置截止日期，自动计算建议处理时间
- 🏷️ **标签系统** - 为备忘录添加多个标签，支持标签搜索
- 🔍 **智能搜索** - 按备忘录名称、标签或任务内容搜索
- ✨ **任务完成** - 清晰的复选框界面，已完成任务显示删除线

### 任务管理
- 📝 **任务创建** - 支持纯文本或文本+图片的任务
- 🎯 **环境追踪** - 记录任务完成地点（家/办公室/咖啡馆/其他）
- 😊 **心情记录** - 完成任务时记录心情（😊/😐/😫）
- 🗑️ **全部清空** - 带确认的清空所有任务功能
- ⬆️ **返回按钮** - 快速返回备忘录列表

### 数据管理
- 📤 **导出功能** - 支持CSV和JSON格式导出
- 📤 **分享功能** - 一键分享备忘录内容
- 📊 **数据同步** - 所有数据自动保存到Supabase云端

### 统计分析
- 📈 **完成情况图表** - 饼图展示完成进度
- 📊 **月度统计** - 查看过去6个月的任务完成趋势
- 🏆 **排名展示** - 查看完成任务最多的备忘录
- 🌍 **环境分布** - 分析在不同地点完成的任务数量
- 😊 **心情统计** - 统计不同心情状态下完成的任务

## 📱 界面设计

- 🎨 **清新绿色主题** - 舒适的视觉体验
- 🔲 **圆角设计** - 现代化的UI风格
- ⚡ **响应式布局** - 完美适配移动和桌面设备
- 🎯 **直观操作** - 清晰的导航和操作流程

## 🚀 快速开始

### 环境要求
- Node.js >= 18
- npm >= 10

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```

### 构建Web版本
```bash
npm run build:web
```

### 类型检查
```bash
npm run typecheck
```

## 🏗️ 项目结构

```
├── app/                    # Expo Router 路由
│   ├── _layout.tsx         # 根布局
│   ├── (tabs)/             # 标签页导航
│   │   ├── index.tsx       # 备忘录列表
│   │   └── statistics.tsx  # 统计分析
│   └── memo/[id].tsx       # 备忘录详情
├── components/             # 可重用组件
│   └── TagsEditor.tsx      # 标签编辑器
├── lib/                    # 工具函数
│   ├── supabase.ts         # Supabase配置
│   ├── utils.ts            # 工具函数
│   └── export.ts           # 导出功能
└── supabase/migrations/    # 数据库迁移
```

## 🗄️ 数据库结构

### Memos 表
```sql
- id (uuid)
- name (text)
- priority (low/medium/high)
- deadline (timestamp)
- tags (text[])
- suggested_time (text)
- created_at (timestamp)
```

### Tasks 表
```sql
- id (uuid)
- memo_id (uuid, FK)
- content (text)
- image_url (text)
- completed (boolean)
- priority (low/medium/high)
- environment (home/office/cafe/other)
- mood (happy/neutral/sad)
- completed_at (timestamp)
- tags (text[])
- sort_order (integer)
- created_at (timestamp)
```

## 🔐 安全性

- 使用Supabase Row Level Security (RLS)保护数据
- 所有用户数据都安全存储在云端
- 支持数据导出和备份

## 📤 发布到GitHub

### 创建发布版本
1. 更新版本号（在package.json中）
2. 创建Git标签：
```bash
git tag v1.0.0
git push origin v1.0.0
```

3. GitHub Actions将自动：
   - 构建应用
   - 创建Release
   - 上传构建包

### 下载应用
在GitHub Releases页面下载对应版本的构建包

## 🛠️ 技术栈

- **框架**: React Native with Expo
- **导航**: Expo Router
- **数据库**: Supabase (PostgreSQL)
- **图表**: react-native-chart-kit
- **图标**: lucide-react-native
- **图片处理**: expo-image-picker
- **分享**: expo-sharing
- **日期选择**: @react-native-community/datetimepicker

## 📝 环境变量

创建`.env`文件：
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

## 📧 联系方式

如有问题或建议，请通过GitHub Issues与我们联系。

---

**版本**: 1.0.0
**更新时间**: 2026年4月
**状态**: 活跃开发中 🚀
