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
}

interface XPostGeneratorProps {
  token: TokenInfo | null;
  onClose?: () => void;
}

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

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (token) {
      const defaultContent = `$${token.symbol} is now featured in Flipfin.fun 🚀\n\nTrade now at flipfin.fun/trade/${token.address}`;
      setPostContent(defaultContent);
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
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            Image Preview
            <span className="text-[10px] bg-[#1e2329] px-2 py-0.5 rounded text-gray-400 font-normal normal-case">1200x675 Aspect Ratio</span>
          </p>
          
          <div className="relative group">
            <div 
              ref={previewRef}
              className="w-full aspect-[16/9] bg-gradient-to-br from-[#0b0e11] via-[#14191f] to-[#0b0e11] relative overflow-hidden rounded-lg border border-[#1e2329] shadow-inner"
              style={{ minWidth: "480px" }}
            >
              {/* Decorative background elements */}
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[120%] bg-[#02c076] rounded-full blur-[120px]" />
                <div className="absolute bottom-[-30%] left-[-10%] w-[50%] h-[100%] bg-blue-500 rounded-full blur-[100px]" />
              </div>

              {/* Top Left: Logo */}
              <div className="absolute top-6 left-8 flex items-center gap-2">
                <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain drop-shadow-lg" />
                <span className="text-2xl font-black text-white tracking-tighter">FLIPFIN</span>
              </div>

              {/* Top Right: Featured Text */}
              <div className="absolute top-8 right-8 flex items-center gap-2 bg-[#02c076]/20 px-4 py-2 rounded-full border border-[#02c076]/30 backdrop-blur-sm">
                <Rocket className="w-5 h-5 text-[#02c076] fill-[#02c076]/20" />
                <span className="text-white font-black uppercase tracking-widest text-sm">Featured</span>
              </div>

              {/* Center Content */}
              <div className="absolute inset-0 flex items-center justify-between px-16">
                {/* Center Left: Token Featured */}
                <div className="relative group/token">
                  <div className="absolute -inset-4 bg-[#02c076]/20 rounded-full blur-xl opacity-50 group-hover/token:opacity-80 transition-opacity" />
                  <div className="relative w-32 h-32 rounded-full border-4 border-[#02c076] p-1.5 bg-[#0b0e11] shadow-[0_0_40px_rgba(2,192,118,0.3)]">
                    {token.logo_url ? (
                      <img src={token.logo_url} alt={token.symbol} className="w-full h-full rounded-full object-cover shadow-2xl" />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gradient-to-br from-[#02c076] to-[#00a86b] flex items-center justify-center text-4xl font-black text-black">
                        {token.symbol.slice(0, 1)}
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#02c076] text-black text-[10px] font-black uppercase px-3 py-0.5 rounded-full whitespace-nowrap border-2 border-[#0b0e11]">
                    Featured Token
                  </div>
                </div>

                {/* Center Right: Token Name */}
                <div className="text-right flex flex-col items-end">
                  <h2 className="text-7xl font-black text-white tracking-tighter leading-none mb-1 drop-shadow-2xl">
                    {token.symbol}
                  </h2>
                  <div className="h-1.5 w-24 bg-[#02c076] rounded-full mb-4 shadow-[0_0_15px_rgba(2,192,118,0.5)]" />
                  <p className="text-2xl font-bold text-gray-400 tracking-tight leading-none">
                    {token.name}
                  </p>
                </div>
              </div>

              {/* Bottom Decoration */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-gray-600 font-mono tracking-[0.2em] uppercase opacity-50">
                FLIPFIN.FUN // THE NEXT LEVEL OF TRADING
              </div>
            </div>

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
