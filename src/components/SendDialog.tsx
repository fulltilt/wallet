import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send } from "lucide-react";
import type { Wallet } from "./WalletManager";

type SendDialogProps = {
  selectedWallet: Wallet | null;
  sendDialogOpen: boolean;
  setSendDialogOpen: (open: boolean) => void;
  sendForm: { recipient: string; amount: string };
  setSendForm: React.Dispatch<
    React.SetStateAction<{ recipient: string; amount: string }>
  >;
  handleSendSOL: () => Promise<void>;
  sendResult: {
    loading: boolean;
    success: boolean | null;
    message: string;
    signature?: string;
  };
};

export const SendDialog = ({
  selectedWallet,
  sendDialogOpen,
  setSendDialogOpen,
  sendForm,
  setSendForm,
  handleSendSOL,
  sendResult,
}: SendDialogProps) => {
  return (
    <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
      <DialogContent className="sm:max-w-md border-2 bg-white dark:bg-black">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Send SOL</DialogTitle>
          <DialogDescription>Transfer SOL to another wallet</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="bg-muted/50 border-2 rounded-xl p-4">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              From
            </Label>
            <p className="text-sm font-mono break-all mt-2">
              {selectedWallet?.publicKey}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="recipient" className="font-semibold">
              Recipient Address
            </Label>
            <Input
              id="recipient"
              placeholder="Enter recipient's public key"
              value={sendForm.recipient}
              onChange={(e) =>
                setSendForm({ ...sendForm, recipient: e.target.value })
              }
              className="h-11 border-2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount" className="font-semibold">
              Amount (SOL)
            </Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.0"
              value={sendForm.amount}
              onChange={(e) =>
                setSendForm({ ...sendForm, amount: e.target.value })
              }
              className="h-11 border-2"
            />
          </div>
          <Button
            onClick={handleSendSOL}
            disabled={sendResult.loading}
            className="w-full h-11 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg"
          >
            {sendResult.loading ? (
              <>
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send SOL
              </>
            )}
          </Button>
          {sendResult.message && (
            <div
              className={`rounded-xl p-4 border-2 ${
                sendResult.success
                  ? "bg-green-50 border-green-500 dark:bg-green-950/20"
                  : "bg-red-50 border-red-500 dark:bg-red-950/20"
              }`}
            >
              <p
                className={`font-medium ${
                  sendResult.success
                    ? "text-green-700 dark:text-green-400"
                    : "text-red-700 dark:text-red-400"
                }`}
              >
                {sendResult.message}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
