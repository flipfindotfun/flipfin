"use client";

import { useState, useEffect } from "react";
import { XIcon } from "@/components/icons";
import { Loader2, Heart, Repeat2, MessageCircle, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Tweet {
  id: string;
  text: string;
  author: {
    name: string;
    username: string;
    profileImageUrl?: string;
  };
  createdAt: string;
  metrics: {
    likes: number;
    retweets: number;
    replies: number;
  };
  media?: {
    type: 'photo' | 'video' | 'animated_gif';
    url?: string;
    previewUrl?: string;
  }[];
}

interface TwitterFeedProps {
  query?: string;
  tokenSymbol?: string;
  limit?: number;
  className?: string;
  title?: string;
}

export function TwitterFeed({ query, tokenSymbol, limit = 5, className, title = "Live Tweets" }: TwitterFeedProps) {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [sentiment, setSentiment] = useState<any>(null);
  const [selectedTweet, setSelectedTweet] = useState<Tweet | null>(null);

  const fetchTweets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (tokenSymbol) params.set("token", tokenSymbol);
      params.set("limit", limit.toString());
      
      const res = await fetch(`/api/twitter?${params}`);
      const data = await res.json();
      
      setTweets(data.tweets || []);
      setSentiment(data.analysis);
    } catch (err) {
      console.error("Failed to fetch tweets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTweets();
  }, [query, tokenSymbol]);

  const getSentimentColor = (s: string) => {
    if (s === "bullish") return "text-green-400 bg-green-400/10";
    if (s === "bearish") return "text-red-400 bg-red-400/10";
    return "text-yellow-400 bg-yellow-400/10";
  };

  const openTweet = (tweet: Tweet) => {
    window.open(`https://twitter.com/${tweet.author.username}/status/${tweet.id}`, "_blank");
  };

  const openProfile = (e: React.MouseEvent, username: string) => {
    e.stopPropagation();
    window.open(`https://twitter.com/${username}`, "_blank");
  };

  return (
    <div className={cn("bg-[#0d1117] border border-[#1e2329] rounded-xl overflow-hidden flex flex-col", className)}>
      <div className="flex items-center justify-between p-3 border-b border-[#1e2329]">
        <div className="flex items-center gap-2">
          <XIcon className="w-4 h-4 text-white" />
          <span className="text-sm font-medium text-white">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {sentiment && (
            <span className={cn("px-2 py-0.5 text-[10px] font-medium rounded-full capitalize", getSentimentColor(sentiment.sentiment))}>
              {sentiment.sentiment} ({sentiment.sentimentScore}%)
            </span>
          )}
          <button
            onClick={fetchTweets}
            disabled={loading}
            className="p-1 hover:bg-[#1e2329] rounded transition-colors"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-gray-400", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[600px]">
        {loading && tweets.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-white" />
          </div>
        ) : tweets.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No tweets found
          </div>
        ) : (
          <div className="divide-y divide-[#1e2329]">
            {tweets.map((tweet) => (
              <div 
                key={tweet.id} 
                className="p-3 hover:bg-[#1e2329]/70 transition-colors group relative"
              >
                <div className="flex items-start gap-3">
                  <div 
                    onClick={(e) => openProfile(e, tweet.author.username)}
                    className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <img
                      src={tweet.author.profileImageUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${tweet.author.username}&backgroundColor=1e2329`}
                      alt={tweet.author.name}
                      className="w-10 h-10 rounded-full object-cover border border-[#2b3139]"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${tweet.author.username}&backgroundColor=1e2329`;
                      }}
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span 
                        onClick={(e) => openProfile(e, tweet.author.username)}
                        className="text-sm font-bold text-white hover:underline cursor-pointer"
                      >
                        {tweet.author.name}
                      </span>
                      <span 
                        onClick={(e) => openProfile(e, tweet.author.username)}
                        className="text-xs text-gray-500 hover:underline cursor-pointer"
                      >
                        @{tweet.author.username}
                      </span>
                      <span className="text-xs text-gray-600">·</span>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(tweet.createdAt), { addSuffix: false })}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-200 mt-1 whitespace-pre-wrap break-words leading-relaxed">
                      {tweet.text}
                    </p>

                    {tweet.media && tweet.media.length > 0 && (
                      <div className="mt-3 rounded-xl overflow-hidden border border-[#1e2329]">
                        {tweet.media.map((m, idx) => (
                          <div key={idx} className="relative">
                            {m.type === 'photo' ? (
                              <img src={m.url} alt="Tweet media" className="w-full h-auto max-h-80 object-cover" />
                            ) : m.type === 'video' || m.type === 'animated_gif' ? (
                              <video src={m.url} controls={m.type === 'video'} autoPlay={m.type === 'animated_gif'} loop={m.type === 'animated_gif'} muted className="w-full h-auto max-h-80" />
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-5 mt-3">
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-xs">{tweet.metrics.replies}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <Repeat2 className="w-4 h-4" />
                        <span className="text-xs">{tweet.metrics.retweets}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <Heart className="w-4 h-4" />
                        <span className="text-xs">{tweet.metrics.likes}</span>
                      </div>
                      <button 
                        onClick={() => openTweet(tweet)}
                        className="ml-auto text-xs text-[#1DA1F2] hover:underline"
                      >
                        View on X
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {sentiment && sentiment.botRatio > 0 && (
        <div className="p-2 border-t border-[#1e2329] bg-[#1e2329]/50">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-gray-500">Bot Activity</span>
            <span className={cn(
              "font-medium",
              sentiment.botRatio > 30 ? "text-red-400" : sentiment.botRatio > 15 ? "text-yellow-400" : "text-green-400"
            )}>
              {sentiment.botRatio}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
