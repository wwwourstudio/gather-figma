import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Command,
  Eye,
  HelpCircle,
  LogIn,
  Moon,
  Radio,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  Sun,
  User,
  UserPlus,
  Users,
} from 'lucide-react';
import { ConnectionState } from '../hooks/useStudioSocket';
import { WatchMode } from '../types/studio';
import { GatherLogo } from './GatherLogo';

export interface AuthUserSummary {
  displayName?: string | null;
  photoURL?: string | null;
  email?: string | null;
}

interface TopBarProps {
  mode: 'landing' | 'studio' | 'watch';
  studioTitle?: string;
  connState?: ConnectionState;
  isLive?: boolean;
  isRecording?: boolean;
  recordingSec?: number;
  watchMode?: WatchMode;
  viewerCount?: number;
  bagCount?: number;
  theme: 'dark' | 'light';
  user?: AuthUserSummary | null;
  onToggleTheme: () => void;
  onGoHome: () => void;
  onCreateStudio?: () => void;
  onOpenSchedule?: () => void;
  onOpenWatchDemo?: (mode: WatchMode) => void;
  onOpenWatchPreview?: () => void;
  onExitWatchPreview?: () => void;
  onOpenInvite?: () => void;
  onOpenGoLive?: () => void;
  onOpenSettings?: () => void;
  onOpenHelp?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenBag?: () => void;
  onOpenAuth?: () => void;
  onLeaveWatch?: () => void;
}

function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const TopBar: React.FC<TopBarProps> = ({
  mode,
  studioTitle,
  connState = 'offline',
  isLive = false,
  isRecording = false,
  recordingSec = 0,
  watchMode = 'standard',
  viewerCount = 0,
  bagCount = 0,
  theme,
  user = null,
  onToggleTheme,
  onGoHome,
  onCreateStudio,
  onOpenWatchPreview,
  onExitWatchPreview,
  onOpenInvite,
  onOpenGoLive,
  onOpenSettings,
  onOpenHelp,
  onOpenCommandPalette,
  onOpenBag,
  onOpenAuth,
  onLeaveWatch,
}) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!userMenuOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [userMenuOpen]);

  const shortName = user?.displayName?.trim().split(/\s+/)[0] || 'You';
  const displayFullName = user?.displayName?.trim() || 'Guest Creator';

  const hdrBtn =
    'inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-[9px] border border-[var(--glass-border)] bg-[var(--fill)] hover:bg-[var(--fill-hover)] text-[13px] font-semibold text-[var(--ink)] whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]';

  const hdrIconBtn =
    'h-9 w-9 grid place-items-center rounded-[9px] text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--fill-hover)] transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]';

  const formatWatchingCount = (n: number) => {
    const safe = Math.max(1, n);
    if (safe >= 1000) return `${(safe / 1000).toFixed(1).replace(/\.0$/, '')}K`;
    return safe.toLocaleString();
  };

  const watchSectionLabel =
    watchMode === 'shop' ? 'Live Shop' : watchMode === 'gamer' ? 'Gaming Arena' : 'Sessions';

  const renderUserMenu = (variant: 'pill' | 'compact') => (
    <div ref={userMenuRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setUserMenuOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={userMenuOpen}
        aria-label="User menu, theme, and help"
        className={
          variant === 'pill'
            ? 'inline-flex items-center gap-2.5 h-10 pl-1.5 pr-3 rounded-full border border-[var(--glass-border)] bg-[var(--fill)] hover:bg-[var(--fill-hover)] text-left whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]'
            : `${hdrBtn} pl-1.5 pr-2.5`
        }
      >
        {user?.photoURL ? (
          <img
            src={user.photoURL}
            alt={shortName}
            referrerPolicy="no-referrer"
            className={`${variant === 'pill' ? 'w-7 h-7' : 'w-6 h-6'} rounded-full object-cover shrink-0`}
          />
        ) : (
          <span
            className={`${
              variant === 'pill' ? 'w-7 h-7 text-[11px]' : 'w-6 h-6 text-[10.5px]'
            } rounded-full bg-indigo-500 text-white font-display font-bold grid place-items-center shrink-0`}
          >
            {user ? shortName[0]?.toUpperCase() || 'Y' : 'Y'}
          </span>
        )}

        {variant === 'pill' ? (
          <span className="hidden sm:flex flex-col leading-tight">
            <span className="text-[12px] font-semibold text-[var(--ink)] max-w-[96px] truncate">
              {user ? shortName : 'You'}
            </span>
            <span className="text-[10.5px] text-[var(--ink-3)]">
              {user ? 'Your account' : 'Sign in'}
            </span>
          </span>
        ) : (
          <span className="hidden sm:inline max-w-[92px] truncate">
            {user ? shortName : 'Account'}
          </span>
        )}

        <ChevronDown
          className={`w-3.5 h-3.5 text-[var(--ink-3)] transition-transform duration-150 ${
            userMenuOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {userMenuOpen && (
        <div
          role="menu"
          aria-label="Account, theme, and help options"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-60 rounded-[15px] gather-glass-elevated p-1.5 animate-gather-modal origin-top-right"
        >
          <div className="px-3 py-2 border-b border-[var(--line)] mb-1">
            <div className="text-[12.5px] font-semibold text-[var(--ink)] truncate">
              {user ? displayFullName : 'Gather Account'}
            </div>
            <div className="text-[11px] text-[var(--ink-3)] truncate">
              {user?.email || 'Sign in to sync studios & payouts'}
            </div>
          </div>

          {onOpenAuth && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setUserMenuOpen(false);
                onOpenAuth();
              }}
              className="w-full px-3 py-2 rounded-[10px] hover:bg-[var(--fill-hover)] text-[12.5px] font-medium text-[var(--ink)] flex items-center justify-between gap-2 cursor-pointer transition-colors whitespace-nowrap"
            >
              <span className="inline-flex items-center gap-2.5">
                {user ? (
                  <User className="w-4 h-4 text-[var(--cyan)]" />
                ) : (
                  <LogIn className="w-4 h-4 text-[var(--cyan)]" />
                )}
                <span>{user ? 'Account & payouts' : 'Sign in with Google'}</span>
              </span>
            </button>
          )}

          <button
            type="button"
            role="menuitem"
            onClick={() => onToggleTheme()}
            className="w-full px-3 py-2 rounded-[10px] hover:bg-[var(--fill-hover)] text-[12.5px] font-medium text-[var(--ink)] flex items-center justify-between gap-2 cursor-pointer transition-colors whitespace-nowrap"
          >
            <span className="inline-flex items-center gap-2.5">
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-[var(--accent)]" />
              )}
              <span>Theme</span>
            </span>
            <span className="px-2 py-0.5 rounded-[6px] bg-[var(--fill)] border border-[var(--line)] text-[10.5px] font-semibold text-[var(--ink-2)]">
              {theme === 'dark' ? 'Dark' : 'Light'}
            </span>
          </button>

          {onOpenHelp && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setUserMenuOpen(false);
                onOpenHelp();
              }}
              className="w-full px-3 py-2 rounded-[10px] hover:bg-[var(--fill-hover)] text-[12.5px] font-medium text-[var(--ink)] flex items-center justify-between gap-2 cursor-pointer transition-colors whitespace-nowrap"
            >
              <span className="inline-flex items-center gap-2.5">
                <HelpCircle className="w-4 h-4 text-[var(--ink-2)]" />
                <span>Help &amp; shortcuts</span>
              </span>
              <span className="text-[10.5px] font-mono-num text-[var(--ink-3)]">?</span>
            </button>
          )}
        </div>
      )}
    </div>
  );

  if (mode === 'landing') {
    return (
      <header className="w-full max-w-[1360px] mx-auto h-[60px] shrink-0 flex items-center justify-between gap-6 px-3 sm:px-6 border-b border-[var(--line)] relative z-40">
        {/* Zone 1: Clean Gather Wordmark */}
        <button
          type="button"
          onClick={onGoHome}
          className="inline-flex items-center gap-2.5 font-display text-[24px] font-extrabold leading-none tracking-[-0.055em] text-[var(--ink)] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-[6px] py-1"
          aria-label="gather home"
        >
          <GatherLogo size={24} />
          <span>
            gather<span className="text-[var(--accent)] ml-[1px]">.</span>
          </span>
        </button>

        {/* Zone 2: User Menu Dropdown (Account, Theme, Help) + Primary CTA */}
        <div className="flex items-center gap-2.5 shrink-0">
          {renderUserMenu('compact')}
          <button
            type="button"
            onClick={onCreateStudio}
            className="inline-flex items-center justify-center h-9 px-4 rounded-[10px] gather-btn-primary text-[13px] font-semibold whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            Create a studio
          </button>
        </div>
      </header>
    );
  }

  if (mode === 'watch') {
    return (
      <header className="w-full h-[56px] shrink-0 flex items-center justify-between gap-6 px-3 sm:px-5 border-b border-[var(--line)] relative z-40">
        {/* Zone 1 + Breadcrumb: Clean Wordmark & Session Status */}
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={onGoHome}
            className="inline-flex items-center gap-2 font-display text-[23px] font-extrabold leading-none tracking-[-0.055em] text-[var(--ink)] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-[6px] py-1"
            aria-label="gather home"
          >
            <GatherLogo size={22} />
            <span>
              gather<span className="text-[var(--accent)] ml-[1px]">.</span>
            </span>
          </button>

          <div className="hidden sm:flex items-center gap-2.5 text-[13px] min-w-0">
            <span className="font-semibold text-[var(--ink)] whitespace-nowrap">
              {watchSectionLabel}
            </span>
            <span className="text-[var(--ink-3)]" aria-hidden="true">
              /
            </span>
            <span className="text-[var(--ink-2)] whitespace-nowrap truncate max-w-[220px]">
              {isLive ? 'Live now' : studioTitle || 'Preview'}
            </span>
          </div>
        </div>

        {/* Zone 2/3: Watching Counter + Controls + User Dropdown */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="hidden md:inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--ink-2)] pr-2 whitespace-nowrap">
            <Users className="w-3.5 h-3.5 text-[var(--ink-3)]" />
            <span className="font-mono-num font-semibold text-[var(--ink)]">
              {formatWatchingCount(viewerCount)}
            </span>
            <span className="text-[var(--ink-3)]">watching</span>
          </div>

          {onExitWatchPreview ? (
            <button type="button" onClick={onExitWatchPreview} className={hdrBtn}>
              <Settings className="w-3.5 h-3.5 text-[var(--ink-2)]" />
              <span>Back to Studio</span>
            </button>
          ) : (
            onLeaveWatch && (
              <button type="button" onClick={onLeaveWatch} className={hdrBtn}>
                <span>Exit Watch</span>
              </button>
            )
          )}

          {watchMode === 'shop' && onOpenBag && (
            <button
              type="button"
              onClick={onOpenBag}
              className="lg:hidden inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-[10px] gather-btn-primary text-[13px] font-semibold whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span className="font-mono-num">Bag ({bagCount})</span>
            </button>
          )}

          {renderUserMenu('pill')}
        </div>
      </header>
    );
  }

  return (
    <header className="h-[56px] shrink-0 flex items-center justify-between gap-8 px-4 sm:px-5 gather-glass rounded-[12px] relative z-40">
      {/* Zone 1: Original Gather Trefoil Mark + Wordmark */}
      <button
        type="button"
        onClick={onGoHome}
        className="inline-flex items-center gap-2.5 font-display text-[25px] font-extrabold leading-none tracking-[-0.055em] text-[var(--ink)] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-[6px] py-1"
        aria-label="gather home"
      >
        <GatherLogo size={26} />
        <span>
          gather<span className="text-[var(--accent)] ml-[1px]">.</span>
        </span>
      </button>

      {/* Zone 2: Studio Breadcrumb */}
      <div className="hidden md:flex items-center gap-2.5 min-w-0 pl-4 border-l border-[var(--line)] h-7 text-[13px]">
        <strong className="font-semibold text-[var(--ink)] truncate max-w-[240px]">
          {studioTitle || 'Gather Studio'}
        </strong>
        <span className="text-[var(--ink-3)]" aria-hidden="true">
          ·
        </span>
        <span className="text-xs text-[var(--ink-2)] whitespace-nowrap">
          {watchMode === 'shop'
            ? 'Live Shop'
            : watchMode === 'gamer'
            ? 'Gaming Arena'
            : 'Broadcast'}
        </span>
        <span className="text-[var(--ink-3)]" aria-hidden="true">
          ·
        </span>
        <span className="text-xs font-mono-num text-[var(--ink-3)] whitespace-nowrap">
          {connState === 'online' ? `${viewerCount} watching` : 'Syncing'}
        </span>
        {isRecording && (
          <>
            <span className="text-[var(--ink-3)]" aria-hidden="true">
              ·
            </span>
            <span className="text-xs font-mono-num font-semibold text-[var(--live)] whitespace-nowrap">
              REC {formatTimer(recordingSec)}
            </span>
          </>
        )}
      </div>

      {/* Zone 3: Studio Header Actions + User Dropdown */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          title="Command palette (Cmd/Ctrl + K)"
          aria-label="Command palette"
          className={`hidden sm:inline-flex ${hdrBtn} px-2.5`}
        >
          <Command className="w-3.5 h-3.5 text-[var(--ink-2)]" />
          <span className="font-mono-num text-xs">K</span>
        </button>
        <button
          type="button"
          onClick={onOpenWatchPreview}
          aria-label="Watch Page"
          className={hdrBtn}
        >
          <Eye className="w-3.5 h-3.5 text-[var(--ink-2)]" />
          <span className="hidden sm:inline">Watch Page</span>
        </button>
        <button
          type="button"
          onClick={onOpenInvite}
          aria-label="Invite guests or viewers"
          className={hdrBtn}
        >
          <UserPlus className="w-3.5 h-3.5 text-[var(--ink-2)]" />
          <span className="hidden sm:inline">Invite</span>
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Studio settings"
          className={hdrIconBtn}
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
        {renderUserMenu('compact')}
        <button
          type="button"
          onClick={onOpenGoLive}
          className={`inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-[9px] text-[13px] font-semibold whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
            isLive ? 'gather-btn-live' : 'gather-btn-primary'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>{isLive ? 'On Air' : 'Go Live'}</span>
        </button>
      </div>
    </header>
  );
};
