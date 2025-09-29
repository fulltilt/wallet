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
import type { Wallet } from "@/App";
import { Send } from "lucide-react";

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
      <DialogContent className="bg-background border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Send SOL</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Send SOL from {selectedWallet?.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <Label className="text-xs text-muted-foreground">From</Label>
            <p className="text-sm font-mono text-foreground break-all mt-1">
              {selectedWallet?.publicKey}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipient" className="text-foreground">
              Recipient Address
            </Label>
            <Input
              id="recipient"
              placeholder="Enter recipient's public key"
              value={sendForm.recipient}
              onChange={(e) =>
                setSendForm((s) => ({ ...s, recipient: e.target.value }))
              }
              className="bg-background border-border text-foreground"
              disabled={sendResult.loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="text-foreground">
              Amount (SOL)
            </Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.0"
              step="0.001"
              min="0"
              value={sendForm.amount}
              onChange={(e) =>
                setSendForm((s) => ({ ...s, amount: e.target.value }))
              }
              className="bg-background border-border text-foreground"
              disabled={sendResult.loading}
            />
          </div>

          <Button
            onClick={handleSendSOL}
            disabled={sendResult.loading}
            className="w-full"
          >
            {sendResult.loading ? (
              <>
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
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
              className={`rounded-lg p-4 ${
                sendResult.success
                  ? "bg-green-500/10 border border-green-500/20"
                  : "bg-destructive/10 border border-destructive/20"
              }`}
            >
              <p
                className={`text-sm font-medium ${
                  sendResult.success
                    ? "text-green-600 dark:text-green-400"
                    : "text-destructive"
                }`}
              >
                {sendResult.message}
              </p>
              {sendResult.signature && (
                <p className="text-xs font-mono text-muted-foreground mt-2 break-all">
                  {sendResult.signature}
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
