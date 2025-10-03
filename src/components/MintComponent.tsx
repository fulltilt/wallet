import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Wallet } from "./WalletManager";
import { useState } from "react";
import { Coins, Plus } from "lucide-react";
import { CreateTokenForm } from "./CreateTokenForm";
import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";
import { getMint } from "@solana/spl-token";

const SPL_TOKEN_PROGRAM_ADDRESS = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

async function checkWalletMintAuthority(walletPublicKey: string) {
  try {
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    const publicKey = new PublicKey(walletPublicKey);

    // Get all token accounts
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      publicKey,
      {
        programId: new PublicKey(SPL_TOKEN_PROGRAM_ADDRESS),
      }
    );

    // Get unique mints
    const uniqueMints = Array.from(
      new Set(
        tokenAccounts.value.map(
          (account) => account.account.data.parsed.info.mint
        )
      )
    );

    // Fetch all mint info in parallel
    const mintInfoPromises = uniqueMints.map((mintAddress) =>
      getMint(connection, new PublicKey(mintAddress))
        .then((info) => ({ mintAddress, info }))
        .catch(() => null)
    );

    const mintInfoResults = await Promise.all(mintInfoPromises);

    // Filter for tokens where wallet is mint authority
    const mintAuthorities = mintInfoResults
      .filter(
        (result) =>
          result !== null &&
          result.info.mintAuthority?.toBase58() === walletPublicKey
      )
      .map((result) => ({
        mintAddress: result!.mintAddress,
        decimals: result!.info.decimals,
        supply: (
          Number(result!.info.supply) / Math.pow(10, result!.info.decimals)
        ).toString(),
      }));

    return mintAuthorities;
  } catch (error) {
    console.error("Error checking mint authority:", error);
    return [];
  }
}

export const MintComponent = ({ wallet }: { wallet: Wallet }) => {
  const [openModal, setOpenModal] = useState(false);
  const [tokenFormDialogOpen, setTokenFormDialogOpen] = useState(false);
  const [checkingAuthority, setCheckingAuthority] = useState(false);
  const [existingTokens, setExistingTokens] = useState<
    Array<{
      mintAddress: string;
      decimals: number;
      supply: string;
    }>
  >([]);

  const openMintModal = async () => {
    setOpenModal(true);

    setCheckingAuthority(true);
    const tokens = await checkWalletMintAuthority(wallet.publicKey);
    setExistingTokens(tokens);
    setCheckingAuthority(false);
  };

  const closeMintDialog = () => {
    setTokenFormDialogOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={openMintModal}
        className="border-2 hover:bg-emerald-50 hover:border-emerald-500 dark:hover:bg-emerald-950/20"
      >
        <Coins className="w-4 h-4 mr-2" />
        Mint
      </Button>

      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto border-2 bg-white dark:bg-black">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Token Minting
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-violet-600 dark:text-violet-400 mt-2 font-mono">
            Wallet: {wallet.publicKey.slice(0, 8)}...
            {wallet.publicKey.slice(-8)}
          </p>

          {checkingAuthority ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
              <p className="mt-4 text-gray-500 dark:text-gray-400">
                Checking mint authority...
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {existingTokens.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Coins className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-bold text-blue-900 dark:text-blue-200">
                      Your Tokens (Mint Authority)
                    </h3>
                  </div>
                  <p className="text-sm text-blue-800 dark:text-blue-300 mb-4">
                    You have mint authority for {existingTokens.length} token
                    {existingTokens.length > 1 ? "s" : ""}
                  </p>
                  <div className="space-y-2">
                    {existingTokens.map((token) => (
                      <div
                        key={token.mintAddress}
                        className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-blue-200 dark:border-blue-700"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <p className="font-mono text-sm truncate">
                              {token.mintAddress}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Supply:{" "}
                              {parseFloat(token.supply).toLocaleString()} •
                              Decimals: {token.decimals}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              // TODO: Open mint more form for this specific token
                              console.log("Mint more for", token.mintAddress);
                            }}
                            className="ml-2 bg-violet-600 hover:bg-violet-700"
                          >
                            Mint More
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-4">
                <Button
                  onClick={() => setTokenFormDialogOpen(true)}
                  className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
                >
                  <Coins className="w-4 h-4 mr-2" />
                  Create New Token
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={tokenFormDialogOpen} onOpenChange={setTokenFormDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto border-2 bg-white dark:bg-black">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Create SPL Token
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Create your own token on Solana blockchain
          </p>

          <p className="text-xs text-violet-600 dark:text-violet-400 mt-2 font-mono">
            Payer: {wallet.publicKey.slice(0, 8)}...
            {wallet.publicKey.slice(-8)}
          </p>

          {wallet && (
            <CreateTokenForm wallet={wallet} onSuccess={closeMintDialog} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
