const { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } = require('@solana/web3.js');
const { createCloseAccountInstruction, TOKEN_PROGRAM_ID, getAccount } = require('@solana/spl-token');
const bs58 = require('bs58');

async function closeTokenAccounts() {
    const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
    const secretKey = bs58.decode('你的私钥');
    const owner = Keypair.fromSecretKey(secretKey);

    console.log("正在获取 Token 账户列表...", owner.publicKey.toBase58());

    // 获取所有 Token 账户
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(owner.publicKey, {
        programId: TOKEN_PROGRAM_ID,
    });

    const accountsToClose = tokenAccounts.value.filter(account => {
        const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
        return amount === 0; // 只选择余额为 0 的账户
    });

    if (accountsToClose.length === 0) {
        console.log("没有余额为 0 的 Token 账户。");
        return;
    }

    console.log(`发现 ${accountsToClose.length} 个空账户，正在关闭...`);

    for (const account of accountsToClose) {
        const accountPubkey = new PublicKey(account.pubkey);
        
        const transaction = new Transaction().add(
            createCloseAccountInstruction(
                accountPubkey,        // 要关闭的账户
                owner.publicKey,     // 租金接收地址
                owner.publicKey      // 账户所有者（Authority）
            )
        );

        try {
            const signature = await sendAndConfirmTransaction(connection, transaction, [owner]);
            console.log(`✅ 关闭成功: ${accountPubkey.toBase58()} | 签名: ${signature}`);
        } catch (e) {
            console.error(`❌ 关闭失败: ${accountPubkey.toBase58()}`, e.message);
        }
    }
}

closeTokenAccounts();
