# Solana Crypto Tools 🛠️

一套用于 Solana 钱包日常维护和**租金回收**的自动化脚本工具。

## 🌟 核心功能

- **📊 租金预览**: 一键查看所有可回收的 SOL 租金
- **🧹 一键清理**: 自动执行所有清理操作
- **地址查找表 (ALT) 管理**:
  - 批量停用、关闭查找表并**回收 SOL 租金**
- **代币账户管理**:
  - 支持 **Token Program** 和 **Token 2022**
  - 自动关闭余额为 0 的代币账户
- **🔄 重试机制**: 网络失败自动重试
- **🔍 Dry Run 模式**: 预览操作，不执行交易

## ⚙️ 安装要求

- [Node.js](https://nodejs.org/) (建议 v16.x 或以上版本)
- 一个包含少量 SOL 用于支付手续费的 Solana 钱包

## 📥 快速开始

1. **下载本项目**:
   ```bash
   git clone https://github.com/SHLE1/crypto-tools.git
   cd crypto-tools
   ```

2. **安装依赖**:
   ```bash
   npm install
   ```

3. **运行工具**:
   ```bash
   node clean-solana.js
   ```

   或使用 Dry Run 模式预览操作：
   ```bash
   node clean-solana.js --dry-run
   ```

## 🔧 环境变量配置（可选）

复制 `.env.example` 为 `.env` 进行配置：

```bash
cp .env.example .env
```

支持的环境变量：

| 变量名 | 说明 | 默认值 |
| :--- | :--- | :--- |
| `SOLANA_RPC_URL` | 自定义 RPC 节点 | 公共主网 RPC |
| `SOLANA_PRIVATE_KEY` | 私钥（避免交互输入） | 运行时输入 |

> ⚠️ **警告**: 请勿将 `.env` 文件提交到版本控制！

## 📁 项目结构

```
crypto-tools/
├── clean-solana.js      # 主程序入口
├── lib/
│   ├── index.js         # 模块导出
│   ├── connection.js    # RPC 连接管理
│   ├── wallet.js        # 钱包管理
│   ├── transaction.js   # 交易批处理
│   ├── alt.js           # ALT 管理
│   └── tokens.js        # Token 账户管理
├── .env.example         # 环境变量示例
└── package.json
```

## 🛠️ NPM 脚本

| 命令 | 说明 |
| :--- | :--- |
| `npm start` | 运行清理工具 |
| `npm run dry-run` | Dry Run 模式 |

## ⚠️ 安全与隐私

- **私钥安全**: 脚本仅在本地运行。输入私钥时使用了隐形模式，且私钥仅用于签署交易，不会上传至任何服务器。
- **主网操作**: 脚本默认连接到 Solana `mainnet-beta`。在执行任何关闭账户的操作前，请务必确认屏幕上显示的钱包地址是否正确。
- **租金回收**: 回收的 SOL 会立即返回到你的主钱包地址。

## 📄 开源协议

本项目基于 [MIT License](LICENSE) 许可协议。

---

**💡 小提示**: 
- 使用 `--dry-run` 参数可以安全地预览所有操作
- 建议使用自定义 RPC 节点以获得更好的性能
- Token 2022 代币账户也会被自动检测和清理