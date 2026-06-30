import si from "systeminformation";
import { EventEmitter } from "events";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

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

export interface MonitorNodeSnapshot {
  id: string;
  label: string;
  role?: string;
  type: "local" | "ssh";
  host?: string;
  status: "online" | "offline";
  lastSeen?: string;
  latencyMs?: number;
  error?: string;
  stats?: SystemHealthData;
}

interface MonitorNodeConfig {
  id: string;
  label: string;
  role?: string;
  type: "local" | "ssh";
  host?: string;
  port: number;
  user?: string;
  password?: string;
  keyPath?: string;
}

type RemoteTrafficBytes = {
  interface: string;
  rxBytes: number;
  txBytes: number;
};

const SSH_METRICS_SCRIPT = String.raw`python3 - <<'PY'
import json, os, socket, subprocess, time

def read_cpu_stat():
    with open("/proc/stat", "r") as f:
        parts = f.readline().split()[1:]
    return [int(x) for x in parts]

def cpu_percent():
    first = read_cpu_stat()
    time.sleep(0.25)
    second = read_cpu_stat()
    total_delta = sum(second) - sum(first)
    idle_delta = (second[3] + second[4]) - (first[3] + first[4])
    if total_delta <= 0:
        return 0
    return round((1 - (idle_delta / total_delta)) * 100, 2)

def meminfo():
    data = {}
    with open("/proc/meminfo", "r") as f:
        for line in f:
            key, value = line.split(":", 1)
            data[key] = int(value.strip().split()[0]) * 1024
    total = data.get("MemTotal", 0)
    available = data.get("MemAvailable", 0)
    used = max(total - available, 0)
    return {
        "total": total,
        "used": used,
        "free": available,
        "percent": round((used / total) * 100, 2) if total else 0,
    }

def os_info():
    distro = "Linux"
    try:
        with open("/etc/os-release", "r") as f:
            for line in f:
                if line.startswith("PRETTY_NAME="):
                    distro = line.split("=", 1)[1].strip().strip('"')
                    break
    except Exception:
        pass
    release = subprocess.check_output(["uname", "-r"], text=True).strip()
    uptime = 0
    try:
        with open("/proc/uptime", "r") as f:
            uptime = float(f.readline().split()[0])
    except Exception:
        pass
    return {
        "platform": "linux",
        "distro": distro,
        "release": release,
        "hostname": socket.gethostname(),
        "uptime": f"{uptime / 3600:.2f} hours",
    }

def cpu_info(load):
    model = ""
    manufacturer = ""
    speed = 0
    try:
        with open("/proc/cpuinfo", "r") as f:
            for line in f:
                if line.startswith("vendor_id") and not manufacturer:
                    manufacturer = line.split(":", 1)[1].strip()
                if line.startswith("model name") and not model:
                    model = line.split(":", 1)[1].strip()
                if line.startswith("cpu MHz") and not speed:
                    speed = round(float(line.split(":", 1)[1].strip()) / 1000, 2)
                if model and manufacturer and speed:
                    break
    except Exception:
        pass
    return {
        "manufacturer": manufacturer,
        "brand": model,
        "cores": os.cpu_count() or 0,
        "speed": speed,
        "load": load,
        "temperature": -1,
    }

def disks():
    rows = []
    try:
        output = subprocess.check_output(["df", "-PT", "-B1"], text=True)
        for line in output.splitlines()[1:]:
            parts = line.split()
            if len(parts) < 7:
                continue
            _, fs_type, size, used, _, use_percent, mount = parts[:7]
            if fs_type in ("tmpfs", "devtmpfs", "squashfs", "overlay"):
                continue
            rows.append({
                "mount": mount,
                "type": fs_type,
                "sizeBytes": int(size),
                "usedBytes": int(used),
                "usePercent": use_percent,
            })
    except Exception:
        pass
    return rows

def net_bytes():
    rows = []
    try:
        with open("/proc/net/dev", "r") as f:
            for line in f.readlines()[2:]:
                if ":" not in line:
                    continue
                iface, rest = line.split(":", 1)
                iface = iface.strip()
                if iface == "lo":
                    continue
                values = rest.split()
                rows.append({
                    "interface": iface,
                    "rxBytes": int(values[0]),
                    "txBytes": int(values[8]),
                })
    except Exception:
        pass
    return rows

def net_interfaces():
    rows = []
    base = "/sys/class/net"
    try:
        for iface in os.listdir(base):
            if iface == "lo":
                continue
            mac = ""
            try:
                with open(os.path.join(base, iface, "address"), "r") as f:
                    mac = f.read().strip()
            except Exception:
                pass
            rows.append({"iface": iface, "ip4": "", "mac": mac, "type": "wired"})
    except Exception:
        pass
    return rows

def connections():
    total = 0
    listening = set()
    remotes = set()
    try:
        output = subprocess.check_output(["ss", "-tuna"], text=True, stderr=subprocess.DEVNULL)
        for line in output.splitlines()[1:]:
            parts = line.split()
            if len(parts) < 5:
                continue
            state = parts[0].upper()
            total += 1
            local_addr = parts[4]
            peer_addr = parts[5] if len(parts) > 5 else ""
            if state == "LISTEN" and ":" in local_addr:
                port = local_addr.rsplit(":", 1)[-1]
                if port.isdigit():
                    listening.add(int(port))
            if state in ("ESTAB", "ESTABLISHED") and peer_addr and ":" in peer_addr:
                ip = peer_addr.rsplit(":", 1)[0].strip("[]")
                if ip not in ("127.0.0.1", "0.0.0.0", "::1", "*"):
                    remotes.add(ip)
    except Exception:
        pass
    return {
        "total": total,
        "listeningPorts": sorted(listening),
        "activeRemoteIPs": sorted(remotes),
    }

load = cpu_percent()
payload = {
    "timestamp": time.time(),
    "os": os_info(),
    "cpu": cpu_info(load),
    "memory": meminfo(),
    "disk": disks(),
    "network": {
        "interfaces": net_interfaces(),
        "trafficBytes": net_bytes(),
        "connections": connections(),
    },
    "gpu": [],
}
print(json.dumps(payload, separators=(",", ":")))
PY`;

const formatGb = (bytes: number) => `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;

const parseNodeKey = (value: string) =>
  value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "_");

const toNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

class SystemStreamService extends EventEmitter {
  private staticData: any = null;
  private cachedState: Partial<SystemHealthData> = {};
  private monitorNodes: MonitorNodeConfig[] | null = null;
  private nodeSnapshots: MonitorNodeSnapshot[] = [];
  private previousRemoteTraffic = new Map<
    string,
    { timestamp: number; traffic: RemoteTrafficBytes[] }
  >();
  private fastInterval: NodeJS.Timeout | null = null;
  private slowInterval: NodeJS.Timeout | null = null;
  private nodeInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private isUpdatingNodes = false;

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

  private getMonitorNodes(): MonitorNodeConfig[] {
    if (this.monitorNodes) return this.monitorNodes;

    const ids = (process.env.MONITOR_NODES || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (!ids.length) {
      this.monitorNodes = [
        {
          id: "local",
          label: process.env.MONITOR_LOCAL_LABEL || "Local server",
          role: process.env.MONITOR_LOCAL_ROLE || "server",
          type: "local",
          port: 22,
        },
      ];
      return this.monitorNodes;
    }

    this.monitorNodes = ids
      .map((id) => {
        const key = parseNodeKey(id);
        const type = (process.env[`MONITOR_NODE_${key}_TYPE`] || "ssh").toLowerCase() === "local" ? "local" : "ssh";
        const host = process.env[`MONITOR_NODE_${key}_HOST`];
        return {
          id,
          label: process.env[`MONITOR_NODE_${key}_LABEL`] || id,
          role: process.env[`MONITOR_NODE_${key}_ROLE`] || "",
          type,
          host,
          port: toNumber(process.env[`MONITOR_NODE_${key}_PORT`], 22),
          user: process.env[`MONITOR_NODE_${key}_USER`] || "root",
          password: process.env[`MONITOR_NODE_${key}_PASSWORD`],
          keyPath: process.env[`MONITOR_NODE_${key}_KEY_PATH`],
        } as MonitorNodeConfig;
      })
      .filter((node) => node.type === "local" || Boolean(node.host));

    if (!this.monitorNodes.length) {
      this.monitorNodes = [
        {
          id: "local",
          label: "Local server",
          role: "server",
          type: "local",
          port: 22,
        },
      ];
    }

    return this.monitorNodes;
  }

  private getLocalNodeSnapshot(config?: MonitorNodeConfig): MonitorNodeSnapshot {
    return {
      id: config?.id || "local",
      label: config?.label || process.env.MONITOR_LOCAL_LABEL || "Local server",
      role: config?.role || process.env.MONITOR_LOCAL_ROLE || "server",
      type: "local",
      host: config?.host || this.cachedState.os?.hostname,
      status: "online",
      lastSeen: new Date().toISOString(),
      latencyMs: 0,
      stats: this.cachedState as SystemHealthData,
    };
  }

  private normalizeRemoteStats(nodeId: string, raw: any): SystemHealthData {
    const now = Date.now();
    const previous = this.previousRemoteTraffic.get(nodeId);
    const rawTraffic: RemoteTrafficBytes[] = Array.isArray(raw?.network?.trafficBytes)
      ? raw.network.trafficBytes
      : [];
    const elapsedSeconds = previous
      ? Math.max((now - previous.timestamp) / 1000, 1)
      : 1;

    const traffic = rawTraffic.map((current) => {
      const prev = previous?.traffic.find((item) => item.interface === current.interface);
      return {
        interface: current.interface,
        rx_sec: prev ? Math.max(0, Math.round((current.rxBytes - prev.rxBytes) / elapsedSeconds)) : 0,
        tx_sec: prev ? Math.max(0, Math.round((current.txBytes - prev.txBytes) / elapsedSeconds)) : 0,
      };
    });

    this.previousRemoteTraffic.set(nodeId, {
      timestamp: now,
      traffic: rawTraffic,
    });

    const memory = raw?.memory || {};
    const disks = Array.isArray(raw?.disk) ? raw.disk : [];

    return {
      timestamp: new Date(),
      os: raw?.os || {},
      cpu: raw?.cpu || {
        manufacturer: "",
        brand: "",
        cores: 0,
        speed: 0,
        load: 0,
        temperature: -1,
      },
      memory: {
        total: formatGb(Number(memory.total || 0)),
        used: formatGb(Number(memory.used || 0)),
        free: formatGb(Number(memory.free || 0)),
        percent: Number(memory.percent || 0),
      },
      disk: disks.map((disk: any) => ({
        mount: disk.mount,
        type: disk.type,
        size: formatGb(Number(disk.sizeBytes || 0)),
        used: formatGb(Number(disk.usedBytes || 0)),
        usePercent: disk.usePercent || "0%",
      })),
      gpu: Array.isArray(raw?.gpu) ? raw.gpu : [],
      network: {
        interfaces: Array.isArray(raw?.network?.interfaces) ? raw.network.interfaces : [],
        traffic,
        connections: raw?.network?.connections || {
          total: 0,
          listeningPorts: [],
          activeRemoteIPs: [],
        },
      },
    };
  }

  private async collectSshNode(config: MonitorNodeConfig): Promise<SystemHealthData> {
    if (!config.host) throw new Error("Missing SSH host");

    const sshArgs = [
      "-o",
      "StrictHostKeyChecking=no",
      "-o",
      "UserKnownHostsFile=/dev/null",
      "-o",
      "ConnectTimeout=4",
      "-p",
      String(config.port || 22),
    ];

    if (config.keyPath) {
      sshArgs.push("-i", config.keyPath);
    }

    sshArgs.push(`${config.user || "root"}@${config.host}`, SSH_METRICS_SCRIPT);

    const command = config.password ? "sshpass" : "ssh";
    const args = config.password ? ["-e", "ssh", ...sshArgs] : sshArgs;
    const { stdout } = await execFileAsync(command, args, {
      timeout: toNumber(process.env.MONITOR_SSH_TIMEOUT_MS, 8000),
      maxBuffer: 1024 * 1024,
      env: {
        ...process.env,
        SSHPASS: config.password || "",
      },
    });

    const raw = JSON.parse(String(stdout).trim());
    return this.normalizeRemoteStats(config.id, raw);
  }

  private async updateNodeMetrics() {
    if (this.isUpdatingNodes) return;
    this.isUpdatingNodes = true;

    try {
      const nodes = this.getMonitorNodes();
      const snapshots = await Promise.all(
        nodes.map(async (node) => {
          const startedAt = Date.now();
          try {
            const stats =
              node.type === "local"
                ? (this.cachedState as SystemHealthData)
                : await this.collectSshNode(node);
            return {
              id: node.id,
              label: node.label,
              role: node.role,
              type: node.type,
              host: node.host || stats.os?.hostname,
              status: "online" as const,
              lastSeen: new Date().toISOString(),
              latencyMs: Date.now() - startedAt,
              stats,
            };
          } catch (error) {
            return {
              id: node.id,
              label: node.label,
              role: node.role,
              type: node.type,
              host: node.host,
              status: "offline" as const,
              lastSeen: new Date().toISOString(),
              latencyMs: Date.now() - startedAt,
              error: error instanceof Error ? error.message : "Unknown monitor error",
            };
          }
        })
      );

      this.nodeSnapshots = snapshots;
      this.emitData();
    } finally {
      this.isUpdatingNodes = false;
    }
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
      const nodes = this.nodeSnapshots.length
        ? this.nodeSnapshots
        : [this.getLocalNodeSnapshot()];
      this.emit("data", {
        ...this.cachedState,
        nodes,
      } as SystemHealthData & { nodes: MonitorNodeSnapshot[] });
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
    await this.updateNodeMetrics();

    // 3. Thiết lập Intervals
    // Fast Loop: 1 giây (Cho biểu đồ)
    this.fastInterval = setInterval(() => this.updateFastMetrics(), 1000);

    // Slow Loop: 5 giây (Cho thông tin nặng)
    this.slowInterval = setInterval(() => this.updateSlowMetrics(), 5000);

    const nodeIntervalMs = Math.max(
      3000,
      toNumber(process.env.MONITOR_NODE_INTERVAL_MS, 5000)
    );
    this.nodeInterval = setInterval(() => this.updateNodeMetrics(), nodeIntervalMs);
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
    if (this.nodeInterval) clearInterval(this.nodeInterval);
    this.fastInterval = null;
    this.slowInterval = null;
    this.nodeInterval = null;
  }
}

// Export singleton
export const systemStream = new SystemStreamService();
