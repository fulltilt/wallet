import React, { useCallback, useState } from "react";
import { Buffer } from "buffer";
window.Buffer = Buffer;

import nacl from "tweetnacl";
import { generateMnemonic, mnemonicToSeedSync } from "bip39";
import { derivePath } from "ed25519-hd-key";

import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

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
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import {
  Check,
  ChevronUp,
  Copy,
  Plus,
  Send,
  Trash2,
  Wallet,
} from "lucide-react";
import { SendDialog } from "./components/ui/SendDialog";

export type Wallet = {
  id: number;
  publicKey: string;
  privateKey: string; // hex-encoded secretKey (Uint8Array -> hex)
};

type SendForm = {
  recipient: string;
  amount: string;
};

type SendResult = {
  loading: boolean;
  success: boolean;
  message: string;
  signature?: string;
};

type BalanceState = {
  sol: number;
  lamports: number;
  loading: boolean;
  error: string | null;
};

const SOLANA_RPC_URL = `https://long-indulgent-log.solana-devnet.quiknode.pro/${
  import.meta.env.VITE_RPC_TOKEN
}`;

const connection = new Connection(SOLANA_RPC_URL, "confirmed");

async function rpcCall(method: string, params: any[] = []) {
  const res = await fetch(SOLANA_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const body = await res.json();
  if (body.error) throw new Error(body.error.message || "RPC error");
  return body.result;
}

const secretKeyToHex = (sk: Uint8Array) => Buffer.from(sk).toString("hex");
const hexToSecretKey = (hex: string) =>
  Uint8Array.from(Buffer.from(hex, "hex"));

const App: React.FC = () => {
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [seedPhrase, setSeedPhrase] = useState<string[]>([]);
  const [seedHex, setSeedHex] = useState<string>(""); // mnemonicToSeedSync -> Buffer -> hex
  const [copied, setCopied] = useState(false);

  const [walletNum, setWalletNum] = useState(0);
  const [wallets, setWallets] = useState<Wallet[]>([]);

  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);

  const [sendForm, setSendForm] = useState<SendForm>({
    recipient: "",
    amount: "",
  });
  const [sendResult, setSendResult] = useState<SendResult>({
    loading: false,
    success: false,
    message: "",
  });

  const [currentBalance, setCurrentBalance] = useState<BalanceState>({
    sol: 0,
    lamports: 0,
    loading: false,
    error: null,
  });

  const generateSeedPhrase = useCallback(() => {
    if (!input.trim()) {
      const mnemonic = generateMnemonic();
      const words = mnemonic.split(" ");
      setSeedPhrase(words);

      const seed = mnemonicToSeedSync(mnemonic); // Buffer
      setSeedHex(seed.toString("hex"));
      setIsOpen(true);
      return;
    }

    const words = input.trim().split(/\s+/);
    if (words.length === 12) {
      setSeedPhrase(words);
      const seed = mnemonicToSeedSync(words.join(" "));
      setSeedHex(seed.toString("hex"));
      setIsOpen(true);
    } else {
      console.warn("seed phrase must be 12 words long");
    }
  }, [input]);

  const addWallet = useCallback(() => {
    if (!seedHex) {
      console.warn("seed not available — generate or set a seed phrase first");
      return;
    }

    const path = `m/44'/501'/${walletNum}'/0'`;
    const derivedSeed = (derivePath as any)(
      path,
      Buffer.from(seedHex, "hex")
    ).key;
    const secretKey = nacl.sign.keyPair.fromSeed(derivedSeed).secretKey; // Uint8Array(64)
    const kp = Keypair.fromSecretKey(secretKey);
    const publicKey = kp.publicKey.toBase58();

    setWallets((prev) => [
      ...prev,
      { id: walletNum, privateKey: secretKeyToHex(secretKey), publicKey },
    ]);
    setWalletNum((n) => n + 1);
  }, [seedHex, walletNum]);

  const getBalance = useCallback(async (publicKey: string) => {
    setBalanceDialogOpen(true);
    setCurrentBalance({ sol: 0, lamports: 0, loading: true, error: null });

    try {
      const result = await rpcCall("getBalance", [publicKey]);
      const lamports = result.value;
      setCurrentBalance({
        sol: lamports / LAMPORTS_PER_SOL,
        lamports,
        loading: false,
        error: null,
      });
    } catch (err) {
      setCurrentBalance({
        sol: 0,
        lamports: 0,
        loading: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  const openSendDialog = useCallback((wallet: Wallet) => {
    setSelectedWallet(wallet);
    setSendForm({ recipient: "", amount: "" });
    setSendResult({ loading: false, success: false, message: "" });
    setSendDialogOpen(true);
  }, []);

  const sendSOL = useCallback(
    async (fromKeypair: Keypair, toPublicKey: string, amountInSOL: number) => {
      const toPubkey = new PublicKey(toPublicKey);
      const lamports = Math.round(amountInSOL * LAMPORTS_PER_SOL);
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: fromKeypair.publicKey,
          toPubkey,
          lamports,
        })
      );
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [fromKeypair]
      );
      return signature;
    },
    []
  );

  const handleSendSOL = useCallback(async () => {
    if (!selectedWallet) return;

    if (!sendForm.recipient.trim()) {
      setSendResult({
        loading: false,
        success: false,
        message: "Please enter a recipient address",
      });
      return;
    }
    const amount = parseFloat(sendForm.amount);
    if (isNaN(amount) || amount <= 0) {
      setSendResult({
        loading: false,
        success: false,
        message: "Please enter a valid amount",
      });
      return;
    }

    setSendResult({ loading: true, success: false, message: "" });

    try {
      const secretKey = hexToSecretKey(selectedWallet.privateKey);
      const kp = Keypair.fromSecretKey(secretKey);
      const signature = await sendSOL(kp, sendForm.recipient, amount);

      setSendResult({
        loading: false,
        success: true,
        message: "Transaction successful!",
        signature,
      });
      // clear form after a short delay
      setTimeout(() => setSendForm({ recipient: "", amount: "" }), 3000);
    } catch (err) {
      setSendResult({
        loading: false,
        success: false,
        message: err instanceof Error ? err.message : "Transaction failed",
      });
    }
  }, [selectedWallet, sendForm, sendSOL]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(seedPhrase.join(" "));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("copy failed", err);
    }
  }, [seedPhrase]);

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Seed input */}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter your secret phrase (or leave blank to generate)"
          className="flex-1 bg-background border-border text-foreground placeholder:text-muted-foreground"
        />
        <Button onClick={generateSeedPhrase} className="shrink-0">
          {input.length === 0 ? "Generate Seed" : "Set Seed"}
        </Button>
      </div>

      {/* Seed phrase collapsible */}
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
                {seedPhrase.map((word, i) => (
                  <div
                    key={i}
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
                    <Check className="w-4 h-4 mr-2" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" /> Click Anywhere To Copy
                  </>
                )}
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Wallet controls */}
      <div className="flex gap-4">
        <Button onClick={addWallet} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Wallet
        </Button>
        <Button
          variant="outline"
          className="flex items-center gap-2 text-destructive hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" /> Clear Wallets
        </Button>
      </div>

      {/* Wallets list */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Wallets</h2>
        {wallets.map((w) => (
          <Card key={w.id} className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-card-foreground">
                Wallet #{w.id}
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => getBalance(w.publicKey)}
                  className="flex items-center gap-2"
                >
                  <Wallet className="w-4 h-4" /> Check Balance
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => openSendDialog(w)}
                  className="flex items-center gap-2"
                >
                  <Send className="w-4 h-4" /> Send SOL
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Public Key
                </label>
                <p className="text-sm font-mono bg-muted p-2 text-foreground break-all">
                  {w.publicKey}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Private Key
                </label>
                <p className="text-sm font-mono bg-muted p-2 text-foreground break-all blur-sm hover:blur-none transition-all cursor-pointer">
                  {w.privateKey}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Balance dialog */}
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
            {currentBalance.loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                <p className="mt-2 text-muted-foreground">
                  Fetching balance...
                </p>
              </div>
            ) : currentBalance.error ? (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <p className="text-destructive text-sm">
                  {currentBalance.error}
                </p>
              </div>
            ) : (
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

      {/* Send SOL dialog */}
      <SendDialog
        selectedWallet={selectedWallet}
        sendDialogOpen={sendDialogOpen}
        setSendDialogOpen={setSendDialogOpen}
        sendForm={sendForm}
        setSendForm={setSendForm}
        handleSendSOL={handleSendSOL}
        sendResult={sendResult}
      />
    </div>
  );
};

export default App;
