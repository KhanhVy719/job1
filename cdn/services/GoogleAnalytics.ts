// src/services/GoogleAnalytics.ts

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // Fix lỗi SSL gRPC/HTTP

import { EventEmitter } from "events";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import dotenv from "dotenv";

dotenv.config();

// --- 1. ĐỊNH NGHĨA CẤU TRÚC JSON CHO CHART ---

export interface ChartDataPoint {
  time: string;       // Nhãn thời gian (VD: "14:05")
  activeUsers: number;
}

export interface PieChartData {
  name: string;       // VD: Mobile, Desktop
  value: number;      // Số lượng
}

export interface ListData {
  id: string;         // Đường dẫn hoặc tên quốc gia
  name: string;       // Tên hiển thị
  value: number;      // Số lượng user
}

export interface DetailedTrafficData {
  timestamp: string;
  totalActiveUsers: number;
  
  // Dữ liệu cho các loại biểu đồ
  trafficTrend: ChartDataPoint[]; // Dùng cho AreaChart/LineChart (30 phút qua)
  deviceUsage: PieChartData[];    // Dùng cho PieChart
  topCountries: ListData[];       // Dùng cho BarChart hoặc List
  topPages: ListData[];           // Dùng cho List top view
}

class GoogleAnalyticsStream extends EventEmitter {
  private client: BetaAnalyticsDataClient;
  private propertyId: string;
  private intervalId: NodeJS.Timeout | null = null;
  public isRunning: boolean = false;
  
  // Cache data để gửi ngay khi client connect
  public lastData: DetailedTrafficData | null = null;

  constructor() {
    super();

    if (!process.env.GA_PROPERTY_ID) console.error("⚠️ GA_PROPERTY_ID is missing!");

    this.client = new BetaAnalyticsDataClient({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      fallback: 'rest' // Quan trọng: Tránh lỗi SSL
    });

    this.propertyId = process.env.GA_PROPERTY_ID || "";
  }

  /**
   * Helper: Tạo nhãn thời gian từ "số phút trước"
   * VD: 5 phút trước -> trả về "14:30"
   */
  private getTimeLabel(minutesAgo: number): string {
    const date = new Date();
    date.setMinutes(date.getMinutes() - minutesAgo);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  async fetchRealtimeData() {
    if (!this.propertyId) return;

    try {
      const propertyLink = `properties/${this.propertyId}`;

      // --- TẠO 5 REQUEST SONG SONG (ĐỂ VẼ FULL CHART) ---
      
      // 1. Tổng User hiện tại
      const reqTotal = this.client.runRealtimeReport({
        property: propertyLink,
        metrics: [{ name: 'activeUsers' }],
      });

      // 2. Biểu đồ xu hướng (Trend 30 phút qua)
      // Dimension 'minutesAgo' trả về: 00, 01, 02... (phút trước)
      const reqTrend = this.client.runRealtimeReport({
        property: propertyLink,
        dimensions: [{ name: 'minutesAgo' }], 
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ dimension: { dimensionName: 'minutesAgo' }, desc: true }] // Sắp xếp từ quá khứ -> hiện tại
      });

      // 3. Top Pages
      const reqPages = this.client.runRealtimeReport({
        property: propertyLink,
        dimensions: [{ name: 'unifiedScreenName' }], // Tên màn hình (dễ đọc hơn path)
        metrics: [{ name: 'activeUsers' }],
        limit: 10,
      });

      // 4. Quốc gia
      const reqCountries = this.client.runRealtimeReport({
        property: propertyLink,
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'activeUsers' }],
        limit: 10,
      });

      // 5. Thiết bị
      const reqDevices = this.client.runRealtimeReport({
        property: propertyLink,
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'activeUsers' }],
      });

      // --- CHỜ TẤT CẢ CÙNG XONG ---
      const [resTotal, resTrend, resPages, resCountries, resDevices] = await Promise.all([
        reqTotal, reqTrend, reqPages, reqCountries, reqDevices
      ]);

      // --- XỬ LÝ DỮ LIỆU ---

      // 1. Total
      const totalActiveUsers = parseInt(resTotal[0].rows?.[0]?.metricValues?.[0]?.value || "0");

      // 2. Trend Chart Data (Xử lý mảng cho LineChart)
      // Google trả về dạng: phút 29, phút 28... phút 00. Ta cần map ra giờ cụ thể.
      const trafficTrend: ChartDataPoint[] = (resTrend[0].rows || [])
        .map(row => {
          const minutesAgo = parseInt(row.dimensionValues?.[0]?.value || "0");
          return {
            time: this.getTimeLabel(minutesAgo),
            activeUsers: parseInt(row.metricValues?.[0]?.value || "0")
          };
        })
        .sort((a, b) => a.time.localeCompare(b.time)); // Đảm bảo sắp xếp đúng theo giờ tăng dần

      // 3. Top Pages List
      const topPages: ListData[] = (resPages[0].rows || []).map(row => ({
        id: row.dimensionValues?.[0]?.value || "",
        name: row.dimensionValues?.[0]?.value || "Unknown",
        value: parseInt(row.metricValues?.[0]?.value || "0")
      }));

      // 4. Top Countries List
      const topCountries: ListData[] = (resCountries[0].rows || []).map(row => ({
        id: row.dimensionValues?.[0]?.value || "",
        name: row.dimensionValues?.[0]?.value || "Unknown",
        value: parseInt(row.metricValues?.[0]?.value || "0")
      }));

      // 5. Device Pie Chart
      const deviceUsage: PieChartData[] = (resDevices[0].rows || []).map(row => ({
        name: row.dimensionValues?.[0]?.value || "Unknown",
        value: parseInt(row.metricValues?.[0]?.value || "0")
      }));

      // --- ĐÓNG GÓI JSON HOÀN CHỈNH ---
      const finalData: DetailedTrafficData = {
        timestamp: new Date().toISOString(),
        totalActiveUsers,
        trafficTrend,   // <-- Dữ liệu vẽ biểu đồ đường
        deviceUsage,    // <-- Dữ liệu vẽ biểu đồ tròn
        topCountries,   // <-- Dữ liệu vẽ bảng quốc gia
        topPages        // <-- Dữ liệu vẽ bảng Top view
      };

      this.lastData = finalData;
      
      // Log nhẹ để biết server đang sống
      console.log(`📊 [GA Stream] Users: ${totalActiveUsers} | Trend Points: ${trafficTrend.length}`);

      this.emit("traffic_update", finalData);

    } catch  {
    }
  }

  startPolling(intervalMs: number = 60000) {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log("🚀 Bắt đầu Stream Full Traffic Charts...");
    this.fetchRealtimeData();
    this.intervalId = setInterval(() => {
      this.fetchRealtimeData();
    }, intervalMs);
  }

  stopPolling() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }
}

export const gaStream = new GoogleAnalyticsStream();