#!/usr/bin/env node

/**
 * Solana 钱包清理工具
 * 交互式菜单，集成所有清理功能
 */

const { getConnection, getRpcUrl } = require('./lib/connection');
const { getWallet, confirmWallet } = require('./lib/wallet');
const { estimateAltRent, deactivateAllAlt, closeAllAlt } = require('./lib/alt');
const { estimateTokenRent, closeEmptyTokenAccounts } = require('./lib/tokens');

let prompts;
try {
    prompts = require('prompts');
} catch (e) {
    console.error("无法加载 prompts 库，请运行: npm install prompts");
    process.exit(1);
}

// 解析命令行参数
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run') || args.includes('-d');

/**
 * 显示租金预览
 */
async function showRentPreview(connection, publicKey) {
    console.log('\n📊 正在估算可回收租金...\n');

    const [altRent, tokenRent] = await Promise.all([
        estimateAltRent(connection, publicKey),
        estimateTokenRent(connection, publicKey)
    ]);

    console.log('┌──────────────────────────────────────────────┐');
    console.log('│              💰 租金预览                      │');
    console.log('├──────────────────────────────────────────────┤');
    console.log(`│ 地址查找表 (ALT)     : ${altRent.count.toString().padStart(4)} 个 ≈ ${altRent.sol.toFixed(4)} SOL │`);
    console.log(`│ Token 空账户         : ${tokenRent.token.count.toString().padStart(4)} 个 ≈ ${tokenRent.token.sol.toFixed(4)} SOL │`);
    console.log(`│ Token 2022 空账户    : ${tokenRent.token2022.count.toString().padStart(4)} 个 ≈ ${tokenRent.token2022.sol.toFixed(4)} SOL │`);
    console.log('├──────────────────────────────────────────────┤');

    const totalSol = altRent.sol + tokenRent.total.sol;
    console.log(`│ \x1b[32m总计可回收租金       : ≈ ${totalSol.toFixed(4)} SOL\x1b[0m           │`);
    console.log('└──────────────────────────────────────────────┘');

    return { altRent, tokenRent, totalSol };
}

/**
 * 一键清理全部
 */
async function cleanAll(connection, keypair, options) {
    console.log('\n🧹 开始一键清理...\n');

    // 1. 停用所有 ALT
    console.log('>>> 步骤 1/3: 停用地址查找表');
    await deactivateAllAlt(connection, keypair, options);

    // 2. 关闭所有 ALT（可能有些需要等待冷却期）
    console.log('\n>>> 步骤 2/3: 关闭地址查找表');
    await closeAllAlt(connection, keypair, options);

    // 3. 关闭所有空 Token 账户
    console.log('\n>>> 步骤 3/3: 关闭空代币账户');
    await closeEmptyTokenAccounts(connection, keypair, options);

    console.log('\n✨ 一键清理完成！');
}

/**
 * 主程序
 */
async function main() {
    const onCancel = () => {
        console.log("\n🛑 用户取消操作");
        process.exit(0);
    };

    try {
        const connection = getConnection();

        console.log('------------------------------------------------');
        console.log(`🌐 RPC: ${getRpcUrl()}`);

        if (isDryRun) {
            console.log('\x1b[33m⚠️  Dry Run 模式 - 不会执行实际交易\x1b[0m');
        }

        // 获取钱包
        const keypair = await getWallet(onCancel);

        // 确认钱包地址
        const isConfirmed = await confirmWallet(keypair, onCancel);
        if (!isConfirmed) {
            console.log("\n🛑 操作已中止，请重新运行并输入正确的私钥。");
            return;
        }

        // 选择操作
        const actionResponse = await prompts({
            type: 'select',
            name: 'action',
            message: '请选择要执行的操作',
            choices: [
                { title: '📊 预览可回收租金', value: 'preview' },
                { title: '🧹 一键清理全部', value: 'all' },
                { title: '━━━━━━━━━━━━━━━━━━', value: 'separator', disabled: true },
                { title: '1. 停用所有地址查找表 (Deactivate)', value: 'deactivate' },
                { title: '2. 关闭所有地址查找表 (Close) [需先停用]', value: 'close-alt' },
                { title: '3. 关闭所有空代币账户 (含 Token 2022)', value: 'close-tokens' }
            ],
            initial: 0
        }, { onCancel });

        const choice = actionResponse.action;
        const options = { dryRun: isDryRun };

        console.log(`\n🚀 开始执行...`);
        console.time("执行耗时");

        switch (choice) {
            case 'preview':
                await showRentPreview(connection, keypair.publicKey);
                break;
            case 'all':
                await cleanAll(connection, keypair, options);
                break;
            case 'deactivate':
                await deactivateAllAlt(connection, keypair, options);
                break;
            case 'close-alt':
                await closeAllAlt(connection, keypair, options);
                break;
            case 'close-tokens':
                await closeEmptyTokenAccounts(connection, keypair, options);
                break;
            default:
                console.log('❌ 无效选择。');
        }

        console.timeEnd("执行耗时");

    } catch (error) {
        console.error('\n❌ 运行错误:', error.message);
    }
}

main();
