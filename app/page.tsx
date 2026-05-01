"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useClerk, useUser } from "@/lib/auth";
import {
  BarChart4,
  Lightbulb,
  LineChart,
  Lock,
  TrendingUp,
  Wallet,
  ArrowRight,
  ChevronRight,
  Shield,
  Coins,
  Users,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BackgroundVideo } from "@/components/media/background-video";
import { PhoneMockup } from "@/components/media/phone-mockup";

const MotionLink = motion.create(Link);

export default function Home() {
  const { openSignIn, openSignUp } = useClerk();
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  // Handle sign-in click: redirect if already signed in
  const handleSignIn = () => {
    if (isSignedIn) {
      router.push("/dashboard");
    } else {
      openSignIn?.({});
    }
  };

  // Handle sign-up click: redirect if already signed in
  const handleSignUp = () => {
    if (isSignedIn) {
      router.push("/dashboard");
    } else {
      openSignUp?.({});
    }
  };
  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-slate-900 flex flex-col">
      {/* Navigation */}
      <nav className="fixed w-full backdrop-blur-md bg-background/80 z-50 flex items-center justify-between px-6 py-4 border-b border-border">
        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="w-8 h-8 flex items-center justify-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.img
              src="/leverfi.png"
              alt="TradeWiseTab Logo"
              width={40}
              height={40}
              className="rounded-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            />
          </motion.div>
          <motion.span
            className="text-xl font-bold text-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            TradeWiseTab
            
          </motion.span>
        </motion.div>

        <motion.div
          className="flex items-center gap-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          {isLoaded && (
            <>
              {isSignedIn ? (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    className="bg-[#00FE01] hover:bg-[#00FE01] text-black font-medium relative overflow-hidden"
                    onClick={() => router.push("/dashboard")}
                  >
                    <motion.span className="relative z-10">
                      Go to Dashboard
                    </motion.span>
                  </Button>
                </motion.div>
              ) : (
                <>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      variant="ghost"
                      className="font-medium"
                      onClick={handleSignIn}
                    >
                      Log in
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      className="bg-[#00FE01] hover:bg-[#00FE01] text-black font-medium relative overflow-hidden"
                      onClick={handleSignUp}
                    >
                      <motion.span className="relative z-10">
                        Sign up
                      </motion.span>
                    </Button>
                  </motion.div>
                </>
              )}
            </>
          )}
        </motion.div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col">
        <div className="pt-32 pb-20 px-6 relative overflow-hidden">
          <BackgroundVideo
            sources={[
              { src: "/videos/reality.webm", type: "video/webm" },
              { src: "/videos/reality2.webm", type: "video/webm" },
            ]}
            overlayOpacity={0.7}
          />
          <div className="absolute inset-0 bg-linear-to-r from-[#00FE01]/5 via-transparent to-[#B4FE01]/5" />
          {/* <motion.div
            className="absolute inset-0"
            animate={{
              background: [
                "radial-gradient(circle at 0% 0%, rgba(0,254,1,0.1) 0%, transparent 50%)",
                "radial-gradient(circle at 100% 100%, rgba(0,254,1,0.1) 0%, transparent 50%)",
                "radial-gradient(circle at 0% 0%, rgba(0,254,1,0.1) 0%, transparent 50%)",
              ],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              repeatType: "reverse",
            }}
          /> */}
          <div className="max-w-4xl mx-auto space-y-12 relative">
            <div className="space-y-6 text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground leading-tight">
                  Your Gateway to{" "}
                  <span className="relative inline-block">
                    <span className="relative z-10 text-[#00FE01]">
                      Finacial
                    </span>
                    <motion.span
                      className="absolute inset-0 bg-[#00FE01]/20 blur-2xl -z-10"
                      animate={{
                        opacity: [0.5, 1, 0.5],
                        scale: [1, 1.2, 1],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        repeatType: "reverse",
                      }}
                    />
                  </span>{" "}
                  Freedom
                </h1>
              </motion.div>
              <motion.p
                className="text-xl text-muted-foreground max-w-2xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
              >
                Experience the future of Wealth & trading with AI-powered
                signals and advanced lending features. All in one powerful
                platform.
              </motion.p>
            </div>

            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  size="lg"
                  className="bg-[#00FE01] hover:bg-[#B4FE01] text-black font-medium px-8 h-14 text-lg w-full sm:w-auto group relative overflow-hidden"
                  onClick={
                    isSignedIn
                      ? () => router.push("/dashboard/funding")
                      : handleSignUp
                  }
                >
                  <motion.span className="relative z-10 flex items-center gap-2">
                    {isSignedIn ? "Get Funded Now" : "Get Funded Now"}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </motion.span>
                </Button>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 text-lg w-full sm:w-auto group flex items-center gap-2"
                  onClick={
                    isSignedIn ? () => router.push("/dashboard") : handleSignIn
                  }
                >
                  {isSignedIn ? "Go to Dashboard" : "Sign In"}
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Feature Section */}
        <div className="py-20 px-6 relative overflow-hidden">
          {/* <BackgroundVideo
            sources={[
              { src: "/videos/reality.webm", type: "video/webm" },
              { src: "/videos/reality2.webm", type: "video/webm" },
            ]}
            overlayOpacity={0.65}
            className="opacity-90"
          /> */}
          <motion.div
            className="absolute inset-0"
            animate={{
              background: [
                "radial-gradient(circle at 0% 0%, rgba(0,254,1,0.1) 0%, transparent 50%)",
                "radial-gradient(circle at 100% 100%, rgba(0,254,1,0.1) 0%, transparent 50%)",
                "radial-gradient(circle at 0% 0%, rgba(0,254,1,0.1) 0%, transparent 50%)",
              ],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              repeatType: "reverse",
            }}
          />
          <div className="max-w-4xl mx-auto relative z-10">
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: LineChart,
                  title: "Real-Time Market Data",
                  description:
                    "Lightning-fast execution with real-time market data and advanced charting tools.",
                },
                {
                  icon: Lightbulb,
                  title: "AI-Powered Signals",
                  description:
                    "Make informed decisions with our advanced AI trading signals and analysis.",
                },
                {
                  icon: Wallet,
                  title: "Smart Funding",
                  description:
                    "Earn interest on your assets or access margin accounts with smart financial tools.",
                },
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  className="group p-6 rounded-2xl bg-card hover:bg-card/80 transition-colors relative overflow-hidden"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.2, duration: 0.5 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.02 }}
                >
                  <motion.div
                    className="absolute inset-0 bg-linear-to-r from-[#00FE01]/5 to-transparent"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: 0 }}
                    transition={{ type: "spring", stiffness: 100 }}
                  />
                  <div className="relative z-10">
                    <motion.div
                      className="w-12 h-12 bg-[#00FE01]/10 rounded-xl flex items-center justify-center mb-4"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                    >
                      <feature.icon className="w-6 h-6 text-[#00FE01]" />
                    </motion.div>
                    <h3 className="font-semibold text-foreground text-lg mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Trust Signals */}
        <div className="bg-card/50 backdrop-blur-sm py-8 px-6 border-y border-border relative overflow-hidden">
          <motion.div
            className="absolute inset-0"
            animate={{
              background: [
                "radial-gradient(circle at 0% 50%, rgba(0,254,1,0.05) 0%, transparent 50%)",
                "radial-gradient(circle at 100% 50%, rgba(180,254,1,0.05) 0%, transparent 50%)",
                "radial-gradient(circle at 0% 50%, rgba(0,254,1,0.05) 0%, transparent 50%)",
              ],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              repeatType: "reverse",
            }}
          />
          <motion.div
            className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 relative z-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            {[
              { value: "$2B+", label: "Trading Volume", icon: BarChart4 },
              { value: "100K+", label: "Active Traders", icon: TrendingUp },
              { value: "24/7", label: "Support", icon: Shield },
              { value: "99.9%", label: "Uptime", icon: Coins },
            ].map((stat, index) => (
              <motion.div
                key={index}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                viewport={{ once: true }}
              >
                <motion.div
                  className="inline-block"
                  whileHover={{ scale: 1.1 }}
                >
                  <stat.icon className="w-6 h-6 text-[#00FE01] mb-2 mx-auto" />
                  <motion.div
                    className="text-2xl font-bold text-[#00FE01]"
                    whileHover={{ scale: 1.05 }}
                  >
                    {stat.value}
                  </motion.div>
                </motion.div>
                <div className="text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Phone Mockup Section */}
        <div className="py-32 px-6 relative">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              className="space-y-6 order-2 md:order-1"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-foreground">
                Trading at Your{" "}
                <span className="text-[#00FE01]">Fingertips</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                Experience seamless trading and portfolio management with our
                intuitive mobile platform. Stay connected to the markets
                wherever you go.
              </p>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  className="bg-[#00FE01] hover:bg-[#B4FE01] text-black font-medium px-8"
                  onClick={
                    isSignedIn ? () => router.push("/dashboard") : handleSignUp
                  }
                >
                  {isSignedIn ? "Go to Dashboard" : "Get Started"}{" "}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </motion.div>
            </motion.div>
            <div className="relative order-1 md:order-2">
              <motion.div
                className="absolute inset-0 bg-linear-to-b from-[#00FE01]/20 via-transparent to-transparent blur-3xl"
                animate={{
                  opacity: [0.5, 0.8, 0.5],
                  scale: [0.8, 1, 0.8],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  repeatType: "reverse",
                }}
              />
              <div className="grid grid-cols-2 gap-6 relative z-10">
                <PhoneMockup
                  imageSrc="/images/phone4.png"
                  className="translate-y-8"
                />
                <PhoneMockup
                  imageSrc="/images/phone3.png"
                  parallaxIntensity={0.2}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Feature Section */}
        <div className="py-20 px-6 relative overflow-hidden">
          <BackgroundVideo
            sources={[
              { src: "/videos/lines.webm", type: "video/webm" },
              { src: "/videos/lines2.webm", type: "video/webm" },
            ]}
            overlayOpacity={0.85}
            className="opacity-50"
          />
          <div className="max-w-4xl mx-auto relative z-10">
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: ShieldCheck, // or any security-related icon
                  title: "Secure & Transparent",
                  description:
                    "Your assets and data are protected with enterprise-grade security, real-time audits, and full transparency—so you can focus on trading without worry.",
                },
                {
                  icon: Users, // or a community/network icon
                  title: "Copy Trading",
                  description:
                    "Follow and automatically replicate the trades of top-performing investors. Learn from the best while you grow your portfolio.",
                },
                {
                  icon: Clock, // or a speed/performance icon
                  title: "24/7 Automated Trading",
                  description:
                    "Set your strategies and let our bots execute trades around the clock—even while you sleep. Never miss an opportunity again.",
                },
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  className="group p-6 rounded-2xl bg-card hover:bg-card/80 transition-colors relative overflow-hidden"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.2, duration: 0.5 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.02 }}
                >
                  <motion.div
                    className="absolute inset-0 bg-linear-to-r from-[#00FE01]/5 to-transparent"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: 0 }}
                    transition={{ type: "spring", stiffness: 100 }}
                  />
                  <div className="relative z-10">
                    <motion.div
                      className="w-12 h-12 bg-[#00FE01]/10 rounded-xl flex items-center justify-center mb-4"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                    >
                      <feature.icon className="w-6 h-6 text-[#00FE01]" />
                    </motion.div>
                    <h3 className="font-semibold text-foreground text-lg mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
        {/* Security Section */}
        <div className="bg-card/50 backdrop-blur-sm py-16 px-6 border-y border-border relative overflow-hidden">
          <motion.div
            className="absolute inset-0"
            animate={{
              background: [
                "radial-gradient(circle at 50% 50%, rgba(0,254,1,0.05) 0%, transparent 50%)",
                "radial-gradient(circle at 50% 50%, rgba(180,254,1,0.05) 0%, transparent 50%)",
                "radial-gradient(circle at 50% 50%, rgba(0,254,1,0.05) 0%, transparent 50%)",
              ],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              repeatType: "reverse",
            }}
          />
          <motion.div
            className="max-w-4xl mx-auto text-center space-y-8 relative z-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <motion.div
              whileHover={{ scale: 1.1, rotate: 360 }}
              transition={{ duration: 0.5 }}
            >
              <Lock className="w-12 h-12 text-[#00FE01] mx-auto" />
            </motion.div>
            <h2 className="text-3xl font-bold">Bank-Grade Security</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Your assets are protected by military-grade encryption and
              multi-signature technology. We prioritize your security above
              everything else.
            </p>
            <motion.div
              className="flex flex-wrap justify-center gap-4"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              viewport={{ once: true }}
            >
              {["SOC 2 Certified", "256-bit Encryption", "2FA Protected"].map(
                (badge, index) => (
                  <motion.div
                    key={badge}
                    className="bg-card px-4 py-2 rounded-full text-sm"
                    whileHover={{
                      scale: 1.05,
                      backgroundColor: "rgba(0,254,1,0.1)",
                    }}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    viewport={{ once: true }}
                  >
                    {badge}
                  </motion.div>
                )
              )}
            </motion.div>
          </motion.div>
        </div>
        {/* CTA Section */}
        <div className="py-20 px-6 text-center">
          <div className="max-w-4xl mx-auto space-y-8">
            <h2 className="text-4xl font-bold">Ready to Get Started?</h2>
            <p className="text-xl text-muted-foreground">
              Join thousands of traders who have already discovered the TradeWiseTab
              advantage.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-[#00FE01] hover:bg-[#00FE01] text-black font-medium px-8 h-14 text-lg w-full sm:w-auto"
                onClick={
                  isSignedIn ? () => router.push("/dashboard") : handleSignUp
                }
              >
                {isSignedIn ? "Go to Dashboard" : "Create Free Account"}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 text-lg w-full sm:w-auto"
                onClick={
                  isSignedIn
                    ? () => router.push("/dashboard/funding")
                    : handleSignIn
                }
              >
                {isSignedIn ? "Get Funded" : "Get Funded"}
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6 bg-background/80">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h4 className="font-semibold mb-4">Platform</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="#"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Security
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Pricing
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="#"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Careers
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="#"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Documentation
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Help Center
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  API
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="#"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Privacy
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Terms
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Licenses
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>© 2025 TradeWiseTab. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
