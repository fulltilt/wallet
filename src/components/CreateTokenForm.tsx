import { useState } from "react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Check, Coins, Plus } from "lucide-react";
import { Keypair, Connection, clusterApiUrl, PublicKey } from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { toast } from "sonner";
import type { Wallet } from "./WalletManager";

interface CreateTokenFormProps {
  wallet: Wallet;
  onSuccess?: () => void;
}

type FormState = "create" | "success" | "mintMore";

export const CreateTokenForm = ({
  wallet,
  onSuccess,
}: CreateTokenFormProps) => {
  const [formState, setFormState] = useState<FormState>("create");
  const [tokenForm, setTokenForm] = useState({
    name: "",
    symbol: "",
    decimals: "9",
    supply: "",
    description: "",
    imageUrl: "",
  });
  const [creating, setCreating] = useState(false);
  const [minting, setMinting] = useState(false);
  const [createdMint, setCreatedMint] = useState<string | null>(null);
  const [mintForm, setMintForm] = useState({
    recipient: "",
    amount: "",
  });

  const handleCreateToken = async () => {
    setCreating(true);

    try {
      // Convert private key from base58 to Keypair
      const payerKeypair = Keypair.fromSecretKey(
        Uint8Array.from(
          // atob(wallet.privateKey)
          //   .split("")
          //   .map((c) => c.charCodeAt(0))
          wallet.privateKey.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
        )
      );

      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

      // Create the mint
      const mint = await createMint(
        connection,
        payerKeypair, // Payer of the transaction
        payerKeypair.publicKey, // Mint authority
        payerKeypair.publicKey, // Freeze authority (optional)
        parseInt(tokenForm.decimals) // Decimals
      );

      // Create associated token account for the wallet
      const tokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        payerKeypair,
        mint,
        payerKeypair.publicKey
      );

      // Mint initial supply
      const supplyWithDecimals =
        parseFloat(tokenForm.supply) *
        Math.pow(10, parseInt(tokenForm.decimals));
      await mintTo(
        connection,
        payerKeypair,
        mint,
        tokenAccount.address,
        payerKeypair.publicKey,
        supplyWithDecimals
      );

      toast.success("Token Created Successfully!", {
        description: `${tokenForm.name} (${tokenForm.symbol}) has been created`,
      });

      console.log("Mint address:", mint.toBase58());
      console.log("Token account:", tokenAccount.address.toBase58());

      onSuccess?.();
    } catch (error) {
      console.error("Token creation failed:", error);

      if (error instanceof Error) {
        toast.error("Token Creation Failed", {
          description: error.message,
        });
      } else {
        toast.error("Token Creation Failed", {
          description: "An unexpected error occurred. Please try again.",
        });
      }
    } finally {
      setCreating(false);
    }
  };

  const handleMintMore = async () => {
    if (!createdMint) return;

    setMinting(true);

    try {
      const payerKeypair = Keypair.fromSecretKey(
        Uint8Array.from(
          atob(wallet.privateKey)
            .split("")
            .map((c) => c.charCodeAt(0))
        )
      );

      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
      const mintPublicKey = new PublicKey(createdMint);
      const recipientPublicKey = new PublicKey(mintForm.recipient);

      // Get or create associated token account for recipient
      const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        payerKeypair,
        mintPublicKey,
        recipientPublicKey
      );

      // Mint tokens to recipient
      const amountWithDecimals =
        parseFloat(mintForm.amount) *
        Math.pow(10, parseInt(tokenForm.decimals));
      await mintTo(
        connection,
        payerKeypair,
        mintPublicKey,
        recipientTokenAccount.address,
        payerKeypair.publicKey,
        amountWithDecimals
      );

      toast.success("Tokens Minted Successfully!", {
        description: `${mintForm.amount} ${tokenForm.symbol} minted to recipient`,
      });

      // Reset mint form
      setMintForm({ recipient: "", amount: "" });
    } catch (error) {
      console.error("Minting failed:", error);

      if (error instanceof Error) {
        toast.error("Minting Failed", {
          description: error.message,
        });
      } else {
        toast.error("Minting Failed", {
          description: "An unexpected error occurred. Please try again.",
        });
      }
    } finally {
      setMinting(false);
    }
  };

  // return (
  //   <div className="space-y-6">
  //     <div className="space-y-4">
  //       <div>
  //         <Label htmlFor="name">Token Name *</Label>
  //         <Input
  //           id="name"
  //           placeholder="My Token"
  //           value={tokenForm.name}
  //           onChange={(e) =>
  //             setTokenForm({ ...tokenForm, name: e.target.value })
  //           }
  //         />
  //       </div>

  //       <div>
  //         <Label htmlFor="symbol">Token Symbol *</Label>
  //         <Input
  //           id="symbol"
  //           placeholder="MTK"
  //           maxLength={10}
  //           value={tokenForm.symbol}
  //           onChange={(e) =>
  //             setTokenForm({
  //               ...tokenForm,
  //               symbol: e.target.value.toUpperCase(),
  //             })
  //           }
  //         />
  //       </div>

  //       <div>
  //         <Label htmlFor="decimals">Decimals</Label>
  //         <Input
  //           id="decimals"
  //           type="number"
  //           min="0"
  //           max="9"
  //           value={tokenForm.decimals}
  //           onChange={(e) =>
  //             setTokenForm({ ...tokenForm, decimals: e.target.value })
  //           }
  //         />
  //         <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
  //           Typically 9 for Solana tokens
  //         </p>
  //       </div>

  //       <div>
  //         <Label htmlFor="supply">Initial Supply *</Label>
  //         <Input
  //           id="supply"
  //           type="number"
  //           placeholder="1000000"
  //           value={tokenForm.supply}
  //           onChange={(e) =>
  //             setTokenForm({ ...tokenForm, supply: e.target.value })
  //           }
  //         />
  //       </div>

  //       <div>
  //         <Label htmlFor="description">Description</Label>
  //         <Textarea
  //           id="description"
  //           placeholder="Describe your token..."
  //           rows={3}
  //           value={tokenForm.description}
  //           onChange={(e) =>
  //             setTokenForm({ ...tokenForm, description: e.target.value })
  //           }
  //         />
  //       </div>

  //       <div>
  //         <Label htmlFor="imageUrl">Image URL</Label>
  //         <Input
  //           id="imageUrl"
  //           type="url"
  //           placeholder="https://example.com/token-image.png"
  //           value={tokenForm.imageUrl}
  //           onChange={(e) =>
  //             setTokenForm({ ...tokenForm, imageUrl: e.target.value })
  //           }
  //         />
  //       </div>
  //     </div>

  //     <Button
  //       onClick={handleCreateToken}
  //       disabled={
  //         creating || !tokenForm.name || !tokenForm.symbol || !tokenForm.supply
  //       }
  //       className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
  //     >
  //       {creating ? (
  //         <>
  //           <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
  //           Creating Token...
  //         </>
  //       ) : (
  //         <>
  //           <Coins className="w-4 h-4 mr-2" />
  //           Create Token
  //         </>
  //       )}
  //     </Button>

  //     <div className="bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-800 p-4 rounded-lg text-sm space-y-2">
  //       <p className="font-medium text-amber-900 dark:text-amber-200">
  //         Important Notes:
  //       </p>
  //       <ul className="list-disc list-inside space-y-1 text-amber-800 dark:text-amber-300">
  //         <li>Token creation requires SOL for transaction fees (~0.01 SOL)</li>
  //         <li>Decimals cannot be changed after creation</li>
  //         <li>You'll be the mint authority and can mint more tokens later</li>
  //       </ul>
  //     </div>
  //   </div>
  // );
  if (formState === "create") {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Token Name *</Label>
            <Input
              id="name"
              placeholder="My Token"
              value={tokenForm.name}
              onChange={(e) =>
                setTokenForm({ ...tokenForm, name: e.target.value })
              }
            />
          </div>

          <div>
            <Label htmlFor="symbol">Token Symbol *</Label>
            <Input
              id="symbol"
              placeholder="MTK"
              maxLength={10}
              value={tokenForm.symbol}
              onChange={(e) =>
                setTokenForm({
                  ...tokenForm,
                  symbol: e.target.value.toUpperCase(),
                })
              }
            />
          </div>

          <div>
            <Label htmlFor="decimals">Decimals</Label>
            <Input
              id="decimals"
              type="number"
              min="0"
              max="9"
              value={tokenForm.decimals}
              onChange={(e) =>
                setTokenForm({ ...tokenForm, decimals: e.target.value })
              }
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Typically 9 for Solana tokens
            </p>
          </div>

          <div>
            <Label htmlFor="supply">Initial Supply *</Label>
            <Input
              id="supply"
              type="number"
              placeholder="1000000"
              value={tokenForm.supply}
              onChange={(e) =>
                setTokenForm({ ...tokenForm, supply: e.target.value })
              }
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your token..."
              rows={3}
              value={tokenForm.description}
              onChange={(e) =>
                setTokenForm({ ...tokenForm, description: e.target.value })
              }
            />
          </div>

          <div>
            <Label htmlFor="imageUrl">Image URL</Label>
            <Input
              id="imageUrl"
              type="url"
              placeholder="https://example.com/token-image.png"
              value={tokenForm.imageUrl}
              onChange={(e) =>
                setTokenForm({ ...tokenForm, imageUrl: e.target.value })
              }
            />
          </div>
        </div>

        <Button
          onClick={handleCreateToken}
          disabled={
            creating ||
            !tokenForm.name ||
            !tokenForm.symbol ||
            !tokenForm.supply
          }
          className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
        >
          {creating ? (
            <>
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Creating Token...
            </>
          ) : (
            <>
              <Coins className="w-4 h-4 mr-2" />
              Create Token
            </>
          )}
        </Button>

        <div className="bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-800 p-4 rounded-lg text-sm space-y-2">
          <p className="font-medium text-amber-900 dark:text-amber-200">
            Important Notes:
          </p>
          <ul className="list-disc list-inside space-y-1 text-amber-800 dark:text-amber-300">
            <li>
              Token creation requires SOL for transaction fees (~0.01 SOL)
            </li>
            <li>Decimals cannot be changed after creation</li>
            <li>You'll be the mint authority and can mint more tokens later</li>
          </ul>
        </div>
      </div>
    );
  }

  // Success State
  if (formState === "success") {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-6">
            <Check className="w-16 h-16 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>

        <div>
          <h3 className="text-2xl font-bold mb-2">{tokenForm.name} Created!</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Your token{" "}
            <span className="font-mono font-semibold">{tokenForm.symbol}</span>{" "}
            has been successfully created
          </p>

          <div className="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-4 mb-6">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Mint Address
            </p>
            <p className="font-mono text-sm break-all">{createdMint}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-left bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 border-2 border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Initial Supply
              </p>
              <p className="font-semibold">
                {parseFloat(tokenForm.supply).toLocaleString()}{" "}
                {tokenForm.symbol}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Decimals
              </p>
              <p className="font-semibold">{tokenForm.decimals}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setFormState("create");
              setCreatedMint(null);
              setTokenForm({
                name: "",
                symbol: "",
                decimals: "9",
                supply: "",
                description: "",
                imageUrl: "",
              });
            }}
            className="flex-1"
          >
            Create Another
          </Button>
          <Button
            onClick={() => setFormState("mintMore")}
            className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Mint More Tokens
          </Button>
        </div>

        <Button variant="ghost" onClick={onSuccess} className="w-full">
          Close
        </Button>
      </div>
    );
  }

  // Mint More Tokens Form
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 border-2 border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Coins className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="font-bold text-emerald-900 dark:text-emerald-200">
            {tokenForm.symbol}
          </h3>
        </div>
        <p className="text-sm text-emerald-800 dark:text-emerald-300">
          {tokenForm.name}
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 font-mono break-all">
          {createdMint}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="recipient">Recipient Address *</Label>
          <Input
            id="recipient"
            placeholder="Enter Solana wallet address"
            value={mintForm.recipient}
            onChange={(e) =>
              setMintForm({ ...mintForm, recipient: e.target.value })
            }
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Tokens will be sent to this address
          </p>
        </div>

        <div>
          <Label htmlFor="amount">Amount *</Label>
          <Input
            id="amount"
            type="number"
            placeholder="1000"
            value={mintForm.amount}
            onChange={(e) =>
              setMintForm({ ...mintForm, amount: e.target.value })
            }
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Number of {tokenForm.symbol} tokens to mint
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setFormState("success")}
          className="flex-1"
        >
          Back
        </Button>
        <Button
          onClick={handleMintMore}
          disabled={minting || !mintForm.recipient || !mintForm.amount}
          className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
        >
          {minting ? (
            <>
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Minting...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Mint Tokens
            </>
          )}
        </Button>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800 p-4 rounded-lg text-sm">
        <p className="font-medium text-blue-900 dark:text-blue-200 mb-2">
          Mint Authority
        </p>
        <p className="text-blue-800 dark:text-blue-300">
          You are the mint authority and can mint unlimited tokens to any
          address. Transaction fees apply.
        </p>
      </div>
    </div>
  );
};
