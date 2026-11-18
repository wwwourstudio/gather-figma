import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Calendar,
  CreditCard,
  Flame,
  Heart,
  MessageSquare,
  Mic,
  MicOff,
  Plus,
  Sparkles,
  Trash2,
  Video,
  VideoOff,
} from 'lucide-react';
import { ScheduledShow, WatchMode } from '../types/studio';
import { GatherLogo } from './GatherLogo';

interface LandingViewProps {
  scheduledShows: ScheduledShow[];
  isSignedIn?: boolean;
  userName?: string | null;
  onCreateStudio: (initialFormat?: WatchMode) => void;
  onJoinCode: (codeOrUrl: string) => void;
  onOpenWatchDemo: (mode: WatchMode) => void;
  onOpenSchedule: () => void;
  onOpenAuth?: () => void;
  onLaunchScheduled: (show: ScheduledShow) => void;
  onDeleteScheduled: (id: string) => void;
}

type StageSceneDemo = 'duo' | 'solo' | 'pip';

interface DemoChatEntry {
  id: string;
  name: string;
  initials: string;
  tone: string;
  text: string;
}

const DEMO_CHATS: Record<WatchMode, DemoChatEntry[]> = {
  standard: [
    { id: 'c1', name: 'Dev', initials: 'D', tone: 'bg-amber-500/85 text-white', text: 'What camera is that?' },
    { id: 'c2', name: 'Ana', initials: 'A', tone: 'bg-sky-500/85 text-white', text: 'Hi from Lisbon!' },
    { id: 'c3', name: 'Riley', initials: 'R', tone: 'bg-rose-500/85 text-white', text: 'This setup is so clean.' },
    { id: 'c4', name: 'Sam', initials: 'S', tone: 'bg-emerald-500/85 text-white', text: 'Audio mix sounds studio-grade' },
    { id: 'c5', name: 'Clara', initials: 'C', tone: 'bg-indigo-500/85 text-white', text: 'Love the split duo framing!' },
    { id: 'c6', name: 'Theo', initials: 'T', tone: 'bg-cyan-500/85 text-white', text: 'Wait that AI producer switch was instant' },
    { id: 'c7', name: 'Mina', initials: 'M', tone: 'bg-violet-500/85 text-white', text: 'Following for Episode 09' },
  ],
  shop: [
    { id: 's1', name: 'Maya', initials: 'M', tone: 'bg-indigo-500/85 text-white', text: 'Does the 16oz mug ship today?' },
    { id: 's2', name: 'Jon', initials: 'J', tone: 'bg-emerald-500/85 text-white', text: 'Just grabbed the 2x duo!' },
    { id: 's3', name: 'Nina', initials: 'N', tone: 'bg-violet-500/85 text-white', text: 'Glaze finish looks unreal.' },
    { id: 's4', name: 'Lucas', initials: 'L', tone: 'bg-amber-500/85 text-white', text: '1-click bag worked in 2 secs' },
    { id: 's5', name: 'Elena', initials: 'E', tone: 'bg-rose-500/85 text-white', text: 'Is cobalt glaze dishwasher safe?' },
    { id: 's6', name: 'Kenji', initials: 'K', tone: 'bg-sky-500/85 text-white', text: 'Claimed #1048 before it sold out!' },
  ],
  gamer: [
    { id: 'g1', name: 'Kuro', initials: 'K', tone: 'bg-cyan-500/85 text-white', text: 'Sheriff only round incoming' },
    { id: 'g2', name: 'Nova', initials: 'N', tone: 'bg-rose-500/85 text-white', text: 'Voted Ascent 64%!' },
    { id: 'g3', name: 'Rex', initials: 'R', tone: 'bg-amber-500/85 text-white', text: 'Clip that 4K clutch!' },
    { id: 'g4', name: 'Zed', initials: 'Z', tone: 'bg-indigo-500/85 text-white', text: 'Joined the squad queue #3' },
    { id: 'g5', name: 'Sora', initials: 'S', tone: 'bg-emerald-500/85 text-white', text: 'Zero latency on this stream' },
    { id: 'g6', name: 'Bram', initials: 'B', tone: 'bg-violet-500/85 text-white', text: 'B main mid split next round' },
  ],
};

function formatDemoClock(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatMinSec(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const LandingView: React.FC<LandingViewProps> = ({
  scheduledShows,
  isSignedIn = false,
  userName,
  onCreateStudio,
  onJoinCode,
  onOpenWatchDemo,
  onOpenSchedule,
  onOpenAuth,
  onLaunchScheduled,
  onDeleteScheduled,
}) => {
  const [joinInput, setJoinInput] = useState('');
  const [joinError, setJoinError] = useState('');
  const [previewMode, setPreviewMode] = useState<WatchMode>('standard');
  const [stageLayout, setStageLayout] = useState<StageSceneDemo>('duo');
  const [demoMicOn, setDemoMicOn] = useState(true);
  const [demoCamOn, setDemoCamOn] = useState(true);
  const [previewTipAmount, setPreviewTipAmount] = useState<number>(10);
  const [previewTipSent, setPreviewTipSent] = useState(false);
  const [previewChatDraft, setPreviewChatDraft] = useState('');
  const [extraPreviewChats, setExtraPreviewChats] = useState<DemoChatEntry[]>([]);

  // Live homepage mockup animation clocks
  const [liveSec, setLiveSec] = useState(42 * 60 + 18);
  const [chatCursor, setChatCursor] = useState(0);
  const [activeSpeaker, setActiveSpeaker] = useState<'maya' | 'jordan'>('maya');
  const [floatingBursts, setFloatingBursts] = useState<Array<{ id: number; left: number; kind: 'heart' | 'flame' | 'spark' }>>([]);

  useEffect(() => {
    const secTimer = window.setInterval(() => {
      setLiveSec((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(secTimer);
  }, []);

  useEffect(() => {
    const speakerTimer = window.setInterval(() => {
      setActiveSpeaker((prev) => (prev === 'maya' ? 'jordan' : 'maya'));
    }, 3400);
    return () => window.clearInterval(speakerTimer);
  }, []);

  useEffect(() => {
    const chatTimer = window.setInterval(() => {
      setChatCursor((c) => c + 1);
      const id = Date.now() + Math.floor(Math.random() * 1000);
      const kinds: Array<'heart' | 'flame' | 'spark'> = ['heart', 'flame', 'spark'];
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      const left = 18 + Math.floor(Math.random() * 64);
      setFloatingBursts((prev) => [...prev.slice(-4), { id, left, kind }]);
    }, 2800);
    return () => window.clearInterval(chatTimer);
  }, []);

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = joinInput.trim();
    if (!trimmed) {
      setJoinError('Paste an invite link or enter a room code.');
      return;
    }
    setJoinError('');
    onJoinCode(trimmed);
  };

  const handleSendPreviewChat = (e: React.FormEvent) => {
    e.preventDefault();
    const text = previewChatDraft.trim();
    if (!text) return;
    const sender = userName?.trim() || 'You';
    const initials = sender[0]?.toUpperCase() || 'Y';
    setExtraPreviewChats((prev) => [
      ...prev.slice(-3),
      {
        id: `demo-usr-${Date.now()}`,
        name: sender.split(' ')[0],
        initials,
        tone: 'bg-indigo-500 text-white',
        text,
      },
    ]);
    setFloatingBursts((prev) => [
      ...prev.slice(-4),
      { id: Date.now(), left: 74, kind: 'spark' },
    ]);
    setPreviewChatDraft('');
  };

  const cycleStageScene = () => {
    setStageLayout((prev) => (prev === 'duo' ? 'solo' : prev === 'solo' ? 'pip' : 'duo'));
  };

  const activeChats = useMemo(() => {
    const pool = DEMO_CHATS[previewMode];
    const rotated: DemoChatEntry[] = [];
    for (let i = 0; i < 4; i++) {
      const idx = (chatCursor + i) % pool.length;
      const item = pool[idx];
      rotated.push({
        ...item,
        id: `${item.id}-${Math.floor((chatCursor + i) / pool.length)}`,
      });
    }
    return [...rotated, ...extraPreviewChats].slice(-4);
  }, [previewMode, chatCursor, extraPreviewChats]);

  const liveViewerCount = 1284 + (chatCursor % 9) - 2;
  const shopCountdownSec = Math.max(45, 582 - (liveSec % 540));
  const shopUnitsLeft = Math.max(3, 9 - (chatCursor % 4));
  const gamerVotePct = 64 + ((chatCursor % 3) - 1) * 2;
  const pipSlideProgress = 68 + ((chatCursor % 5) * 6);

  return (
    <main className="flex-1 min-h-0 flex flex-col justify-between overflow-y-auto gather-scroll animate-gather-panel">
      <div className="flex-1 min-h-0 flex items-center justify-center py-6 sm:py-10">
        <div className="w-[92%] max-w-[1320px] mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,0.84fr)_minmax(0,1.16fr)] gap-10 lg:gap-14 items-center">
          {/* Left Column: Clean Editorial Hero */}
          <div className="flex flex-col items-start gap-6">
            {/* Unboxed Architectural Kicker */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-[9px] bg-[var(--fill)] border border-[var(--line-2)] grid place-items-center shrink-0">
                <GatherLogo size={18} />
              </div>
              <span className="text-[12px] font-semibold tracking-[0.14em] uppercase text-[var(--ink-2)]">
                Broadcasting, reimagined
              </span>
            </div>

            {/* Balanced Two-Line Display Headline */}
            <div className="space-y-4">
              <h1 className="font-display text-[clamp(42px,4.8vw,64px)] font-extrabold leading-[0.98] tracking-[-0.04em] text-[var(--ink)] text-balance">
                Your show.
                <span className="block text-[var(--ink-2)] mt-1">Live, together.</span>
              </h1>

              <p className="text-[15.5px] leading-[1.6] text-[var(--ink-2)] max-w-[42ch]">
                Bring guests, scenes, live chat, and an AI producer into one beautiful studio. Go
                live everywhere — right from your browser.
              </p>
            </div>

            {/* Primary CTA + Text Schedule Action */}
            <div className="flex flex-wrap items-center gap-6 pt-0.5">
              <button
                type="button"
                onClick={() => onCreateStudio(previewMode)}
                className="h-12 px-6 rounded-[12px] gather-btn-primary text-[14.5px] font-semibold inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                <span>Create a studio</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onOpenSchedule}
                className="pb-1 border-b border-[var(--line-2)] hover:border-[var(--ink)] text-[14px] font-medium text-[var(--ink-2)] hover:text-[var(--ink)] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-[var(--cyan)]" />
                <span>Schedule for later</span>
              </button>
            </div>

            {/* Unified Invite Bar */}
            <div className="w-full max-w-[460px] space-y-2 pt-1">
              <div className="text-[12.5px] text-[var(--ink-3)]">Already have an invite?</div>
              <form
                onSubmit={handleJoinSubmit}
                className="h-12 pl-4 pr-1.5 rounded-[13px] bg-[var(--surface-2)] border border-[var(--line-2)] focus-within:border-[var(--accent)] flex items-center gap-2 transition-colors"
              >
                <input
                  type="text"
                  value={joinInput}
                  onChange={(e) => setJoinInput(e.target.value)}
                  placeholder="Paste link or room code"
                  aria-label="Invite link or studio code"
                  spellCheck={false}
                  className="flex-1 min-w-0 bg-transparent text-[13.5px] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none"
                />
                <button
                  type="submit"
                  className="h-9 px-4 rounded-[9px] bg-[var(--fill-hover)] hover:bg-[var(--fill-active)] border border-[var(--line-2)] text-[13px] font-semibold text-[var(--ink)] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  <span>Join</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
              {joinError && <p className="text-xs text-[var(--danger)]">{joinError}</p>}
            </div>

            {/* Unboxed Metadata Highlights */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-[var(--ink-3)]">
              <span>No downloads</span>
              <span aria-hidden="true" className="text-[var(--line-2)]">
                ·
              </span>
              <span>Free to start</span>
              <span aria-hidden="true" className="text-[var(--line-2)]">
                ·
              </span>
              <span>0% platform cut</span>
              <span aria-hidden="true" className="text-[var(--line-2)]">
                ·
              </span>
              <span>Go live in minutes</span>
            </div>

            {/* Scheduled Shows (when saved) */}
            {scheduledShows.length > 0 && (
              <div className="w-full max-w-[460px] flex flex-wrap gap-2">
                {scheduledShows.slice(0, 2).map((show) => (
                  <div
                    key={show.id}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-[9px] gather-card-obsidian text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => onLaunchScheduled(show)}
                      className="font-semibold text-[var(--accent-text)] hover:underline whitespace-nowrap cursor-pointer"
                    >
                      {show.title} ({show.date})
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteScheduled(show.id)}
                      aria-label="Remove scheduled show"
                      className="text-[var(--ink-3)] hover:text-[var(--danger)] cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Animated Interactive Studio Browser Window Showcase */}
          <div className="relative flex flex-col gap-3.5 w-full">
            {/* Ambient Cobalt-Indigo Halo & Concentric Orbital Ring */}
            <div
              className="pointer-events-none absolute -inset-8 rounded-full opacity-75 blur-3xl animate-pulse"
              aria-hidden="true"
              style={{
                animationDuration: '7s',
                background:
                  'radial-gradient(58% 58% at 42% 44%, rgba(59,130,246,0.28), transparent 72%), radial-gradient(48% 48% at 78% 72%, rgba(124,58,237,0.24), transparent 72%)',
              }}
            />
            <div
              className="pointer-events-none hidden sm:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] aspect-square rounded-full border border-[var(--line)] opacity-60"
              aria-hidden="true"
            />

            {/* Main Elevated Studio Window */}
            <div className="relative rounded-[20px] gather-card-obsidian overflow-visible">
              {/* Floating Live Viewers Cluster (Top-Right Offset) */}
              <div className="hidden sm:flex items-center gap-2.5 px-3.5 py-2 rounded-[14px] gather-card-obsidian absolute -top-4 right-5 z-20">
                <div className="flex -space-x-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-500 text-white text-[9.5px] font-bold grid place-items-center ring-2 ring-[var(--bg)]">
                    JD
                  </span>
                  <span className="w-6 h-6 rounded-full bg-sky-500 text-white text-[9.5px] font-bold grid place-items-center ring-2 ring-[var(--bg)]">
                    MK
                  </span>
                  <span className="w-6 h-6 rounded-full bg-slate-700 text-white text-[9.5px] font-semibold grid place-items-center ring-2 ring-[var(--bg)]">
                    +8
                  </span>
                </div>
                <div className="leading-tight">
                  <div className="text-[12.5px] font-mono-num font-bold text-[var(--ink)]">
                    {liveViewerCount.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-[var(--ink-3)]">watching now</div>
                </div>
              </div>

              {/* Window Chrome Header */}
              <div className="px-4 py-2.5 border-b border-[var(--line)] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5" aria-hidden="true">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400/75" />
                    <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                  </div>
                  <div className="hidden sm:flex items-center gap-1 pl-1">
                    {(
                      [
                        { id: 'duo', label: 'Split Duo' },
                        { id: 'solo', label: 'Solo' },
                        { id: 'pip', label: 'Keynote PIP' },
                      ] as Array<{ id: StageSceneDemo; label: string }>
                    ).map((sc) => (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => setStageLayout(sc.id)}
                        className={`h-6 px-2 rounded-[6px] text-[10.5px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                          stageLayout === sc.id
                            ? 'bg-[var(--accent-soft)] text-[var(--accent-text)]'
                            : 'text-[var(--ink-3)] hover:text-[var(--ink)]'
                        }`}
                      >
                        {sc.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] font-mono-num">
                  <span className="inline-flex items-center gap-1.5 font-bold text-[var(--ink)]">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f43f5e] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#f43f5e]" />
                    </span>
                    <span>LIVE</span>
                  </span>
                  <span className="text-[var(--ink-3)]">{formatDemoClock(liveSec)}</span>
                </div>

                <div className="text-[11px] font-mono-num text-[var(--ink-3)] pr-0 sm:pr-44">
                  1080p
                </div>
              </div>

              {/* Window Body: Stage (Left) + Embedded Live Chat (Right) */}
              <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_206px]">
                {/* Stage Canvas Area */}
                <div className="relative p-3 sm:p-3.5 min-h-[268px] sm:min-h-[318px] flex flex-col justify-between overflow-hidden">
                  {/* Top-Center Floating Alert / Super Chat */}
                  <div className="relative z-20 flex justify-center">
                    <div
                      key={`${previewMode}-${chatCursor % 2}-${previewTipSent ? 'sent' : 'idle'}`}
                      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#090e1b]/90 backdrop-blur-xl border border-white/14 shadow-lg text-[11px] animate-gather-msg"
                    >
                      {previewMode === 'shop' ? (
                        <>
                          <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-[#090e1b] font-mono-num font-bold text-[10px]">
                            20% OFF
                          </span>
                          <span className="text-white/90 font-medium">
                            Flash Drop · {shopUnitsLeft} mugs left · {formatMinSec(shopCountdownSec)}
                          </span>
                        </>
                      ) : previewMode === 'gamer' ? (
                        <>
                          <span className="px-1.5 py-0.5 rounded-full bg-sky-400 text-[#090e1b] font-mono-num font-bold text-[10px]">
                            BO3
                          </span>
                          <span className="text-white/90 font-medium">
                            Ascent · {gamerVotePct}% Sheriff Challenge
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="px-1.5 py-0.5 rounded-full bg-[#84cc16] text-[#081006] font-mono-num font-bold text-[10px]">
                            ${previewTipAmount}
                          </span>
                          <span className="text-white/90 font-medium">
                            {previewTipSent
                              ? 'You sent a super chat'
                              : chatCursor % 2 === 0
                              ? 'Jason sent a super chat'
                              : 'Clara boosted the show'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Stage Content */}
                  <div className="relative flex-1 my-2 rounded-[14px] overflow-hidden border border-white/10 bg-[#0b1224]">
                    {previewMode === 'standard' && stageLayout === 'duo' && (
                      <div className="w-full h-full min-h-[225px] grid grid-cols-2 gap-1.5 p-1.5">
                        {/* Left Speaker Tile (Cobalt Blue) */}
                        <div
                          className={`relative rounded-[10px] overflow-hidden bg-gradient-to-br from-[#2a4d9c] via-[#1c3269] to-[#0f1c42] flex items-center justify-center transition-all duration-500 ${
                            activeSpeaker === 'maya' && demoMicOn
                              ? 'ring-2 ring-sky-400/75 shadow-[0_0_24px_-4px_rgba(56,189,248,0.45)]'
                              : 'ring-1 ring-white/10'
                          }`}
                        >
                          <img
                            src="/src/assets/images/host_maya_studio_1794840297410.jpg"
                            alt="Maya Chen live studio"
                            referrerPolicy="no-referrer"
                            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                              demoCamOn ? 'opacity-70 mix-blend-luminosity animate-gather-kenburns' : 'opacity-0'
                            }`}
                          />
                          <div
                            className="absolute inset-0"
                            style={{
                              background:
                                'radial-gradient(circle at 50% 45%, rgba(96,165,250,0.34), rgba(15,28,66,0.72) 72%)',
                            }}
                          />
                          <div
                            className={`relative z-10 w-14 h-14 rounded-full bg-white/12 border backdrop-blur-md grid place-items-center text-[18px] font-display font-bold text-white shadow-lg transition-all duration-500 ${
                              activeSpeaker === 'maya' && demoMicOn
                                ? 'border-sky-300/80 scale-105'
                                : 'border-white/25 scale-100'
                            }`}
                          >
                            M
                          </div>
                          <div className="absolute left-2.5 bottom-2.5 z-10 leading-tight">
                            <div className="text-[11.5px] font-semibold text-white">Maya</div>
                            <div className="text-[10px] text-white/65">Host</div>
                          </div>
                          {activeSpeaker === 'maya' && demoMicOn && (
                            <div className="absolute right-2.5 bottom-2.5 z-10 flex items-end gap-0.5 h-4">
                              <span className="w-0.5 h-3.5 rounded-full bg-sky-300 animate-gather-eq" />
                              <span
                                className="w-0.5 h-4 rounded-full bg-sky-300 animate-gather-eq"
                                style={{ animationDelay: '160ms' }}
                              />
                              <span
                                className="w-0.5 h-3 rounded-full bg-sky-300 animate-gather-eq"
                                style={{ animationDelay: '310ms' }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Right Speaker Tile (Indigo Violet) */}
                        <div
                          className={`relative rounded-[10px] overflow-hidden bg-gradient-to-br from-[#6d35b8] via-[#4a238a] to-[#1e1445] flex items-center justify-center transition-all duration-500 ${
                            activeSpeaker === 'jordan'
                              ? 'ring-2 ring-emerald-400/75 shadow-[0_0_24px_-4px_rgba(16,185,129,0.4)]'
                              : 'ring-1 ring-white/10'
                          }`}
                        >
                          <img
                            src="/src/assets/images/host_jordan_studio_1794840296850.jpg"
                            alt="Jordan Lee live guest"
                            referrerPolicy="no-referrer"
                            className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-luminosity animate-gather-kenburns"
                            style={{ animationDelay: '-5s' }}
                          />
                          <div
                            className="absolute inset-0"
                            style={{
                              background:
                                'radial-gradient(circle at 50% 45%, rgba(168,85,247,0.36), rgba(30,20,69,0.72) 72%)',
                            }}
                          />
                          <div
                            className={`relative z-10 w-14 h-14 rounded-full bg-white/12 border backdrop-blur-md grid place-items-center text-[18px] font-display font-bold text-white shadow-lg transition-all duration-500 ${
                              activeSpeaker === 'jordan'
                                ? 'border-emerald-300/80 scale-105'
                                : 'border-white/25 scale-100'
                            }`}
                          >
                            J
                          </div>
                          <div className="absolute right-2.5 bottom-2.5 z-10 flex items-end gap-0.5 h-4">
                            <span
                              className={`w-0.5 rounded-full bg-emerald-400 ${
                                activeSpeaker === 'jordan' ? 'h-3.5 animate-gather-eq' : 'h-1.5 opacity-60'
                              }`}
                            />
                            <span
                              className={`w-0.5 rounded-full bg-emerald-400 ${
                                activeSpeaker === 'jordan' ? 'h-4 animate-gather-eq' : 'h-2 opacity-60'
                              }`}
                              style={{ animationDelay: '180ms' }}
                            />
                            <span
                              className={`w-0.5 rounded-full bg-emerald-400 ${
                                activeSpeaker === 'jordan' ? 'h-3 animate-gather-eq' : 'h-1.5 opacity-60'
                              }`}
                              style={{ animationDelay: '340ms' }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {previewMode === 'standard' && stageLayout === 'solo' && (
                      <div className="relative w-full h-full min-h-[225px] overflow-hidden">
                        <img
                          src="/src/assets/images/host_maya_studio_1794840297410.jpg"
                          alt="Maya Chen solo host"
                          referrerPolicy="no-referrer"
                          className={`w-full h-full object-cover transition-opacity duration-300 ${
                            demoCamOn ? 'opacity-100 animate-gather-kenburns' : 'opacity-20'
                          }`}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        <div className="absolute left-3 bottom-3 text-white flex items-center gap-2.5">
                          <div>
                            <div className="text-[12px] font-semibold">Maya Chen</div>
                            <div className="text-[10.5px] text-white/70">Host · Solo Spotlight</div>
                          </div>
                          {demoMicOn && (
                            <div className="flex items-end gap-0.5 h-3.5">
                              <span className="w-0.5 h-3 rounded-full bg-sky-400 animate-gather-eq" />
                              <span
                                className="w-0.5 h-3.5 rounded-full bg-sky-400 animate-gather-eq"
                                style={{ animationDelay: '140ms' }}
                              />
                              <span
                                className="w-0.5 h-2.5 rounded-full bg-sky-400 animate-gather-eq"
                                style={{ animationDelay: '280ms' }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {previewMode === 'standard' && stageLayout === 'pip' && (
                      <div className="relative w-full h-full min-h-[225px] bg-gradient-to-br from-[#0f1f44] to-[#0a132c] p-4 flex flex-col justify-between overflow-hidden">
                        <div className="flex items-center justify-between text-[10px] font-mono-num text-[#7dd3fc]">
                          <span className="inline-flex items-center gap-1">
                            <Sparkles className="w-3 h-3 animate-pulse" />
                            <span>KEYNOTE DECK · SLIDE 0{4 + (chatCursor % 3)}</span>
                          </span>
                          <span className="text-white/60">1080p60</span>
                        </div>
                        <div className="space-y-1.5 pr-[34%]">
                          <div className="text-sm font-display font-bold text-white leading-snug">
                            Direct Creator Economy
                          </div>
                          <div className="text-[11.5px] text-white/70 leading-snug">
                            0% platform cut across Express Pay, Live Shop Drops &amp; Audio RSS.
                          </div>
                        </div>
                        <div className="h-1.5 w-[52%] rounded-full bg-white/10 overflow-hidden">
                          <div
                            style={{ width: `${Math.min(96, pipSlideProgress)}%` }}
                            className="h-full bg-gradient-to-r from-[#3b82f6] to-[#7dd3fc] transition-all duration-700 ease-out"
                          />
                        </div>
                        <div className="absolute right-3 bottom-3 w-[32%] aspect-video rounded-[8px] overflow-hidden border border-sky-400/45 shadow-xl">
                          <img
                            src="/src/assets/images/host_maya_studio_1794840297410.jpg"
                            alt="Host picture-in-picture"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover animate-gather-kenburns"
                          />
                        </div>
                      </div>
                    )}

                    {previewMode === 'shop' && (
                      <div className="relative w-full h-full min-h-[225px] grid grid-cols-[1.15fr_0.85fr] gap-2 p-2">
                        <div className="relative rounded-[10px] overflow-hidden">
                          <img
                            src="/src/assets/images/host_maya_studio_1794840297410.jpg"
                            alt="Host presenting ceramic mug"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover animate-gather-kenburns"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                          <div className="absolute left-2.5 bottom-2.5 text-white flex items-center gap-2">
                            <div>
                              <div className="text-[11.5px] font-semibold">Maya Chen</div>
                              <div className="text-[10px] text-white/70">Studio Objects Host</div>
                            </div>
                            <div className="flex items-end gap-0.5 h-3">
                              <span className="w-0.5 h-2.5 rounded-full bg-emerald-400 animate-gather-eq" />
                              <span
                                className="w-0.5 h-3 rounded-full bg-emerald-400 animate-gather-eq"
                                style={{ animationDelay: '150ms' }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="rounded-[10px] bg-[#0b1224] border border-white/12 overflow-hidden flex flex-col gather-superchat-sheen">
                          <div className="flex-1 min-h-0 relative overflow-hidden">
                            <img
                              src="/src/assets/images/product_ceramic_mug_1794839256911.jpg"
                              alt="Cobalt Glaze Pour-Over Mug"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover animate-gather-kenburns"
                              style={{ animationDelay: '-4s' }}
                            />
                          </div>
                          <div className="p-2.5 space-y-1">
                            <div className="text-[11px] font-semibold text-white truncate">
                              Cobalt Glaze Mug
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <div className="flex items-baseline gap-1.5">
                                <span className="font-mono-num font-bold text-white">$30</span>
                                <span className="font-mono-num text-[10px] line-through text-white/45">$38</span>
                              </div>
                              <span className="text-[#34d399] font-semibold">1-Click Claim</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {previewMode === 'gamer' && (
                      <div className="relative w-full h-full min-h-[225px] bg-gradient-to-br from-[#0e1936] via-[#0c142c] to-[#171238] p-3.5 flex flex-col justify-between overflow-hidden">
                        <div className="flex items-center justify-between text-[10.5px] font-mono-num text-[#7dd3fc]">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] animate-ping" />
                            <span>VALORANT · ASCENT</span>
                          </span>
                          <span className="text-amber-300 font-semibold">BO3 · 1–0</span>
                        </div>
                        <div className="space-y-2.5 my-auto">
                          <div className="text-sm font-display font-bold text-white">
                            Next map challenge?
                          </div>
                          <div className="space-y-1.5">
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px] text-white/90">
                                <span>Ascent · Sheriff Only</span>
                                <span className="font-mono-num">{gamerVotePct}%</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                                <div
                                  style={{ width: `${gamerVotePct}%` }}
                                  className="h-full bg-gradient-to-r from-[#3b82f6] to-[#7dd3fc] transition-all duration-700 ease-out"
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px] text-white/75">
                                <span>Bind · Rush A Site</span>
                                <span className="font-mono-num">{100 - gamerVotePct}%</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                                <div
                                  style={{ width: `${100 - gamerVotePct}%` }}
                                  className="h-full bg-white/35 transition-all duration-700 ease-out"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-[10.5px] font-mono-num text-white/60 flex items-center justify-between">
                          <span>Squad queue open · {2 + (chatCursor % 3)} players ready</span>
                          <span className="text-emerald-400">128 tick</span>
                        </div>
                      </div>
                    )}

                    {/* Floating Animated Reaction Bursts */}
                    <div className="pointer-events-none absolute inset-0 overflow-hidden z-10">
                      {floatingBursts.map((b) => (
                        <div
                          key={b.id}
                          style={{ left: `${b.left}%`, bottom: '18px' }}
                          className="absolute animate-gather-float"
                        >
                          <div className="w-6 h-6 rounded-full bg-[#090e1b]/80 border border-white/15 grid place-items-center shadow-md">
                            {b.kind === 'flame' ? (
                              <Flame className="w-3 h-3 text-amber-400" />
                            ) : b.kind === 'heart' ? (
                              <Heart className="w-3 h-3 text-rose-400 fill-rose-400" />
                            ) : (
                              <Sparkles className="w-3 h-3 text-sky-300" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Bottom Lower-Third Overlay Inside Stage */}
                    <div
                      className={`pointer-events-none absolute bottom-3 z-20 px-3 py-2 rounded-[10px] bg-[#0b101e]/92 backdrop-blur-xl border border-white/14 shadow-xl flex items-center gap-2.5 ${
                        previewMode === 'standard' && stageLayout === 'duo'
                          ? 'left-1/2 -translate-x-1/2 max-w-[82%]'
                          : previewMode === 'shop'
                          ? 'left-3 max-w-[52%]'
                          : 'left-3 max-w-[76%]'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-[7px] bg-[var(--accent-soft)] border border-[var(--accent-line)] grid place-items-center shrink-0">
                        <GatherLogo size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11.5px] font-semibold text-white truncate">
                          {previewMode === 'shop'
                            ? 'Studio Objects Live Drop'
                            : previewMode === 'gamer'
                            ? 'Ranked Squad Co-Stream'
                            : 'The Future of Creative Work'}
                        </div>
                        <div className="text-[10px] text-white/60 truncate">
                          {previewMode === 'shop'
                            ? 'Flash bundles & 1-click Express Bag'
                            : previewMode === 'gamer'
                            ? 'Live predictions & 30s clutch clips'
                            : 'Live conversations · Episode 08'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Embedded Live Chat Pane */}
                <div className="border-t sm:border-t-0 sm:border-l border-[var(--line)] p-3 flex flex-col justify-between gap-2 bg-[var(--fill)]">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-[11.5px] font-semibold text-[var(--ink)]">
                      <span>Live chat</span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono-num text-[var(--ok)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--ok)] animate-pulse" />
                        <MessageSquare className="w-3.5 h-3.5 text-[var(--ink-3)]" />
                      </span>
                    </div>

                    <div className="space-y-2">
                      {activeChats.map((msg) => (
                        <div key={msg.id} className="flex items-start gap-2 animate-gather-msg">
                          <span
                            className={`w-5 h-5 rounded-full text-[9.5px] font-bold grid place-items-center shrink-0 mt-0.5 ${msg.tone}`}
                          >
                            {msg.initials}
                          </span>
                          <div className="min-w-0 leading-snug">
                            <div className="text-[10.5px] font-semibold text-[var(--ink)]">
                              {msg.name}
                            </div>
                            <div className="text-[10.5px] text-[var(--ink-3)] truncate">
                              {msg.text}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 pt-0.5 text-[10px] text-[var(--ink-3)]">
                      <span className="inline-flex items-center gap-0.5" aria-hidden="true">
                        <span className="w-1 h-1 rounded-full bg-[var(--ink-3)] animate-gather-dot" />
                        <span
                          className="w-1 h-1 rounded-full bg-[var(--ink-3)] animate-gather-dot"
                          style={{ animationDelay: '180ms' }}
                        />
                        <span
                          className="w-1 h-1 rounded-full bg-[var(--ink-3)] animate-gather-dot"
                          style={{ animationDelay: '360ms' }}
                        />
                      </span>
                      <span>2 viewers typing</span>
                    </div>
                  </div>

                  {/* Interactive Chat Composer + Quick Super Chat inside Preview */}
                  <form
                    onSubmit={handleSendPreviewChat}
                    className="pt-2 border-t border-[var(--line)] flex items-center gap-1.5"
                  >
                    <input
                      type="text"
                      value={previewChatDraft}
                      onChange={(e) => setPreviewChatDraft(e.target.value)}
                      placeholder="Say something..."
                      aria-label="Preview live chat message"
                      className="flex-1 min-w-0 h-7 px-2 rounded-[7px] bg-[var(--surface-2)] border border-[var(--line)] focus:border-[var(--accent)] text-[10.5px] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none"
                    />
                    {previewChatDraft.trim() ? (
                      <button
                        type="submit"
                        aria-label="Send preview message"
                        className="w-7 h-7 rounded-[7px] gather-btn-primary grid place-items-center shrink-0 cursor-pointer"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewTipAmount((a) => (a === 10 ? 25 : 10));
                          setPreviewTipSent(true);
                          setFloatingBursts((prev) => [
                            ...prev.slice(-4),
                            { id: Date.now(), left: 50, kind: 'heart' },
                          ]);
                        }}
                        title="Send sample super chat"
                        aria-label="Send sample super chat"
                        className="w-7 h-7 rounded-[7px] bg-[var(--fill)] hover:bg-[var(--fill-hover)] border border-[var(--line)] grid place-items-center shrink-0 cursor-pointer"
                      >
                        <CreditCard className="w-3 h-3 text-[var(--cyan)]" />
                      </button>
                    )}
                  </form>
                </div>
              </div>

              {/* Window Bottom Dock Controls */}
              <div className="px-3.5 py-2.5 border-t border-[var(--line)] flex items-center justify-between gap-2 relative sm:pr-[204px]">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDemoMicOn((v) => !v)}
                    aria-label={demoMicOn ? 'Mute preview mic' : 'Unmute preview mic'}
                    className={`w-7 h-7 rounded-[7px] border grid place-items-center cursor-pointer transition-colors ${
                      demoMicOn
                        ? 'bg-[var(--fill)] border-[var(--line-2)] text-[var(--ink)]'
                        : 'bg-rose-500/15 border-rose-500/35 text-rose-600 dark:text-rose-300'
                    }`}
                  >
                    {demoMicOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDemoCamOn((v) => !v)}
                    aria-label={demoCamOn ? 'Turn off preview camera' : 'Turn on preview camera'}
                    className={`w-7 h-7 rounded-[7px] border grid place-items-center cursor-pointer transition-colors ${
                      demoCamOn
                        ? 'bg-[var(--fill)] border-[var(--line-2)] text-[var(--ink)]'
                        : 'bg-rose-500/15 border-rose-500/35 text-rose-600 dark:text-rose-300'
                    }`}
                  >
                    {demoCamOn ? (
                      <Video className="w-3.5 h-3.5" />
                    ) : (
                      <VideoOff className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={cycleStageScene}
                    aria-label="Cycle stage scene"
                    title="Switch stage scene"
                    className="w-7 h-7 rounded-[7px] bg-[var(--fill)] hover:bg-[var(--fill-hover)] border border-[var(--line-2)] text-[var(--ink)] grid place-items-center cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <span className="hidden md:inline text-[11px] text-[var(--ink-3)]">
                  {demoMicOn
                    ? 'Everyone looks and sounds great'
                    : 'Mic muted · Preview monitor active'}
                </span>

                <button
                  type="button"
                  onClick={() => onOpenWatchDemo(previewMode)}
                  className="h-7 px-3 rounded-[7px] bg-rose-500/12 hover:bg-rose-500/20 border border-rose-500/30 text-[11px] font-semibold text-rose-600 dark:text-rose-300 cursor-pointer whitespace-nowrap transition-colors"
                >
                  Open Watch
                </button>

                {/* Overlapping AI Producer Card */}
                <button
                  type="button"
                  onClick={cycleStageScene}
                  className="hidden sm:flex items-center gap-2.5 px-3 py-2 rounded-[12px] gather-card-obsidian hover:border-[var(--accent-line)] absolute -bottom-5 right-3 z-20 text-left cursor-pointer transition-colors"
                >
                  <div className="w-7 h-7 rounded-[8px] bg-[var(--accent-soft)] border border-[var(--accent-line)] grid place-items-center shrink-0">
                    <GatherLogo size={15} />
                  </div>
                  <div className="leading-tight pr-1">
                    <div className="text-[10px] text-[var(--ink-3)]">AI Producer</div>
                    <div className="text-[11.5px] font-semibold text-[var(--ink)]">
                      Next scene is ready
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-[#34d399] animate-pulse shrink-0" />
                </button>
              </div>
            </div>

            {/* Interactive Format Switcher Bar Below Studio Window */}
            <div className="relative flex flex-wrap items-center justify-between gap-3 pt-2 sm:pt-3 px-0.5">
              <div className="gather-seg" role="tablist" aria-label="Watch Page format previews">
                {(
                  [
                    { id: 'standard', label: 'Broadcast' },
                    { id: 'shop', label: 'Live Shop' },
                    { id: 'gamer', label: 'Gaming Arena' },
                  ] as Array<{ id: WatchMode; label: string }>
                ).map((item) => {
                  const active = previewMode === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setPreviewMode(item.id)}
                      className={`gather-seg-btn ${active ? 'active' : ''}`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => onOpenWatchDemo(previewMode)}
                className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--ink-2)] hover:text-[var(--ink)] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>
                  {previewMode === 'standard'
                    ? 'See Broadcast Watch'
                    : previewMode === 'shop'
                    ? 'Open Live Shop Watch'
                    : 'Open Gaming Arena'}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-[var(--accent-text)]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quiet Editorial Footer */}
      <footer className="w-[92%] max-w-[1320px] mx-auto pb-3 pt-2 border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-[var(--ink-3)]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display font-bold text-[var(--ink-2)]">gather.</span>
          <span className="text-[var(--line-2)]" aria-hidden="true">
            ·
          </span>
          <span>100% Free</span>
          <span className="text-[var(--line-2)]" aria-hidden="true">
            ·
          </span>
          <span>No redirects · Direct creator payouts</span>
          {onOpenAuth && (
            <>
              <span className="text-[var(--line-2)]" aria-hidden="true">
                ·
              </span>
              <button
                type="button"
                onClick={onOpenAuth}
                className="text-[var(--ink-2)] hover:text-[var(--ink)] hover:underline underline-offset-4 cursor-pointer"
              >
                {isSignedIn && userName ? `Signed in as ${userName.split(' ')[0]}` : 'Creator Sign in'}
              </button>
            </>
          )}
        </div>
        <div className="font-semibold text-[var(--ink-2)]">Made in Texas · ourstudio</div>
      </footer>
    </main>
  );
};
