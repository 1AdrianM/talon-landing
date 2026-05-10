import type { APIRoute } from 'astro';

export const prerender = false;

export interface AnalyzeRequest {
  productUrl: string;
  competitors: string[];
}

export interface AnalyzeResponse {
  status: 'overpriced' | 'underpriced' | 'competitive';
  yourPrice: number;
  recommendedPrice: number;
  priceRange: { min: number; max: number };
  confidence: number;
  marketAverage: number;
  position: number;
  trend: 'lowering' | 'stable' | 'rising';
  consequence: string;
  recommendation: string;
  explanation: string;
  competitorPrices?: Record<string, number>;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as AnalyzeRequest;
    const { productUrl, competitors } = body;

    if (!productUrl) {
      return new Response(JSON.stringify({ error: 'Product URL is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const yourPrice = 99 + Math.random() * 50;
    const marketAverage = yourPrice * (0.85 + Math.random() * 0.3);
    const diff = ((yourPrice - marketAverage) / marketAverage) * 100;
    const confidence = 0.75 + Math.random() * 0.2;

    let status: AnalyzeResponse['status'];
    let consequence: string;
    let recommendation: string;
    let explanation: string;

    if (diff > 5) {
      status = 'overpriced';
      consequence = 'You may be losing conversions. Customers may choose cheaper alternatives.';
      recommendation = 'Lower your price by 5–10% to stay competitive';
      explanation = `Your product is priced ${Math.abs(Math.round(diff))}% above similar listings.`;
    } else if (diff < -5) {
      status = 'underpriced';
      consequence = 'You may be leaving revenue on the table.';
      recommendation = 'Consider increasing your price slightly';
      explanation = `Your product is priced ${Math.abs(Math.round(diff))}% below similar listings.`;
    } else {
      status = 'competitive';
      consequence = 'You are aligned with the market.';
      recommendation = 'No immediate action needed';
      explanation = 'Your price is aligned with the market average.';
    }

    const priceRange = {
      min: Math.round(marketAverage * 0.9 * 100) / 100,
      max: Math.round(marketAverage * 1.1 * 100) / 100
    };
    const recommendedPrice = Math.round(marketAverage * 100) / 100;

    const trends: AnalyzeResponse['trend'][] = ['lowering', 'stable', 'rising'];
    const trend = trends[Math.floor(Math.random() * trends.length)];

    const competitorPrices: Record<string, number> = {};
    competitors.forEach((url, i) => {
      const basePrice = marketAverage * (0.9 + Math.random() * 0.2);
      const domains = ['amazon.com', 'bestbuy.com', 'walmart.com', 'target.com', 'ebay.com'];
      competitorPrices[domains[i] || `competitor${i + 1}.com`] = Math.round(basePrice * 100) / 100;
    });

    const response: AnalyzeResponse = {
      status,
      yourPrice: Math.round(yourPrice * 100) / 100,
      recommendedPrice,
      priceRange,
      confidence: Math.round(confidence * 100) / 100,
      marketAverage: Math.round(marketAverage * 100) / 100,
      position: Math.round(Math.abs(diff) * 10) / 10,
      trend,
      consequence,
      recommendation,
      explanation,
      ...(competitors.length > 0 && { competitorPrices })
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};