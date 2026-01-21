"use client";

import { useState } from "react";
import { Settings, Sliders, Bell, Shield, Zap, Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useApp } from "@/lib/context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function SettingsPage() {
  const { settings, updateSettings } = useApp();
  const [localSettings, setLocalSettings] = useState(settings);

  const handleSave = () => {
    updateSettings(localSettings);
    toast.success("Settings saved!");
  };

  const handleReset = () => {
    const defaults = {
      slippagePercent: 15,
      buyAmountSOL: 0.1,
      autoBuy: false,
      autoSell: false,
      stopLoss: 20,
      takeProfit: 50,
      maxMarketCap: 100000,
      minLiquidity: 5000,
      antiRug: true,
    };
    setLocalSettings(defaults);
    updateSettings(defaults);
    toast.success("Settings reset to defaults");
  };

  return (
    <div className="flex flex-col h-full bg-[#0b0e11] overflow-y-auto">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-[#1e2329]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#1e2329] flex items-center justify-center">
            <Settings className="w-5 h-5 text-[#02c076]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Settings</h1>
            <p className="text-sm text-gray-500">Configure your trading preferences</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-6 space-y-6">
        {/* Trading Settings */}
        <SettingsSection icon={Sliders} title="Trading Settings">
          <SettingRow label="Default Slippage %" description="Maximum price movement tolerance">
            <div className="flex gap-1">
              {[5, 10, 15, 25, 50].map((val) => (
                <button
                  key={val}
                  onClick={() => setLocalSettings({ ...localSettings, slippagePercent: val })}
                  className={cn(
                    "px-3 py-1 text-xs font-bold rounded",
                    localSettings.slippagePercent === val
                      ? "bg-[#02c076] text-black"
                      : "bg-[#1e2329] text-gray-400 hover:text-white"
                  )}
                >
                  {val}%
                </button>
              ))}
            </div>
          </SettingRow>

          <SettingRow label="Default Buy Amount (SOL)" description="Default amount for quick buys">
            <Input
              type="number"
              value={localSettings.buyAmountSOL}
              onChange={(e) => setLocalSettings({ ...localSettings, buyAmountSOL: parseFloat(e.target.value) || 0 })}
              className="w-32 bg-[#1e2329] border-[#2b3139] h-9"
            />
          </SettingRow>

          <SettingRow label="Max Market Cap" description="Filter tokens above this market cap">
            <Input
              type="number"
              value={localSettings.maxMarketCap}
              onChange={(e) => setLocalSettings({ ...localSettings, maxMarketCap: parseFloat(e.target.value) || 0 })}
              className="w-32 bg-[#1e2329] border-[#2b3139] h-9"
            />
          </SettingRow>

          <SettingRow label="Min Liquidity" description="Filter tokens below this liquidity">
            <Input
              type="number"
              value={localSettings.minLiquidity}
              onChange={(e) => setLocalSettings({ ...localSettings, minLiquidity: parseFloat(e.target.value) || 0 })}
              className="w-32 bg-[#1e2329] border-[#2b3139] h-9"
            />
          </SettingRow>
        </SettingsSection>

        {/* Auto Trading */}
        <SettingsSection icon={Zap} title="Auto Trading">
          <SettingRow label="Auto Buy" description="Automatically buy new tokens matching filters">
            <Switch
              checked={localSettings.autoBuy}
              onCheckedChange={(checked) => setLocalSettings({ ...localSettings, autoBuy: checked })}
            />
          </SettingRow>

          <SettingRow label="Auto Sell" description="Automatically sell at take profit/stop loss">
            <Switch
              checked={localSettings.autoSell}
              onCheckedChange={(checked) => setLocalSettings({ ...localSettings, autoSell: checked })}
            />
          </SettingRow>

          <SettingRow label="Stop Loss %" description="Automatically sell if price drops by this %">
            <Input
              type="number"
              value={localSettings.stopLoss}
              onChange={(e) => setLocalSettings({ ...localSettings, stopLoss: parseFloat(e.target.value) || 0 })}
              className="w-24 bg-[#1e2329] border-[#2b3139] h-9"
              disabled={!localSettings.autoSell}
            />
          </SettingRow>

          <SettingRow label="Take Profit %" description="Automatically sell if price increases by this %">
            <Input
              type="number"
              value={localSettings.takeProfit}
              onChange={(e) => setLocalSettings({ ...localSettings, takeProfit: parseFloat(e.target.value) || 0 })}
              className="w-24 bg-[#1e2329] border-[#2b3139] h-9"
              disabled={!localSettings.autoSell}
            />
          </SettingRow>
        </SettingsSection>

        {/* Security */}
        <SettingsSection icon={Shield} title="Security">
          <SettingRow label="Anti-Rug Protection" description="Skip tokens with suspicious contract features">
            <Switch
              checked={localSettings.antiRug}
              onCheckedChange={(checked) => setLocalSettings({ ...localSettings, antiRug: checked })}
            />
          </SettingRow>
        </SettingsSection>

        {/* Platform Info */}
        <div className="bg-[#0d1117] border border-[#1e2329] rounded-lg p-4">
          <h3 className="text-sm font-bold text-white mb-2">Platform Fee</h3>
          <p className="text-xs text-gray-500">
            A 0.5% fee is applied to all trades. This helps maintain the platform and fund development.
          </p>
          <p className="text-xs text-gray-600 mt-2 font-mono break-all">
            Fee Wallet: 822nLMadem89qc3dyXrKkarrvKPxV1hZyDZokAQ3Z1FX
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button onClick={handleSave} className="bg-[#02c076] hover:bg-[#02a566] text-black font-bold">
            <Save className="w-4 h-4 mr-2" />
            Save Settings
          </Button>
          <Button onClick={handleReset} variant="outline" className="border-[#2b3139] text-gray-400 hover:text-white">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset Defaults
          </Button>
        </div>
      </div>
    </div>
  );
}

function SettingsSection({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0d1117] border border-[#1e2329] rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1e2329] bg-[#0b0e11]">
        <Icon className="w-4 h-4 text-[#02c076]" />
        <h2 className="text-sm font-bold text-white">{title}</h2>
      </div>
      <div className="divide-y divide-[#1e2329]">{children}</div>
    </div>
  );
}

function SettingRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      {children}
    </div>
  );
}
