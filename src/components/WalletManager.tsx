import { useCallback, useState } from "react";
import { derivePath } from "ed25519-hd-key";
import nacl from "tweetnacl";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

import { Button } from "./ui/button";
import { Plus, Send, Trash2, Wallet } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { SendDialog } from "./SendDialog";
import { Label } from "@radix-ui/react-label";
import { toast } from "sonner";
import { SeedPhraseComponent } from "./SeedPhraseComponent";
import { BalanceButton } from "./BalanceButton";
import { SOLANA_RPC_URL } from "@/lib/utils";
import { MintComponent } from "./MintComponent";

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

export type BalanceState = {
  sol: number;
  lamports: number;
  loading: boolean;
  error: string | null;
};

const connection = new Connection(SOLANA_RPC_URL, "confirmed");

const secretKeyToHex = (sk: Uint8Array) => Buffer.from(sk).toString("hex");
const hexToSecretKey = (hex: string) =>
  Uint8Array.from(Buffer.from(hex, "hex"));

export const WalletManager = () => {
  const [seedHex, setSeedHex] = useState<string>(""); // mnemonicToSeedSync -> Buffer -> hex

  const [walletNum, setWalletNum] = useState(0);
  const [wallets, setWallets] = useState<Wallet[]>([]);
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

  const addWallet = useCallback(async () => {
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

  const clearWallets = () => {
    console.log("Clear wallets");
  };

  const airdrop = async (publicKey: string, amount: number) => {
    try {
      const airdropSignature = await connection.requestAirdrop(
        new PublicKey(publicKey),
        amount
      );

      // Get latest blockhash for confirmation strategy
      const latestBlockhash = await connection.getLatestBlockhash();

      // Use the TransactionConfirmationStrategy
      await connection.confirmTransaction({
        signature: airdropSignature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      });

      toast.success("Airdrop Successful!", {
        description: `${(amount / 1e9).toFixed(2)} SOL added to your wallet`,
      });

      return true;
    } catch (error) {
      // Error handling
      console.error("Airdrop failed:", error);

      if (error instanceof Error) {
        toast.error("Airdrop Failed", {
          description: error.message,
        });
      } else {
        toast.error("Airdrop Failed", {
          description: "An unexpected error occurred. Please try again.",
        });
      }

      return false;
    }
  };

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

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-7xl">
      {/* Header Section */}
      <SeedPhraseComponent setSeedHex={setSeedHex} />

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={addWallet}
          size="lg"
          className="h-11 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg shadow-violet-500/50"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Wallet
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={clearWallets}
          className="h-11 border-2 hover:bg-red-50 hover:border-red-500 hover:text-red-600 dark:hover:bg-red-950/20 transition-all"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Clear Wallets
        </Button>
      </div>

      {/* Wallets Section */}
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 bg-gradient-to-b from-violet-600 to-purple-600 rounded-full"></div>
          <h2 className="text-3xl font-bold">Your Wallets</h2>
        </div>
        <div className="grid gap-5">
          {wallets.map((wallet) => {
            return (
              <Card
                key={wallet.id}
                className="border-2 shadow-xl hover:shadow-2xl transition-all bg-gradient-to-br from-card to-card/50 backdrop-blur"
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg">
                        <Wallet className="w-5 h-5 text-white" />
                      </div>
                      <CardTitle className="text-xl">{wallet.id}</CardTitle>
                    </div>
                    <div className="flex gap-2">
                      <BalanceButton wallet={wallet} />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => airdrop(wallet.publicKey, 1)}
                        className="border-2 hover:bg-violet-50 hover:border-violet-500 dark:hover:bg-violet-950/20"
                      >
                        <Wallet className="w-4 h-4 mr-2" />
                        Airdrop
                      </Button>

                      <MintComponent wallet={wallet} />

                      <Button
                        size="sm"
                        onClick={() => openSendDialog(wallet)}
                        className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-md"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Send
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Public Key
                    </Label>
                    <div className="group relative bg-muted/50 border-2 border-border/50 p-3 rounded-lg hover:border-violet-500/50 transition-all">
                      <p className="text-sm font-mono break-all">
                        {wallet.publicKey}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

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
