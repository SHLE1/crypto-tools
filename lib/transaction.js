/**
 * 交易处理模块
 * 支持批量处理、重试机制、Dry Run 模式
 */

const {
    Transaction,
    sendAndConfirmTransaction,
    ComputeBudgetProgram
} = require('@solana/web3.js');

const BATCH_SIZE = 12;
const PRIORITY_FEE = 1000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

/**
 * 延迟函数
 * @param {number} ms
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 带重试的交易发送
 * @param {Connection} connection
 * @param {Transaction} transaction
 * @param {Keypair[]} signers
 * @param {number} retries
 * @returns {Promise<string>}
 */
async function sendWithRetry(connection, transaction, signers, retries = MAX_RETRIES) {
    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const signature = await sendAndConfirmTransaction(connection, transaction, signers, {
                skipPreflight: false,
                preflightCommitment: 'confirmed',
            });
            return signature;
        } catch (error) {
            lastError = error;
            if (attempt < retries) {
                console.log(`   ⏳ 重试中 (${attempt}/${retries})...`);
                await sleep(RETRY_DELAY_MS);
            }
        }
    }
    throw lastError;
}

/**
 * 批量处理指令
 * @param {Connection} connection
 * @param {Keypair} authority - 签名者
 * @param {TransactionInstruction[]} instructions - 指令列表
 * @param {string} actionName - 操作名称（用于日志）
 * @param {Object} options - 选项
 * @param {boolean} options.dryRun - 是否为 Dry Run 模式
 * @returns {Promise<{success: number, fail: number}>}
 */
async function processInstructionsBatched(connection, authority, instructions, actionName, options = {}) {
    const { dryRun = false } = options;

    if (instructions.length === 0) {
        console.log(`没有需要执行的 ${actionName} 操作。`);
        return { success: 0, fail: 0 };
    }

    const totalBatches = Math.ceil(instructions.length / BATCH_SIZE);

    if (dryRun) {
        console.log(`\n🔍 [Dry Run] ${actionName}: 将执行 ${instructions.length} 个指令，分为 ${totalBatches} 批`);
        return { success: instructions.length, fail: 0 };
    }

    console.log(`\n🚀 准备执行 ${actionName}: 总计 ${instructions.length} 个指令，分为 ${totalBatches} 批交易处理...`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < instructions.length; i += BATCH_SIZE) {
        const batchIndex = Math.floor(i / BATCH_SIZE) + 1;
        const currentBatch = instructions.slice(i, i + BATCH_SIZE);

        try {
            const transaction = new Transaction();
            transaction.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: PRIORITY_FEE }));
            currentBatch.forEach(ix => transaction.add(ix));

            console.log(`正在发送第 ${batchIndex}/${totalBatches} 批交易...`);

            const signature = await sendWithRetry(connection, transaction, [authority]);

            console.log(`✅ 第 ${batchIndex} 批成功 | Sig: ${signature.slice(0, 15)}...`);
            successCount += currentBatch.length;
        } catch (error) {
            console.error(`❌ 第 ${batchIndex} 批失败:`, error.message);
            failCount += currentBatch.length;
        }
    }

    console.log(`\n📊 ${actionName} 完成报告: 成功 ${successCount} 个, 失败 ${failCount} 个。`);
    return { success: successCount, fail: failCount };
}

module.exports = {
    BATCH_SIZE,
    PRIORITY_FEE,
    MAX_RETRIES,
    sendWithRetry,
    processInstructionsBatched
};
