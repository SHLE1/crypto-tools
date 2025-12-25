const { 
    Connection, 
    Keypair, 
    PublicKey, 
    AddressLookupTableProgram, 
    Transaction, 
    sendAndConfirmTransaction, 
    ComputeBudgetProgram 
} = require('@solana/web3.js'); 

const { 
    createCloseAccountInstruction, 
    TOKEN_PROGRAM_ID 
} = require('@solana/spl-token'); 

// === 兼容性导入检查 (bs58) ===
let bs58; 
try { 
    const _bs58 = require('bs58'); 
    bs58 = _bs58.default || _bs58; 
} catch (e) { 
    console.error("无法加载 bs58 库，请运行: npm install bs58"); 
    process.exit(1); 
} 

// === 引入 prompts (交互式输入) ===
let prompts;
try {
    prompts = require('prompts');
} catch (e) {
    console.error("无法加载 prompts 库，请运行: npm install prompts");
    process.exit(1);
}

const BATCH_SIZE = 12; 
const PRIORITY_FEE = 1000; 
const ALT_PROGRAM_ID = new PublicKey("AddressLookupTab1e1111111111111111111111111"); 

// === 批量处理函数 ===
async function processInstructionsBatched(connection, authority, instructions, actionName) { 
    if (instructions.length === 0) { 
        console.log(`没有需要执行的 ${actionName} 操作。`); 
        return; 
    } 

    const totalBatches = Math.ceil(instructions.length / BATCH_SIZE); 
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
            
            const signature = await sendAndConfirmTransaction(connection, transaction, [authority], { 
                skipPreflight: false, 
                preflightCommitment: 'confirmed', 
            }); 

            console.log(`✅ 第 ${batchIndex} 批成功 | Sig: ${signature.slice(0, 15)}...`); 
            successCount += currentBatch.length; 
        } catch (error) { 
            console.error(`❌ 第 ${batchIndex} 批失败:`, error.message); 
            failCount += currentBatch.length; 
        } 
    } 

    console.log(`\n📊 ${actionName} 完成报告: 成功 ${successCount} 个, 失败 ${failCount} 个。`); 
} 

// === 业务逻辑函数 ===
async function deactivateAll(connection, authority) { 
    console.log("正在查找准备停用的查找表...", authority.publicKey.toBase58()); 
    const accounts = await connection.getProgramAccounts(ALT_PROGRAM_ID, { 
        filters: [{ memcmp: { offset: 22, bytes: authority.publicKey.toBase58() } }] 
    }); 

    if (accounts.length === 0) return console.log("没有找到查找表。"); 

    const instructions = accounts.map(account => 
        AddressLookupTableProgram.deactivateLookupTable({ 
            lookupTable: account.pubkey, authority: authority.publicKey 
        }) 
    ); 
    await processInstructionsBatched(connection, authority, instructions, "停用地址查找表"); 
} 

async function closeAll(connection, authority) { 
    console.log("正在查找准备关闭的查找表...", authority.publicKey.toBase58()); 
    const accounts = await connection.getProgramAccounts(ALT_PROGRAM_ID, { 
        filters: [{ memcmp: { offset: 22, bytes: authority.publicKey.toBase58() } }] 
    }); 

    if (accounts.length === 0) return console.log("没有找到查找表。"); 

    const instructions = accounts.map(account => 
        AddressLookupTableProgram.closeLookupTable({ 
            lookupTable: account.pubkey, authority: authority.publicKey, recipient: authority.publicKey 
        }) 
    ); 
    await processInstructionsBatched(connection, authority, instructions, "关闭地址查找表"); 
} 

async function closeTokenAccounts(connection, owner) { 
    console.log("正在扫描 Token 账户...", owner.publicKey.toBase58()); 
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(owner.publicKey, { programId: TOKEN_PROGRAM_ID }); 
    const accountsToClose = tokenAccounts.value.filter(account => account.account.data.parsed.info.tokenAmount.uiAmount === 0); 
    
    if (accountsToClose.length === 0) return console.log("没有发现空 Token 账户。"); 

    const instructions = accountsToClose.map(account => 
        createCloseAccountInstruction(new PublicKey(account.pubkey), owner.publicKey, owner.publicKey) 
    ); 
    await processInstructionsBatched(connection, owner, instructions, "关闭空 Token 账户"); 
} 

// === 主程序 ===
async function main() { 
    const onCancel = () => {
        console.log("\n🛑 用户取消操作");
        process.exit(0);
    };

    try { 
        const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed"); 

        console.log('------------------------------------------------');
        
        // 步骤 1: 输入私钥 (使用 invisible 类型避免刷屏)
        const keyResponse = await prompts({
            type: 'invisible', 
            name: 'privateKey',
            message: '请输入你的私钥 (隐形模式，粘贴后按回车)',
            validate: value => value.length > 0 ? true : '私钥不能为空'
        }, { onCancel });

        // 解析私钥
        let keypair; 
        try { 
            const cleanInput = keyResponse.privateKey.trim(); 
            const secretKey = bs58.decode(cleanInput); 
            keypair = Keypair.fromSecretKey(secretKey); 
        } catch(e) { 
            console.error("\n❌ 私钥解析失败，请检查格式是否正确。"); 
            process.exit(1); 
        } 

        // 步骤 2: 显示地址并确认
        console.log(`\n🔍 识别到的钱包地址: \x1b[36m${keypair.publicKey.toBase58()}\x1b[0m`);
        
        const confirmResponse = await prompts({
            type: 'confirm',
            name: 'isCorrect',
            message: '请确认这是你的钱包地址吗？',
            initial: true
        }, { onCancel });

        if (!confirmResponse.isCorrect) {
            console.log("\n🛑 操作已中止，请重新运行并输入正确的私钥。");
            return;
        }

        // 步骤 3: 选择操作
        const actionResponse = await prompts({
            type: 'select',
            name: 'action',
            message: '请选择要执行的操作',
            choices: [
                { title: '1. 停用所有地址查找表 (Deactivate)', value: '1' },
                { title: '2. 关闭所有地址查找表 (Close) [需先停用]', value: '2' },
                { title: '3. 关闭所有空代币账户 (Close Token Accounts)', value: '3' }
            ],
            initial: 0
        }, { onCancel });

        const choice = actionResponse.action;
        
        console.log(`\n🚀 开始执行...`);
        console.time("Execution Time"); 

        switch (choice) { 
            case '1': await deactivateAll(connection, keypair); break; 
            case '2': await closeAll(connection, keypair); break; 
            case '3': await closeTokenAccounts(connection, keypair); break; 
            default: console.log('❌ 无效选择。'); 
        } 
        console.timeEnd("Execution Time"); 

    } catch (error) { 
        console.error('\n❌ 运行错误:', error.message); 
    }
} 

main();
