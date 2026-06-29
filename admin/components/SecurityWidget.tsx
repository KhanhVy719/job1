import React, { useEffect, useState } from 'react';
import Head from 'next/head';
// --- THAY ĐỔI 1: Import socket trực tiếp từ file singleton ---
// Hãy chắc chắn đường dẫn đúng với nơi bạn tạo file ở bước 1 (vd: @/lib/socket hoặc @/utils/socket)
import { socket } from "@/utils/socket";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import {
  HardDrive, Cpu, MemoryStick, CircuitBoard,
  Activity, ArrowDown, ArrowUp, Server, Wifi,
  Globe, Shield, Terminal
} from 'lucide-react';
import clsx from 'clsx';

// --- Types ---
interface SystemStats {
  timestamp: string;
  os?: {
    uptime?: string;
    hostname?: string;
    distro?: string;
    platform?: string;
    release?: string
  };
  cpu?: {
    manufacturer: string;
    brand: string;
    speed: number;
    load: number;
    temperature: number;
    cores: number
  };
  memory?: {
    total?: string;
    used?: string;
    free?: string;
    percent?: number;
  };
  gpu?: {
    model?: string;
    vram?: number;
    temperature?: number | string;
    utilization?: number | string
  }[];
  disk: {
    mount?: string;
    type?: string;
    size?: string;
    used?: string;
    usePercent?: string
  }[];
  network?: {
    interfaces?: { iface?: string; ip4?: string; mac?: string; type?: string }[];
    traffic?: { rx_sec?: number; tx_sec?: number }[];
    connections?: {
      total?: number;
      activeRemoteIPs?: string[];
      listeningPorts?: number[];
    };
  };
}

// Interface cho cấu trúc lưu Cache
interface CachedData {
  lastStats: SystemStats;
  trafficHistory: any[];
  cpuHistory: any[];
  savedAt: number;
}

// --- Helper Functions ---
const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const parseNumber = (val: number | string | undefined): number => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val) || 0;
  return 0;
};

const parseSizeString = (str?: string): number => {
  if (!str) return 0;
  return parseFloat(str.replace(/[^\d.]/g, '')) || 0;
};

// --- Constants ---
const CACHE_KEY = "rophim_system_stats_cache";
const MAX_HISTORY_POINTS = 50;

const HomePage: React.FC = () => {
  // --- THAY ĐỔI 2: Xóa dòng "const socket = useSocket();" để tránh xung đột tên biến ---

  const [stats, setStats] = useState<SystemStats | null>(null);
  const [trafficHistory, setTrafficHistory] = useState<any[]>([]);
  const [cpuHistory, setCpuHistory] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(socket.connected); // Lấy trạng thái ban đầu từ socket

  // 1. Effect: Load Cache khi vào trang
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cachedRaw = localStorage.getItem(CACHE_KEY);
      if (cachedRaw) {
        try {
          const cached: CachedData = JSON.parse(cachedRaw);
          const now = Date.now();
          // Cache hết hạn sau 1 tiếng
          if (now - cached.savedAt < 1000 * 60 * 60) {
            setStats(cached.lastStats);
            setTrafficHistory(cached.trafficHistory || []);
            setCpuHistory(cached.cpuHistory || []);
          }
        } catch (error) {
          console.error("Lỗi đọc cache:", error);
          localStorage.removeItem(CACHE_KEY);
        }
      }
    }
  }, []);

  // 2. Effect: Auto Save Cache
  useEffect(() => {
    if (stats && typeof window !== 'undefined') {
      const dataToSave: CachedData = {
        lastStats: stats,
        trafficHistory: trafficHistory,
        cpuHistory: cpuHistory,
        savedAt: Date.now()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(dataToSave));
    }
  }, [stats, trafficHistory, cpuHistory]);

useEffect(() => {
    // Luôn set true vì _app.tsx đã lo việc connect
    setIsConnected(socket.connected);

    const handleStats = (data: SystemStats) => {
      setStats(data);
      setIsConnected(true);

      const time = new Date().toLocaleTimeString('vi-VN', { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const rx = data.network?.traffic?.[0]?.rx_sec || 0;
      const tx = data.network?.traffic?.[0]?.tx_sec || 0;
      const cpuLoad = data.cpu?.load || 0;

      setTrafficHistory(prev => {
        const newData = [...prev, { time, rx, tx }];
        return newData.slice(-MAX_HISTORY_POINTS);
      });

      setCpuHistory(prev => {
        const newData = [...prev, { time, load: cpuLoad }];
        return newData.slice(-MAX_HISTORY_POINTS);
      });
    };
    
    const onDisconnect = () => setIsConnected(false);
    const onConnect = () => setIsConnected(true);

    // Lắng nghe sự kiện
    socket.on("admin:system_stats", handleStats);
    socket.on("disconnect", onDisconnect);
    socket.on("connect", onConnect);

    // --- CLEANUP QUAN TRỌNG ---
    return () => {
      // Chỉ hủy lắng nghe sự kiện để tránh lỗi React khi component đã hủy
      socket.off("admin:system_stats", handleStats);
      socket.off("disconnect", onDisconnect);
      socket.off("connect", onConnect);

      // ❌ TUYỆT ĐỐI KHÔNG GỌI DÒNG NÀY:
      // socket.emit("admin:stop_monitoring"); 
      // socket.disconnect();
      
      // => Kết quả: Khi bạn rời trang này, Socket vẫn nhận data ngầm bên dưới
    };
  }, []);
  // Loading State
  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-zinc-200 border-t-yellow-500 rounded-full animate-spin"></div>
          <p className="text-zinc-500 font-medium text-sm animate-pulse">Đang tải dữ liệu hệ thống...</p>
        </div>
      </div>
    );
  }

  // --- Calculations ---
  const totalDiskSizeVal = stats.disk?.reduce((acc, d) => acc + parseSizeString(d.size), 0) || 0;
  const totalDiskUsedVal = stats.disk?.reduce((acc, d) => acc + parseSizeString(d.used), 0) || 0;
  const totalDiskPercent = totalDiskSizeVal > 0 ? (totalDiskUsedVal / totalDiskSizeVal) * 100 : 0;

  const firstGpu = stats.gpu && stats.gpu.length > 0 ? stats.gpu[0] : null;

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-4 md:p-8 font-sans text-zinc-800">
      <Head>
        <title>System Monitor | Rophim Manager</title>
      </Head>

      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
              <Server className="text-yellow-500" />
              {stats.os?.hostname || "Unknown Host"}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-zinc-500">
              <span className="bg-zinc-100 px-2 py-1 rounded text-zinc-700 font-medium">{stats.os?.distro || "Linux"}</span>
              <span className="hidden md:inline">•</span>
              <span>Kernel: {stats.os?.release || "N/A"}</span>
              <span className="hidden md:inline">•</span>
              <span className="flex items-center gap-1">
                <Activity size={14} /> Uptime: {stats.os?.uptime || "0h"}
              </span>
            </div>
          </div>

          <div className="mt-4 md:mt-0 flex items-center gap-3">
            <div className={clsx("flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-colors",
              isConnected ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-red-50 border-red-100 text-red-700"
            )}>
              <div className="relative flex h-2.5 w-2.5">
                {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                <span className={clsx("relative inline-flex rounded-full h-2.5 w-2.5", isConnected ? "bg-emerald-500" : "bg-red-500")}></span>
              </div>
              {isConnected ? "Live Connected" : "Disconnected"}
            </div>
          </div>
        </div>

        {/* --- OVERVIEW CARDS --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

          {/* Card: Disk */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:border-yellow-400 transition-colors group">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Lưu trữ tổng</p>
                <h3 className="text-2xl font-bold text-zinc-900 mt-1">{totalDiskSizeVal.toFixed(0)} GB</h3>
              </div>
              <div className="p-2 bg-zinc-50 text-zinc-400 group-hover:text-yellow-500 group-hover:bg-yellow-50 rounded-lg transition-colors">
                <HardDrive size={24} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-zinc-500">Đã dùng: {totalDiskUsedVal.toFixed(0)} GB</span>
                <span className={totalDiskPercent > 85 ? "text-red-500" : "text-emerald-600"}>{totalDiskPercent.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                <div className={clsx("h-full rounded-full transition-all duration-700", totalDiskPercent > 85 ? "bg-red-500" : "bg-zinc-900")} style={{ width: `${totalDiskPercent}%` }}></div>
              </div>
            </div>
          </div>

          {/* Card: GPU */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:border-yellow-400 transition-colors group">
            <div className="flex justify-between items-start mb-4">
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">GPU / VRAM</p>
                <h3 className="text-2xl font-bold text-zinc-900 mt-1">{firstGpu?.vram || 0} MB</h3>
              </div>
              <div className="p-2 bg-zinc-50 text-zinc-400 group-hover:text-yellow-500 group-hover:bg-yellow-50 rounded-lg transition-colors">
                <CircuitBoard size={24} />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-zinc-700 truncate" title={firstGpu?.model}>{firstGpu?.model || "No GPU"}</p>
              <div className="flex items-center gap-3 text-xs">
                <span className={clsx("px-2 py-0.5 rounded font-bold", parseNumber(firstGpu?.temperature) > 80 ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600")}>
                  {parseNumber(firstGpu?.temperature)}°C
                </span>
                <span className="text-zinc-400">Load: {parseNumber(firstGpu?.utilization)}%</span>
              </div>
            </div>
          </div>

          {/* Card: RAM */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:border-yellow-400 transition-colors group">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">RAM Usage</p>
                <h3 className="text-2xl font-bold text-zinc-900 mt-1">
                  {stats.memory?.used || "0"}
                  <span className="text-sm text-zinc-400 font-normal ml-1">/ {stats.memory?.total || "0"}</span>
                </h3>
              </div>
              <div className="p-2 bg-zinc-50 text-zinc-400 group-hover:text-yellow-500 group-hover:bg-yellow-50 rounded-lg transition-colors">
                <MemoryStick size={24} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-zinc-500">Free: {stats.memory?.free || "0"}</span>
                <span className={(stats.memory?.percent || 0) > 90 ? "text-red-500" : "text-zinc-900"}>{stats.memory?.percent || 0}%</span>
              </div>
              <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                <div className={clsx("h-full rounded-full transition-all duration-500", (stats.memory?.percent || 0) > 90 ? "bg-red-500" : "bg-yellow-500")} style={{ width: `${stats.memory?.percent || 0}%` }}></div>
              </div>
            </div>
          </div>

          {/* Card: CPU */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:border-yellow-400 transition-colors group">
            <div className="flex justify-between items-start mb-4">
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">CPU Info</p>
                <h3 className="text-lg font-bold text-zinc-900 mt-1 truncate" title={stats.cpu?.brand}>{stats.cpu?.brand || "Unknown CPU"}</h3>
              </div>
              <div className="p-2 bg-zinc-50 text-zinc-400 group-hover:text-yellow-500 group-hover:bg-yellow-50 rounded-lg transition-colors">
                <Cpu size={24} />
              </div>
            </div>
            <div className="flex justify-between items-end border-t border-zinc-100 pt-3">
              <div>
                <p className="text-xs text-zinc-400">Speed</p>
                <p className="text-sm font-semibold">{stats.cpu?.speed || 0} GHz</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-400">Temp</p>
                <p className={clsx("text-sm font-bold", (stats.cpu?.temperature || 0) > 85 ? "text-red-500" : "text-zinc-900")}>
                  {stats.cpu?.temperature || 0}°C
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* --- MAIN CONTENT SPLIT --- */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* LEFT: Charts (2/3 width) */}
          <div className="xl:col-span-2 space-y-6">

            {/* Chart: Network */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-zinc-100 rounded text-zinc-900"><Activity size={18} /></div>
                  <div>
                    <h3 className="font-bold text-zinc-900">Lưu lượng mạng</h3>
                    <p className="text-xs text-zinc-500">Realtime Bandwidth</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex items-center gap-2 px-3 py-1 bg-zinc-50 rounded border text-xs">
                    <span className="w-2 h-2 rounded-full bg-zinc-900"></span>
                    <ArrowDown size={12} /> {formatBytes(stats.network?.traffic?.[0]?.rx_sec || 0)}/s
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-zinc-50 rounded border text-xs">
                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                    <ArrowUp size={12} /> {formatBytes(stats.network?.traffic?.[0]?.tx_sec || 0)}/s
                  </div>
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trafficHistory}>
                    <defs>
                      <linearGradient id="colorRx" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#18181b" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#18181b" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorTx" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#eab308" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#aaa' }} minTickGap={40} stroke="transparent" />
                    <YAxis tickFormatter={(v) => formatBytes(v, 0)} tick={{ fontSize: 10, fill: '#aaa' }} stroke="transparent" />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Area type="monotone" dataKey="rx" stroke="#18181b" fill="url(#colorRx)" strokeWidth={2} isAnimationActive={false} />
                    <Area type="monotone" dataKey="tx" stroke="#eab308" fill="url(#colorTx)" strokeWidth={2} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Detailed Lists: Disk Partitions & Interfaces */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Partition List */}
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <h4 className="font-bold text-zinc-900 mb-4 flex items-center gap-2"><HardDrive size={16} /> Phân vùng ổ cứng</h4>
                <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                  {stats.disk?.map((d, i) => {
                    const percent = parseSizeString(d.usePercent);
                    return (
                      <div key={i} className="bg-zinc-50 p-3 rounded-lg border border-zinc-100">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-sm text-zinc-800">{d.mount} <span className="text-zinc-400 font-normal text-xs">({d.type})</span></span>
                          <span className="text-xs font-medium text-zinc-600">{d.used} / {d.size}</span>
                        </div>
                        <div className="w-full bg-zinc-200 h-1.5 rounded-full">
                          <div className={clsx("h-1.5 rounded-full", percent > 90 ? "bg-red-500" : "bg-zinc-800")} style={{ width: d.usePercent?.includes('%') ? d.usePercent : `${d.usePercent}%` }}></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Network Interfaces */}
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <h4 className="font-bold text-zinc-900 mb-4 flex items-center gap-2"><Globe size={16} /> Card mạng</h4>
                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                  {stats.network?.interfaces?.map((iface, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg border border-zinc-100">
                      <div className="flex items-center gap-3">
                        <div className="bg-white p-1.5 rounded shadow-sm">
                          <Wifi size={14} className="text-yellow-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-800">{iface.iface}</p>
                          <p className="text-xs text-zinc-400 font-mono">{iface.mac}</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono bg-white px-2 py-1 rounded border text-zinc-600">{iface.ip4 || "No IPv4"}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* RIGHT: Security & CPU (1/3 width) */}
          <div className="space-y-6">

            {/* CPU Load Chart */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="font-bold text-zinc-900 mb-1">Hiệu suất CPU</h3>
              <p className="text-xs text-zinc-500 mb-4">Tải xử lý realtime</p>
              <div className="h-[150px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cpuHistory}>
                    <XAxis dataKey="time" hide />
                    <YAxis domain={[0, 100]} hide />
                    <Tooltip contentStyle={{ borderRadius: '8px' }} labelStyle={{ display: 'none' }} />
                    <Line type="stepAfter" dataKey="load" stroke="#18181b" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-zinc-50 p-3 rounded-lg text-center">
                  <p className="text-xs text-zinc-500">Threads</p>
                  <p className="font-bold text-lg">{stats.cpu?.cores || 0}</p>
                </div>
                <div className="bg-zinc-50 p-3 rounded-lg text-center">
                  <p className="text-xs text-zinc-500">Manufacturer</p>
                  <p className="font-bold text-sm truncate text-yellow-600" title={stats.cpu?.manufacturer}>{stats.cpu?.manufacturer || "N/A"}</p>
                </div>
              </div>
            </div>

            {/* Active Connections (Security) */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col h-[400px]">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-zinc-900 flex items-center gap-2"><Shield size={16} className="text-emerald-500" /> Kết nối từ xa</h4>
                <span className="bg-zinc-100 text-xs px-2 py-1 rounded-full text-zinc-600">{stats.network?.connections?.total || 0} active</span>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                {stats.network?.connections?.activeRemoteIPs && stats.network.connections.activeRemoteIPs.length > 0 ? (
                  stats.network.connections.activeRemoteIPs.map((ip, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm p-2 hover:bg-zinc-50 rounded border border-transparent hover:border-zinc-100 transition-all">
                      <span className="font-mono text-zinc-700">{ip}</span>
                      <span className="text-[10px] uppercase font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">Remote</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-zinc-400 py-10 text-sm">Không có kết nối lạ</div>
                )}
              </div>
            </div>

            {/* Listening Ports */}
            <div className="bg-zinc-900 p-5 rounded-xl shadow-sm text-white">
              <h4 className="font-bold mb-4 flex items-center gap-2"><Terminal size={16} className="text-yellow-500" /> Ports đang mở</h4>
              <div className="flex flex-wrap gap-2">
                {stats.network?.connections?.listeningPorts?.map((port, idx) => (
                  <span key={idx} className="bg-zinc-800 border border-zinc-700 text-xs px-2 py-1 rounded hover:border-yellow-500 transition-colors cursor-default">
                    {port}
                  </span>
                ))}
                {(!stats.network?.connections?.listeningPorts || stats.network.connections.listeningPorts.length === 0) &&
                  <span className="text-zinc-500 text-xs">No open ports</span>
                }
              </div>
            </div>

          </div>

        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e4e4e7; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d4d4d8; }
      `}</style>
    </div>
  );
};

export default HomePage;