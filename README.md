# LocalStorage 复制器

一个简单实用的浏览器扩展，用于在不同网站之间复制和提取 localStorage 数据。

## 功能特点

- **跨站复制**：从源网站复制指定的 localStorage 数据到当前网站
- **数据提取**：从当前网站提取指定 localStorage 数据到剪贴板
- **多 Key 支持**：支持同时操作多个 localStorage key
- **历史记录**：保存操作历史，方便重复使用

## 使用方法

### 复制功能

1. 输入源网站 URL（例如：https://example.com）
2. 添加需要复制的 localStorage key
3. 点击"复制到当前网站"按钮
4. 扩展会自动打开源网站，获取指定的 localStorage 数据，然后将数据设置到当前网站

### 提取功能

1. 添加需要提取的 localStorage key
2. 点击"提取指定key"按钮
3. 扩展会从当前网站获取第一个有效的 localStorage 值，并复制到剪贴板

### 历史记录

- 点击"历史记录"标签页查看之前的操作记录
- 点击任意历史记录项可以快速恢复之前的操作设置
- 历史记录会显示操作类型（复制/提取）、源网站、使用的 key 和操作时间

## 注意事项

- 扩展无法在 chrome:// 开头的特殊页面上运行
- 扩展需要访问网站的 localStorage 权限
- 历史记录最多保存最近的 10 条操作

## 安装方法

1. 下载项目代码
2. 打开 Chrome 浏览器，进入扩展管理页面（chrome://extensions/）
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目文件夹

## 技术实现

- 使用 Chrome 扩展 API 实现跨标签页数据传输
- 使用 chrome.storage.local API 存储历史记录
- 使用 chrome.scripting.executeScript API 在目标页面执行脚本
