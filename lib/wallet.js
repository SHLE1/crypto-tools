/**
 * 钱包管理模块
 * 支持环境变量 SOLANA_PRIVATE_KEY 或交互式输入
 */

const { Keypair } = require('@solana/web3.js');

// bs58 兼容性导入
let bs58;
try {
    const _bs58 = require('bs58');
    bs58 = _bs58.default || _bs58;
} catch (e) {
    console.error("无法加载 bs58 库，请运行: npm install bs58");
    process.exit(1);
}

// prompts 导入
let prompts;
try {
    prompts = require('prompts');
} catch (e) {
    console.error("无法加载 prompts 库，请运行: npm install prompts");
    process.exit(1);
}

/**
 * 从私钥字符串解析 Keypair
 * @param {string} privateKeyStr - Base58 编码的私钥
 * @returns {Keypair}
 */
function parseKeypair(privateKeyStr) {
    const cleanInput = privateKeyStr.trim();
    const secretKey = bs58.decode(cleanInput);
    return Keypair.fromSecretKey(secretKey);
}

/**
 * 获取钱包 Keypair
 * 优先使用环境变量，否则交互式输入
 * @param {Function} onCancel - 用户取消回调
 * @returns {Promise<Keypair>}
 */
async function getWallet(onCancel) {
    // 优先使用环境变量
    if (process.env.SOLANA_PRIVATE_KEY) {
        try {
            const keypair = parseKeypair(process.env.SOLANA_PRIVATE_KEY);
            console.log(`🔐 使用环境变量中的私钥`);
            return keypair;
        } catch (e) {
            console.error("❌ 环境变量 SOLANA_PRIVATE_KEY 格式错误");
            process.exit(1);
        }
    }

    // 交互式输入
    const keyResponse = await prompts({
        type: 'invisible',
        name: 'privateKey',
        message: '请输入你的私钥 (隐形模式，粘贴后按回车)',
        validate: value => value.length > 0 ? true : '私钥不能为空'
    }, { onCancel });

    try {
        return parseKeypair(keyResponse.privateKey);
    } catch (e) {
        console.error("\n❌ 私钥解析失败，请检查格式是否正确。");
        process.exit(1);
    }
}

/**
 * 确认钱包地址
 * @param {Keypair} keypair
 * @param {Function} onCancel
 * @returns {Promise<boolean>}
 */
async function confirmWallet(keypair, onCancel) {
    console.log(`\n🔍 识别到的钱包地址: \x1b[36m${keypair.publicKey.toBase58()}\x1b[0m`);

    const confirmResponse = await prompts({
        type: 'confirm',
        name: 'isCorrect',
        message: '请确认这是你的钱包地址吗？',
        initial: true
    }, { onCancel });

    return confirmResponse.isCorrect;
}

module.exports = {
    parseKeypair,
    getWallet,
    confirmWallet
};
