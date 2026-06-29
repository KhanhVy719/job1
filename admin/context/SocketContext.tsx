// context/SocketContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { socket } from "@/utils/socket"; // Import singleton
import { Socket } from "socket.io-client";

const SocketContext = createContext<Socket>(socket);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    // 1. Chỉ connect nếu chưa connect
    if (!socket.connected) {
      socket.connect();
    }

    // 2. Debug logs
    function onConnect() {
      console.log("✅ Socket connected:", socket.id);
    }

    function onDisconnect() {
      console.log("❌ Socket disconnected");
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    // 3. Cleanup: 
    // Quan trọng: Trong Next.js SPA, ta thường KHÔNG muốn disconnect khi chuyển trang.
    // Chỉ remove listener để tránh memory leak.
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      // socket.disconnect(); // <-- COMMENT DÒNG NÀY ĐỂ GIỮ KẾT NỐI KHI CHUYỂN TRANG
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};