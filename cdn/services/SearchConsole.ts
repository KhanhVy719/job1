// src/services/SearchConsole.ts

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import { EventEmitter } from "events";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

export interface GSCQueryStats {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

// Thêm Interface cho biểu đồ
export interface GSCTrendPoint {
  date: string; // Ngày (YYYY-MM-DD)
  clicks: number;
  impressions: number;
}

export interface GSCData {
  lastUpdated: string;
  overview: {
    totalClicks: number;
    totalImpressions: number;
    avgCtr: number;
    avgPosition: number;
  };
  trendHistory: GSCTrendPoint[]; // <-- Dữ liệu mới để vẽ chart
  topQueries: GSCQueryStats[];
  topPages: any[];
}

class SearchConsoleStream extends EventEmitter {
  private auth: any;
  private siteUrl: string;
  private intervalId: NodeJS.Timeout | null = null;
  public lastData: GSCData | null = null;

  constructor() {
    super();
    this.auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
    });
    this.siteUrl = process.env.GSC_PROPERTY_URL || "";
  }

  private getDateRange() {
    const end = new Date();
    end.setDate(end.getDate() - 2);
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    };
  }

  async fetchSearchData() {
    if (!this.siteUrl) return;

    try {
      const webmasters = google.webmasters({ version: "v3", auth: this.auth });
      const { startDate, endDate } = this.getDateRange();

      // 1. Tổng quan & Từ khóa
      const reqQueries = webmasters.searchanalytics.query({
        siteUrl: this.siteUrl,
        requestBody: {
          startDate,
          endDate,
          dimensions: ["query"],
          rowLimit: 20,
        },
      });

      // 2. Tổng quan (Số liệu gốc)
      const reqOverview = webmasters.searchanalytics.query({
        siteUrl: this.siteUrl,
        requestBody: { startDate, endDate, dimensions: [] },
      });

      // 3. [MỚI] Lấy dữ liệu biểu đồ theo ngày (Date)
      const reqTrend = webmasters.searchanalytics.query({
        siteUrl: this.siteUrl,
        requestBody: {
          startDate,
          endDate,
          dimensions: ["date"], // Gom nhóm theo ngày để vẽ biểu đồ
        },
      });

      const [resQueries, resOverview, resTrend] = await Promise.all([
        reqQueries,
        reqOverview,
        reqTrend,
      ]);

      // --- XỬ LÝ DỮ LIỆU ---

      const overviewRow = resOverview.data.rows?.[0] || {};

      const topQueries = (resQueries.data.rows || []).map((row) => ({
        query: row.keys?.[0] || "Unknown",
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: parseFloat(((row.ctr || 0) * 100).toFixed(1)),
        position: parseFloat((row.position || 0).toFixed(1)),
      }));

      const trendHistory: GSCTrendPoint[] = (resTrend.data.rows || [])
        .map((row) => ({
          date: row.keys?.[0] || "",
          clicks: row.clicks || 0,
          impressions: row.impressions || 0,
          ctr: parseFloat(((row.ctr || 0) * 100).toFixed(2)), // Đổi sang %
          position: parseFloat((row.position || 0).toFixed(1)),
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const finalData: GSCData = {
        lastUpdated: new Date().toISOString(),
        overview: {
          totalClicks: overviewRow.clicks || 0,
          totalImpressions: overviewRow.impressions || 0,
          avgCtr: parseFloat(((overviewRow.ctr || 0) * 100).toFixed(2)),
          avgPosition: parseFloat((overviewRow.position || 0).toFixed(1)),
        },
        trendHistory, // <-- Có data này rồi mới vẽ được chart
        topQueries,
        topPages: [],
      };

      this.lastData = finalData;
      this.emit("gsc_update", finalData);
      console.log(`✅ GSC Updated: ${trendHistory.length} days of history`);
    } catch (error) {
      console.error("❌ Search Console Error:", error);
    }
  }

  startPolling(intervalMs: number = 3600000) {
    if (this.intervalId) return;
    this.fetchSearchData();
    this.intervalId = setInterval(() => this.fetchSearchData(), intervalMs);
  }
}

export const gscStream = new SearchConsoleStream();
