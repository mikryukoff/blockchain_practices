import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

// ERC-20 Token Contract Example on Sepolia
const tokenContractAddress = "0x5f9c96470F808671eFE810C99c1170c5F07d166a";
const abi = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address account) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "event Transfer(address indexed from, address indexed to, uint256 value)"
];

function TokenInterface({ provider }) {
    const [writableContract, setWritableContract] = useState(null);
    const [address, setAddress] = useState("");
    const [tokenInfo, setTokenInfo] = useState({
        name: "",
        symbol: "",
        decimals: 18,
        totalSupply: "0"
    });
    const [balances, setBalances] = useState({
        user: "0",
        contract: "0"
    });
    const [transferAmount, setTransferAmount] = useState("");
    const [recipient, setRecipient] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const initializeTokenData = useCallback(async () => {
        if (!provider || tokenInfo.name) return;
        
        try {
            setIsLoading(true);
            const readOnlyContract = new ethers.Contract(tokenContractAddress, abi, provider);
            
            // Fetch token metadata in parallel
            const [name, symbol, decimals, totalSupply] = await Promise.all([
                readOnlyContract.name(),
                readOnlyContract.symbol(),
                readOnlyContract.decimals(),
                readOnlyContract.totalSupply()
            ]);

            setTokenInfo({
                name,
                symbol,
                decimals: parseInt(decimals),
                totalSupply: ethers.formatUnits(totalSupply, decimals)
            });

        } catch (error) {
            console.error("Error initializing token data:", error);
            alert(`Failed to initialize token data: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [provider, tokenInfo.name]);

    const updateBalances = useCallback(async () => {
        if (!provider || !address) return;

        try {
            const readOnlyContract = new ethers.Contract(tokenContractAddress, abi, provider);
            const userBalance = await readOnlyContract.balanceOf(address);
            const contractBalance = await provider.getBalance(tokenContractAddress);

            setBalances({
                user: ethers.formatUnits(userBalance, tokenInfo.decimals),
                contract: ethers.formatEther(contractBalance)
            });
        } catch (error) {
            console.error("Error updating balances:", error);
        }
    }, [provider, address, tokenInfo.decimals]);

    async function connectWallet(evt) {
        evt.preventDefault();
        try {
            setIsLoading(true);
            
            if (!window.ethereum) {
                throw new Error("Please install MetaMask to use this dApp");
            }

            const walletProvider = new ethers.BrowserProvider(window.ethereum);
            const signer = await walletProvider.getSigner();
            const userAddress = await signer.getAddress();
            
            setAddress(userAddress);
            
            const contractWithSigner = new ethers.Contract(tokenContractAddress, abi, signer);
            setWritableContract(contractWithSigner);
            
            console.log("Wallet connected:", userAddress);
            
        } catch (exception) {
            console.error("Wallet connection failed:", exception);
            alert(`Connection failed: ${exception.message}`);
        } finally {
            setIsLoading(false);
        }
    }

    async function transferTokens(evt) {
        evt.preventDefault();
        if (!writableContract || !transferAmount || !recipient) return;

        try {
            setIsLoading(true);
            const amount = ethers.parseUnits(transferAmount, tokenInfo.decimals);
            
            const transaction = await writableContract.transfer(recipient, amount);
            console.log("Transaction sent:", transaction.hash);
            
            await transaction.wait();
            console.log("Transaction confirmed");
            
            await updateBalances();
            
            setTransferAmount("");
            setRecipient("");
            
            alert("Transfer successful!");
            
        } catch (exception) {
            console.error("Transfer failed:", exception);
            alert(`Transfer failed: ${exception.message}`);
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        initializeTokenData();
    }, [initializeTokenData]);

    useEffect(() => {
        updateBalances();
    }, [updateBalances]);

    const setValue = (setter) => (evt) => setter(evt.target.value);

    return (
        <div className="container">
            <h1>Token Interface</h1>
            
            <div className="token-info">
                <h2>{tokenInfo.name} ({tokenInfo.symbol})</h2>
                <p>Total Supply: {tokenInfo.totalSupply} {tokenInfo.symbol}</p>
                <p>Contract: {tokenContractAddress}</p>
            </div>

            <div className="wallet-section">
                <button 
                    onClick={connectWallet}
                    disabled={isLoading || !!address}
                    className="button"
                >
                    {isLoading ? "Connecting..." : address ? "Connected" : "Connect Wallet"}
                </button>
                {address && <p>Connected: {address}</p>}
            </div>

            {address && (
                <div className="balances">
                    <h3>Balances</h3>
                    <p>Your {tokenInfo.symbol} Balance: {balances.user}</p>
                    <p>Contract ETH Balance: {balances.contract} ETH</p>
                </div>
            )}

            {writableContract && (
                <form onSubmit={transferTokens} className="transfer-form">
                    <h3>Transfer Tokens</h3>
                    
                    <label>
                        Recipient Address:
                        <input
                            type="text"
                            placeholder="0x..."
                            value={recipient}
                            onChange={setValue(setRecipient)}
                            required
                        />
                    </label>
                    
                    <label>
                        Amount:
                        <input
                            type="text"
                            placeholder="1.0"
                            value={transferAmount}
                            onChange={setValue(setTransferAmount)}
                            required
                        />
                    </label>
                    
                    <button 
                        type="submit" 
                        disabled={isLoading || !transferAmount || !recipient}
                        className="button"
                    >
                        {isLoading ? "Processing..." : `Transfer ${tokenInfo.symbol}`}
                    </button>
                </form>
            )}

            <style jsx>{`
                .container {
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    font-family: Arial, sans-serif;
                }
                .button {
                    background: #4CAF50;
                    color: white;
                    padding: 10px 20px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    margin: 5px;
                }
                .button:disabled {
                    background: #cccccc;
                    cursor: not-allowed;
                }
                .transfer-form label {
                    display: block;
                    margin: 10px 0;
                }
                .transfer-form input {
                    width: 100%;
                    padding: 8px;
                    margin: 5px 0;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                }
            `}</style>
        </div>
    );
}

export default TokenInterface;