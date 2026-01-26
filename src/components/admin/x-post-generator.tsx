"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Twitter, 
  Download, 
  Copy, 
  Rocket, 
  Save, 
  Trash2, 
  Plus, 
  Loader2,
  CheckCircle,
  ChevronDown
} from "lucide-react";
import { toPng } from "html-to-image";
import { cn } from "@/lib/utils";

interface Template {
  id: string;
  name: string;
  content: string;
}

interface TokenInfo {
  symbol: string;
  name: string;
  logo_url: string;
  address: string;
  twitter_handle?: string;
}

interface XPostGeneratorProps {
  token: TokenInfo | null;
  onClose?: () => void;
}

const DEFAULT_CAPTIONS = [
  "💎 New Alpha Alert: ${symbol} is now officially featured on Flipfin.fun!\n\nReal-time analytics, institutional-grade charts, and lightning-fast execution.\n\nRide the wave: flipfin.fun/trade/${address} 🚀",
  "The smart money is moving to ${symbol}. Now trending and featured on Flipfin.fun 📈\n\nDon't trade blind. Use the best tools in the game.\n\nLFG: flipfin.fun/trade/${address} 🔥",
  "🚨 FEATURED LISTING: ${symbol} (${name}) has just hit the Flipfin.fun front page!\n\nSecurity verified. Liquidty locked. High conviction.\n\nTrade now: flipfin.fun/trade/${address} 💎",
  "Is ${symbol} the next 100x? 🚀\n\nWe've just featured it on Flipfin.fun for our pro trading community.\n\nAnalyze and swap with zero lag: flipfin.fun/trade/${address}",
  "Flipfin.fun Spotlight: ${symbol} 🔦\n\nOur scanners just flagged this as a top featured asset. Join the action before the crowd arrives.\n\nLink: flipfin.fun/trade/${address} ✨",
  "Wait... did you miss the ${symbol} pump? Don't miss the next one. \n\n${symbol} is now featured on Flipfin.fun with real-time tracking.\n\nTrade like a pro: flipfin.fun/trade/${address} 🚀🔥"
];

type ImageTemplateType = "classic" | "impact" | "split" | "hype" | "card";

export function XPostGenerator({ token, onClose }: XPostGeneratorProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [postContent, setPostContent] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [imageTemplate, setImageTemplate] = useState<ImageTemplateType>("classic");
  const [isFetchingHandle, setIsFetchingHandle] = useState(false);
  const [twitterHandle, setTwitterHandle] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (token) {
      const fetchHandle = async () => {
        setIsFetchingHandle(true);
        try {
          const res = await fetch(`/api/token?address=${token.address}`);
          const data = await res.json();
          if (data.success && data.data?.extensions?.twitter) {
            const handle = data.data.extensions.twitter.split("/").pop();
            setTwitterHandle(handle);
            updatePostWithHandle(handle);
          }
        } catch (err) {
          console.error("Fetch handle error:", err);
        } finally {
          setIsFetchingHandle(false);
        }
      };
      
      const updatePostWithHandle = (handle: string | null) => {
        const base = DEFAULT_CAPTIONS[Math.floor(Math.random() * DEFAULT_CAPTIONS.length)];
        let content = base.replace(/\$\{symbol\}/g, `$${token.symbol}`);
        content = content.replace(/\$\{name\}/g, token.name);
        content = content.replace(/\$\{address\}/g, token.address);
        
        if (handle) {
          content = content.replace(`$${token.symbol}`, `@${handle}`);
        }
        setPostContent(content);
      };

      updatePostWithHandle(null);
      fetchHandle();
    }
  }, [token]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/admin/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
        if (data.length > 0) {
          // Keep current content if already set, otherwise use first template
        }
      }
    } catch (err) {
      console.error("Fetch templates error:", err);
    }
  };

  const saveTemplate = async () => {
    if (!templateName || !postContent) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName,
          type: "x_post",
          content: postContent
        })
      });
      if (res.ok) {
        setTemplateName("");
        fetchTemplates();
        setShowTemplateManager(false);
      }
    } catch (err) {
      console.error("Save template error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    try {
      const res = await fetch(`/api/admin/templates?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchTemplates();
    } catch (err) {
      console.error("Delete template error:", err);
    }
  };

  const applyTemplate = (template: Template) => {
    if (!token) return;
    let content = template.content;
    content = content.replace(/\$\{symbol\}/g, token.symbol);
    content = content.replace(/\$\{name\}/g, token.name);
    content = content.replace(/\$\{address\}/g, token.address);
    setPostContent(content);
    setSelectedTemplateId(template.id);
  };

  const downloadImage = async () => {
    if (!previewRef.current || !token) return;
    setIsDownloading(true);
    try {
      const dataUrl = await toPng(previewRef.current, {
        quality: 1,
        pixelRatio: 2,
        cacheBust: true,
        includeQueryParams: true,
      });
      const link = document.createElement("a");
      link.download = `featured-${token.symbol.toLowerCase()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Download error:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const copyText = () => {
    navigator.clipboard.writeText(postContent);
    setIsCopying(true);
    setTimeout(() => setIsCopying(false), 2000);
  };

  if (!token) return null;

  return (
    <div className="bg-[#14191f] rounded-xl border border-[#1e2329] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
      <div className="p-4 border-b border-[#1e2329] flex items-center justify-between bg-[#1e2329]/50">
        <div className="flex items-center gap-2">
          <Twitter className="w-5 h-5 text-[#1DA1F2]" />
          <h3 className="font-bold text-white text-lg">X Post Generator</h3>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <Plus className="w-5 h-5 rotate-45" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
        {/* Preview Section */}
        <div className="p-6 bg-[#0b0e11] border-r border-[#1e2329]">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                Image Preview
                <span className="text-[10px] bg-[#1e2329] px-2 py-0.5 rounded text-gray-400 font-normal normal-case">1200x675</span>
              </p>
              <div className="flex gap-1">
                {(["classic", "impact", "split", "hype", "card"] as ImageTemplateType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setImageTemplate(t)}
                    className={cn(
                      "px-2 py-1 text-[10px] font-bold rounded uppercase transition-all",
                      imageTemplate === t 
                        ? "bg-[#02c076] text-black" 
                        : "bg-[#1e2329] text-gray-500 hover:text-white"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="relative group">
              <div 
                ref={previewRef}
                className="w-full aspect-[16/9] bg-[#0b0e11] relative overflow-hidden rounded-lg border border-[#1e2329] shadow-inner"
                style={{ minWidth: "480px" }}
              >
                {/* Background Styles based on template */}
                {imageTemplate === "classic" && (
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[120%] bg-[#02c076] rounded-full blur-[120px]" />
                    <div className="absolute bottom-[-30%] left-[-10%] w-[50%] h-[100%] bg-blue-500 rounded-full blur-[100px]" />
                  </div>
                )}

                {imageTemplate === "impact" && (
                  <div className="absolute inset-0">
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e11] to-transparent z-10" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[15rem] font-black text-white/[0.03] select-none">
                      {token.symbol}
                    </div>
                  </div>
                )}

                {imageTemplate === "split" && (
                  <div className="absolute inset-0 flex">
                    <div className="w-1/2 h-full bg-[#02c076]/5 border-r border-white/5" />
                    <div className="w-1/2 h-full bg-[#0b0e11]" />
                  </div>
                )}

                {imageTemplate === "hype" && (
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute inset-0 opacity-20">
                      {[...Array(20)].map((_, i) => (
                        <Rocket 
                          key={i} 
                          className="absolute text-[#02c076] animate-pulse" 
                          style={{
                            top: `${Math.random() * 100}%`,
                            left: `${Math.random() * 100}%`,
                            transform: `rotate(${Math.random() * 360}deg) scale(${0.5 + Math.random()})`,
                            opacity: 0.1 + Math.random() * 0.3
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {imageTemplate === "card" && (
                  <div className="absolute inset-0 bg-gradient-to-br from-[#14191f] to-[#0b0e11]">
                    <div className="absolute top-0 left-0 w-full h-full border-[16px] border-[#02c076]/5" />
                  </div>
                )}

                {/* Content Layers */}
                {imageTemplate === "classic" && (
                  <>
                    <div className="absolute top-6 left-8 flex items-center gap-2">
                      <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
                      <span className="text-2xl font-black text-white tracking-tighter">FLIPFIN</span>
                    </div>
                    <div className="absolute top-8 right-8 flex items-center gap-2 bg-[#02c076]/20 px-4 py-2 rounded-full border border-[#02c076]/30 backdrop-blur-sm">
                      <Rocket className="w-5 h-5 text-[#02c076] fill-[#02c076]/20" />
                      <span className="text-white font-black uppercase tracking-widest text-sm">Featured</span>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-between px-16">
                      <div className="relative">
                        <div className="absolute -inset-4 bg-[#02c076]/20 rounded-full blur-xl opacity-50" />
                        <div className="relative w-32 h-32 rounded-full border-4 border-[#02c076] p-1.5 bg-[#0b0e11]">
                          <img src={token.logo_url} alt={token.symbol} className="w-full h-full rounded-full object-cover" crossOrigin="anonymous" />
                        </div>
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#02c076] text-black text-[10px] font-black uppercase px-3 py-0.5 rounded-full whitespace-nowrap border-2 border-[#0b0e11]">
                          Featured Token
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <h2 className="text-7xl font-black text-white tracking-tighter leading-none mb-1">{token.symbol}</h2>
                        <div className="h-1.5 w-24 bg-[#02c076] rounded-full mb-4" />
                        <p className="text-2xl font-bold text-gray-400">{token.name}</p>
                      </div>
                    </div>
                  </>
                )}

                {imageTemplate === "impact" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-12">
                    <img src="/logo.png" alt="Logo" className="absolute top-8 left-1/2 -translate-x-1/2 w-8 h-8 opacity-50" />
                    <div className="relative mb-6">
                      <div className="absolute -inset-12 bg-[#02c076]/30 rounded-full blur-[60px]" />
                      <div className="relative w-40 h-40 rounded-full border-8 border-white p-2 bg-[#0b0e11] shadow-2xl">
                        <img src={token.logo_url} alt={token.symbol} className="w-full h-full rounded-full object-cover" />
                      </div>
                    </div>
                    <h2 className="text-8xl font-black text-white tracking-[0.2em] uppercase mb-2">{token.symbol}</h2>
                    <div className="bg-[#02c076] text-black font-black text-sm px-6 py-2 rounded-full uppercase tracking-[0.3em]">Featured on Flipfin.fun</div>
                  </div>
                )}

                {imageTemplate === "split" && (
                  <div className="absolute inset-0 flex">
                    <div className="w-1/2 h-full flex items-center justify-center p-12">
                      <div className="relative">
                        <div className="absolute inset-0 bg-[#02c076] rounded-full blur-[80px] opacity-20" />
                        <img src={token.logo_url} alt={token.symbol} className="relative w-48 h-48 rounded-full shadow-2xl border-4 border-white/10" />
                      </div>
                    </div>
                    <div className="w-1/2 h-full flex flex-col items-start justify-center p-12 bg-[#0b0e11]">
                      <div className="flex items-center gap-2 mb-8">
                        <img src="/logo.png" alt="Logo" className="w-6 h-6" />
                        <span className="text-lg font-black text-white opacity-50">FLIPFIN</span>
                      </div>
                      <div className="mb-2 bg-[#02c076] text-black text-[10px] font-bold px-3 py-1 rounded-sm uppercase tracking-widest">Initial Listing</div>
                      <h2 className="text-6xl font-black text-white mb-2">{token.symbol}</h2>
                      <p className="text-xl text-gray-500 font-medium mb-12">{token.name}</p>
                      <div className="mt-auto flex items-center gap-2 text-[#02c076] font-bold">
                        <Rocket className="w-4 h-4" />
                        <span className="text-xs uppercase tracking-widest">Featured Token</span>
                      </div>
                    </div>
                  </div>
                )}

                {imageTemplate === "hype" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="absolute top-8 left-8 flex items-center gap-2">
                      <img src="/logo.png" alt="Logo" className="w-8 h-8" />
                      <span className="text-xl font-black text-white">FLIPFIN</span>
                    </div>
                    <div className="text-center relative">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-[300px] h-[300px] bg-[#02c076]/20 rounded-full blur-[100px] animate-pulse" />
                      </div>
                      <h1 className="text-[120px] font-black text-white tracking-tighter italic leading-none mb-4 drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                        {token.symbol}
                      </h1>
                      <div className="inline-flex items-center gap-3 bg-white text-black px-8 py-3 rounded-full font-black text-2xl uppercase italic tracking-tighter skew-x-[-10deg] shadow-[10px_10px_0_rgba(2,192,118,1)]">
                        <Rocket className="w-6 h-6 fill-current" />
                        FEATURED
                      </div>
                    </div>
                    <div className="absolute bottom-8 right-8 text-right">
                      <p className="text-[#02c076] font-black text-2xl italic">LFG 🚀🚀🚀</p>
                      <p className="text-white/50 text-xs font-mono">FLIPFIN.FUN/TRADE/{token.address.slice(0, 8)}</p>
                    </div>
                  </div>
                )}

                {imageTemplate === "card" && (
                  <div className="absolute inset-0 flex items-center justify-center p-12">
                    <div className="w-full h-full bg-[#1e2329]/40 backdrop-blur-xl rounded-2xl border border-white/10 flex items-center p-8 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                         <img src="/logo.png" alt="Logo" className="w-24 h-24" />
                      </div>
                      <div className="relative z-10 flex items-center gap-8 w-full">
                        <div className="w-40 h-40 rounded-2xl bg-gradient-to-br from-[#02c076] to-[#00a86b] p-1 shadow-2xl">
                          <img src={token.logo_url} alt={token.symbol} className="w-full h-full rounded-2xl object-cover" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                             <div className="px-3 py-1 bg-[#02c076]/20 text-[#02c076] text-[10px] font-black rounded-md border border-[#02c076]/30 uppercase">Featured</div>
                             <span className="text-gray-500 font-mono text-xs">SOLANA NETWORK</span>
                          </div>
                          <h2 className="text-6xl font-black text-white tracking-tight mb-1">{token.symbol}</h2>
                          <p className="text-2xl text-gray-400 font-medium">{token.name}</p>
                          <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                               <div className="w-8 h-8 rounded-full bg-[#0b0e11] flex items-center justify-center">
                                  <img src="/logo.png" alt="Logo" className="w-4 h-4" />
                               </div>
                               <span className="text-sm font-bold text-white">Flipfin.fun</span>
                            </div>
                            <span className="text-[10px] text-gray-600 font-mono">{token.address}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}


            <button 
              onClick={downloadImage}
              disabled={isDownloading}
              className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-lg border border-white/20 transition-all opacity-0 group-hover:opacity-100 shadow-xl"
            >
              {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span className="text-xs font-bold">Download PNG</span>
              </button>
            </div>
          </div>
        </div>

        {/* Controls Section */}
        <div className="p-6 flex flex-col gap-6">
          {/* Template Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Templates</label>
              <button 
                onClick={() => setShowTemplateManager(!showTemplateManager)}
                className="text-[10px] font-bold text-[#02c076] hover:underline flex items-center gap-1"
              >
                {showTemplateManager ? "Close Manager" : "Manage Templates"}
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {templates.length === 0 ? (
                <div className="col-span-2 py-4 text-center border border-dashed border-[#1e2329] rounded-lg text-xs text-gray-500">
                  No saved templates
                </div>
              ) : templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => applyTemplate(t)}
                  className={cn(
                    "px-3 py-2 text-xs rounded-lg border transition-all text-left truncate font-medium",
                    selectedTemplateId === t.id 
                      ? "bg-[#02c076]/10 border-[#02c076] text-[#02c076]" 
                      : "bg-[#1e2329] border-[#2a3139] text-gray-400 hover:text-white hover:border-gray-600"
                  )}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Template Manager */}
          {showTemplateManager && (
            <div className="p-4 bg-[#1e2329]/50 rounded-xl border border-[#2a3139] space-y-4 animate-in slide-in-from-top-2 duration-200">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Save Current as Template</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Template Name (e.g. Daily Featured)"
                    className="flex-1 bg-[#0b0e11] border border-[#2a3139] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#02c076]"
                  />
                  <button
                    onClick={saveTemplate}
                    disabled={isSaving || !templateName || !postContent}
                    className="px-3 py-2 bg-[#02c076] text-black font-bold rounded-lg text-xs disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-gray-500">
                  Use <span className="text-[#02c076] font-mono">{"${symbol}"}</span>, 
                  <span className="text-[#02c076] font-mono">{"${name}"}</span>, 
                  <span className="text-[#02c076] font-mono">{"${address}"}</span> for dynamic values.
                </p>
              </div>

              {templates.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Existing Templates</label>
                  <div className="space-y-1 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                    {templates.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-2 bg-[#0b0e11] rounded-lg group">
                        <span className="text-xs text-gray-400">{t.name}</span>
                        <button 
                          onClick={() => deleteTemplate(t.id)}
                          className="p-1 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Post Content */}
          <div className="flex-1 flex flex-col gap-3 min-h-[200px]">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Post Content</label>
            <div className="flex-1 relative">
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                className="w-full h-full min-h-[150px] bg-[#0b0e11] border border-[#2a3139] rounded-xl p-4 text-sm text-white focus:outline-none focus:border-[#02c076] resize-none"
                placeholder="Write your X post here..."
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <span className={cn(
                  "text-[10px] font-bold",
                  postContent.length > 280 ? "text-red-400" : "text-gray-600"
                )}>
                  {postContent.length}/280
                </span>
                <button
                  onClick={copyText}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    isCopying ? "bg-green-500 text-black" : "bg-[#1e2329] text-gray-400 hover:text-white"
                  )}
                >
                  {isCopying ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#1e2329]">
             <button
              onClick={copyText}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-[#1e2329] text-white font-bold rounded-xl border border-[#2a3139] hover:bg-[#2a3139] transition-all"
            >
              <Copy className="w-4 h-4" />
              Copy Content
            </button>
            <button
              onClick={downloadImage}
              disabled={isDownloading}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-[#02c076] text-black font-bold rounded-xl hover:bg-[#02a566] transition-all disabled:opacity-50"
            >
              {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Save Image
            </button>
          </div>

          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(postContent)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-4 py-3 bg-[#1DA1F2] text-white font-bold rounded-xl hover:bg-[#1a91da] transition-all shadow-lg shadow-[#1DA1F2]/10"
          >
            <Twitter className="w-4 h-4 fill-current" />
            Open X (Twitter)
          </a>
        </div>
      </div>
    </div>
  );
}
