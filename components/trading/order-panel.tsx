"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface OrderPanelProps {
  asset: string;
}

export function OrderPanel({ asset }: OrderPanelProps) {
  const [orderType, setOrderType] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");

  const handlePlaceOrder = () => {
    console.log(
      `Placing ${orderType} order for ${quantity} ${asset} at ${price}`
    );
  };

  return (
    <Card className="border-border bg-card p-4 sticky top-4 max-h-[600px] overflow-y-auto">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Place Order
      </h3>

      <Tabs defaultValue="buy" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="buy" onClick={() => setOrderType("buy")}>
            Trade
          </TabsTrigger>
          <TabsTrigger value="sell" onClick={() => setOrderType("sell")}>
            Sell
          </TabsTrigger>
        </TabsList>

        <TabsContent value="buy" className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">
              Quantity
            </label>
            <Input
              type="number"
              placeholder="0.00"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="bg-background border-border"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-2">
              Price
            </label>
            <Input
              type="number"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="bg-background border-border"
            />
          </div>

          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Total:</span>
              <span className="text-foreground font-semibold">
                $
                {(
                  Number.parseFloat(quantity || "0") *
                  Number.parseFloat(price || "0")
                ).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Fee (0.1%):</span>
              <span className="text-foreground font-semibold">
                $
                {(
                  Number.parseFloat(quantity || "0") *
                  Number.parseFloat(price || "0") *
                  0.001
                ).toFixed(2)}
              </span>
            </div>
          </div>

          <Button
            onClick={handlePlaceOrder}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            disabled={!quantity || !price}
          >
            Trade {asset}
          </Button>
        </TabsContent>

        <TabsContent value="sell" className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">
              Quantity
            </label>
            <Input
              type="number"
              placeholder="0.00"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="bg-background border-border"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-2">
              Price
            </label>
            <Input
              type="number"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="bg-background border-border"
            />
          </div>

          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Total:</span>
              <span className="text-foreground font-semibold">
                $
                {(
                  Number.parseFloat(quantity || "0") *
                  Number.parseFloat(price || "0")
                ).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Fee (0.1%):</span>
              <span className="text-foreground font-semibold">
                $
                {(
                  Number.parseFloat(quantity || "0") *
                  Number.parseFloat(price || "0") *
                  0.001
                ).toFixed(2)}
              </span>
            </div>
          </div>

          <Button
            onClick={handlePlaceOrder}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
            disabled={!quantity || !price}
          >
            Sell {asset}
          </Button>
        </TabsContent>
      </Tabs>

      <div className="mt-6 pt-6 border-t border-border">
        <div className="text-xs text-muted-foreground space-y-2">
          <div className="flex justify-between">
            <span>Available Balance:</span>
            <span className="text-foreground font-semibold">$10,000.00</span>
          </div>
          <div className="flex justify-between">
            <span>Buying Power:</span>
            <span className="text-foreground font-semibold">$50,000.00</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
