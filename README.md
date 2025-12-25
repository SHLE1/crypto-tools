# Solana Crypto Tools 🛠️

一套用于 Solana 钱包日常维护和**租金回收**的自动化脚本工具。

## 🌟 核心功能

- **一键清理 (`clean-solana.js`)**: 提供交互式菜单，集成以下所有功能，适合个人用户。
- **地址查找表 (ALT) 管理**:
  - **批量停用**: 准备销毁不再使用的地址查找表。
  - **批量关闭**: 永久关闭查找表并**回收 SOL 租金**。
- **代币账户管理**:
  - **批量关闭空账户**: 自动识别并关闭余额为 0 的 SPL 代币账户，**收回租金**。

## ⚙️ 安装要求

- [Node.js](https://nodejs.org/) (建议 v16.x 或以上版本)
- 一个包含少量 SOL 用于支付手续费（Priority Fee）的 Solana 钱包

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
   我们推荐使用交互式主脚本：
   ```bash
   node clean-solana.js
   ```

## 🛠️ 脚本说明

如果你需要执行特定任务，可以直接运行子脚本：

| 脚本文件 | 功能描述 |
| :--- | :--- |
| `clean-solana.js` | **推荐**。交互式菜单，包含所有功能。 |
| `deactivate-all-ALT.js` | 批量停用所有的地址查找表。 |
| `close-all-ALT.js` | 批量关闭已停用的地址查找表（需停用后 1 个 slot 才能操作）。 |
| `close-tokens.js` | 批量关闭所有余额为 0 的代币账户。 |

## ⚠️ 安全与隐私

- **私钥安全**: 脚本仅在本地运行。输入私钥时使用了隐形模式，且私钥仅用于签署交易，不会上传至任何服务器。
- **主网操作**: 脚本默认连接到 Solana `mainnet-beta`。在执行任何关闭账户的操作前，请务必确认屏幕上显示的钱包地址是否正确。
- **租金回收**: 回收的 SOL 会立即返回到你的主钱包地址。

## 📄 开源协议
本项目基于 [MIT License](LICENSE) 许可协议。

---

**💡 小提示**: 
在执行 `close-all-ALT.js` 之前，请确保你已经运行过 `deactivate-all-ALT.js`，因为 Solana 协议规定查找表必须先停用才能被关闭。