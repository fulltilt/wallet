import { useState } from "react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, ChevronUp, Copy, Plus, Trash2, Wallet } from "lucide-react";
import { Buffer } from "buffer";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";

import nacl from "tweetnacl";
import { generateMnemonic, mnemonicToSeedSync } from "bip39";
import { derivePath } from "ed25519-hd-key";
import { Keypair } from "@solana/web3.js";
window.Buffer = Buffer;

type Wallet = {
  id: number;
  publicKey: string;
  privateKey: string;
};

const SOLANA_RPC_URL = `https://long-indulgent-log.solana-devnet.quiknode.pro/${
  import.meta.env.VITE_RPC_TOKEN
}`;

function App() {
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [seedPhrase, setSeedPhrase] = useState<string[]>([]);
  const [seed, setSeed] = useState("");
  const [copied, setCopied] = useState(false);
  const [walletNum, setWalletNum] = useState(0);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [currentBalance, setCurrentBalance] = useState<{
    sol: number;
    lamports: number;
    loading: boolean;
    error: string | null;
  }>({
    sol: 0,
    lamports: 0,
    loading: false,
    error: null,
  });

  const generateSeedPhrase = () => {
    if (input.length === 0) {
      const mnemonic = generateMnemonic();
      setSeedPhrase(mnemonic.split(" "));

      const seed = mnemonicToSeedSync(mnemonic); // returns a Buffer
      setSeed(seed.toString("hex"));

      setIsOpen(true);
    } else {
      const words = input.split(" ");
      if (words.length === 12) setSeedPhrase(words);
      else console.log("seed phrase must be 12 words long");
    }
  };

  const addWallet = () => {
    // 501 = Solana
    // 1 - Bitcoin
    // 60 - Ethereum
    const path = `m/44'/501'/${walletNum}'/0'`;
    const derivedSeed = derivePath(path, seed).key;
    const privateKey = nacl.sign.keyPair.fromSeed(derivedSeed).secretKey; // returns a Uint8Array
    const publicKey = Keypair.fromSecretKey(privateKey).publicKey.toBase58();

    setWallets([
      ...wallets,
      {
        id: walletNum,
        privateKey: Buffer.from(privateKey).toString("hex"),
        publicKey,
      },
    ]);
    setWalletNum((prev) => prev + 1);
  };

  const makeSolanaRpcCall = async (method: string, params: any[] = []) => {
    try {
      const response = await fetch(SOLANA_RPC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: method,
          params: params,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`RPC Error: ${data.error.message}`);
      }

      return data.result;
    } catch (error) {
      console.error("RPC call failed:", error);
      throw error;
    }
  };

  const getBalance = async (publicKey: string) => {
    setBalanceDialogOpen(true);
    setCurrentBalance({ sol: 0, lamports: 0, loading: true, error: null });

    try {
      const result = await makeSolanaRpcCall("getBalance", [publicKey]);

      // Result returns lamports (1 SOL = 1,000,000,000 lamports)
      const lamports = result.value;
      const sol = lamports / 1_000_000_000;

      setCurrentBalance({
        sol,
        lamports,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error("Failed to get balance:", error);
      setCurrentBalance({
        sol: 0,
        lamports: 0,
        loading: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch balance",
      });
    }
  };

  async function getAccountInfo(publicKey: string) {
    try {
      const result = await makeSolanaRpcCall("getAccountInfo", [
        publicKey,
        { encoding: "jsonParsed" },
      ]);

      return result;
    } catch (error) {
      console.error("Failed to get account info:", error);
      throw error;
    }
  }

  // Get recent blockhash
  async function getRecentBlockhash() {
    try {
      const result = await makeSolanaRpcCall("getLatestBlockhash");
      return result;
    } catch (error) {
      console.error("Failed to get recent blockhash:", error);
      throw error;
    }
  }

  // Request airdrop (devnet only)
  async function requestAirdrop(
    publicKey: string,
    lamports: number = 1_000_000_000
  ) {
    try {
      const signature = await makeSolanaRpcCall("requestAirdrop", [
        publicKey,
        lamports,
      ]);

      return signature;
    } catch (error) {
      console.error("Failed to request airdrop:", error);
      throw error;
    }
  }

  // Get transaction details
  async function getTransaction(signature: string) {
    try {
      const result = await makeSolanaRpcCall("getTransaction", [
        signature,
        { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 },
      ]);

      return result;
    } catch (error) {
      console.error("Failed to get transaction:", error);
      throw error;
    }
  }

  // Get multiple accounts
  async function getMultipleAccounts(publicKeys: string[]) {
    try {
      const result = await makeSolanaRpcCall("getMultipleAccounts", [
        publicKeys,
        { encoding: "jsonParsed" },
      ]);

      return result;
    } catch (error) {
      console.error("Failed to get multiple accounts:", error);
      throw error;
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(seedPhrase.join(" "));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Input Section */}
      <div className="flex gap-2">
        <Input
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter your secret phrase (or leave blank to generate)"
          className="flex-1 bg-background border-border text-foreground placeholder:text-muted-foreground"
        />
        <Button onClick={generateSeedPhrase} className="shrink-0">
          {input.length === 0 ? "Generate Seed" : "Set Seed"}
        </Button>
      </div>

      {/* Seed Phrase Section */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="bg-card border-border">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between p-6 text-card-foreground hover:bg-accent hover:text-accent-foreground rounded-none"
            >
              <span className="text-lg font-medium">Current Secret Phrase</span>
              <ChevronUp
                className={`h-5 w-5 transition-transform duration-200 ${
                  isOpen ? "transform rotate-0" : "transform rotate-180"
                }`}
              />
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="p-6 pt-0">
              {/* Seed phrase grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
                {seedPhrase.map((word, index) => (
                  <div
                    key={index}
                    className="bg-muted border border-border rounded-lg px-3 py-3 text-center hover:bg-muted/80 transition-colors"
                  >
                    <span className="text-muted-foreground text-sm font-medium">
                      {word}
                    </span>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleCopy}
                variant="outline"
                className="w-full bg-background border-border text-foreground hover:bg-accent hover:text-accent-foreground"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Click Anywhere To Copy
                  </>
                )}
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Wallet Controls */}
      <div className="flex gap-4">
        <Button onClick={addWallet} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Wallet
        </Button>
        <Button
          variant="outline"
          // onClick={clearWallets}
          className="flex items-center gap-2 text-destructive hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
          Clear Wallets
        </Button>
      </div>

      {/* Wallets Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Wallets</h2>
        {wallets.map((wallet) => (
          <Card key={wallet.id} className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-card-foreground">
                Wallet #{wallet.id}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => getBalance(wallet.publicKey)}
                className="flex items-center gap-2"
              >
                <Wallet className="w-4 h-4" />
                Check Balance
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Public Key
                </label>
                <p className="text-sm font-mono bg-muted p-2 text-foreground break-all">
                  {wallet.publicKey}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Private Key
                </label>
                <p className="text-sm font-mono bg-muted p-2 text-foreground break-all blur-sm hover:blur-none transition-all cursor-pointer">
                  {wallet.privateKey}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Balance Dialog */}
      <Dialog open={balanceDialogOpen} onOpenChange={setBalanceDialogOpen}>
        <DialogContent className="bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-card-foreground">
              Wallet Balance
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Current balance on Solana Devnet
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {currentBalance.loading && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="mt-2 text-muted-foreground">
                  Fetching balance...
                </p>
              </div>
            )}

            {currentBalance.error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <p className="text-destructive text-sm">
                  {currentBalance.error}
                </p>
              </div>
            )}

            {!currentBalance.loading && !currentBalance.error && (
              <div className="space-y-4">
                <div className="bg-muted rounded-lg p-6 text-center">
                  <p className="text-4xl font-bold text-foreground">
                    {currentBalance.sol.toFixed(4)}
                  </p>
                  <p className="text-muted-foreground mt-1">SOL</p>
                </div>

                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Lamports
                    </span>
                    <span className="text-sm font-mono text-foreground">
                      {currentBalance.lamports.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
