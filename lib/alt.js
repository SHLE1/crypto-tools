/**
 * Address Lookup Table (ALT) 管理模块
 */

const { PublicKey, AddressLookupTableProgram } = require('@solana/web3.js');
const { processInstructionsBatched } = require('./transaction');

const ALT_PROGRAM_ID = new PublicKey("AddressLookupTab1e1111111111111111111111111");

// 每个 ALT 账户的租金（约 0.00286 SOL）
const ALT_RENT_LAMPORTS = 2858880;

/**
 * 获取用户的所有 ALT 账户
 * @param {Connection} connection
 * @param {PublicKey} authority
 * @returns {Promise<Array>}
 */
async function getAltAccounts(connection, authority) {
    const accounts = await connection.getProgramAccounts(ALT_PROGRAM_ID, {
        filters: [{ memcmp: { offset: 22, bytes: authority.toBase58() } }]
    });
    return accounts;
}

/**
 * 估算 ALT 可回收租金
 * @param {Connection} connection
 * @param {PublicKey} authority
 * @returns {Promise<{count: number, lamports: number, sol: number}>}
 */
async function estimateAltRent(connection, authority) {
    const accounts = await getAltAccounts(connection, authority);
    const count = accounts.length;
    const lamports = count * ALT_RENT_LAMPORTS;
    return {
        count,
        lamports,
        sol: lamports / 1e9
    };
}

/**
 * 停用所有 ALT
 * @param {Connection} connection
 * @param {Keypair} authority
 * @param {Object} options
 * @returns {Promise<{success: number, fail: number}>}
 */
async function deactivateAllAlt(connection, authority, options = {}) {
    console.log("正在查找准备停用的查找表...", authority.publicKey.toBase58());

    const accounts = await getAltAccounts(connection, authority.publicKey);

    if (accounts.length === 0) {
        console.log("没有找到查找表。");
        return { success: 0, fail: 0 };
    }

    const instructions = accounts.map(account =>
        AddressLookupTableProgram.deactivateLookupTable({
            lookupTable: account.pubkey,
            authority: authority.publicKey
        })
    );

    return await processInstructionsBatched(connection, authority, instructions, "停用地址查找表", options);
}

/**
 * 关闭所有 ALT
 * @param {Connection} connection
 * @param {Keypair} authority
 * @param {Object} options
 * @returns {Promise<{success: number, fail: number}>}
 */
async function closeAllAlt(connection, authority, options = {}) {
    console.log("正在查找准备关闭的查找表...", authority.publicKey.toBase58());

    const accounts = await getAltAccounts(connection, authority.publicKey);

    if (accounts.length === 0) {
        console.log("没有找到查找表。");
        return { success: 0, fail: 0 };
    }

    const instructions = accounts.map(account =>
        AddressLookupTableProgram.closeLookupTable({
            lookupTable: account.pubkey,
            authority: authority.publicKey,
            recipient: authority.publicKey
        })
    );

    return await processInstructionsBatched(connection, authority, instructions, "关闭地址查找表", options);
}

module.exports = {
    ALT_PROGRAM_ID,
    ALT_RENT_LAMPORTS,
    getAltAccounts,
    estimateAltRent,
    deactivateAllAlt,
    closeAllAlt
};
