"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

type Testimony = {
  name: string;
  amount: string;
  type: "withdrew" | "invested";
  icon: string;
};

const testimonies: Testimony[] = [
  { name: "Andrew", amount: "$1,250", type: "withdrew", icon: "A" },
  { name: "Jacob", amount: "$7,000", type: "invested", icon: "J" },
  { name: "Sarah", amount: "$3,450", type: "withdrew", icon: "S" },
  { name: "Michael", amount: "$5,200", type: "withdrew", icon: "M" },
  { name: "Emma", amount: "$12,800", type: "withdrew", icon: "E" },
  { name: "David", amount: "$10,500", type: "withdrew", icon: "D" },
  { name: "Olivia", amount: "$8,900", type: "withdrew", icon: "O" },
  { name: "James", amount: "$15,000", type: "withdrew", icon: "J" },
  { name: "Sophia", amount: "$21,400", type: "withdrew", icon: "S" },
  { name: "William", amount: "$6,300", type: "invested", icon: "W" },
  { name: "Isabella", amount: "$18,750", type: "withdrew", icon: "I" },
  { name: "Alexander", amount: "$25,600", type: "withdrew", icon: "A" },
  { name: "Mia", amount: "$9,200", type: "withdrew", icon: "M" },
  { name: "Benjamin", amount: "$32,100", type: "withdrew", icon: "B" },
  { name: "Charlotte", amount: "$2,500", type: "invested", icon: "C" },
  { name: "Lucas", amount: "$14,500", type: "withdrew", icon: "L" },
  { name: "Amelia", amount: "$38,500", type: "withdrew", icon: "A" },
  { name: "Henry", amount: "$7,800", type: "withdrew", icon: "H" },
  { name: "Harper", amount: "$28,900", type: "withdrew", icon: "H" },
  { name: "Daniel", amount: "$42,000", type: "withdrew", icon: "D" },
  { name: "Evelyn", amount: "$1,500", type: "invested", icon: "E" },
  { name: "Matthew", amount: "$45,800", type: "withdrew", icon: "M" },
  { name: "Abigail", amount: "$35,000", type: "withdrew", icon: "A" },
  { name: "Joseph", amount: "$55,200", type: "withdrew", icon: "J" },
  { name: "Ella", amount: "$11,000", type: "invested", icon: "E" },
  { name: "Samuel", amount: "$60,700", type: "withdrew", icon: "S" },
  { name: "Avery", amount: "$70,500", type: "withdrew", icon: "A" },
  { name: "Jack", amount: "$50,000", type: "withdrew", icon: "J" },
  { name: "Scarlett", amount: "$22,300", type: "withdrew", icon: "S" },
  { name: "Owen", amount: "$4,000", type: "invested", icon: "O" },
  { name: "Grace", amount: "$75,300", type: "withdrew", icon: "G" },
  { name: "Levi", amount: "$82,000", type: "withdrew", icon: "L" },
  { name: "Chloe", amount: "$65,000", type: "withdrew", icon: "C" },
  { name: "Sebastian", amount: "$88,600", type: "withdrew", icon: "S" },
  { name: "Victoria", amount: "$100,200", type: "withdrew", icon: "V" },
  { name: "Aiden", amount: "$125,000", type: "withdrew", icon: "A" },
  { name: "Madison", amount: "$5,000", type: "invested", icon: "M" },
  { name: "Dylan", amount: "$110,000", type: "withdrew", icon: "D" },
  { name: "Lily", amount: "$95,000", type: "withdrew", icon: "L" },
  { name: "Nathan", amount: "$140,000", type: "withdrew", icon: "N" },
  { name: "Aria", amount: "$150,000", type: "withdrew", icon: "A" },
  { name: "Blake", amount: "$175,500", type: "withdrew", icon: "B" },
  { name: "Zoey", amount: "$165,000", type: "withdrew", icon: "Z" },
  { name: "Christian", amount: "$185,000", type: "withdrew", icon: "C" },
  { name: "Penelope", amount: "$7,500", type: "invested", icon: "P" },
  { name: "Aaron", amount: "$200,000", type: "withdrew", icon: "A" },
  { name: "Layla", amount: "$215,000", type: "withdrew", icon: "L" },
  { name: "Eli", amount: "$230,000", type: "withdrew", icon: "E" },
  { name: "Riley", amount: "$245,000", type: "withdrew", icon: "R" },
  { name: "Nora", amount: "$260,000", type: "withdrew", icon: "N" },
];

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function TestimonyToast() {
  const pathname = usePathname();
  const [index, setIndex] = useState(0);
  const [shuffled, setShuffled] = useState<Testimony[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setShuffled(shuffle(testimonies));
  }, []);

  useEffect(() => {
    if (shuffled.length === 0) return;
    
    intervalRef.current = setInterval(() => {
      setIndex((prev) => (prev + 1) % shuffled.length);
    }, 2500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [shuffled]);

  // Hide on admin routes (after hooks to obey rules of hooks)
  if (pathname?.startsWith("/admin")) return null;

  const current = shuffled[index];

  if (!current) return null;

  return (
    <div className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-[100] max-w-[320px] sm:max-w-sm">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 30, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -15, scale: 0.88 }}
          transition={{
            type: "tween",
            duration: 0.5,
            ease: "easeInOut",
          }}
          className="bg-card/95 backdrop-blur-lg border border-[#00FE01]/20 rounded-xl p-3 sm:p-4 shadow-2xl shadow-[#00FE01]/5"
        >
          <div className="flex items-start gap-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-full bg-[#00FE01]/10 border-2 border-[#00FE01]/30 flex items-center justify-center text-[#00FE01] text-sm font-semibold">
                {current.icon}
              </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm sm:text-base font-medium text-foreground truncate">
                {current.name}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {current.type === "withdrew" ? (
                  <>
                    Just withdrew{" "}
                    <span className="text-[#00FE01] font-semibold">
                      {current.amount}
                    </span>{" "}
                    in profit
                  </>
                ) : (
                  <>
                    Just invested{" "}
                    <span className="text-[#00FE01] font-semibold">
                      {current.amount}
                    </span>
                  </>
                )}
              </p>
            </div>
            <motion.div
              className="w-2 h-2 rounded-full bg-[#00FE01] shrink-0 mt-2"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}