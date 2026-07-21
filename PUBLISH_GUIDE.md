# GitHub发布指南

## 📦 如何发布新版本到GitHub

### 前置条件
1. 项目已推送到GitHub仓库
2. 已配置GitHub Actions（工作流文件已存在）
3. 有仓库的写入权限

### 发布步骤

#### 第一步：更新版本号
编辑 `package.json`，更新版本号：

```json
{
  "version": "1.0.1"
}
```

版本号规则 (Semantic Versioning):
- `1.0.0` → 主版本.次版本.补丁版本
- `1.0.0` - `1.0.1` 补丁版本（Bug修复）
- `1.0.0` - `1.1.0` 次版本（新功能）
- `1.0.0` - `2.0.0` 主版本（重大更改）

#### 第二步：提交更改
```bash
git add .
git commit -m "Release v1.0.1: Add new features and improvements"
git push origin main
```

#### 第三步：创建版本标签
```bash
git tag -a v1.0.1 -m "Release version 1.0.1"
git push origin v1.0.1
```

或一步完成：
```bash
git tag v1.0.1 && git push origin v1.0.1
```

### 自动流程（GitHub Actions）

推送标签后，GitHub Actions会自动：

1. ✅ 检出代码
2. ✅ 安装依赖（npm install）
3. ✅ 构建Web版本（npm run build:web）
4. ✅ 创建发布压缩包
5. ✅ 生成发布说明
6. ✅ 创建GitHub Release
7. ✅ 上传构建包到Release

### 检查发布状态

1. 访问仓库的 **Actions** 标签
2. 查看工作流运行状态
3. 成功后，访问 **Releases** 标签查看新发布

## 📝 发布说明示例

工作流会自动生成以下发布说明：

```
# 高级备忘录应用 Release Notes

版本: v1.0.1

## 功能特性
- 优先级管理（高/中/低）
- 截止日期和建议处理时间
- 标签管理和搜索
- 任务环境追踪和心情记录
- 数据导出(CSV/JSON)
- 任务分享功能
- 完整的统计分析
- 按月统计数据展示
```

## 📥 用户如何下载

用户可以通过以下方式获取应用：

### 方式一：GitHub Releases
1. 访问项目的 **Releases** 页面
2. 找到最新版本
3. 下载 `advanced-memo-app-web-v1.0.1.zip`
4. 解压并打开 `index.html`

### 方式二：Web访问
如果部署到GitHub Pages：
```
https://username.github.io/advanced-memo-app/
```

### 方式三：Expo
扫描项目QR码，在Expo Go中打开

### 方式四：原生应用（iOS/Android）
从GitHub Releases下载对应的应用包

## 🔄 持续发布工作流

### 每个版本的完整流程

```
1. 开发新功能
   ↓
2. 本地测试通过
   ↓
3. 提交到GitHub
   ↓
4. 创建版本标签
   ↓
5. GitHub Actions自动构建
   ↓
6. 生成Release
   ↓
7. 用户下载使用
```

### 推荐发布周期

- **Bug修复**: v1.0.X - 1-2周
- **新功能**: v1.X.0 - 2-4周
- **重大更新**: vX.0.0 - 1-2个月

## 🛠️ 本地测试发布版本

在发布前，建议本地测试：

```bash
# 构建Web版本
npm run build:web

# 本地测试
cd dist
python -m http.server 8000
# 访问 http://localhost:8000
```

## 🔐 安全最佳实践

1. **推送前检查**
   ```bash
   npm run typecheck  # 类型检查
   npm run build:web  # 构建测试
   ```

2. **版本标签签名**（可选）
   ```bash
   git tag -s v1.0.1 -m "Release version 1.0.1"
   ```

3. **删除错误标签**
   ```bash
   git tag -d v1.0.1           # 本地删除
   git push origin :refs/tags/v1.0.1  # 远程删除
   ```

## 📊 发布统计

GitHub会自动跟踪：
- Release下载次数
- 版本发布时间
- Release资源大小

## 🔗 分享发布链接

发布后可以分享：

```markdown
## 最新版本已发布！

下载 [高级备忘录应用 v1.0.1](https://github.com/username/repo/releases/tag/v1.0.1)

功能特性：
- 完整的备忘录管理
- 智能数据分析
- 云端同步

立即下载：[Get the App](https://github.com/username/repo/releases/download/v1.0.1/advanced-memo-app-web-v1.0.1.zip)
```

## 🎯 高级发布选项

### 预发布版本
```bash
git tag v1.0.1-beta.1
# 在Release页面标记为"Pre-release"
```

### 草稿版本
在Release页面创建草稿，稍后发布

### 多渠道发布
- GitHub Releases - Web版本
- App Store - iOS版本
- Google Play - Android版本
- 官方网站 - 演示链接

## 📞 故障排除

### Q: GitHub Actions构建失败？
A: 检查日志，确保所有依赖已正确安装

### Q: Release没有自动创建？
A: 检查workflow文件是否存在于 `.github/workflows/`

### Q: 构建包大小过大？
A: 删除不必要的文件，使用 `.gitignore` 排除

### Q: 如何更新已发布的Release？
A: 删除旧Release，创建新的版本标签

## 📚 相关资源

- [GitHub Actions文档](https://docs.github.com/actions)
- [语义化版本](https://semver.org/lang/zh-CN/)
- [Git标签文档](https://git-scm.com/book/zh/v2/Git-基础-打标签)

## ✅ 发布检查清单

在发布前，确保：

- [ ] 所有测试通过
- [ ] 类型检查通过（npm run typecheck）
- [ ] 本地构建成功
- [ ] 版本号已更新
- [ ] CHANGELOG已更新（可选）
- [ ] README是最新的
- [ ] 没有未提交的更改

---

**最后更新**: 2026年4月
**维护者**: Advanced Memo App Team

如有问题，请在GitHub Issues中提出。
