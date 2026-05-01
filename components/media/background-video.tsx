"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface BackgroundVideoProps {
  sources: Array<{ src: string; type: string }>;
  overlayOpacity?: number;
  className?: string;
}

export function BackgroundVideo({
  sources,
  overlayOpacity = 0.5,
  className = "",
}: BackgroundVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Handle autoplay failure
        console.log("Autoplay prevented");
      });
    }
  }, []);

  return (
    <motion.div
      className={`absolute inset-0 w-full h-full overflow-hidden ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5 }}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        {sources.map((source, index) => (
          <source key={index} src={source.src} type={source.type} />
        ))}
      </video>
      <motion.div
        className="absolute inset-0 bg-background"
        initial={{ opacity: 0 }}
        animate={{ opacity: overlayOpacity }}
        transition={{ duration: 1 }}
      />
    </motion.div>
  );
}
