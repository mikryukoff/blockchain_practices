import { createWalletClient, createPublicClient, custom, http } from "viem";import { sepolia } from "viem/chains";
import "viem/window";

export function ConnectPublicClient() {
    let transport;
    if (window.ethereum) {
        transport = custom(window.ethereum);
    } else {
        transport = http();
    }

    const publicClient = createPublicClient({
        chain: sepolia,
        transport: transport,
    });

    return publicClient;
}

export function ConnectWalletClient() {
    let transport;
    if (window.ethereum) {
        transport = custom(window.ethereum);
    } else {
        throw new Error("Web3 wallet is not installed. Please install a Web3 wallet like MetaMask.");
    }

    const walletClient = createWalletClient({
        chain: sepolia,
        transport: transport, // Теперь transport гарантированно определен
    });

    return walletClient;
}
