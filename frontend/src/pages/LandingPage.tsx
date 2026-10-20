import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Car,
  Bike,
  ShieldCheck,
  Smartphone,
  Monitor,
  Database,
  Activity,
  Zap,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Lock,
  BarChart3,
  Users,
  DollarSign,
  Clock,
  Sparkles,
  Server,
  ExternalLink,
  QrCode,
  Terminal,
  Copy,
  Check,
  Layers,
  Wifi,
  WifiOff,
  Sliders,
  ChevronDown,
  RefreshCw,
  FileCheck2,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, currentUser } = useAuth();

  // Copy command state
  const [copied, setCopied] = useState(false);
  const dockerCommand = 'git clone https://github.com/pranavk-7117/SmartParking.git && cd SmartParking && ./start.sh';

  const handleCopy = () => {
    navigator.clipboard.writeText(dockerCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Interactive Live Lot Simulator State
  const [selectedVehicle, setSelectedVehicle] = useState<'Car' | 'Scooter'>('Car');
  const [simDurationHours, setSimDurationHours] = useState<number>(2.5);
  const [simSlots, setSimSlots] = useState<Array<{ id: string; type: 'Car' | 'Scooter'; status: 'Vacant' | 'Occupied' | 'Maintenance' }>>([
    { id: 'C-01', type: 'Car', status: 'Occupied' },
    { id: 'C-02', type: 'Car', status: 'Vacant' },
    { id: 'C-03', type: 'Car', status: 'Occupied' },
    { id: 'C-04', type: 'Car', status: 'Occupied' },
    { id: 'C-05', type: 'Car', status: 'Vacant' },
    { id: 'C-06', type: 'Car', status: 'Maintenance' },
    { id: 'S-01', type: 'Scooter', status: 'Occupied' },
    { id: 'S-02', type: 'Scooter', status: 'Vacant' },
  ]);

  // Toggle slot status on click
  const toggleSlot = (id: string) => {
    setSimSlots((prev) =>
      prev.map((slot) => {
        if (slot.id !== id) return slot;
        const nextStatus: Record<'Vacant' | 'Occupied' | 'Maintenance', 'Vacant' | 'Occupied' | 'Maintenance'> = {
          Vacant: 'Occupied',
          Occupied: 'Maintenance',
          Maintenance: 'Vacant',
        };
        return { ...slot, status: nextStatus[slot.status] };
      })
    );
  };

  // Live tariff calculation
  const carRate = 40;
  const scooterRate = 20;
  const ratePerHour = selectedVehicle === 'Car' ? carRate : scooterRate;
  const billedHours = Math.ceil(simDurationHours);
  const calculatedFee = billedHours * ratePerHour;

  const vacantCount = simSlots.filter((s) => s.status === 'Vacant').length;
  const occupiedCount = simSlots.filter((s) => s.status === 'Occupied').length;
  const occupancyPercentage = Math.round((occupiedCount / (simSlots.length - simSlots.filter(s => s.status === 'Maintenance').length || 1)) * 100);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const toggleFaq = (idx: number) => setOpenFaq(openFaq === idx ? null : idx);

  // Animated pulse counters
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => setPulse((p) => !p), 2400);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-primary-light selection:text-white">
      {/* ── Top Navigation Bar ────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-neutral-950/80 border-b border-neutral-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-primary to-cyan-500 p-0.5 shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition">
              <div className="w-full h-full bg-neutral-900 rounded-[10px] flex items-center justify-center">
                <Car className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-white">ParkIT</span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                  Enterprise v2.0
                </span>
              </div>
              <p className="text-xs text-neutral-400 hidden sm:block">Smart Parking Management Platform</p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-300">
            <a href="#solutions" className="hover:text-cyan-400 transition">Solutions</a>
            <a href="#simulator" className="hover:text-cyan-400 transition">Interactive Demo</a>
            <a href="#features" className="hover:text-cyan-400 transition">Features</a>
            <a href="#architecture" className="hover:text-cyan-400 transition">Architecture</a>
            <a href="#faq" className="hover:text-cyan-400 transition">FAQ</a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <Link
              to="/display"
              target="_blank"
              rel="noreferrer"
              className="hidden lg:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 hover:border-neutral-600 transition"
              title="Launch standalone fullscreen LED Kiosk view"
            >
              <Monitor className="w-3.5 h-3.5 text-emerald-400" />
              <span>Live Kiosk</span>
              <ExternalLink className="w-3 h-3 text-neutral-400" />
            </Link>

            {isAuthenticated ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-primary-light to-cyan-500 hover:from-primary hover:to-cyan-600 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition transform hover:-translate-y-0.5"
              >
                <span>Console ({currentUser?.username || 'Admin'})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-primary-light to-cyan-500 hover:from-primary hover:to-cyan-600 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition transform hover:-translate-y-0.5"
              >
                <span>Sign In</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero Section ──────────────────────────────────────────────── */}
      <section className="relative pt-16 pb-24 overflow-hidden">
        {/* Glow ambient background effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-primary/30 to-cyan-500/20 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute top-10 right-10 w-72 h-72 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-neutral-900/90 border border-neutral-800 text-xs font-semibold text-neutral-300 mb-8 shadow-inner">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Real-Time IoT Telemetry & Offline-First Gate Operations</span>
            <span className="text-neutral-500">|</span>
            <span className="text-cyan-400">Dockerized & Cloud Ready</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-5xl mx-auto leading-[1.12]">
            Enterprise Parking Infrastructure,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400">
              Reimagined.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg sm:text-xl text-neutral-400 max-w-3xl mx-auto font-normal leading-relaxed">
            A unified ecosystem connecting <strong className="text-neutral-200">handheld Android gate scanners</strong>,{' '}
            <strong className="text-neutral-200">real-time digital kiosk displays</strong>, and an{' '}
            <strong className="text-neutral-200">intelligent telemetry command center</strong> for commercial and municipal parking facilities.
          </p>

          {/* Dual CTAs */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl text-base font-bold bg-white text-neutral-950 hover:bg-neutral-100 shadow-xl shadow-white/10 hover:shadow-white/20 transition transform hover:-translate-y-0.5"
            >
              <span>{isAuthenticated ? 'Open Admin Console' : 'Launch Admin Demo'}</span>
              <ArrowRight className="w-5 h-5 text-neutral-950" />
            </button>

            <Link
              to="/display"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl text-base font-bold bg-neutral-900/90 hover:bg-neutral-800 text-neutral-100 border border-neutral-700/80 hover:border-neutral-600 transition"
            >
              <Monitor className="w-5 h-5 text-emerald-400" />
              <span>View Driver Kiosk</span>
              <ExternalLink className="w-4 h-4 text-neutral-400" />
            </Link>

            <a
              href="#simulator"
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl text-sm font-semibold text-neutral-400 hover:text-white hover:bg-neutral-900/50 transition"
            >
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Try Simulator</span>
            </a>
          </div>

          {/* Trust & Metric Highlights Bar */}
          <div className="mt-16 pt-10 border-t border-neutral-900/90 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto text-left">
            <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800/40">
              <div className="text-2xl sm:text-3xl font-black text-cyan-400">&lt; 1.2s</div>
              <div className="text-xs font-medium text-neutral-400 mt-1">Gate Processing Time</div>
            </div>
            <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800/40">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400">100%</div>
              <div className="text-xs font-medium text-neutral-400 mt-1">Offline Gate Continuity</div>
            </div>
            <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800/40">
              <div className="text-2xl sm:text-3xl font-black text-white">45+ Slots</div>
              <div className="text-xs font-medium text-neutral-400 mt-1">Real-Time Camp Facility</div>
            </div>
            <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800/40">
              <div className="text-2xl sm:text-3xl font-black text-indigo-400">AES-256</div>
              <div className="text-xs font-medium text-neutral-400 mt-1">Encrypted Telemetry & MFA</div>
            </div>
          </div>
        </div>

        {/* ── Interactive Hero UI Showcase Window ───────────────────── */}
        <div className="max-w-6xl mx-auto mt-16 px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-2xl p-1 bg-gradient-to-b from-neutral-700/50 via-neutral-800/20 to-transparent shadow-2xl">
            <div className="rounded-[15px] bg-neutral-900/90 backdrop-blur-xl border border-neutral-800 p-6 sm:p-8">
              {/* Window Header */}
              <div className="flex items-center justify-between pb-6 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-3 text-xs font-mono text-neutral-400">parkit.live/console — Camp Facility Command</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-800/50">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Websocket Live Polling (2.5s)
                  </span>
                </div>
              </div>

              {/* Dashboard Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                {/* Metric 1 */}
                <div className="p-5 rounded-xl bg-neutral-950/70 border border-neutral-800/80">
                  <div className="flex items-center justify-between text-neutral-400 text-xs font-semibold uppercase">
                    <span>Cars Live Occupancy</span>
                    <Car className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="mt-3 flex items-baseline gap-3">
                    <span className="text-3xl font-extrabold text-white">22 / 30</span>
                    <span className="text-xs font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/50">
                      73% Filled
                    </span>
                  </div>
                  <div className="w-full bg-neutral-800 h-2 rounded-full mt-3 overflow-hidden">
                    <div className="bg-gradient-to-r from-cyan-500 to-amber-500 h-full rounded-full transition-all" style={{ width: '73%' }} />
                  </div>
                  <div className="mt-2 text-[11px] text-neutral-400 flex justify-between">
                    <span>8 Vacant Bays Available</span>
                    <span>Rate: ₹40/hr</span>
                  </div>
                </div>

                {/* Metric 2 */}
                <div className="p-5 rounded-xl bg-neutral-950/70 border border-neutral-800/80">
                  <div className="flex items-center justify-between text-neutral-400 text-xs font-semibold uppercase">
                    <span>Scooters Live Occupancy</span>
                    <Bike className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="mt-3 flex items-baseline gap-3">
                    <span className="text-3xl font-extrabold text-white">6 / 15</span>
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                      40% Filled
                    </span>
                  </div>
                  <div className="w-full bg-neutral-800 h-2 rounded-full mt-3 overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all" style={{ width: '40%' }} />
                  </div>
                  <div className="mt-2 text-[11px] text-neutral-400 flex justify-between">
                    <span>9 Vacant Bays Available</span>
                    <span>Rate: ₹20/hr</span>
                  </div>
                </div>

                {/* Metric 3 */}
                <div className="p-5 rounded-xl bg-neutral-950/70 border border-neutral-800/80">
                  <div className="flex items-center justify-between text-neutral-400 text-xs font-semibold uppercase">
                    <span>Today's Revenue</span>
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="mt-3 flex items-baseline gap-3">
                    <span className="text-3xl font-extrabold text-emerald-400">₹ 8,420</span>
                    <span className="text-xs text-neutral-400">+18% vs yesterday</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-neutral-300 pt-2 border-t border-neutral-800/80">
                    <span>Sessions Completed: <strong>142</strong></span>
                    <span className="text-cyan-400 font-medium">Auto Receipted</span>
                  </div>
                </div>
              </div>

              {/* Live Slot Badges Strip */}
              <div className="mt-6 p-4 rounded-xl bg-neutral-950/40 border border-neutral-800/60">
                <div className="flex items-center justify-between mb-3 text-xs font-semibold text-neutral-400">
                  <span>Camp Facility — Gate Zone A (Sample Live Slot Matrix)</span>
                  <span className="text-neutral-500 text-[11px]">Auto updates upon gate sensor triggers</span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                  {['C-01', 'C-02', 'C-03', 'C-04', 'C-05', 'C-06', 'S-01', 'S-02'].map((code, idx) => {
                    const isVacant = idx % 3 === 1;
                    const isMaint = idx === 5;
                    return (
                      <div
                        key={code}
                        className={`p-2.5 rounded-lg border text-center transition-all ${
                          isMaint
                            ? 'bg-amber-950/30 border-amber-800/50 text-amber-300'
                            : isVacant
                            ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
                            : 'bg-red-950/30 border-red-800/50 text-red-300'
                        }`}
                      >
                        <div className="text-[10px] font-mono text-neutral-400">{code}</div>
                        <div className="text-xs font-bold mt-0.5">{isMaint ? 'Maint' : isVacant ? 'Vacant' : 'Occupied'}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── The 3 Core Pillars (Trio Showcase) ────────────────────────── */}
      <section id="solutions" className="py-24 border-t border-neutral-800/80 bg-neutral-900/30 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-cyan-400">Unified System Architecture</h2>
            <p className="mt-3 text-3xl sm:text-4xl font-extrabold text-white">
              Three Integrated Platforms. One Cohesive Ecosystem.
            </p>
            <p className="mt-4 text-base text-neutral-400">
              Designed to eliminate revenue leakage, prevent gate bottlenecks, and give municipal managers total visibility over physical spaces.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Pillar 1: Admin Console */}
            <div className="rounded-2xl bg-neutral-900/80 border border-neutral-800 p-8 flex flex-col justify-between hover:border-cyan-500/50 transition group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="mt-6 text-xl font-bold text-white">Central Admin Console</h3>
                <p className="mt-2 text-sm text-neutral-400 leading-relaxed">
                  Real-time telemetry command center built with React 18 and Vite. Gives managers live slot heatmaps, tariff controls, operator shift audits, and instant PDF receipts.
                </p>

                <ul className="mt-6 space-y-2.5 text-xs text-neutral-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Real-time vacancy & occupancy telemetry</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Multi-facility switcher with custom rates</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>One-click PDF receipt generator & CSV exports</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Granular RBAC (Admin & Operator roles)</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-neutral-800">
                <button
                  onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition"
                >
                  <span>Explore Admin Features</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Pillar 2: Android Scanner App */}
            <div className="rounded-2xl bg-neutral-900/80 border border-neutral-800 p-8 flex flex-col justify-between hover:border-emerald-500/50 transition group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="mt-6 text-xl font-bold text-white">Operator Handheld App</h3>
                <p className="mt-2 text-sm text-neutral-400 leading-relaxed">
                  Native Android Jetpack Compose application built for gate personnel. Features CameraX plate recognition, bluetooth thermal printing, and offline SQLite cache.
                </p>

                <ul className="mt-6 space-y-2.5 text-xs text-neutral-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Offline-First: Local Room cache syncs on reconnect</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Optical license plate scan (ML Kit ANPR)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Instant thermal bluetooth paper ticket printer</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Quick UPI QR & cash settlement at gate-out</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-neutral-800 flex items-center justify-between">
                <span className="text-xs font-mono text-neutral-400">Kotlin 2.0 / Jetpack</span>
                <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800/50">
                  Zero Network Stalls
                </span>
              </div>
            </div>

            {/* Pillar 3: High-Visibility Driver Kiosk */}
            <div className="rounded-2xl bg-neutral-900/80 border border-neutral-800 p-8 flex flex-col justify-between hover:border-amber-500/50 transition group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-950/80 border border-amber-800/60 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                  <Monitor className="w-6 h-6" />
                </div>
                <h3 className="mt-6 text-xl font-bold text-white">Driver Entrance Kiosk</h3>
                <p className="mt-2 text-sm text-neutral-400 leading-relaxed">
                  Standalone, zero-distraction fullscreen digital signage designed for high-glare outdoor gantry LED screens. Guides incoming motorists directly to vacant zones.
                </p>

                <ul className="mt-6 space-y-2.5 text-xs text-neutral-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>High-contrast Archivo Black font visible at 30m</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Dynamic color-coded status badges (GREEN / RED)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Sub-second state synchronization via HTTP polling</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>No login required: Deployable on any Smart TV or browser</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-neutral-800">
                <Link
                  to="/display"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-400 hover:text-amber-300 transition"
                >
                  <span>Launch Live Kiosk Route</span>
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Interactive Live Lot & Tariff Simulator ──────────────────── */}
      <section id="simulator" className="py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-950 text-cyan-400 border border-cyan-800/60 mb-3">
              <Sliders className="w-3.5 h-3.5" />
              Interactive Prototype
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Test Drive the ParkIT Smart Engine
            </h2>
            <p className="mt-3 text-base text-neutral-400">
              Click slots to simulate arrivals and departures, test dynamic rate calculations, and inspect instant tariff generation in real time.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Interactive Slot Map Simulator */}
            <div className="lg:col-span-7 rounded-2xl bg-neutral-900 border border-neutral-800 p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-neutral-800">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>Live Slot Layout</span>
                    <span className="text-xs font-normal text-neutral-400">(Click a slot to toggle state)</span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">Facility: Camp Main Bay Zone</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Vacant ({vacantCount})
                  </span>
                  <span className="flex items-center gap-1.5 text-red-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Occupied ({occupiedCount})
                  </span>
                </div>
              </div>

              {/* Slot Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                {simSlots.map((slot) => {
                  const isVacant = slot.status === 'Vacant';
                  const isMaint = slot.status === 'Maintenance';
                  return (
                    <button
                      key={slot.id}
                      onClick={() => toggleSlot(slot.id)}
                      className={`p-4 rounded-xl border text-left transition-all transform active:scale-95 hover:shadow-lg ${
                        isMaint
                          ? 'bg-amber-950/30 border-amber-700/60 hover:border-amber-500'
                          : isVacant
                          ? 'bg-emerald-950/30 border-emerald-700/60 hover:border-emerald-500'
                          : 'bg-red-950/30 border-red-700/60 hover:border-red-500'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-neutral-400">{slot.id}</span>
                        {slot.type === 'Car' ? (
                          <Car className="w-4 h-4 text-neutral-400" />
                        ) : (
                          <Bike className="w-4 h-4 text-neutral-400" />
                        )}
                      </div>
                      <div className="mt-3">
                        <div
                          className={`text-sm font-black ${
                            isMaint ? 'text-amber-400' : isVacant ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {slot.status}
                        </div>
                        <div className="text-[10px] text-neutral-400 mt-0.5">
                          {isVacant ? 'Click to occupy' : isMaint ? 'Click to free' : 'Click to service'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Live Occupancy Gauge Bar */}
              <div className="mt-8 pt-6 border-t border-neutral-800">
                <div className="flex items-center justify-between text-xs text-neutral-300 font-medium mb-2">
                  <span>Current Facility Capacity Utilization</span>
                  <span className="font-bold text-cyan-400">{occupancyPercentage}% Occupied</span>
                </div>
                <div className="w-full bg-neutral-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      occupancyPercentage > 80
                        ? 'bg-red-500'
                        : occupancyPercentage > 50
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${occupancyPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Right: Dynamic Tariff Engine Calculator */}
            <div className="lg:col-span-5 rounded-2xl bg-neutral-900 border border-neutral-800 p-6 sm:p-8">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <span>Dynamic Rate Engine</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Computes minute-accurate parking dues with configurable hourly tiers.
              </p>

              {/* Vehicle Selection */}
              <div className="mt-6">
                <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">Select Vehicle Type</label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <button
                    onClick={() => setSelectedVehicle('Car')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold transition ${
                      selectedVehicle === 'Car'
                        ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-950'
                        : 'bg-neutral-800/60 border-neutral-700 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Car className="w-4 h-4" />
                    <span>Four-Wheeler (₹40/h)</span>
                  </button>
                  <button
                    onClick={() => setSelectedVehicle('Scooter')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold transition ${
                      selectedVehicle === 'Scooter'
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-950'
                        : 'bg-neutral-800/60 border-neutral-700 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Bike className="w-4 h-4" />
                    <span>Two-Wheeler (₹20/h)</span>
                  </button>
                </div>
              </div>

              {/* Duration Slider */}
              <div className="mt-6">
                <div className="flex items-center justify-between text-xs font-semibold text-neutral-300">
                  <span className="uppercase tracking-wider">Parking Duration</span>
                  <span className="text-cyan-400 font-bold">{simDurationHours} Hours ({Math.round(simDurationHours * 60)} mins)</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="12"
                  step="0.5"
                  value={simDurationHours}
                  onChange={(e) => setSimDurationHours(parseFloat(e.target.value))}
                  className="w-full mt-3 accent-cyan-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-neutral-500 mt-1">
                  <span>30 mins</span>
                  <span>4 hrs</span>
                  <span>8 hrs</span>
                  <span>12 hrs</span>
                </div>
              </div>

              {/* Bill Receipt Preview Card */}
              <div className="mt-6 p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-2 text-xs">
                <div className="flex justify-between text-neutral-400">
                  <span>Base Rate per Hour:</span>
                  <span className="font-mono text-neutral-200">₹ {ratePerHour}.00</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Billed Duration (Ceil):</span>
                  <span className="font-mono text-neutral-200">{billedHours} hour(s)</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Grace Period:</span>
                  <span className="font-mono text-emerald-400">10 mins applied</span>
                </div>
                <div className="pt-3 border-t border-neutral-800 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-white">Estimated Due:</span>
                  <span className="text-2xl font-black text-emerald-400">₹ {calculatedFee}.00</span>
                </div>
              </div>

              {/* Simulated QR Action */}
              <div className="mt-6 flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center shrink-0">
                  <QrCode className="w-7 h-7 text-cyan-400" />
                </div>
                <div className="text-xs text-neutral-400">
                  <span className="text-white font-medium">Digital Pass & UPI Ready:</span> Tickets print instantly with scannable QR tokens for contactless exit.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature Highlights Grid ─────────────────────────────────── */}
      <section id="features" className="py-24 border-t border-neutral-800/80 bg-neutral-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-cyan-400">Engineered for Reliability</h2>
            <p className="mt-3 text-3xl sm:text-4xl font-extrabold text-white">
              Everything Your Operation Demands
            </p>
            <p className="mt-4 text-base text-neutral-400">
              Built from the ground up to prevent downtime, enforce accountability, and simplify daily parking enforcement.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition">
              <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-800/50 flex items-center justify-center text-cyan-400 mb-5">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Zero-Latency Polling</h3>
              <p className="mt-2 text-sm text-neutral-400 leading-relaxed">
                Frontend dashboard and kiosk displays synchronize continuously without requiring full-page browser refreshes or causing UI flickering.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800/50 flex items-center justify-center text-emerald-400 mb-5">
                <WifiOff className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Offline Gate Resiliency</h3>
              <p className="mt-2 text-sm text-neutral-400 leading-relaxed">
                If the municipal Wi-Fi or cellular network drops, Android gate operators continue printing entry passes and caching sessions locally without delays.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition">
              <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-800/50 flex items-center justify-center text-indigo-400 mb-5">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Bank-Grade MFA Security</h3>
              <p className="mt-2 text-sm text-neutral-400 leading-relaxed">
                Protects administrative actions with TOTP two-factor authentication, AES-256 encrypted secret seeds, and token revocation upon password change.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition">
              <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-800/50 flex items-center justify-center text-amber-400 mb-5">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Automated PDF & CSV Audits</h3>
              <p className="mt-2 text-sm text-neutral-400 leading-relaxed">
                Generate branded receipts with QR validation codes, export financial records to CSV, and analyze hourly turnover trends by vehicle type.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition">
              <div className="w-10 h-10 rounded-xl bg-sky-950/80 border border-sky-800/50 flex items-center justify-center text-sky-400 mb-5">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Multi-Site Scalability</h3>
              <p className="mt-2 text-sm text-neutral-400 leading-relaxed">
                Manage Camp, Deccan, Airport, or Station facilities from a single dashboard. Define distinct slot capacities, gate configurations, and tariff structures.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition">
              <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-800/50 flex items-center justify-center text-purple-400 mb-5">
                <Server className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">One-Command Docker Stack</h3>
              <p className="mt-2 text-sm text-neutral-400 leading-relaxed">
                PostgreSQL 16, Express API with Prisma migrations, and Vite Nginx container images with non-root security and automated startup scripts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Architecture & Technology Stack ─────────────────────────── */}
      <section id="architecture" className="py-24 border-t border-neutral-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-cyan-400">Technical Foundation</h2>
            <p className="mt-3 text-3xl sm:text-4xl font-extrabold text-white">
              Built on Modern, Battle-Tested Technologies
            </p>
            <p className="mt-4 text-base text-neutral-400">
              Clean separation of concerns ensuring peak performance, type safety, and zero deployment friction.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Tech 1 */}
            <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 text-center">
              <div className="text-xs font-mono text-cyan-400">FRONTEND</div>
              <div className="mt-2 text-xl font-bold text-white">React 18 + Vite</div>
              <p className="mt-2 text-xs text-neutral-400">Tailwind CSS, Lucide Icons, jsPDF auto-table reporting</p>
            </div>

            {/* Tech 2 */}
            <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 text-center">
              <div className="text-xs font-mono text-emerald-400">BACKEND</div>
              <div className="mt-2 text-xl font-bold text-white">Node.js + Express</div>
              <p className="mt-2 text-xs text-neutral-400">TypeScript 5.7, Zod validation, Helmet, Rate Limiters</p>
            </div>

            {/* Tech 3 */}
            <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 text-center">
              <div className="text-xs font-mono text-indigo-400">DATA TIER</div>
              <div className="mt-2 text-xl font-bold text-white">PostgreSQL 16</div>
              <p className="mt-2 text-xs text-neutral-400">Prisma ORM, transactional ACID consistency, automated migrations</p>
            </div>

            {/* Tech 4 */}
            <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 text-center">
              <div className="text-xs font-mono text-purple-400">MOBILE APP</div>
              <div className="mt-2 text-xl font-bold text-white">Android Kotlin</div>
              <p className="mt-2 text-xs text-neutral-400">Jetpack Compose, CameraX, ML Kit OCR, SQLite Room cache</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Quick Deploy Banner ─────────────────────────────────────── */}
      <section className="py-20 border-t border-neutral-800/80 bg-gradient-to-b from-neutral-900 to-neutral-950">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-cyan-950 border border-cyan-700/60 flex items-center justify-center text-cyan-400 mx-auto mb-6">
            <Terminal className="w-7 h-7" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Run the Entire Ecosystem in Seconds
          </h2>
          <p className="mt-3 text-neutral-400 text-sm max-w-xl mx-auto">
            Everything is pre-configured with Docker Compose. Automated migrations, initial facility seeds, and default accounts start up with one command.
          </p>

          {/* Code Snippet Box */}
          <div className="mt-8 max-w-2xl mx-auto rounded-xl bg-neutral-950 border border-neutral-800 p-4 flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-3 overflow-x-auto text-left text-xs font-mono text-cyan-300">
              <span className="text-neutral-500 select-none">$</span>
              <span>{dockerCommand}</span>
            </div>
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition shrink-0 ml-3"
              title="Copy to clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-neutral-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" /> No local Node or PostgreSQL installation required
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" /> Default credentials pre-seeded
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" /> Linux, macOS, and Windows ready
            </span>
          </div>
        </div>
      </section>

      {/* ── Frequently Asked Questions (FAQ) ────────────────────────── */}
      <section id="faq" className="py-24 border-t border-neutral-800/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-cyan-400">Everything You Need to Know</h2>
            <p className="mt-3 text-3xl font-extrabold text-white">Frequently Asked Questions</p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: 'What happens if the internet connection drops at the parking gate?',
                a: 'The handheld Android operator app is built offline-first using Android Room (SQLite). Gate staff can continue capturing vehicle entries, scanning plate numbers, and issuing thermal printed tickets. When network connectivity is restored, all cached records automatically synchronize with the central database.',
              },
              {
                q: 'How does the driver entrance kiosk display work?',
                a: 'The Kiosk Display (/display) is a standalone, unauthenticated fullscreen web route. It can be opened on any web-enabled digital signage, smart TV, or tablet installed at entrance gantries. It utilizes high-contrast typography readable at high distances and syncs slot counts dynamically.',
              },
              {
                q: 'Can we configure different rates for cars, scooters, and peak hours?',
                a: 'Yes. The system features a Rate Master module where administrators can configure independent hourly rates, grace periods, and vehicle types for each facility. Changes take effect immediately without server restarts.',
              },
              {
                q: 'How is security and multi-user authentication handled?',
                a: 'The system implements role-based access control (Admin and Operator roles) with JWT tokens, token versioning, rate limiting, and optional TOTP Two-Factor Authentication (MFA). Brute-force attacks are thwarted through database-backed lockout windows.',
              },
              {
                q: 'Can ParkIT be deployed in multi-facility municipal configurations?',
                a: 'Yes. The data model supports multiple facilities under one management umbrella. Administrators can toggle between sites using the header site switcher and monitor separate slot allocations and revenue streams.',
              },
            ].map((faq, idx) => (
              <div
                key={idx}
                className="rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden transition"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-neutral-850 transition"
                >
                  <span className="font-semibold text-sm sm:text-base text-white">{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-neutral-400 transition-transform ${
                      openFaq === idx ? 'rotate-180 text-cyan-400' : ''
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="p-5 pt-0 text-sm text-neutral-400 border-t border-neutral-800/60 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t border-neutral-800/80 bg-neutral-950 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-cyan-500 flex items-center justify-center">
                <Car className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-black text-white">ParkIT</span>
              <span className="text-xs text-neutral-500">© 2026 ParkIT Systems. All rights reserved.</span>
            </div>

            <div className="flex items-center gap-6 text-xs text-neutral-400">
              <Link to="/login" className="hover:text-cyan-400 transition">Admin Login</Link>
              <Link to="/display" className="hover:text-cyan-400 transition">Driver Kiosk</Link>
              <a href="#simulator" className="hover:text-cyan-400 transition">Interactive Demo</a>
              <a href="https://github.com/pranavk-7117/SmartParking" target="_blank" rel="noreferrer" className="hover:text-cyan-400 transition">GitHub Repo</a>
            </div>

            <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono bg-emerald-950/40 px-3 py-1.5 rounded-full border border-emerald-800/50">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>All Systems Operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
