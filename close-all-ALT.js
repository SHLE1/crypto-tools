const { Connection, Keypair, PublicKey, AddressLookupTableProgram, Transaction, sendAndConfirmTransaction } = require('@solana/web3.js');
const bs58 = require('bs58');

async function closeAll() {
    // 建议使用更稳定的 RPC 节点
    const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
    
    // 替换为你的私钥
    const secretKey = bs58.decode('你的私钥'); 
    const authority = Keypair.fromSecretKey(secretKey);

    console.log("正在查找准备关闭的查找表...", authority.publicKey.toBase58());

    // 查找该 authority 管理的所有表
    const accounts = await connection.getProgramAccounts(
        new PublicKey("AddressLookupTab1e1111111111111111111111111"),
        {
            filters: [
                {
                    memcmp: {
                        offset: 22, // Authority 偏移量
                        bytes: authority.publicKey.toBase58(),
                    },
                },
            ],
        }
    );

    if (accounts.length === 0) {
        console.log("没有找到可关闭的表（可能已经关闭或未找到）。");
        return;
    }

    console.log(`发现 ${accounts.length} 个表。准备执行关闭并回收租金...`);

    for (const account of accounts) {
        const lutAddress = account.pubkey;
        
        const transaction = new Transaction().add(
            AddressLookupTableProgram.closeLookupTable({
                lookupTable: lutAddress,
                authority: authority.publicKey,
                recipient: authority.publicKey, // 租金（SOL）退回的地址
            })
        );
        
        try {
            const signature = await sendAndConfirmTransaction(connection, transaction, [authority]);
            console.log(`✅ 已关闭并回收: ${lutAddress.toBase58()} | 签名: ${signature}`);
        } catch (err) {
            if (err.message.includes("deactivated")) {
                console.error(`❌ 失败: ${lutAddress.toBase58()} 尚未完成冷却期，请再等几分钟。`);
            } else {
                console.error(`❌ 失败: ${lutAddress.toBase58()}`, err.message);
            }
        }
    }
    
    console.log("\n所有操作尝试完成。");
}

closeAll();
