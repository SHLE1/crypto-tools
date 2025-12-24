const { Connection, Keypair, PublicKey, AddressLookupTableProgram, Transaction, sendAndConfirmTransaction } = require('@solana/web3.js');
const bs58 = require('bs58'); // 如果需要解析 base58 私钥

async function deactivateAll() {
    const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
    
    // 替换为你的私钥数组或从文件加载
    const secretKey = bs58.decode('你的私钥'); 
    const authority = Keypair.fromSecretKey(secretKey);

    console.log("正在查找由该地址管理的查找表...", authority.publicKey.toBase58());

    // 查找所有属于地址查找表程序且 authority 为你的账户
    const accounts = await connection.getProgramAccounts(
        new PublicKey("AddressLookupTab1e1111111111111111111111111"),
        {
            filters: [
                {
                    memcmp: {
                        offset: 22, // 权限地址在 metadata 中的偏移量
                        bytes: authority.publicKey.toBase58(),
                    },
                },
            ],
        }
    );

    if (accounts.length === 0) {
        console.log("未找到任何可用的地址查找表。");
        return;
    }

    console.log(`找到 ${accounts.length} 个表，正在发送停用指令...`);

    for (const account of accounts) {
        const lutAddress = account.pubkey;
        const transaction = new Transaction().add(
            AddressLookupTableProgram.deactivateLookupTable({
                lookupTable: lutAddress,
                authority: authority.publicKey,
            })
        );
        
        try {
            const signature = await sendAndConfirmTransaction(connection, transaction, [authority]);
            console.log(`成功停用: ${lutAddress.toBase58()} | 签名: ${signature}`);
        } catch (err) {
            console.error(`停用失败: ${lutAddress.toBase58()}`, err.message);
        }
    }
    
    console.log("\n所有停用指令已发送。请等待约 10 分钟后运行 Close 脚本。");
}

deactivateAll();
