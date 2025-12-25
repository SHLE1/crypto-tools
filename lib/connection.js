/**
 * Solana RPC 连接管理
 * 支持环境变量 SOLANA_RPC_URL 配置自定义 RPC
 */

const { Connection } = require('@solana/web3.js');

const DEFAULT_RPC = 'https://api.mainnet-beta.solana.com';

/**
 * 获取 Solana 连接
 * @param {string} commitment - 确认级别，默认 'confirmed'
 * @returns {Connection}
 */
function getConnection(commitment = 'confirmed') {
    const rpcUrl = process.env.SOLANA_RPC_URL || DEFAULT_RPC;
    return new Connection(rpcUrl, commitment);
}

/**
 * 获取当前 RPC URL
 * @returns {string}
 */
function getRpcUrl() {
    return process.env.SOLANA_RPC_URL || DEFAULT_RPC;
}

module.exports = {
    getConnection,
    getRpcUrl,
    DEFAULT_RPC
};
