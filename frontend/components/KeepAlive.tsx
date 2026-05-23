"use client";
import { useEffect } from "react";

export default function KeepAlive() {
  useEffect(() => {
    const ping = () => fetch("/api/health").catch(() => {});
    const interval = setInterval(ping, 4 * 60 * 1000); // every 4 minutes
    return () => clearInterval(interval);
  }, []);
  return null;
}
