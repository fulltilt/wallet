import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import { Coins, Wallet } from "lucide-react";
import { Button } from "./ui/button";

export const Navigation = () => {
  const location = useLocation();

  return (
    <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-6">
        <div className="flex items-center space-x-2 h-16">
          <div className="flex items-center space-x-2 flex-1">
            <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-2 rounded-lg">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
              Solana Wallet
            </span>
          </div>
          <div className="flex items-center space-x-1 bg-muted/50 rounded-lg p-1">
            <Link to="/">
              <Button
                variant={location.pathname === "/" ? "default" : "ghost"}
                size="sm"
                className={
                  location.pathname === "/"
                    ? "bg-gradient-to-r from-violet-600 to-purple-600 shadow-lg shadow-violet-500/50"
                    : ""
                }
              >
                <Wallet className="w-4 h-4 mr-2" />
                Wallet
              </Button>
            </Link>
            <Link to="/create-token">
              <Button
                variant={
                  location.pathname === "/create-token" ? "default" : "ghost"
                }
                size="sm"
                className={
                  location.pathname === "/create-token"
                    ? "bg-gradient-to-r from-violet-600 to-purple-600 shadow-lg shadow-violet-500/50"
                    : ""
                }
              >
                <Coins className="w-4 h-4 mr-2" />
                Create Token
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};
