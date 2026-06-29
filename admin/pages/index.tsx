import React, { useEffect, useState } from "react";
import { socket } from "@/utils/socket";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  ComposedChart,
  Legend,
} from "recharts";
import {
  HardDrive,
  Cpu,
  MemoryStick,
  CircuitBoard,
  Activity,
  Server,
  Eye,
  Globe,
  Search,
  Zap,
  ArrowDown,
  ArrowUp,
  MousePointer,
  BarChart3,
  Percent,
  Hash,
} from "lucide-react";
import clsx from "clsx";

interface SystemStats {
  os?: {
    hostname?: string;
    distro?: string;
    uptime?: string;
    release?: string;
  };
  cpu?: {
    brand: string;
    speed: number;
    load: number;
    temperature: number;
    cores: number;
    manufacturer: string;
  };
  memory?: { total?: string; used?: string; free?: string; percent?: number };
  gpu?: {
    model?: string;
    vram?: number;
    temperature?: number | string;
    utilization?: number | string;
  }[];
  disk: {
    mount?: string;
    type?: string;
    size?: string;
    used?: string;
    usePercent?: string;
  }[];
  network?: {
    interfaces?: {
      iface?: string;
      ip4?: string;
      mac?: string;
      type?: string;
    }[];
    traffic?: { rx_sec?: number; tx_sec?: number }[];
    connections?: {
      total?: number;
      activeRemoteIPs?: string[];
      listeningPorts?: number[];
    };
  };
}

interface ListData {
  id: string;
  name: string;
  value: number;
}
interface NetworkPoint {
  time: string;
  rx: number;
  tx: number;
}

interface DetailedTrafficData {
  totalActiveUsers: number;
  trafficTrend: { time: string; activeUsers: number }[];
  topCountries: ListData[];
  topPages: ListData[];
}

interface GSCTrendPoint {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}
interface GSCData {
  overview: {
    totalClicks: number;
    totalImpressions: number;
    avgCtr: number;
    avgPosition: number;
  };
  trendHistory: GSCTrendPoint[];
  topQueries: { query: string; clicks: number; impressions: number }[];
}

// --- Helpers (GIỮ NGUYÊN) ---
const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

const parseSizeString = (str?: string): number =>
  str ? parseFloat(str.replace(/[^\d.]/g, "")) || 0 : 0;

const formatDateShort = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

const TinyChart = ({
  data,
  dataKey,
  color,
  reversed = false,
}: {
  data: any[];
  dataKey: string;
  color: string;
  reversed?: boolean;
}) => (
  <ResponsiveContainer width="100%" height="100%">
    <LineChart data={data}>
      {reversed ? (
        <YAxis hide domain={["dataMin", "dataMax"]} reversed={true} />
      ) : (
        <YAxis hide domain={["dataMin", "dataMax"]} />
      )}
      <Line
        type="monotone"
        dataKey={dataKey}
        stroke={color}
        strokeWidth={2}
        dot={false}
        isAnimationActive={false}
      />
    </LineChart>
  </ResponsiveContainer>
);

const HomePage: React.FC = () => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [gaData, setGaData] = useState<DetailedTrafficData | null>(null);
  const [gscData, setGscData] = useState<GSCData | null>(null);
  const [networkHistory, setNetworkHistory] = useState<NetworkPoint[]>([]);

  // Toggle chart chính
  const [showClicks, setShowClicks] = useState(true);
  const [showImpressions, setShowImpressions] = useState(true);
  const [showCTR, setShowCTR] = useState(true);
  const [showPosition, setShowPosition] = useState(true);

  useEffect(() => {
    const handleData = (data: any) => {
      if (data.cpu || data.network) {
        setStats((prev) => ({ ...prev, ...data }));
        if (data.network?.traffic) {
          const rx = data.network.traffic[0]?.rx_sec || 0;
          const tx = data.network.traffic[0]?.tx_sec || 0;
          const time = new Date().toLocaleTimeString("vi-VN", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
          setNetworkHistory((prev) => {
            const newData = [...prev, { time, rx, tx }];
            return newData.slice(-30);
          });
        }
      }

      if (data.ga_traffic) setGaData(data.ga_traffic);
      if (data.gsc_stats) setGscData(data.gsc_stats);
    };

    socket.on("admin:system_stats", handleData);

    if (socket.connected) socket.emit("admin:start_monitoring");

    return () => {
      socket.off("admin:system_stats", handleData);
    };
  }, []);

  if (!stats && !gaData) return <div className="min-h-screen bg-[#F8F9FA]" />;

  const totalDisk =
    stats?.disk?.reduce((acc, d) => acc + parseSizeString(d.size), 0) || 0;
  const usedDisk =
    stats?.disk?.reduce((acc, d) => acc + parseSizeString(d.used), 0) || 0;
  const diskPercent = totalDisk > 0 ? (usedDisk / totalDisk) * 100 : 0;
  const currentRx = stats?.network?.traffic?.[0]?.rx_sec || 0;
  const currentTx = stats?.network?.traffic?.[0]?.tx_sec || 0;

  // --- MÀU SẮC ĐÃ CHỈNH (Vàng/Xám/Xanh/Cam) ---
  const colors = {
    clicks: "#eab308", // Vàng (Clicks - Quan trọng nhất)
    impressions: "#000", // black (Impressions - Nền)
    ctr: "#10b981", // Xanh lá (CTR)
    position: "#f97316", // Cam (Position)
  };

  return (
    <div className="px-3 lg:px-5 xl:px-8 py-5 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Disk */}
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <div className="flex justify-between mb-3">
            <span className="text-xs font-bold text-zinc-400 uppercase">
              Lưu trữ tổng
            </span>
            <HardDrive size={20} className="text-zinc-300" />
          </div>
          <h3 className="text-2xl font-bold text-zinc-800">
            {totalDisk.toFixed(0)} GB
          </h3>
          <div className="w-full bg-zinc-100 h-1.5 rounded-full mt-2">
            <div
              className="h-full bg-zinc-800 rounded-full"
              style={{ width: `${diskPercent}%` }}
            ></div>
          </div>
          <p className="text-xs text-zinc-500 mt-2 text-right">
            Đã dùng {diskPercent.toFixed(1)}%
          </p>
        </div>

        {/* RAM */}
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <div className="flex justify-between mb-3">
            <span className="text-xs font-bold text-zinc-400 uppercase">
              RAM Sử dụng
            </span>
            <MemoryStick size={20} className="text-zinc-300" />
          </div>
          <h3 className="text-2xl font-bold text-zinc-800">
            {stats?.memory?.used}
          </h3>
          <div className="w-full bg-zinc-100 h-1.5 rounded-full mt-2">
            <div
              className="h-full bg-yellow-500 rounded-full"
              style={{ width: `${stats?.memory?.percent}%` }}
            ></div>
          </div>
          <p className="text-xs text-zinc-500 mt-2 text-right">
            {stats?.memory?.percent}%
          </p>
        </div>

        {/* CPU */}
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <div className="flex justify-between mb-3">
            <span className="text-xs font-bold text-zinc-400 uppercase">
              CPU Load
            </span>
            <Cpu size={20} className="text-zinc-300" />
          </div>
          <h3 className="text-2xl font-bold text-zinc-800">
            {stats?.cpu?.load}%
          </h3>
          <div className="w-full bg-zinc-100 h-1.5 rounded-full mt-2">
            <div
              className="h-full bg-zinc-900 rounded-full"
              style={{ width: `${stats?.cpu?.load}%` }}
            ></div>
          </div>
          <p className="text-xs text-zinc-500 mt-2 text-right">
            {stats?.cpu?.cores} Cores
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <div className="flex justify-between mb-3">
            <span className="text-xs font-bold text-zinc-400 uppercase">
              Người dùng thực
            </span>
            <Activity size={20} className="text-zinc-300" />
          </div>
          <h3 className="text-2xl font-bold text-zinc-800">
            {gaData?.totalActiveUsers || 0}
          </h3>
          <div className="mt-2">
            <span className="text-xs bg-gray-100 px-2 py-1.5 font-medium rounded-md text-black ">
              Đang truy cập
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT (2/3): Search Performance (SEO) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Clicks */}
            <div
              onClick={() => setShowClicks(!showClicks)}
              className={clsx(
                "p-4 rounded-xl border cursor-pointer transition-all duration-200",
                showClicks
                  ? "bg-zinc-900 border-zinc-900 text-white ring-1 ring-zinc-900"
                  : "bg-white border-gray-200 text-zinc-500 hover:border-gray-300"
              )}
            >
              <p
                className={clsx(
                  "text-xs uppercase font-bold flex gap-2",
                  showClicks ? "text-zinc-400" : "text-zinc-500"
                )}
              >
                <MousePointer
                  size={14}
                  className={showClicks ? "text-white" : "text-zinc-400"}
                />{" "}
                Số nhấp chuột
              </p>
              <div className="flex justify-between items-end mt-2">
                <p className="text-xl font-bold">
                  {gscData?.overview?.totalClicks?.toLocaleString()}
                </p>
                <div className="w-16 h-8">
                  {/* Dùng currentColor để dây chart tự ăn theo màu chữ (Trắng khi active, màu gốc khi inactive) */}
                  <TinyChart
                    data={gscData?.trendHistory || []}
                    dataKey="clicks"
                    color={showClicks ? "#fbbf24" : colors.clicks} // Màu vàng nhạt khi nền đen cho nổi
                  />
                </div>
              </div>
            </div>

            {/* Impressions */}
            <div
              onClick={() => setShowImpressions(!showImpressions)}
              className={clsx(
                "p-4 rounded-xl border cursor-pointer transition-all duration-200",
                showImpressions
                  ? "bg-zinc-900 border-zinc-900 text-white ring-1 ring-zinc-900"
                  : "bg-white border-gray-200 text-zinc-500 hover:border-gray-300"
              )}
            >
              <p
                className={clsx(
                  "text-xs uppercase font-bold flex gap-2",
                  showImpressions ? "text-zinc-400" : "text-zinc-500"
                )}
              >
                <BarChart3
                  size={14}
                  className={showImpressions ? "text-white" : "text-zinc-400"}
                />{" "}
                Lượt hiển thị
              </p>
              <div className="flex justify-between items-end mt-2">
                <p className="text-xl font-bold">
                  {gscData?.overview?.totalImpressions?.toLocaleString()}
                </p>
                <div className="w-16 h-8">
                  <TinyChart
                    data={gscData?.trendHistory || []}
                    dataKey="impressions"
                    color={showImpressions ? "#a1a1aa" : colors.impressions} // Màu xám sáng khi nền đen
                  />
                </div>
              </div>
            </div>

            <div
              onClick={() => setShowCTR(!showCTR)}
              className={clsx(
                "p-4 rounded-xl border cursor-pointer transition-all duration-200",
                showCTR
                  ? "bg-zinc-900 border-zinc-900 text-white ring-1 ring-zinc-900"
                  : "bg-white border-gray-200 text-zinc-500 hover:border-gray-300"
              )}
            >
              <p
                className={clsx(
                  "text-xs uppercase font-bold flex gap-2",
                  showCTR ? "text-zinc-400" : "text-zinc-500"
                )}
              >
                <Percent
                  size={14}
                  className={showCTR ? "text-white" : "text-zinc-400"}
                />{" "}
                CTR TB
              </p>
              <div className="flex justify-between items-end mt-2">
                <p className="text-xl font-bold">
                  {gscData?.overview?.avgCtr}%
                </p>
                <div className="w-16 h-8">
                  <TinyChart
                    data={gscData?.trendHistory || []}
                    dataKey="ctr"
                    color={showCTR ? "#34d399" : colors.ctr} // Màu xanh ngọc sáng khi nền đen
                  />
                </div>
              </div>
            </div>

            <div
              onClick={() => setShowPosition(!showPosition)}
              className={clsx(
                "p-4 rounded-xl border cursor-pointer transition-all duration-200",
                showPosition
                  ? "bg-zinc-900 border-zinc-900 text-white ring-1 ring-zinc-900"
                  : "bg-white border-gray-200 text-zinc-500 hover:border-gray-300"
              )}
            >
              <p
                className={clsx(
                  "text-xs uppercase font-bold flex gap-2",
                  showPosition ? "text-zinc-400" : "text-zinc-500"
                )}
              >
                <Hash
                  size={14}
                  className={showPosition ? "text-white" : "text-zinc-400"}
                />{" "}
                Vị trí TB
              </p>
              <div className="flex justify-between items-end mt-2">
                <p className="text-xl font-bold">
                  {gscData?.overview?.avgPosition}
                </p>
                <div className="w-16 h-8">
                  <TinyChart
                    data={gscData?.trendHistory || []}
                    dataKey="position"
                    color={showPosition ? "#fb923c" : colors.position} // Màu cam sáng khi nền đen
                    reversed={true}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-zinc-100 text-zinc-900 rounded-lg">
                  <Search size={20} />
                </div>
                <h3 className="font-medium text-lg text-zinc-900">
                  Hiệu suất tìm kiếm
                </h3>
              </div>
              <span className="text-xs text-zinc-500 bg-zinc-100 px-2 py-1 rounded">
                28 ngày qua
              </span>
            </div>

            <div className="h-[320px] w-full">
              {gscData?.trendHistory && gscData.trendHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={gscData.trendHistory}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f1f1f1"
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDateShort}
                      tick={{ fontSize: 10, fill: "#aaa" }}
                      minTickGap={30}
                      stroke="transparent"
                    />

                    <YAxis
                      yAxisId="left"
                      hide={!showClicks}
                      tick={{ fontSize: 10, fill: colors.clicks }}
                      stroke="transparent"
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      hide={!showImpressions}
                      tick={{ fontSize: 10, fill: colors.impressions }}
                      stroke="transparent"
                    />
                    {showCTR && <YAxis yAxisId="ctr" hide domain={[0, 100]} />}
                    {showPosition && (
                      <YAxis
                        yAxisId="pos"
                        hide
                        domain={["dataMin", "dataMax"]}
                        reversed={true}
                      />
                    )}

                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                      labelFormatter={(label) =>
                        `Ngày: ${formatDateShort(label)}`
                      }
                    />

                    {showImpressions && (
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="impressions"
                        stroke={colors.impressions}
                        dot={false}
                        strokeWidth={2}
                        name="Lượt hiển thị"
                      />
                    )}
                    {showCTR && (
                      <Line
                        yAxisId="ctr"
                        type="monotone"
                        dataKey="ctr"
                        stroke={colors.ctr}
                        dot={false}
                        strokeWidth={2}
                        name="CTR (%)"
                      />
                    )}
                    {showPosition && (
                      <Line
                        yAxisId="pos"
                        type="monotone"
                        dataKey="position"
                        stroke={colors.position}
                        dot={false}
                        strokeWidth={2}
                        name="Vị trí"
                      />
                    )}
                    {showClicks && (
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="clicks"
                        stroke={colors.clicks}
                        strokeWidth={3}
                        fill="url(#colorClicks)"
                        name="Số nhấp chuột"
                      />
                    )}

                    <defs>
                      <linearGradient
                        id="colorClicks"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={colors.clicks}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor={colors.clicks}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-400 text-sm">
                  Đang tải dữ liệu Search Console...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (Realtime) */}
        <div className="space-y-6">
          {/* 1. Realtime Users Trend */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 h-[220px] flex flex-col">
            <h3 className="font-bold text-zinc-900 mb-2 flex items-center gap-2">
              <Zap size={16} className="text-zinc-400" /> Xu hướng Realtime
            </h3>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={gaData?.trafficTrend || []}>
                  <defs>
                    <linearGradient
                      id="colorRealtime"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#18181b" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#18181b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "none" }}
                    itemStyle={{ color: "#000" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="activeUsers"
                    stroke="#18181b"
                    strokeWidth={2}
                    fill="url(#colorRealtime)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2. Network Speed */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 h-[240px] flex flex-col">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                <Globe size={16} className="text-zinc-400" /> Tốc độ mạng
              </h3>
              <div className="text-[10px] space-y-1 text-right">
                <div className="flex items-center justify-end gap-1 text-yellow-600">
                  <ArrowDown size={10} /> {formatBytes(currentRx)}/s
                </div>
                <div className="flex items-center justify-end gap-1 text-zinc-500">
                  <ArrowUp size={10} /> {formatBytes(currentTx)}/s
                </div>
              </div>
            </div>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={networkHistory}>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [formatBytes(value), ""]}
                    labelStyle={{ display: "none" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="rx"
                    stroke="#eab308"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                    name="Tải xuống"
                  />
                  <Line
                    type="monotone"
                    dataKey="tx"
                    stroke="#18181b"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                    name="Tải lên"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex justify-between mb-4">
            <h3 className="font-bold text-zinc-900">Từ khóa hàng đầu</h3>
            <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-1 rounded">
              SEO
            </span>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
            {gscData?.topQueries?.map((q, i) => (
              <div
                key={i}
                className="flex justify-between items-center text-sm p-2 border-b border-zinc-50 last:border-0 hover:bg-zinc-50"
              >
                <span
                  className="truncate font-medium text-zinc-700 w-2/3"
                  title={q.query}
                >
                  {q.query}
                </span>
                <div className="w-1/3 text-right">
                  <div className="">
                    <span className="font-bold text-white rounded-md bg-black px-1.5 py-1">
                      {q.clicks}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400">
                    {q.impressions} hiển thị
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex justify-between mb-4">
            <h3 className="font-bold text-zinc-900">Trang xem nhiều nhất</h3>
            <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-1 rounded">
              Realtime
            </span>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
            {gaData?.topPages?.map((p, i) => (
              <div
                key={i}
                className="flex justify-between items-center text-sm p-2 border-b border-zinc-50 last:border-0 hover:bg-zinc-50"
              >
                <div className="flex items-center gap-2 w-3/4">
                  <span className="text-xs text-zinc-300 font-bold w-4">
                    {i + 1}
                  </span>
                  <span
                    className="truncate font-medium text-zinc-700"
                    title={p.name}
                  >
                    {p.name.replace(" - Rophim", "")}
                  </span>
                </div>
                <span className="font-bold text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded text-xs">
                  {p.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
