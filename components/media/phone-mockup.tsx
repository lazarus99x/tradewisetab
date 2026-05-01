"use client";

import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";

interface PhoneMockupProps {
  imageSrc: string;
  className?: string;
  parallaxIntensity?: number;
}

export function PhoneMockup({
  imageSrc,
  className = "",
  parallaxIntensity = 0.2,
}: PhoneMockupProps) {
  const { scrollYProgress } = useScroll();
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [50 * parallaxIntensity, -50 * parallaxIntensity]
  );

  return (
    <motion.div
      style={{ y }}
      className={`relative ${className}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true }}
    >
      <div className="relative aspect-[18/20.5] max-w-[300px] mx-auto">
        <Image
          src={imageSrc}
          alt="Device mockup"
          fill
          className="object-contain rounded-[3rem]"
          //   sizes="(max-width: 768px) 100vw, 300px"
          priority
        />
        <div className="absolute inset-0 rounded-[3rem] ring-1 ring-white/10" />
        <motion.div
          className="absolute inset-0 bg-linear-to-tr from-[#00FE01]/10 via-transparent to-[#00FE01]/5 rounded-[3rem]"
          animate={{
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            repeatType: "reverse",
          }}
        />
      </div>
    </motion.div>
  );
}
