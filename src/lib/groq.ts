import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export interface TokenAnalysis {
  summary: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  keyPoints: string[];
  tradingAdvice: string;
}

export interface NarrativeAnalysis {
  summary: string;
  trend: 'rising' | 'falling' | 'stable';
  catalysts: string[];
  risks: string[];
  opportunities: string[];
}

export async function analyzeToken(
  tokenData: {
    symbol: string;
    name: string;
    price: number;
    priceChange24h: number;
    volume24h: number;
    marketCap: number;
    holders?: number;
    topHolderPercent?: number;
  },
  tweets: { text: string; likes: number }[]
): Promise<TokenAnalysis> {
  const tweetSample = tweets.slice(0, 10).map(t => `- ${t.text.slice(0, 100)}`).join('\n');
  
  const prompt = `Analyze this Solana token for a crypto trader. Be concise and direct.

Token: ${tokenData.symbol} (${tokenData.name})
Price: $${tokenData.price.toFixed(6)}
24h Change: ${tokenData.priceChange24h > 0 ? '+' : ''}${tokenData.priceChange24h.toFixed(2)}%
24h Volume: $${(tokenData.volume24h / 1e6).toFixed(2)}M
Market Cap: $${(tokenData.marketCap / 1e6).toFixed(2)}M
${tokenData.holders ? `Holders: ${tokenData.holders.toLocaleString()}` : ''}
${tokenData.topHolderPercent ? `Top 10 Holders: ${tokenData.topHolderPercent}%` : ''}

Recent Twitter mentions:
${tweetSample || 'No recent tweets found'}

Respond in this exact JSON format:
{
  "summary": "2-3 sentence analysis",
  "sentiment": "bullish" | "bearish" | "neutral",
  "riskLevel": "low" | "medium" | "high" | "extreme",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "tradingAdvice": "brief actionable advice"
}`;

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a crypto trading analyst. Provide concise, data-driven analysis. Always respond with valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_completion_tokens: 500,
    });

    const content = response.choices[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as TokenAnalysis;
    }
    
    return {
      summary: 'Unable to generate analysis',
      sentiment: 'neutral',
      riskLevel: 'high',
      keyPoints: ['Insufficient data for analysis'],
      tradingAdvice: 'DYOR - Do your own research',
    };
  } catch (error) {
    console.error('Groq API error:', error);
    return {
      summary: 'Analysis unavailable',
      sentiment: 'neutral',
      riskLevel: 'high',
      keyPoints: ['API error occurred'],
      tradingAdvice: 'Try again later',
    };
  }
}

export async function analyzeNarrative(
  narrative: string,
  tokens: { symbol: string; priceChange24h: number; volume24h: number }[],
  tweets: { text: string; likes: number }[]
): Promise<NarrativeAnalysis> {
  const tokenSummary = tokens.slice(0, 5).map(t => 
    `${t.symbol}: ${t.priceChange24h > 0 ? '+' : ''}${t.priceChange24h.toFixed(1)}% ($${(t.volume24h / 1e6).toFixed(1)}M vol)`
  ).join(', ');
  
  const tweetSample = tweets.slice(0, 8).map(t => `- ${t.text.slice(0, 80)}`).join('\n');

  const prompt = `Analyze this crypto narrative trend. Be concise.

Narrative: ${narrative}
Top tokens: ${tokenSummary || 'None tracked'}

Recent Twitter sentiment:
${tweetSample || 'No recent tweets'}

Respond in this exact JSON format:
{
  "summary": "2-3 sentence narrative analysis",
  "trend": "rising" | "falling" | "stable",
  "catalysts": ["catalyst 1", "catalyst 2"],
  "risks": ["risk 1", "risk 2"],
  "opportunities": ["opportunity 1", "opportunity 2"]
}`;

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a crypto market analyst specializing in narrative trends. Provide data-driven insights. Always respond with valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_completion_tokens: 400,
    });

    const content = response.choices[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as NarrativeAnalysis;
    }
    
    return {
      summary: 'Unable to analyze narrative',
      trend: 'stable',
      catalysts: [],
      risks: ['Insufficient data'],
      opportunities: [],
    };
  } catch (error) {
    console.error('Groq API error:', error);
    return {
      summary: 'Analysis unavailable',
      trend: 'stable',
      catalysts: [],
      risks: ['API error'],
      opportunities: [],
    };
  }
}

export async function generateMarketPulse(
  topGainers: { symbol: string; change: number }[],
  topLosers: { symbol: string; change: number }[],
  totalVolume: number,
  dominantNarrative?: string
): Promise<string> {
  const prompt = `Generate a 2-sentence market pulse summary for Solana tokens.

Top gainers: ${topGainers.map(t => `${t.symbol} +${t.change.toFixed(0)}%`).join(', ')}
Top losers: ${topLosers.map(t => `${t.symbol} ${t.change.toFixed(0)}%`).join(', ')}
Total 24h volume: $${(totalVolume / 1e9).toFixed(2)}B
${dominantNarrative ? `Dominant narrative: ${dominantNarrative}` : ''}

Be direct, use crypto slang sparingly, focus on actionable insights.`;

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a crypto market commentator. Be concise and insightful.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.5,
      max_completion_tokens: 150,
    });

    return response.choices[0]?.message?.content || 'Market data unavailable';
  } catch (error) {
    console.error('Groq API error:', error);
    return 'Unable to generate market pulse';
  }
}

export async function streamAnalysis(
  prompt: string,
  onChunk: (chunk: string) => void
): Promise<string> {
  try {
    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a helpful crypto trading assistant.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.5,
      max_completion_tokens: 500,
      stream: true,
    });

    let full = '';
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      full += delta;
      onChunk(delta);
    }
    
    return full;
  } catch (error) {
    console.error('Groq streaming error:', error);
    return 'Analysis unavailable';
  }
}
