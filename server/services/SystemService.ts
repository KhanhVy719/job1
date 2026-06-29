import si from "systeminformation";
import { EventEmitter } from "events";

// --- INTERFACE (GIỮ NGUYÊN) ---
export interface SystemHealthData {
  timestamp: Date;
  os: any;
  cpu: {
    manufacturer: string;
    brand: string;
    cores: number;
    speed: number;
    load: number;
    temperature: number;
  };
  memory: {
    total: string;
    used: string;
    free: string;
    percent: number;
  };
  gpu: any[];
  disk: any[];
  network: {
    interfaces: any[];
    traffic: {
      interface: string;
      rx_sec: number;
      tx_sec: number;
    }[];
    connections: {
      total: number;
      listeningPorts: number[];
      activeRemoteIPs: string[];
    };
  };
}

class SystemStreamService extends EventEmitter {
  private staticData: any = null;
  private cachedState: Partial<SystemHealthData> = {};
  private fastInterval: NodeJS.Timeout | null = null;
  private slowInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor() {
    super();
    // Khởi tạo state rỗng để tránh lỗi undefined khi chưa có data
    this.cachedState = {
      network: {
        interfaces: [],
        traffic: [],
        connections: { total: 0, listeningPorts: [], activeRemoteIPs: [] },
      },
      disk: [],
      gpu: [],
      memory: { total: "0 GB", used: "0 GB", free: "0 GB", percent: 0 },
      cpu: {
        manufacturer: "",
        brand: "",
        cores: 0,
        speed: 0,
        load: 0,
        temperature: 0,
      },
      os: {},
    };
  }

  // 1. Khởi tạo dữ liệu tĩnh (chạy 1 lần duy nhất)
  private async initStaticData() {
    if (this.staticData) return;
    const [osInfo, cpu, diskLayout, graphics] = await Promise.all([
      si.osInfo(),
      si.cpu(),
      si.diskLayout(),
      si.graphics(),
    ]);
    this.staticData = { osInfo, cpu, diskLayout, graphics };

    // Set static data vào cache ngay lập tức
    this.cachedState.os = {
      platform: osInfo.platform,
      distro: osInfo.distro,
      release: osInfo.release,
      hostname: osInfo.hostname,
    };
    this.cachedState.cpu!.manufacturer = cpu.manufacturer;
    this.cachedState.cpu!.brand = cpu.brand;
    this.cachedState.cpu!.cores = cpu.cores;
    this.cachedState.cpu!.speed = cpu.speed;
  }

  // 2. Loop Nhanh: CPU, RAM, Network Traffic (~800ms - 1000ms)
  // Giúp biểu đồ client mượt, không bị khựng
  private async updateFastMetrics() {
    try {
      const [currentLoad, cpuTemp, mem, networkStats] = await Promise.all([
        si.currentLoad(),
        si.cpuTemperature(),
        si.mem(),
        si.networkStats(),
      ]);

      // Update Cache
      this.cachedState.timestamp = new Date();
      this.cachedState.os!.uptime =
        (si.time().uptime / 3600).toFixed(2) + " hours";

      this.cachedState.cpu!.load = Number(currentLoad.currentLoad.toFixed(2));
      this.cachedState.cpu!.temperature = cpuTemp.main || -1;

      this.cachedState.memory = {
        total: (mem.total / 1024 / 1024 / 1024).toFixed(2) + " GB",
        used: (mem.active / 1024 / 1024 / 1024).toFixed(2) + " GB",
        free: (mem.available / 1024 / 1024 / 1024).toFixed(2) + " GB",
        percent: Number(((mem.active / mem.total) * 100).toFixed(2)),
      };

      this.cachedState.network!.traffic = networkStats.map((stat) => ({
        interface: stat.iface,
        rx_sec: stat.rx_sec,
        tx_sec: stat.tx_sec,
      }));

      // Emit ngay lập tức sau khi có dữ liệu nhanh
      this.emitData();
    } catch (err) {
      console.error("Fast Update Error:", err);
    }
  }

  // 3. Loop Chậm: Disk, Connections, GPU, Interface (~3000ms - 5000ms)
  // Những thứ này ít thay đổi hoặc rất nặng, không cần lấy mỗi giây
  private async updateSlowMetrics() {
    try {
      const [fsSize, networkInterfaces, networkConnections, gpuDynamic] =
        await Promise.all([
          si.fsSize(),
          si.networkInterfaces(),
          si.networkConnections(), // Nặng nhất
          si.graphics(), // Nặng nhì
        ]);

      // Xử lý Connections
      const connectionStats = networkConnections.reduce(
        (acc, conn) => {
          if (conn.state === "LISTEN") {
            const port = parseInt(conn.localPort);
            if (!isNaN(port)) acc.listeningPorts.add(port);
          } else if (
            conn.state === "ESTABLISHED" &&
            conn.peerAddress &&
            conn.peerAddress !== "127.0.0.1" &&
            conn.peerAddress !== "0.0.0.0" &&
            conn.peerAddress !== "::1"
          ) {
            acc.activeRemoteIPs.add(conn.peerAddress);
          }
          return acc;
        },
        {
          listeningPorts: new Set<number>(),
          activeRemoteIPs: new Set<string>(),
        }
      );

      // Update Cache
      this.cachedState.disk = fsSize.map((d) => ({
        mount: d.mount,
        type: d.type,
        size: (d.size / 1024 / 1024 / 1024).toFixed(2) + " GB",
        used: (d.used / 1024 / 1024 / 1024).toFixed(2) + " GB",
        usePercent: d.use.toFixed(2) + "%",
      }));

      this.cachedState.network!.interfaces = (
        Array.isArray(networkInterfaces)
          ? networkInterfaces
          : [networkInterfaces]
      ).map((iface: any) => ({
        iface: iface.iface,
        ip4: iface.ip4,
        mac: iface.mac,
        type: iface.type,
      }));

      this.cachedState.network!.connections = {
        total: networkConnections.length,
        listeningPorts: Array.from(connectionStats.listeningPorts),
        activeRemoteIPs: Array.from(connectionStats.activeRemoteIPs),
      };

      this.cachedState.gpu = gpuDynamic.controllers.map((g) => ({
        model: g.model,
        vram: g.vram,
        temperature: g.temperatureGpu || "N/A",
        utilization: g.utilizationGpu || "N/A",
      }));

      // Emit sau khi update dữ liệu chậm (để client update list connection/disk)
      this.emitData();
    } catch (err) {
      console.error("Slow Update Error:", err);
    }
  }

  private emitData() {
    if (this.isRunning) {
      // Clone object để tránh reference issue khi gửi qua socket
      this.emit("data", { ...this.cachedState } as SystemHealthData);
    }
  }

  // --- PUBLIC METHODS ---

  public async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // 1. Đảm bảo có dữ liệu tĩnh trước
    await this.initStaticData();

    // 2. Chạy lần đầu tiên ngay lập tức
    await Promise.all([this.updateFastMetrics(), this.updateSlowMetrics()]);

    // 3. Thiết lập Intervals
    // Fast Loop: 1 giây (Cho biểu đồ)
    this.fastInterval = setInterval(() => this.updateFastMetrics(), 1000);

    // Slow Loop: 5 giây (Cho thông tin nặng)
    this.slowInterval = setInterval(() => this.updateSlowMetrics(), 5000);
  }
  public getCachedData() {
    // Trả về dữ liệu đang lưu trong RAM của server
    return this.cachedState;
  }

  // Thêm helper để check xem có đang chạy không
  public isServiceRunning() {
    return this.isRunning;
  }
  public stop() {
    this.isRunning = false;
    if (this.fastInterval) clearInterval(this.fastInterval);
    if (this.slowInterval) clearInterval(this.slowInterval);
    this.fastInterval = null;
    this.slowInterval = null;
  }
}

// Export singleton
export const systemStream = new SystemStreamService();
