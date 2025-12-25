/**
 * Token 账户管理模块
 * 支持 Token Program 和 Token 2022
 */

const { PublicKey } = require('@solana/web3.js');
const { createCloseAccountInstruction, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } = require('@solana/spl-token');
const { processInstructionsBatched } = require('./transaction');

// 每个 Token 账户的租金（约 0.00203 SOL）
const TOKEN_ACCOUNT_RENT_LAMPORTS = 2039280;

/**
 * 获取空 Token 账户
 * @param {Connection} connection
 * @param {PublicKey} owner
 * @param {PublicKey} programId - TOKEN_PROGRAM_ID 或 TOKEN_2022_PROGRAM_ID
 * @returns {Promise<Array>}
 */
async function getEmptyTokenAccounts(connection, owner, programId) {
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(owner, { programId });
    return tokenAccounts.value.filter(account =>
        account.account.data.parsed.info.tokenAmount.uiAmount === 0
    );
}

/**
 * 估算 Token 账户可回收租金
 * @param {Connection} connection
 * @param {PublicKey} owner
 * @returns {Promise<{token: Object, token2022: Object, total: Object}>}
 */
async function estimateTokenRent(connection, owner) {
    const [tokenAccounts, token2022Accounts] = await Promise.all([
        getEmptyTokenAccounts(connection, owner, TOKEN_PROGRAM_ID),
        getEmptyTokenAccounts(connection, owner, TOKEN_2022_PROGRAM_ID)
    ]);

    const tokenCount = tokenAccounts.length;
    const token2022Count = token2022Accounts.length;
    const totalCount = tokenCount + token2022Count;

    const tokenLamports = tokenCount * TOKEN_ACCOUNT_RENT_LAMPORTS;
    const token2022Lamports = token2022Count * TOKEN_ACCOUNT_RENT_LAMPORTS;
    const totalLamports = tokenLamports + token2022Lamports;

    return {
        token: { count: tokenCount, lamports: tokenLamports, sol: tokenLamports / 1e9 },
        token2022: { count: token2022Count, lamports: token2022Lamports, sol: token2022Lamports / 1e9 },
        total: { count: totalCount, lamports: totalLamports, sol: totalLamports / 1e9 }
    };
}

/**
 * 关闭空 Token 账户
 * @param {Connection} connection
 * @param {Keypair} owner
 * @param {Object} options
 * @param {boolean} options.includeToken2022 - 是否包含 Token 2022
 * @returns {Promise<{success: number, fail: number}>}
 */
async function closeEmptyTokenAccounts(connection, owner, options = {}) {
    const { dryRun = false, includeToken2022 = true } = options;

    console.log("正在扫描 Token 账户...", owner.publicKey.toBase58());

    // 获取 Token Program 账户
    const tokenAccounts = await getEmptyTokenAccounts(connection, owner.publicKey, TOKEN_PROGRAM_ID);

    // 获取 Token 2022 账户
    let token2022Accounts = [];
    if (includeToken2022) {
        try {
            token2022Accounts = await getEmptyTokenAccounts(connection, owner.publicKey, TOKEN_2022_PROGRAM_ID);
            if (token2022Accounts.length > 0) {
                console.log(`📦 发现 ${token2022Accounts.length} 个 Token 2022 空账户`);
            }
        } catch (e) {
            // Token 2022 可能不存在，忽略错误
        }
    }

    const allAccounts = [...tokenAccounts, ...token2022Accounts];

    if (allAccounts.length === 0) {
        console.log("没有发现空 Token 账户。");
        return { success: 0, fail: 0 };
    }

    console.log(`发现 ${tokenAccounts.length} 个 Token 空账户` +
        (token2022Accounts.length > 0 ? ` 和 ${token2022Accounts.length} 个 Token 2022 空账户` : ''));

    // 创建关闭指令
    const instructions = [];

    // Token Program 账户
    for (const account of tokenAccounts) {
        instructions.push(
            createCloseAccountInstruction(
                new PublicKey(account.pubkey),
                owner.publicKey,
                owner.publicKey,
                [],
                TOKEN_PROGRAM_ID
            )
        );
    }

    // Token 2022 账户
    for (const account of token2022Accounts) {
        instructions.push(
            createCloseAccountInstruction(
                new PublicKey(account.pubkey),
                owner.publicKey,
                owner.publicKey,
                [],
                TOKEN_2022_PROGRAM_ID
            )
        );
    }

    return await processInstructionsBatched(connection, owner, instructions, "关闭空 Token 账户", { dryRun });
}

module.exports = {
    TOKEN_ACCOUNT_RENT_LAMPORTS,
    getEmptyTokenAccounts,
    estimateTokenRent,
    closeEmptyTokenAccounts
};
