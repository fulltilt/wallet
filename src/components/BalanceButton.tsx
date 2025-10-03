import { useCallback, useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { rpcCall } from "@/lib/utils";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Wallet as WalletIcon } from "lucide-react";
import type { BalanceState, Wallet } from "./WalletManager";

export const BalanceButton = ({ wallet }: { wallet: Wallet }) => {
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [currentBalance, setCurrentBalance] = useState<BalanceState>({
    sol: 0,
    lamports: 0,
    loading: false,
    error: null,
  });

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

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => getBalance(wallet.publicKey)}
        className="border-2 hover:bg-violet-50 hover:border-violet-500 dark:hover:bg-violet-950/20"
      >
        <WalletIcon className="w-4 h-4 mr-2" />
        Balance
      </Button>

      <Dialog open={balanceDialogOpen} onOpenChange={setBalanceDialogOpen}>
        <DialogContent className="sm:max-w-md border-2 bg-white dark:bg-black">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Wallet Balance
            </DialogTitle>
            <DialogDescription>
              Current balance on Solana Devnet
            </DialogDescription>
          </DialogHeader>
          {currentBalance.loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-violet-500 border-t-transparent"></div>
              <p className="mt-4 text-muted-foreground">Fetching balance...</p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-2 border-violet-500/20 rounded-2xl p-8 text-center">
                <p className="text-5xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                  {currentBalance.sol.toFixed(4)}
                </p>
                <p className="text-muted-foreground mt-2 font-medium">SOL</p>
              </div>
              <div className="bg-muted/50 border rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground font-medium">
                    Lamports
                  </span>
                  <span className="text-sm font-mono font-semibold">
                    {currentBalance.lamports.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
