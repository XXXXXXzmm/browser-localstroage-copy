// 历史记录管理
const HISTORY_KEY = 'localStorageCopyHistory';
const MAX_HISTORY = 10;

// 保存历史记录
async function saveHistory(sourceUrl, keys, operationType = 'copy') {
  try {
    const result = await chrome.storage.local.get(HISTORY_KEY);
    let history = result[HISTORY_KEY] || [];
    
    const newItem = {
      sourceUrl,
      keys,
      operationType,
      timestamp: new Date().toISOString()
    };
    
    history.unshift(newItem);
    if (history.length > MAX_HISTORY) {
      history = history.slice(0, MAX_HISTORY);
    }
    
    await chrome.storage.local.set({ [HISTORY_KEY]: history });
  } catch (error) {
    console.error('保存历史记录失败:', error);
  }
}

// 加载历史记录
async function loadHistory() {
  try {
    const result = await chrome.storage.local.get(HISTORY_KEY);
    return result[HISTORY_KEY] || [];
  } catch (error) {
    console.error('加载历史记录失败:', error);
    return [];
  }
}

// 渲染历史记录
async function renderHistory() {
  try {
    const history = await loadHistory();
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '';
    
    if (history.length === 0) {
      historyList.innerHTML = '<div style="padding: 10px; text-align: center;">暂无历史记录</div>';
      return;
    }
    
    history.forEach(item => {
      const div = document.createElement('div');
      div.className = 'history-item';
      
      // 根据操作类型设置不同的样式
      if (item.operationType === 'extract') {
        div.classList.add('extract-type');
      }
      
      div.innerHTML = `
        <div><strong>源网站:</strong> ${item.sourceUrl}</div>
        <div><strong>Keys:</strong> ${item.keys.join(', ')}</div>
        <div>
          <span class="operation-type ${item.operationType === 'extract' ? 'extract-badge' : 'copy-badge'}">
            ${item.operationType === 'extract' ? '提取' : '复制'}
          </span>
          <small>${new Date(item.timestamp).toLocaleString()}</small>
        </div>
      `;
      
      div.addEventListener('click', () => {
        document.getElementById('sourceUrl').value = item.sourceUrl;
        const keysContainer = document.querySelector('.keys-container');
        keysContainer.innerHTML = '';
        item.keys.forEach(key => {
          addKeyInput(key);
        });
        document.getElementById('copyTabBtn').click();
      });
      
      historyList.appendChild(div);
    });
  } catch (error) {
    console.error('渲染历史记录失败:', error);
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '<div style="padding: 10px; text-align: center; color: red;">加载历史记录失败</div>';
  }
}

// 添加 key 输入框
function addKeyInput(value = '') {
  const container = document.querySelector('.keys-container');
  const div = document.createElement('div');
  div.className = 'key-input';
  div.innerHTML = `
    <input type="text" class="key-input-field" placeholder="输入 localStorage 的 key" value="${value}">
    <button class="remove-key">-</button>
  `;
  container.appendChild(div);
  
  // 更新所有删除按钮的状态
  updateRemoveButtons();
}

// 更新删除按钮状态
function updateRemoveButtons() {
  const removeButtons = document.querySelectorAll('.remove-key');
  const keyInputs = document.querySelectorAll('.key-input');
  
  removeButtons.forEach(button => {
    // 如果只有一个输入框，禁用删除按钮
    if (keyInputs.length === 1) {
      button.disabled = true;
      button.style.opacity = '0.5';
      button.style.cursor = 'not-allowed';
    } else {
      button.disabled = false;
      button.style.opacity = '1';
      button.style.cursor = 'pointer';
    }
  });
}

// 删除 key 输入框
function removeKeyInput(button) {
  const container = document.querySelector('.keys-container');
  const keyInputs = document.querySelectorAll('.key-input');
  
  // 如果只有一个输入框，不允许删除
  if (keyInputs.length === 1) {
    return;
  }
  
  const div = button.parentElement;
  container.removeChild(div);
  
  // 更新删除按钮状态
  updateRemoveButtons();
}

// 获取所有输入的 keys
function getAllKeys() {
  const inputs = document.querySelectorAll('.key-input-field');
  return Array.from(inputs).map(input => input.value.trim()).filter(key => key);
}

// 标签页切换
document.getElementById('copyTabBtn').addEventListener('click', () => {
  document.getElementById('copyTab').classList.add('active');
  document.getElementById('historyTab').classList.remove('active');
  document.getElementById('copyTabBtn').classList.add('active');
  document.getElementById('historyTabBtn').classList.remove('active');
});

document.getElementById('historyTabBtn').addEventListener('click', () => {
  document.getElementById('historyTab').classList.add('active');
  document.getElementById('copyTab').classList.remove('active');
  document.getElementById('historyTabBtn').classList.add('active');
  document.getElementById('copyTabBtn').classList.remove('active');
  renderHistory();
});

// 添加 key 按钮
document.getElementById('addKeyBtn').addEventListener('click', () => {
  addKeyInput();
});

// 复制按钮
document.getElementById('copyButton').addEventListener('click', async () => {
  const sourceUrl = document.getElementById('sourceUrl').value;
  const keys = getAllKeys();

  if (!sourceUrl || keys.length === 0) {
    alert('请填写源网站 URL 和至少一个 key');
    return;
  }

  try {
    // 创建新标签页打开源网站
    const sourceTab = await chrome.tabs.create({ url: sourceUrl, active: false });
    
    // 等待页面加载完成
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 获取所有 keys 的值
    const results = await Promise.all(keys.map(async (key) => {
      const result = await chrome.scripting.executeScript({
        target: { tabId: sourceTab.id },
        func: (k) => {
          try {
            return localStorage.getItem(k);
          } catch (e) {
            return null;
          }
        },
        args: [key]
      });
      return { key, value: result[0].result };
    }));

    // 关闭源标签页
    await chrome.tabs.remove(sourceTab.id);

    // 检查是否有获取失败的值
    const failedKeys = results.filter(r => r.value === null).map(r => r.key);
    if (failedKeys.length > 0) {
      alert(`以下 keys 获取失败：${failedKeys.join(', ')}`);
    }

    // 获取当前标签页
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // 检查当前标签页URL是否允许执行脚本
    if (!currentTab.url || currentTab.url.startsWith('chrome://') || 
        currentTab.url.startsWith('edge://') || currentTab.url.startsWith('about:') || 
        currentTab.url.startsWith('chrome-extension://')) {
      alert('无法在此类型的页面上执行操作。请在普通网页上使用此功能。');
      return;
    }

    // 在当前网站设置 localStorage
    await Promise.all(results.map(async ({ key, value }) => {
      if (value !== null) {
        await chrome.scripting.executeScript({
          target: { tabId: currentTab.id },
          func: (k, v) => {
            localStorage.setItem(k, v);
          },
          args: [key, value]
        });
      }
    }));

    // 保存到历史记录
    await saveHistory(sourceUrl, keys, 'copy');

    alert('复制成功！');
  } catch (error) {
    console.error('Error:', error);
    alert('操作失败：' + error.message);
  }
});

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  // 添加第一个 key 输入框
  addKeyInput();
  
  // 为所有删除按钮添加事件监听
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-key')) {
      removeKeyInput(e.target);
    }
  });
});

// 复制localStorage按钮
document.getElementById('copyLocalStorageButton').addEventListener('click', async () => {
  const keys = getAllKeys();

  if (keys.length === 0) {
    alert('请至少添加一个key');
    return;
  }

  try {
    // 获取当前标签页
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // 检查URL是否允许执行脚本
    if (!currentTab.url || currentTab.url.startsWith('chrome://') || 
        currentTab.url.startsWith('edge://') || currentTab.url.startsWith('about:') || 
        currentTab.url.startsWith('chrome-extension://')) {
      alert('无法在此类型的页面上执行操作。请在普通网页上使用此功能。');
      return;
    }

    // 在当前网站获取第一个有效的localStorage值
    const result = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: (keysList) => {
        for (const key of keysList) {
          try {
            const value = localStorage.getItem(key);
            if (value !== null) {
              return { key, value };
            }
          } catch (e) {
            console.error(`获取key ${key}失败:`, e);
          }
        }
        return { key: null, value: null };
      },
      args: [keys]
    });

    const { key, value } = result[0].result;

    if (key === null || value === null) {
      alert('未找到有效的localStorage值');
      return;
    }

    // 复制到剪贴板
    await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: (text) => {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return true;
      },
      args: [value]
    });
    
    // 获取当前网站URL
    const url = currentTab.url;
    // 保存到历史记录，标记为提取操作
    await saveHistory(url, [key], 'extract');
    
    alert(`已成功复制key "${key}"的值到剪贴板`);
  } catch (error) {
    console.error('Error:', error);
    alert('操作失败：' + error.message);
  }
}); 