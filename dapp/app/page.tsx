import TokenComponent from "./tokenComponent";
import TransactionComponent from "./transactionComponent";
import WalletComponent from "./walletComponent";

export default function Home() {
  return (
    <main className="min-h-screen">
      <div className="flex flex-col items-center justify-center">
        <WalletComponent />
        <TransactionComponent />
        <TokenComponent />
      </div>
    </main>
  );
}

