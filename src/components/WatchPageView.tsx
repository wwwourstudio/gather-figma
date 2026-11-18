import React, { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  ArrowLeft,
  ArrowUp,
  Ban,
  BarChart3,
  Bell,
  BellRing,
  Captions,
  Check,
  Clapperboard,
  Clock,
  Copy,
  CornerUpLeft,
  Cpu,
  CreditCard,
  Crosshair,
  DollarSign,
  EyeOff,
  Flame,
  Gamepad2,
  Hand,
  Heart,
  HelpCircle,
  ListChecks,
  Lock,
  Maximize2,
  MessageSquare,
  Minimize2,
  Minus,
  PackageCheck,
  Pin,
  Plus,
  QrCode,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  ThumbsUp,
  Trash2,
  Trophy,
  UserPlus,
  Users,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { DEFAULT_VIDEO_FX } from '../constants/studioDefaults';
import {
  AudienceQuestion,
  ChatReplyRef,
  FlashSaleState,
  PayoutSettings,
  ProductItem,
  RoomState,
  SuperChatMethod,
  WatchMode,
} from '../types/studio';
import { HoverReactionMenu, ReactionBadgeRow } from './ChatReactions';
import { StageCanvas } from './StageCanvas';

interface BagItem {
  product: ProductItem;
  variant: string;
  quantity: number;
  bundleLabel?: string;
}

interface CompletedReceipt {
  orderNumber: string;
  buyerName: string;
  buyerCity: string;
  shippingAddress: string;
  paymentMethod: string;
  items: Array<{
    title: string;
    source: string;
    variant: string;
    quantity: number;
    lineTotal: number;
    bundleLabel?: string;
  }>;
  subtotal: number;
  savings: number;
  total: number;
  createdAt: number;
}

interface FloatingHypeParticle {
  id: string;
  leftPct: number;
  kind: 'flame' | 'zap' | 'heart' | 'spark';
}

export interface WatchViewerUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

interface WatchPageViewProps {
  room: RoomState;
  clientId?: string;
  isHost?: boolean;
  user?: WatchViewerUser | null;
  onSignInWithGoogle?: () => Promise<void>;
  isSubscribed?: boolean;
  subscribing?: boolean;
  onToggleSubscribe?: () => Promise<void>;
  onRaiseHand?: (topic: string) => void;
  onLowerHand?: () => void;
  broadcastStream: MediaStream | null;
  localPreviewCanvas?: HTMLCanvasElement | null;
  elapsedSec: number;
  isPreviewMode: boolean;
  bagOpen: boolean;
  onSetBagOpen: (open: boolean) => void;
  onBagCountChange: (count: number) => void;
  onSwitchWatchMode?: (mode: WatchMode) => void;
  onSendChat: (text: string, author: string, replyTo?: ChatReplyRef) => void;
  onToggleChatLike?: (messageId: string) => void;
  onToggleChatReaction?: (messageId: string, emoji: string) => void;
  onPinChatMessage?: (messageId: string | null) => void;
  onDeleteChatMessage?: (messageId: string) => void;
  onBlockChatUser?: (author: string, uid?: string) => void;
  onUnblockChatUser?: (blockId: string) => void;
  onAskQuestion?: (text: string, author: string) => void;
  onUpvoteQuestion?: (questionId: string) => void;
  onPlaceOrder: (payload: {
    productId?: string;
    quantity?: number;
    buyerName: string;
    buyerCity?: string;
    paymentMethod?: string;
    variant?: string;
    bundleLabel?: string;
    items?: Array<{
      productId: string;
      quantity: number;
      variant?: string;
      bundleLabel?: string;
    }>;
  }) => void;
  onVotePoll: (optionId: string) => void;
  onCreateClip: (label: string, timestampSec: number, createdBy: string) => void;
  onJoinSquadQueue: (
    handle: string,
    platform: string,
    note?: string,
    role?: string,
    rank?: string
  ) => void;
  onSendSuperChat: (payload: {
    amount: number;
    method: SuperChatMethod;
    author: string;
    text: string;
  }) => void;
  onSendHype: () => void;
  onExitPreview?: () => void;
  onLeaveWatch?: () => void;
}

type ShopPanelTab = 'drop' | 'all' | 'claims' | 'qa' | 'bag';
type GamerSubTab = 'squad' | 'rig' | 'clips' | 'poll';
type ProgramSubTab = 'agenda' | 'poll' | 'clips';
type RailTab = 'chat' | 'companion' | 'qa' | 'bag';

const WATCH_AVATAR_TONES = [
  'bg-sky-500/14 text-sky-700 dark:text-sky-200 border-sky-500/25',
  'bg-indigo-500/14 text-indigo-700 dark:text-indigo-200 border-indigo-500/25',
  'bg-emerald-500/14 text-emerald-700 dark:text-emerald-200 border-emerald-500/25',
  'bg-amber-500/14 text-amber-700 dark:text-amber-200 border-amber-500/25',
  'bg-rose-500/14 text-rose-700 dark:text-rose-200 border-rose-500/25',
  'bg-cyan-500/14 text-cyan-700 dark:text-cyan-200 border-cyan-500/25',
];

function getWatchAvatar(name: string): { initials: string; cls: string } {
  const clean = name.trim() || 'G';
  const initials =
    clean
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() || '')
      .join('') || 'G';
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash * 31 + clean.charCodeAt(i)) >>> 0;
  }
  return { initials, cls: WATCH_AVATAR_TONES[hash % WATCH_AVATAR_TONES.length] };
}

function formatClock(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const rem = Math.floor(safe % 60);
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

function formatMoney(amount: number): string {
  const rounded = Math.round(amount);
  if (Math.abs(amount - rounded) < 0.005) {
    return `$${rounded}`;
  }
  return `$${amount.toFixed(2)}`;
}

function computeBagLinePricing(
  item: BagItem,
  flashSale: FlashSaleState | null | undefined,
  nowMs: number
): { unitPrice: number; retailTotal: number; lineTotal: number; savings: number; discountLabel?: string } {
  const retailTotal = item.product.price * item.quantity;
  const flashActive =
    Boolean(flashSale?.active) &&
    flashSale!.productId === item.product.id &&
    flashSale!.endsAt > nowMs &&
    flashSale!.soldUnits < flashSale!.totalUnits;

  let pct = 0;
  let discountLabel: string | undefined;

  if (flashActive && flashSale) {
    const trioTier = flashSale.bundles?.find((b) => b.quantity >= 3);
    const duoTier = flashSale.bundles?.find((b) => b.quantity === 2);
    if (item.quantity >= 3) {
      pct = trioTier?.discountPct || Math.min(60, flashSale.discountPct + 18);
      discountLabel = `3× VIP Flash (-${pct}%)`;
    } else if (item.quantity === 2) {
      pct = duoTier?.discountPct || Math.min(50, flashSale.discountPct + 10);
      discountLabel = `2× Duo Flash (-${pct}%)`;
    } else {
      pct = flashSale.discountPct;
      discountLabel = `Flash Drop (-${pct}%)`;
    }
  } else if (item.quantity >= 3) {
    pct = 15;
    discountLabel = '3+ Bundle (-15%)';
  } else if (item.quantity === 2) {
    pct = 10;
    discountLabel = '2× Bundle (-10%)';
  }

  const unitPrice = Number((item.product.price * (1 - pct / 100)).toFixed(2));
  const lineTotal = Number((unitPrice * item.quantity).toFixed(2));
  const savings = Math.max(0, Number((retailTotal - lineTotal).toFixed(2)));
  return { unitPrice, retailTotal, lineTotal, savings, discountLabel };
}

const GoogleMarkSvg: React.FC = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
    />
  </svg>
);

interface InChatPaymentCardProps {
  headline: string;
  subline?: string;
  suggestedAmounts?: number[];
  initialAmount?: number;
  payouts: PayoutSettings;
  viewerName: string;
  compact?: boolean;
  onClose?: () => void;
  onSubmitTip: (payload: {
    amount: number;
    method: SuperChatMethod;
    author: string;
    text: string;
  }) => void;
}

const InChatPaymentWidget: React.FC<InChatPaymentCardProps> = ({
  headline,
  subline,
  suggestedAmounts = [5, 10, 25, 50],
  initialAmount = 10,
  payouts,
  viewerName,
  compact = false,
  onClose,
  onSubmitTip,
}) => {
  const availableMethods = useMemo<SuperChatMethod[]>(() => {
    const list: SuperChatMethod[] = ['card'];
    if (payouts.venmoHandle) list.push('venmo');
    if (payouts.paypalHandle) list.push('paypal');
    if (payouts.cashappTag) list.push('cashapp');
    if (payouts.stripeUrl) list.push('stripe');
    return list;
  }, [payouts]);

  const [amount, setAmount] = useState<number>(initialAmount);
  const [method, setMethod] = useState<SuperChatMethod>('card');
  const [note, setNote] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedHandle, setCopiedHandle] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [sentReceipt, setSentReceipt] = useState<number | null>(null);
  const [showInlineFrame, setShowInlineFrame] = useState(false);

  useEffect(() => {
    setAmount(initialAmount);
  }, [initialAmount]);

  const handleInfo = useMemo(() => {
    if (method === 'venmo' && payouts.venmoHandle) {
      const h = payouts.venmoHandle.replace(/^@/, '');
      return {
        label: 'Venmo',
        handle: `@${h}`,
        qrPayload: `https://venmo.com/${encodeURIComponent(h)}?txn=pay&amount=${amount}`,
      };
    }
    if (method === 'paypal' && payouts.paypalHandle) {
      const h = payouts.paypalHandle.replace(/^@/, '');
      return {
        label: 'PayPal',
        handle: `paypal.me/${h}`,
        qrPayload: `https://paypal.me/${encodeURIComponent(h)}/${amount}`,
      };
    }
    if (method === 'cashapp' && payouts.cashappTag) {
      const h = payouts.cashappTag.replace(/^\$/, '');
      return {
        label: 'Cash App',
        handle: `$${h}`,
        qrPayload: `https://cash.app/$${encodeURIComponent(h)}/${amount}`,
      };
    }
    if (method === 'stripe' && payouts.stripeUrl) {
      return {
        label: 'Creator Link',
        handle: payouts.stripeUrl.replace(/^https?:\/\//, '').slice(0, 28),
        qrPayload: payouts.stripeUrl,
      };
    }
    return null;
  }, [method, payouts, amount]);

  useEffect(() => {
    if (!handleInfo?.qrPayload) {
      setQrDataUrl('');
      return;
    }
    let active = true;
    void QRCode.toDataURL(handleInfo.qrPayload, {
      width: 112,
      margin: 1,
      color: { dark: '#071024', light: '#ffffff' },
    }).then((url) => {
      if (active) setQrDataUrl(url);
    });
    return () => {
      active = false;
    };
  }, [handleInfo?.qrPayload]);

  const handleCompleteInChat = () => {
    if (processing) return;
    setProcessing(true);
    window.setTimeout(() => {
      onSubmitTip({
        amount: Math.max(1, Math.min(500, Math.round(amount || 5))),
        method,
        author: viewerName.trim() || 'Viewer',
        text: note.trim() || `Supported the stream directly in chat ($${amount})!`,
      });
      setProcessing(false);
      setSentReceipt(amount);
      setNote('');
      window.setTimeout(() => {
        setSentReceipt(null);
        onClose?.();
      }, 1500);
    }, 200);
  };

  return (
    <div className={`gather-pay-card rounded-[16px] ${compact ? 'p-3' : 'p-3.5'} space-y-2.5 animate-gather-msg`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--ink)]">
            <DollarSign className="w-3.5 h-3.5 text-[var(--ok)] shrink-0" strokeWidth={1.75} />
            <span className="truncate">{headline}</span>
          </div>
          <p className="text-[11px] text-[var(--ink-2)] mt-0.5 leading-snug">
            {subline || '0% platform fee · Instant checkout inside chat'}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close payment drawer"
            className="w-6 h-6 rounded-[7px] hover:bg-[var(--fill-hover)] text-[var(--ink-3)] hover:text-[var(--ink)] grid place-items-center cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {suggestedAmounts.slice(0, 4).map((preset) => {
          const active = amount === preset;
          return (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(preset)}
              className={`h-8 rounded-[8px] text-[12px] font-mono-num font-semibold cursor-pointer transition-all whitespace-nowrap shrink-0 ${
                active
                  ? 'gather-btn-primary text-white'
                  : 'gather-liquid-pill text-[var(--ink-2)] hover:text-[var(--ink)]'
              }`}
            >
              ${preset}
            </button>
          );
        })}
        <div className="relative flex items-center">
          <span className="absolute left-2 text-[11px] font-mono-num text-[var(--ink-3)] pointer-events-none">
            $
          </span>
          <input
            type="number"
            min={1}
            max={500}
            value={amount}
            aria-label="Custom tip amount"
            onChange={(e) => setAmount(Math.max(1, Math.min(500, Number(e.target.value || 1))))}
            className="w-full h-8 pl-5 pr-1.5 rounded-[8px] bg-[var(--fill)] border border-[var(--line-2)] text-[12px] font-mono-num font-semibold text-[var(--ink)] focus:outline-none focus:border-[var(--cyan)]"
          />
        </div>
      </div>

      <div className="gather-seg w-full overflow-x-auto gather-scroll">
        {availableMethods.map((m) => {
          const active = method === m;
          const label =
            m === 'card'
              ? 'Instant Pay'
              : m === 'venmo'
              ? 'Venmo'
              : m === 'paypal'
              ? 'PayPal'
              : m === 'cashapp'
              ? 'Cash App'
              : 'Sheet';
          return (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMethod(m);
                setShowInlineFrame(false);
              }}
              className={`gather-seg-btn flex-1 ${active ? 'active' : ''}`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {method === 'card' ? (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-[10px] bg-[var(--fill)] border border-[var(--line)]">
          <div className="flex items-center gap-2 min-w-0">
            <CreditCard className="w-3.5 h-3.5 text-[var(--cyan)] shrink-0" strokeWidth={1.65} />
            <span className="text-[11.5px] text-[var(--ink-2)] truncate">
              Apple Pay · Google Pay · Card
            </span>
          </div>
          <span className="text-[10.5px] font-mono-num text-[var(--ok)] whitespace-nowrap shrink-0 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.65} />
            Direct
          </span>
        </div>
      ) : method === 'stripe' && payouts.stripeUrl ? (
        <div className="rounded-[10px] bg-[var(--fill)] border border-[var(--line)] p-2.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11.5px] text-[var(--ink-2)] truncate">
              Inline Checkout ({handleInfo?.handle})
            </span>
            <button
              type="button"
              onClick={() => setShowInlineFrame((v) => !v)}
              className="h-6 px-2.5 rounded-[6px] bg-[var(--accent-soft)] border border-[var(--accent-line)] text-[11px] font-semibold text-[var(--accent-text)] cursor-pointer whitespace-nowrap shrink-0"
            >
              {showInlineFrame ? 'Hide' : 'Open'}
            </button>
          </div>
          {showInlineFrame && (
            <iframe
              src={payouts.stripeUrl}
              title="In-Chat Creator Payment Sheet"
              className="w-full h-44 rounded-[8px] border border-white/10 bg-white"
              sandbox="allow-scripts allow-forms allow-same-origin"
            />
          )}
        </div>
      ) : (
        handleInfo && (
          <div className="flex items-center gap-3 p-2.5 rounded-[10px] bg-[var(--fill)] border border-[var(--line)]">
            {qrDataUrl && (
              <img
                src={qrDataUrl}
                alt={`Scan ${handleInfo.label} QR`}
                referrerPolicy="no-referrer"
                className="w-13 h-13 rounded-[7px] bg-white p-1 shrink-0"
              />
            )}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-mono-num font-bold text-[var(--ink)] truncate">
                  {handleInfo.handle}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(handleInfo.handle);
                    setCopiedHandle(true);
                    window.setTimeout(() => setCopiedHandle(false), 1600);
                  }}
                  className="h-6 px-2 rounded-[6px] bg-[var(--fill)] hover:bg-[var(--fill-hover)] border border-[var(--line)] text-[11px] font-semibold text-[var(--accent-text)] inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                >
                  {copiedHandle ? <Check className="w-3 h-3 text-[var(--ok)]" /> : <Copy className="w-3 h-3" />}
                  {copiedHandle ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-[11px] text-[var(--ink-3)] leading-tight flex items-center gap-1">
                <QrCode className="w-3 h-3 text-[var(--cyan)] shrink-0" />
                <span>Scan or copy handle</span>
              </p>
            </div>
          </div>
        )
      )}

      {sentReceipt !== null ? (
        <div className="h-9 rounded-[9px] bg-[var(--ok)]/16 border border-[var(--ok)]/35 px-3 flex items-center justify-center gap-2 text-[12px] font-semibold text-[var(--ok)]">
          <Check className="w-4 h-4" />
          <span>${sentReceipt} Tip Sent Live</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCompleteInChat();
              }
            }}
            placeholder="Add a shoutout note..."
            className="flex-1 min-w-0 h-9 px-3 rounded-[9px] bg-[var(--fill)] border border-[var(--line-2)] text-[12px] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:border-[var(--cyan)]"
          />
          <button
            type="button"
            disabled={processing}
            onClick={handleCompleteInChat}
            className="h-9 px-3.5 rounded-[9px] gather-btn-tip text-[12px] font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Zap className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>{processing ? 'Sending...' : `Send $${amount}`}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export const WatchPageView: React.FC<WatchPageViewProps> = ({
  room,
  clientId,
  isHost = false,
  user,
  onSignInWithGoogle,
  isSubscribed = false,
  subscribing = false,
  onToggleSubscribe,
  onRaiseHand,
  onLowerHand,
  broadcastStream,
  localPreviewCanvas,
  elapsedSec,
  isPreviewMode,
  bagOpen,
  onSetBagOpen,
  onBagCountChange,
  onSwitchWatchMode,
  onSendChat,
  onToggleChatLike,
  onToggleChatReaction,
  onPinChatMessage,
  onDeleteChatMessage,
  onBlockChatUser,
  onUnblockChatUser,
  onAskQuestion,
  onUpvoteQuestion,
  onPlaceOrder,
  onVotePoll,
  onCreateClip,
  onJoinSquadQueue,
  onSendSuperChat,
  onSendHype,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mirrorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const stageFrameContainerRef = useRef<HTMLDivElement | null>(null);

  const isShopMode = room.watchMode === 'shop';
  const isGamerMode = room.watchMode === 'gamer';
  const isStandardMode = room.watchMode === 'standard';

  const [nowMs, setNowMs] = useState(() => Date.now());
  const [railTab, setRailTab] = useState<RailTab>('chat');
  const [shopPanelTab, setShopPanelTab] = useState<ShopPanelTab>('drop');
  const [gamerSubTab, setGamerSubTab] = useState<GamerSubTab>('squad');
  const [programSubTab, setProgramSubTab] = useState<ProgramSubTab>('agenda');
  const [viewerCaptionsOn, setViewerCaptionsOn] = useState(true);
  const [stageSoundOn, setStageSoundOn] = useState(false);
  const [pinnedOverlayDismissed, setPinnedOverlayDismissed] = useState(false);
  const [selectedDropProductId, setSelectedDropProductId] = useState<string | null>(null);
  const [addedFeedbackId, setAddedFeedbackId] = useState<string | null>(null);
  const [copiedPartyInvite, setCopiedPartyInvite] = useState(false);

  const [viewerName, setViewerName] = useState('Alex');
  const [chatText, setChatText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatReplyRef | null>(null);
  const [locallyBlocked, setLocallyBlocked] = useState<string[]>([]);
  const [tipDrawerOpen, setTipDrawerOpen] = useState(false);

  useEffect(() => {
    setTipDrawerOpen(false);
    setPinnedOverlayDismissed(false);
    setSelectedDropProductId(null);
  }, [room.roomCode]);

  useEffect(() => {
    if (!isShopMode && railTab === 'bag') {
      setRailTab('chat');
      onSetBagOpen(false);
    }
    if (isShopMode && railTab === 'qa') {
      setRailTab('chat');
      setShopPanelTab('qa');
    }
  }, [isShopMode, railTab, onSetBagOpen]);

  const [handPopoverOpen, setHandPopoverOpen] = useState(false);
  const [handTopic, setHandTopic] = useState('');

  const [questionDraft, setQuestionDraft] = useState('');
  const [upvotedIds, setUpvotedIds] = useState<Record<string, boolean>>({});

  const [bag, setBag] = useState<BagItem[]>([]);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [buyerFullName, setBuyerFullName] = useState('');
  const [buyerCity, setBuyerCity] = useState('Austin, TX');
  const [shippingAddress, setShippingAddress] = useState('410 Congress Ave');
  const [checkoutMethod, setCheckoutMethod] = useState<'Apple Pay' | 'Google Pay' | 'Card' | 'PayPal'>('Apple Pay');
  const [lastReceipt, setLastReceipt] = useState<CompletedReceipt | null>(null);

  const [votedPollId, setVotedPollId] = useState<string | null>(null);
  const [arenaXp, setArenaXp] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('gather:arena_xp');
      if (saved) {
        const parsed = Number(saved);
        if (Number.isFinite(parsed) && parsed >= 0) return parsed;
      }
    } catch {
      // ignore
    }
    return 1250;
  });
  const [wagerStake, setWagerStake] = useState<number>(100);
  const [activePrediction, setActivePrediction] = useState<{
    pollId: string;
    optionId: string;
    optionLabel: string;
    stake: number;
    odds: number;
  } | null>(null);
  const [hypeStreak, setHypeStreak] = useState(0);
  const hypeStreakTimerRef = useRef<number | null>(null);
  const [theaterMode, setTheaterMode] = useState(false);
  const [activePov, setActivePov] = useState<'main' | 'host' | 'tac'>('main');
  const [copiedCrosshair, setCopiedCrosshair] = useState(false);
  const [clipUpvotes, setClipUpvotes] = useState<Record<string, boolean>>({});
  const [clipLabel, setClipLabel] = useState('');
  const [clipSavedToast, setClipSavedToast] = useState(false);
  const [squadHandle, setSquadHandle] = useState('');
  const [squadPlatform, setSquadPlatform] = useState('PC · Discord');
  const [squadRole, setSquadRole] = useState('Flex');
  const [squadRank, setSquadRank] = useState('Ascendant');
  const [squadJoined, setSquadJoined] = useState(false);

  const [copiedShare, setCopiedShare] = useState(false);
  const [copiedLobby, setCopiedLobby] = useState(false);
  const [hypeParticles, setHypeParticles] = useState<FloatingHypeParticle[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem('gather:arena_xp', String(arenaXp));
    } catch {
      // ignore
    }
  }, [arenaXp]);

  useEffect(() => {
    if (!isGamerMode && theaterMode) {
      setTheaterMode(false);
    }
  }, [isGamerMode, theaterMode]);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (user?.displayName) {
      setViewerName(user.displayName);
      setBuyerFullName((prev) => prev || user.displayName || '');
    } else if (user?.email) {
      const localPart = user.email.split('@')[0];
      setViewerName(localPart);
      setBuyerFullName((prev) => prev || localPart);
    }
  }, [user?.displayName, user?.email]);

  const effectiveViewerName = useMemo(() => {
    if (user?.displayName) return user.displayName;
    if (user?.email) return user.email.split('@')[0];
    return viewerName.trim() || 'Viewer';
  }, [user, viewerName]);

  const canPostToChat = Boolean(user) || isPreviewMode;

  useEffect(() => {
    if (bagOpen && isShopMode) {
      setRailTab('bag');
      setShopPanelTab('bag');
    }
  }, [bagOpen, isShopMode]);

  useEffect(() => {
    const count = isShopMode ? bag.reduce((sum, item) => sum + item.quantity, 0) : 0;
    onBagCountChange(count);
  }, [bag, isShopMode, onBagCountChange]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = !stageSoundOn;
    }
  }, [stageSoundOn]);

  useEffect(() => {
    if (videoRef.current && broadcastStream) {
      videoRef.current.srcObject = broadcastStream;
      void videoRef.current.play().catch(() => {});
    }
  }, [broadcastStream]);

  useEffect(() => {
    if (!isPreviewMode || !localPreviewCanvas || !mirrorCanvasRef.current) return;
    let raf = 0;
    const dst = mirrorCanvasRef.current;
    const ctx = dst.getContext('2d');
    const copyFrame = () => {
      if (ctx && localPreviewCanvas.width > 0 && localPreviewCanvas.height > 0) {
        if (dst.width !== localPreviewCanvas.width || dst.height !== localPreviewCanvas.height) {
          dst.width = localPreviewCanvas.width;
          dst.height = localPreviewCanvas.height;
        }
        ctx.drawImage(localPreviewCanvas, 0, 0);
      }
      raf = requestAnimationFrame(copyFrame);
    };
    raf = requestAnimationFrame(copyFrame);
    return () => cancelAnimationFrame(raf);
  }, [isPreviewMode, localPreviewCanvas]);

  useEffect(() => {
    if (chatScrollRef.current && (isShopMode || railTab === 'chat')) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [room.chatMessages.length, railTab, tipDrawerOpen, isShopMode]);

  const pinnedProduct = useMemo(
    () =>
      isShopMode
        ? room.commerce.products.find((p) => p.id === room.commerce.pinnedProductId) ||
          room.commerce.products[0]
        : undefined,
    [isShopMode, room.commerce.products, room.commerce.pinnedProductId]
  );

  const lookbookOthers = useMemo(
    () =>
      isShopMode
        ? room.commerce.products.filter((p) => p.id !== pinnedProduct?.id)
        : [],
    [isShopMode, room.commerce.products, pinnedProduct?.id]
  );

  const activeFlashSale = useMemo(() => {
    const fs = room.commerce.activeFlashSale;
    if (!isShopMode || !fs || !fs.active || fs.endsAt <= nowMs) return null;
    return fs;
  }, [isShopMode, room.commerce.activeFlashSale, nowMs]);

  const sortedQuestions = useMemo<AudienceQuestion[]>(() => {
    return [...(room.questions || [])].sort((a, b) => b.upvotes - a.upvotes);
  }, [room.questions]);

  const bagPricing = useMemo(() => {
    let retailSubtotal = 0;
    let finalTotal = 0;
    let totalSavings = 0;
    const lines = bag.map((item) => {
      const calc = computeBagLinePricing(item, activeFlashSale, nowMs);
      retailSubtotal += calc.retailTotal;
      finalTotal += calc.lineTotal;
      totalSavings += calc.savings;
      return { item, ...calc };
    });
    return {
      lines,
      retailSubtotal: Number(retailSubtotal.toFixed(2)),
      finalTotal: Number(finalTotal.toFixed(2)),
      totalSavings: Number(totalSavings.toFixed(2)),
    };
  }, [bag, activeFlashSale, nowMs]);

  const addToBag = (product: ProductItem, quantityToAdd = 1, bundleLabel?: string, openDrawer = true) => {
    const variant = selectedVariants[product.id] || product.variants[0] || 'Standard';
    setLastReceipt(null);
    setBag((prev) => {
      const existingIdx = prev.findIndex(
        (i) => i.product.id === product.id && i.variant === variant
      );
      if (existingIdx >= 0) {
        return prev.map((item, idx) =>
          idx === existingIdx
            ? {
                ...item,
                quantity: Math.min(product.stock, Math.max(item.quantity + quantityToAdd, quantityToAdd)),
                bundleLabel: bundleLabel || item.bundleLabel,
              }
            : item
        );
      }
      return [
        ...prev,
        {
          product,
          variant,
          quantity: Math.min(product.stock, Math.max(1, quantityToAdd)),
          bundleLabel,
        },
      ];
    });
    setAddedFeedbackId(product.id);
    window.setTimeout(() => {
      setAddedFeedbackId((curr) => (curr === product.id ? null : curr));
    }, 1500);
    if (openDrawer) {
      setRailTab('bag');
      setShopPanelTab('bag');
      onSetBagOpen(true);
    }
  };

  const handleCompleteBagOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (bag.length === 0) return;
    const buyer = (buyerFullName || effectiveViewerName).trim() || 'Live Shopper';
    const city = buyerCity.trim() || 'Austin, TX';
    const addr = shippingAddress.trim() || 'Express In-Stream Delivery';
    const orderNumber = `GTH-${Math.floor(1000 + Math.random() * 9000)}`;

    const itemsPayload = bagPricing.lines.map(({ item, discountLabel }) => ({
      productId: item.product.id,
      quantity: item.quantity,
      variant: item.variant,
      bundleLabel: discountLabel || item.bundleLabel,
    }));

    onPlaceOrder({
      buyerName: buyer,
      buyerCity: city,
      paymentMethod: checkoutMethod,
      items: itemsPayload,
    });

    setLastReceipt({
      orderNumber,
      buyerName: buyer,
      buyerCity: city,
      shippingAddress: addr,
      paymentMethod: checkoutMethod,
      items: bagPricing.lines.map(({ item, lineTotal, discountLabel }) => ({
        title: item.product.title,
        source: item.product.source,
        variant: item.variant,
        quantity: item.quantity,
        lineTotal,
        bundleLabel: discountLabel || item.bundleLabel,
      })),
      subtotal: bagPricing.retailSubtotal,
      savings: bagPricing.totalSavings,
      total: bagPricing.finalTotal,
      createdAt: Date.now(),
    });
    setBag([]);
  };

  const triggerHypeBurst = () => {
    onSendHype();
    if (isGamerMode) {
      setHypeStreak((prev) => Math.min(25, prev + 1));
      setArenaXp((xp) => xp + 5);
      if (hypeStreakTimerRef.current) window.clearTimeout(hypeStreakTimerRef.current);
      hypeStreakTimerRef.current = window.setTimeout(() => setHypeStreak(0), 2600);
    }
    const kinds: FloatingHypeParticle['kind'][] = ['flame', 'zap', 'heart', 'spark'];
    const id = `hp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const next: FloatingHypeParticle = {
      id,
      leftPct: 72 + Math.round(Math.random() * 20),
      kind: kinds[Math.floor(Math.random() * kinds.length)],
    };
    setHypeParticles((prev) => [...prev.slice(-8), next]);
    window.setTimeout(() => {
      setHypeParticles((prev) => prev.filter((p) => p.id !== id));
    }, 1250);
  };

  const handleQuickClipCapture = (customTitle?: string) => {
    const title = customTitle?.trim() || `${effectiveViewerName}'s Highlight`;
    onCreateClip(title, elapsedSec, effectiveViewerName);
    setClipLabel('');
    setClipSavedToast(true);
    setArenaXp((xp) => xp + 25);
    window.setTimeout(() => setClipSavedToast(false), 2000);
  };

  const handleCopyCrosshair = () => {
    const code = room.gamer.crosshairCode || '0;P;c;5;o;1;0l;4;0o;2;0a;1;0f;0;1b;0';
    void navigator.clipboard.writeText(code);
    setCopiedCrosshair(true);
    window.setTimeout(() => setCopiedCrosshair(false), 1800);
  };

  const handleLockPrediction = (pollId: string, optionId: string, optionLabel: string, odds: number) => {
    const stake = Math.min(arenaXp, wagerStake);
    onVotePoll(optionId);
    setVotedPollId(pollId);
    if (stake > 0) {
      setArenaXp((xp) => Math.max(0, xp - stake));
    }
    setActivePrediction({
      pollId,
      optionId,
      optionLabel,
      stake,
      odds,
    });
  };

  const handleSubmitChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPostToChat || !chatText.trim()) return;
    onSendChat(chatText.trim(), effectiveViewerName, replyingTo || undefined);
    setChatText('');
    setReplyingTo(null);
  };

  const handleSubmitQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPostToChat || !questionDraft.trim()) return;
    if (onAskQuestion) {
      onAskQuestion(questionDraft.trim(), effectiveViewerName);
    } else {
      onSendChat(`Q: ${questionDraft.trim()}`, effectiveViewerName);
    }
    setQuestionDraft('');
  };

  const myHandEntry = useMemo(() => {
    const queue = room.handRaiseQueue || [];
    return queue.find(
      (h) => (clientId && h.id === clientId) || (user?.uid && h.uid === user.uid)
    );
  }, [room.handRaiseQueue, clientId, user?.uid]);

  const myHandPosition = useMemo(() => {
    if (!myHandEntry) return 0;
    return (room.handRaiseQueue || []).findIndex((h) => h.id === myHandEntry.id) + 1;
  }, [room.handRaiseQueue, myHandEntry]);

  const liveSalePopup = useMemo(() => {
    const p = room.commerce.latestSalePopup;
    if (!p || nowMs - p.createdAt > 7500) return null;
    return p;
  }, [room.commerce.latestSalePopup, nowMs]);

  const activeHypeTrain = useMemo(() => {
    const ht = room.hypeTrain;
    if (!ht || !ht.active || ht.endsAt <= nowMs) return null;
    return ht;
  }, [room.hypeTrain, nowMs]);

  const activePoll = room.gamer.activePoll;
  const totalPollVotes = activePoll
    ? activePoll.options.reduce((sum, o) => sum + o.votes, 0)
    : 0;
  const isVertical = room.aspectRatio === '9:16';
  const onStageSpeakers = room.participants.filter((p) => p.onStage);
  const bagTotalCount = bag.reduce((s, i) => s + i.quantity, 0);

  const liveCaptionLine =
    room.overlays.captionText ||
    `${onStageSpeakers[0]?.name || 'Host'}: Welcome to ${room.title} — drop your questions in Q&A.`;

  const activeDropProduct = useMemo(() => {
    if (!isShopMode) return undefined;
    if (selectedDropProductId) {
      const found = room.commerce.products.find((p) => p.id === selectedDropProductId);
      if (found) return found;
    }
    return pinnedProduct;
  }, [isShopMode, selectedDropProductId, room.commerce.products, pinnedProduct]);

  const getProductSalePrice = (prod: ProductItem) => {
    if (activeFlashSale && activeFlashSale.productId === prod.id) {
      return Number((prod.price * (1 - activeFlashSale.discountPct / 100)).toFixed(2));
    }
    return prod.price;
  };

  const hostSpeaker = onStageSpeakers.find((s) => s.role === 'host') || onStageSpeakers[0];
  const hostDisplayName = hostSpeaker?.name || 'Maya Chen';

  const handleToggleFullscreen = () => {
    const el = stageFrameContainerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    } else {
      void el.requestFullscreen?.().catch(() => {});
    }
  };

  const renderStageViewport = () => (
    <div
      ref={stageFrameContainerRef}
      className="flex-1 min-h-0 w-full flex flex-col relative overflow-hidden rounded-[12px]"
    >
      <div className="gather-stage-wrap relative min-h-[260px]">
        {isPreviewMode && localPreviewCanvas ? (
          <div className={isVertical ? 'gather-stage-frame-vertical' : 'gather-stage-frame'}>
            <canvas ref={mirrorCanvasRef} className="w-full h-full block object-contain" />
          </div>
        ) : broadcastStream ? (
          <div className={isVertical ? 'gather-stage-frame-vertical' : 'gather-stage-frame'}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={!stageSoundOn}
              controls
              className="w-full h-full object-contain bg-[#03060f]"
            />
          </div>
        ) : (
          <StageCanvas
            room={room}
            localClientId="watch-viewer"
            localStream={null}
            screenStream={null}
            remoteStreams={{}}
            activeMedia={null}
            videoFx={DEFAULT_VIDEO_FX}
            editMode={false}
            viewerMode
            onExitEditMode={() => {}}
            onUpdateCustomElements={() => {}}
            onDropMediaFile={() => {}}
            onMediaPageChange={() => {}}
            onStopMedia={() => {}}
            onCanvasReady={() => {}}
          />
        )}

        {/* Top Stage HUD: Live Tally & Scoreboard Bug (Left), Sound Prompt (Center), Telemetry / Flash Drop (Right) */}
        <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex items-start justify-between gap-3">
          <div className="pointer-events-auto flex items-center gap-2 flex-wrap">
            <span
              className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold tracking-wide inline-flex items-center gap-1.5 shadow-lg ${
                room.isLive ? 'bg-[#f43f5e] text-white' : 'bg-[#2563eb] text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              <span>{room.isLive ? 'LIVE' : 'PREVIEW'}</span>
            </span>

            {isGamerMode ? (
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[10px] bg-[#070d1c]/88 backdrop-blur-md border border-white/14 shadow-lg text-[11.5px]">
                <span className="font-bold tracking-wide text-sky-300">
                  {room.gamer.teamAName || 'GATHER'}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-white/10 font-mono-num font-bold text-white leading-none">
                  {room.gamer.teamAScore ?? 11}
                </span>
                <span className="text-white/40 font-mono-num">–</span>
                <span className="px-1.5 py-0.5 rounded bg-white/10 font-mono-num font-bold text-white leading-none">
                  {room.gamer.teamBScore ?? 9}
                </span>
                <span className="font-bold tracking-wide text-rose-300">
                  {room.gamer.teamBName || 'APEX'}
                </span>
                <span className="hidden sm:inline text-white/35">·</span>
                <span className="hidden sm:inline font-medium text-white/85">
                  {room.gamer.currentMap || 'Ascent'}
                  {room.gamer.roundLabel ? ` · ${room.gamer.roundLabel}` : ''}
                </span>
              </div>
            ) : (
              <span className="hidden sm:inline text-[12px] font-medium text-white/85 drop-shadow">
                {isShopMode ? 'Studio drop' : 'Behind the scenes'}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setStageSoundOn((v) => !v)}
            className="pointer-events-auto hidden md:inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#3b82f6]/92 hover:bg-[#2563eb] text-white shadow-xl backdrop-blur-md border border-white/20 cursor-pointer transition-colors"
          >
            {stageSoundOn ? (
              <Volume2 className="w-4 h-4 shrink-0" />
            ) : (
              <VolumeX className="w-4 h-4 shrink-0" />
            )}
            <span className="text-left leading-tight">
              <span className="block text-[11.5px] font-semibold">
                {stageSoundOn ? 'Sound active' : 'Turn on sound'}
              </span>
              <span className="block text-[10px] text-white/80">
                {stageSoundOn ? 'Listening to live mix' : 'Join the conversation'}
              </span>
            </span>
          </button>

          {isShopMode && activeFlashSale ? (
            <button
              type="button"
              onClick={() => setShopPanelTab('drop')}
              className="pointer-events-auto px-3.5 py-2 rounded-[13px] bg-[#0a0f1d]/90 backdrop-blur-xl border border-white/14 shadow-xl flex items-center gap-2.5 text-left cursor-pointer hover:border-amber-400/40 transition-colors"
            >
              <Clock className="w-4 h-4 text-white/75 shrink-0" />
              <div className="leading-tight">
                <div className="text-[10px] font-semibold tracking-wider uppercase text-amber-400">
                  Flash sale · {activeFlashSale.discountPct}% off
                </div>
                <div className="text-[13px] font-mono-num font-bold text-white">
                  Ends in {formatClock((activeFlashSale.endsAt - nowMs) / 1000)}
                </div>
              </div>
            </button>
          ) : isGamerMode ? (
            <div className="pointer-events-auto flex items-center gap-1.5">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[9px] bg-[#070d1c]/85 backdrop-blur-md border border-white/14 text-[10.5px] font-mono-num font-semibold text-emerald-400 shadow-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>18ms · {activePov === 'main' ? 'MAIN' : activePov === 'host' ? 'COMMS' : 'TAC'}</span>
              </span>
              <button
                type="button"
                onClick={handleCopyCrosshair}
                title="Copy Pro Crosshair Profile"
                className="px-2.5 py-1 rounded-[9px] bg-[#070d1c]/85 hover:bg-[#0f172a] backdrop-blur-md border border-white/14 text-[10.5px] font-mono-num font-semibold text-white/90 inline-flex items-center gap-1.5 cursor-pointer shadow-lg transition-colors whitespace-nowrap"
              >
                {copiedCrosshair ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Crosshair className="w-3 h-3 text-sky-400" />
                )}
                <span>{copiedCrosshair ? 'Copied!' : '!crosshair'}</span>
              </button>
            </div>
          ) : (
            <div className="w-10" />
          )}
        </div>

        {/* Ephemeral Live Claim Toast */}
        {liveSalePopup && (
          <div className="pointer-events-none absolute top-16 left-1/2 -translate-x-1/2 z-20 max-w-[90%] px-3.5 py-2 rounded-[14px] gather-card-obsidian border-emerald-400/40 flex items-center gap-3 animate-gather-msg">
            {liveSalePopup.productImageUrl && (
              <img
                src={liveSalePopup.productImageUrl}
                alt={liveSalePopup.productTitle}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-[8px] object-cover border border-white/15 shrink-0"
              />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[10.5px] font-mono-num font-semibold text-emerald-400">
                <span>Claimed #{liveSalePopup.orderNumber}</span>
                <span className="text-white/90">${liveSalePopup.total.toFixed(2)}</span>
              </div>
              <div className="text-[12px] font-medium text-white truncate">
                {liveSalePopup.buyerName} · {liveSalePopup.quantity}× {liveSalePopup.productTitle}
              </div>
            </div>
          </div>
        )}

        {/* Bottom-Right In-Stage Pinned Product Overlay (Shop Mode) */}
        {isShopMode && pinnedProduct && !pinnedOverlayDismissed && (
          <div className="hidden sm:block absolute right-3.5 bottom-11 z-20 w-[min(368px,calc(100%-28px))] rounded-[16px] bg-[#090e1c]/92 backdrop-blur-xl border border-white/14 p-3.5 shadow-2xl space-y-2.5 animate-gather-msg">
            <div className="flex items-center justify-between gap-2 text-[10px] font-semibold tracking-wider uppercase text-white/60">
              <span className="inline-flex items-center gap-1.5">
                <Pin className="w-3 h-3 text-[var(--cyan)]" />
                <span>Pinned by {hostDisplayName}</span>
              </span>
              <button
                type="button"
                onClick={() => setPinnedOverlayDismissed(true)}
                aria-label="Hide pinned product overlay"
                className="text-white/50 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <img
                src={pinnedProduct.imageUrl}
                alt={pinnedProduct.title}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-[10px] object-cover border border-white/12 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-white truncate">
                  {pinnedProduct.title}
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="font-mono-num text-[15px] font-bold text-white">
                    {formatMoney(getProductSalePrice(pinnedProduct))}
                  </span>
                  {getProductSalePrice(pinnedProduct) < pinnedProduct.price && (
                    <span className="font-mono-num text-[11.5px] line-through text-white/45">
                      {formatMoney(pinnedProduct.price)}
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-medium text-amber-400">
                  {pinnedProduct.stock} left in drop
                </div>
              </div>
              <button
                type="button"
                disabled={pinnedProduct.stock <= 0}
                onClick={() => addToBag(pinnedProduct, 1, undefined, true)}
                className="h-9 px-3.5 rounded-[10px] gather-btn-primary text-[12px] font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Buy now · {formatMoney(getProductSalePrice(pinnedProduct))}</span>
              </button>
            </div>
          </div>
        )}

        {/* Bottom Subtle Player Controls Scrim */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-11 bg-gradient-to-t from-black/75 via-black/30 to-transparent z-10 flex items-end justify-between px-3.5 pb-2 text-[11px] text-white/80">
          <div className="pointer-events-auto flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStageSoundOn((v) => !v)}
              aria-label={stageSoundOn ? 'Mute stage audio' : 'Unmute stage audio'}
              className="hover:text-white cursor-pointer"
            >
              {stageSoundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
            <span className="inline-flex items-center gap-1.5 font-mono-num">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f43f5e]" />
              <span>{room.isLive ? 'LIVE' : 'PREVIEW'}</span>
              <span className="text-white/45">·</span>
              <span className="text-white/70">{formatClock(elapsedSec)}</span>
            </span>
          </div>

          <div className="pointer-events-auto flex items-center gap-3 font-mono-num">
            {isShopMode && pinnedOverlayDismissed && pinnedProduct && (
              <button
                type="button"
                onClick={() => setPinnedOverlayDismissed(false)}
                className="text-[10.5px] font-sans font-semibold text-[var(--cyan)] hover:underline cursor-pointer"
              >
                Show pinned item
              </button>
            )}
            {isGamerMode && (
              <>
                <button
                  type="button"
                  onClick={() => handleQuickClipCapture()}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/12 hover:bg-white/20 text-[10.5px] font-sans font-semibold text-white cursor-pointer transition-colors whitespace-nowrap"
                >
                  <Clapperboard className="w-3 h-3 text-sky-300" />
                  <span>{clipSavedToast ? 'Clipped!' : 'Clip 30s'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheaterMode((v) => !v)}
                  className="hidden lg:inline-flex items-center gap-1 text-[10.5px] font-sans font-semibold text-white/85 hover:text-white cursor-pointer whitespace-nowrap"
                >
                  {theaterMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  <span>{theaterMode ? 'Show Rail' : 'Theater'}</span>
                </button>
              </>
            )}
            <span className="text-white/65">{isGamerMode ? '1080p60' : '1080p'}</span>
            <button
              type="button"
              onClick={handleToggleFullscreen}
              aria-label="Toggle fullscreen"
              className="hover:text-white cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Floating Hype Bursts */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {hypeParticles.map((p) => (
            <div
              key={p.id}
              style={{ left: `${p.leftPct}%`, bottom: '20px' }}
              className="absolute animate-gather-float"
            >
              <div className="w-8 h-8 rounded-full gather-card-obsidian grid place-items-center text-[var(--cyan)]">
                {p.kind === 'flame' ? (
                  <Flame className="w-4 h-4 text-amber-400" strokeWidth={1.65} />
                ) : p.kind === 'heart' ? (
                  <Heart className="w-4 h-4 text-rose-400" strokeWidth={1.65} />
                ) : p.kind === 'spark' ? (
                  <Sparkles className="w-4 h-4 text-sky-300" strokeWidth={1.65} />
                ) : (
                  <Zap className="w-4 h-4 text-emerald-400" strokeWidth={1.65} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderRaiseHandControl = () =>
    onRaiseHand ? (
      <div className="relative">
        {myHandEntry ? (
          <button
            type="button"
            onClick={() => onLowerHand?.()}
            className="h-8 px-3 rounded-[10px] bg-amber-500/15 border border-amber-500/35 text-amber-700 dark:text-amber-300 text-[12px] font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Hand className="w-3.5 h-3.5" strokeWidth={1.65} />
            <span className="font-mono-num">#{myHandPosition} · Lower</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setHandPopoverOpen((v) => !v)}
            className="h-8 px-3 rounded-[10px] gather-liquid-pill text-[12px] font-medium text-[var(--ink-2)] hover:text-[var(--ink)] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Hand className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" strokeWidth={1.65} />
            <span>Call In</span>
          </button>
        )}

        {handPopoverOpen && !myHandEntry && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onRaiseHand(
                handTopic.trim() || 'Would love to join the live stage for a quick question!'
              );
              setHandTopic('');
              setHandPopoverOpen(false);
            }}
            className="absolute right-0 top-10 z-40 w-[280px] p-3.5 rounded-[16px] gather-glass-elevated space-y-2.5"
          >
            <div className="flex items-center justify-between text-[12px] font-semibold text-[var(--ink)]">
              <span>Request Stage Call-In</span>
              <button
                type="button"
                onClick={() => setHandPopoverOpen(false)}
                className="text-[var(--ink-3)] hover:text-[var(--ink)] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" strokeWidth={1.65} />
              </button>
            </div>
            <input
              type="text"
              autoFocus
              value={handTopic}
              onChange={(e) => setHandTopic(e.target.value)}
              placeholder="Topic or question for the host..."
              className="w-full h-8 px-2.5 rounded-[8px] bg-[var(--fill)] border border-[var(--line-2)] text-[12px] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:border-[var(--cyan)]"
            />
            <button
              type="submit"
              className="w-full h-8 rounded-[8px] gather-btn-primary text-[12px] font-semibold cursor-pointer whitespace-nowrap"
            >
              Send Request
            </button>
          </form>
        )}
      </div>
    ) : null;

  const renderShareButton = () => (
    <button
      type="button"
      onClick={() => {
        const url = `${window.location.origin}/?watch=${room.roomCode}`;
        void navigator.clipboard.writeText(url);
        setCopiedShare(true);
        window.setTimeout(() => setCopiedShare(false), 1800);
      }}
      aria-label="Copy Watch Link"
      className="h-8 px-3 rounded-[10px] gather-liquid-pill text-[12px] font-medium text-[var(--ink-2)] hover:text-[var(--ink)] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
    >
      {copiedShare ? (
        <Check className="w-3.5 h-3.5 text-[var(--ok)]" strokeWidth={1.75} />
      ) : (
        <Share2 className="w-3.5 h-3.5" strokeWidth={1.65} />
      )}
      <span>{copiedShare ? 'Copied' : 'Share'}</span>
    </button>
  );

  const renderNotifyButton = () =>
    onToggleSubscribe ? (
      <button
        type="button"
        disabled={subscribing}
        onClick={() => void onToggleSubscribe()}
        className={`h-8 px-3 rounded-[10px] text-[12px] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
          isSubscribed
            ? 'bg-emerald-500/14 border border-emerald-500/35 text-emerald-700 dark:text-emerald-300'
            : 'gather-liquid-pill text-[var(--ink-2)] hover:text-[var(--ink)]'
        }`}
      >
        {isSubscribed ? (
          <BellRing className="w-3.5 h-3.5" strokeWidth={1.65} />
        ) : (
          <Bell className="w-3.5 h-3.5 text-[var(--cyan)]" strokeWidth={1.65} />
        )}
        <span>{subscribing ? 'Saving...' : isSubscribed ? 'Subscribed' : 'Notify'}</span>
      </button>
    ) : null;

  const renderFormatSwitch = () =>
    isPreviewMode && onSwitchWatchMode ? (
      <div className="gather-seg shrink-0" role="tablist" aria-label="Preview Stream Format">
        {(
          [
            { id: 'standard', label: 'Broadcast' },
            { id: 'shop', label: 'Shop' },
            { id: 'gamer', label: 'Arena' },
          ] as const
        ).map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={room.watchMode === m.id}
            onClick={() => onSwitchWatchMode(m.id)}
            className={`gather-seg-btn ${room.watchMode === m.id ? 'active' : ''}`}
          >
            {m.label}
          </button>
        ))}
      </div>
    ) : null;

  return (
    <div className="flex-1 min-h-0 w-full flex flex-col lg:overflow-hidden">
      {/* 72% Cinema Stage / 28% Obsidian Companion Rail (or Full Theater in Arena) */}
      <div
        className={`flex-1 min-h-0 w-full px-2 sm:px-4 pb-3 pt-1 grid grid-cols-1 gap-3.5 overflow-y-auto lg:overflow-hidden ${
          isGamerMode && theaterMode
            ? 'lg:grid-cols-1'
            : 'lg:grid-cols-[minmax(0,1fr)_390px] xl:grid-cols-[minmax(0,1fr)_410px]'
        }`}
      >
        {/* ===================================================================== */}
        {/* LEFT COLUMN: EDITORIAL HEADER + CINEMA STAGE + BELOW-STAGE BARS       */}
        {/* ===================================================================== */}
        <section className="min-h-0 min-w-0 w-full flex flex-col gap-2.5 overflow-visible lg:overflow-hidden">
          {/* Clean Editorial Stream Header */}
          <header className="relative z-20 shrink-0 px-0.5 pt-0.5 flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold tracking-[0.09em] uppercase text-[var(--ink-3)]">
                <span>
                  {isShopMode
                    ? room.commerce.storeLabel || 'Gather Sessions · Live Drop'
                    : isGamerMode
                    ? room.gamer.gameTitle
                    : 'Gather Sessions · Live Broadcast'}
                </span>
                {isGamerMode && room.gamer.seriesScore && (
                  <>
                    <span aria-hidden="true">/</span>
                    <span className="text-amber-600 dark:text-amber-300 font-mono-num">
                      {room.gamer.seriesScore}
                    </span>
                  </>
                )}
                {isGamerMode && room.gamer.modeOrRank && (
                  <>
                    <span aria-hidden="true">/</span>
                    <span className="text-[var(--cyan)] normal-case tracking-normal font-medium">
                      {room.gamer.modeOrRank}
                    </span>
                  </>
                )}
                {isStandardMode && onStageSpeakers.length > 0 && (
                  <>
                    <span aria-hidden="true">/</span>
                    <span className="normal-case tracking-normal font-medium text-[var(--ink-2)] truncate">
                      {onStageSpeakers.map((s) => s.name).join(', ')}
                    </span>
                  </>
                )}
              </div>

              <h1 className="font-display text-[22px] sm:text-[26px] font-bold tracking-[-0.03em] leading-tight text-[var(--ink)] text-balance truncate">
                {room.title}
              </h1>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
              {renderFormatSwitch()}

              {isGamerMode && (
                <>
                  {theaterMode && (
                    <button
                      type="button"
                      onClick={() => setTheaterMode(false)}
                      className="h-8 px-3 rounded-[10px] gather-btn-primary text-[11.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Minimize2 className="w-3.5 h-3.5" />
                      <span>Show Chat &amp; Arena</span>
                    </button>
                  )}
                  {room.gamer.lobbyCode && (
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(room.gamer.lobbyCode);
                        setCopiedLobby(true);
                        window.setTimeout(() => setCopiedLobby(false), 1600);
                      }}
                      className="h-8 px-3 rounded-[10px] gather-liquid-pill text-[11.5px] font-mono-num font-semibold text-[var(--ink)] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      {copiedLobby ? (
                        <Check className="w-3.5 h-3.5 text-[var(--ok)]" strokeWidth={1.75} />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-[var(--cyan)]" strokeWidth={1.65} />
                      )}
                      <span>{copiedLobby ? 'Lobby Copied' : room.gamer.lobbyCode}</span>
                    </button>
                  )}
                </>
              )}

              {isStandardMode && (
                <button
                  type="button"
                  onClick={() => setViewerCaptionsOn((v) => !v)}
                  className={`h-8 px-3 rounded-[10px] text-[12px] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                    viewerCaptionsOn
                      ? 'bg-[var(--accent-soft)] border border-[var(--accent-line)] text-[var(--accent-text)]'
                      : 'gather-liquid-pill text-[var(--ink-2)] hover:text-[var(--ink)]'
                  }`}
                >
                  <Captions className="w-3.5 h-3.5" strokeWidth={1.65} />
                  <span>Captions</span>
                </button>
              )}

              {!isShopMode && renderRaiseHandControl()}
              {!isShopMode && renderNotifyButton()}
              {!isShopMode && renderShareButton()}
            </div>
          </header>

          {/* Maximized Cinema Video Player */}
          {renderStageViewport()}

          {/* BELOW-STAGE OBSIDIAN ACTION BARS (Shop Party + Creator Broadcast) */}
          {isShopMode && (
            <div className="shrink-0 space-y-2">
              {/* Bar 1: Shop Party & Sync Bar */}
              <div className="gather-card-obsidian rounded-[14px] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex -space-x-2 shrink-0">
                    <span className="w-7 h-7 rounded-full bg-indigo-500 text-white text-[10px] font-bold grid place-items-center ring-2 ring-[var(--bg)]">
                      Y
                    </span>
                    <span className="w-7 h-7 rounded-full bg-violet-500 text-white text-[10px] font-bold grid place-items-center ring-2 ring-[var(--bg)]">
                      MC
                    </span>
                    <span className="w-7 h-7 rounded-full bg-sky-500 text-white text-[10px] font-bold grid place-items-center ring-2 ring-[var(--bg)]">
                      JB
                    </span>
                    <span className="w-7 h-7 rounded-full bg-emerald-500 text-white text-[10px] font-bold grid place-items-center ring-2 ring-[var(--bg)]">
                      N
                    </span>
                  </div>
                  <div className="min-w-0 leading-tight">
                    <div className="text-[12.5px] font-semibold text-[var(--ink)]">
                      Your shop party · {Math.max(4, onStageSpeakers.length + 2)}
                    </div>
                    <div className="text-[11px] text-[var(--ink-3)] truncate">
                      You, {hostDisplayName.split(' ')[0]}, Jon + Nina
                    </div>
                  </div>
                </div>

                <div className="hidden md:flex items-center gap-1.5 text-[12px] font-medium text-[var(--ok)] whitespace-nowrap">
                  <Check className="w-3.5 h-3.5" />
                  <span>Synced to live</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}/?watch=${room.roomCode}`;
                      void navigator.clipboard.writeText(url);
                      setCopiedShare(true);
                      window.setTimeout(() => setCopiedShare(false), 1800);
                    }}
                    className="h-8 px-3 rounded-[9px] gather-liquid-pill text-[12px] font-semibold text-[var(--ink)] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    {copiedShare ? (
                      <Check className="w-3.5 h-3.5 text-[var(--ok)]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-[var(--ink-2)]" />
                    )}
                    <span>{copiedShare ? 'Copied' : 'Copy link'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}/?watch=${room.roomCode}`;
                      void navigator.clipboard.writeText(url);
                      setCopiedPartyInvite(true);
                      window.setTimeout(() => setCopiedPartyInvite(false), 2000);
                    }}
                    className="h-8 px-3.5 rounded-[9px] gather-btn-primary text-[12px] font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{copiedPartyInvite ? 'Invite copied' : 'Invite friends'}</span>
                  </button>
                </div>
              </div>

              {/* Bar 2: Creator Studio Follow / Share / Hype Bar */}
              <div className="gather-card-obsidian rounded-[14px] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {hostSpeaker?.avatarUrl ? (
                    <img
                      src={hostSpeaker.avatarUrl}
                      alt={hostDisplayName}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-full object-cover border border-[var(--line-2)] shrink-0"
                    />
                  ) : (
                    <span className="w-9 h-9 rounded-full gather-btn-primary text-white text-xs font-bold grid place-items-center shrink-0">
                      {getWatchAvatar(hostDisplayName).initials}
                    </span>
                  )}
                  <div className="min-w-0 leading-tight">
                    <div className="text-[13px] font-semibold text-[var(--ink)] truncate">
                      {hostDisplayName}
                    </div>
                    <div className="text-[11px] text-[var(--ink-3)] truncate">
                      Live studio · {Math.max(1, room.viewerCount).toLocaleString()} watching
                    </div>
                  </div>
                  <span className="hidden xl:inline-block pl-3 ml-1 border-l border-[var(--line)] text-[10.5px] font-semibold tracking-[0.08em] uppercase text-[var(--ink-3)] whitespace-nowrap">
                    Live with {hostDisplayName}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {onToggleSubscribe && (
                    <button
                      type="button"
                      disabled={subscribing}
                      onClick={() => void onToggleSubscribe()}
                      className={`h-8 px-4 rounded-[9px] text-[12px] font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                        isSubscribed
                          ? 'bg-emerald-500/14 border border-emerald-500/35 text-emerald-700 dark:text-emerald-300'
                          : 'gather-btn-primary'
                      }`}
                    >
                      {subscribing ? 'Saving...' : isSubscribed ? 'Following' : 'Follow'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}/?watch=${room.roomCode}`;
                      void navigator.clipboard.writeText(url);
                      setCopiedShare(true);
                      window.setTimeout(() => setCopiedShare(false), 1800);
                    }}
                    className="h-8 px-3 rounded-[9px] gather-liquid-pill text-[12px] font-semibold text-[var(--ink)] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Share2 className="w-3.5 h-3.5 text-[var(--ink-2)]" />
                    <span>Share</span>
                  </button>
                  <button
                    type="button"
                    onClick={triggerHypeBurst}
                    className="h-8 px-3 rounded-[9px] gather-liquid-pill text-[12px] font-mono-num font-semibold text-[var(--ink)] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Heart className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                    <span>{room.gamer.hypeCount}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {isGamerMode && (
            <div className="shrink-0 space-y-2">
              {/* Bar 1: Live Arena Match Command, POV Switcher, Hype Combo & 1-Click Clip */}
              <div className="gather-card-obsidian rounded-[14px] px-3.5 py-2 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  {hostSpeaker?.avatarUrl ? (
                    <img
                      src={hostSpeaker.avatarUrl}
                      alt={hostDisplayName}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-full object-cover border border-[var(--line-2)] shrink-0"
                    />
                  ) : (
                    <span className="w-8 h-8 rounded-full gather-btn-primary text-white text-xs font-bold grid place-items-center shrink-0">
                      {getWatchAvatar(hostDisplayName).initials}
                    </span>
                  )}
                  <div className="min-w-0 leading-tight">
                    <div className="text-[12.5px] font-semibold text-[var(--ink)] flex items-center gap-1.5 truncate">
                      <span>{hostDisplayName}</span>
                      <span className="text-[10.5px] font-mono-num text-[var(--ok)]">· 18ms</span>
                    </div>
                    <div className="text-[11px] text-[var(--ink-3)] truncate">
                      {room.gamer.teamAName || 'GATHER'} {room.gamer.teamAScore ?? 11} –{' '}
                      {room.gamer.teamBScore ?? 9} {room.gamer.teamBName || 'APEX'} ·{' '}
                      {room.gamer.sensitivity || '0.35 (280 eDPI)'}
                    </div>
                  </div>
                </div>

                {/* Perspective Switcher */}
                <div className="hidden xl:flex items-center gap-1 p-0.5 rounded-[9px] bg-[var(--fill)] border border-[var(--line)]">
                  {(
                    [
                      { id: 'main', label: 'Main POV' },
                      { id: 'host', label: 'Squad Comms' },
                      { id: 'tac', label: 'Tac View' },
                    ] as const
                  ).map((pov) => (
                    <button
                      key={pov.id}
                      type="button"
                      onClick={() => setActivePov(pov.id)}
                      className={`h-6 px-2.5 rounded-[7px] text-[11px] font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                        activePov === pov.id
                          ? 'gather-btn-primary text-white'
                          : 'text-[var(--ink-3)] hover:text-[var(--ink)]'
                      }`}
                    >
                      {pov.label}
                    </button>
                  ))}
                </div>

                {/* Action Triggers: Hype Combo + 1-Click Clip + Quick Rail Jumps */}
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={triggerHypeBurst}
                    className="h-8 px-3 rounded-[9px] gather-liquid-pill text-[12px] font-semibold text-[var(--ink)] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap hover:border-amber-400/45 transition-colors"
                  >
                    <Flame className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                    <span>Hype</span>
                    <span className="font-mono-num text-[var(--cyan)]">{room.gamer.hypeCount}</span>
                    {hypeStreak > 1 && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-300 font-mono-num text-[10px] font-bold">
                        ×{hypeStreak}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickClipCapture()}
                    className="h-8 px-3 rounded-[9px] gather-liquid-pill text-[12px] font-semibold text-[var(--ink)] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Clapperboard className="w-3.5 h-3.5 text-[var(--cyan)]" />
                    <span>{clipSavedToast ? `Clipped @ ${formatClock(elapsedSec)}` : 'Clip 30s'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRailTab('companion');
                      setGamerSubTab('squad');
                      if (theaterMode) setTheaterMode(false);
                    }}
                    className="h-8 px-3 rounded-[9px] gather-liquid-pill text-[12px] font-semibold text-[var(--ink)] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Users className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                    <span>Squad ({room.squadQueue.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRailTab('companion');
                      setGamerSubTab('rig');
                      if (theaterMode) setTheaterMode(false);
                    }}
                    className="hidden sm:inline-flex h-8 px-2.5 rounded-[9px] gather-liquid-pill text-[11.5px] font-mono-num font-semibold text-[var(--ink-2)] hover:text-[var(--ink)] items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <Crosshair className="w-3.5 h-3.5 text-[var(--cyan)]" />
                    <span>!sens</span>
                  </button>
                </div>
              </div>

              {/* Bar 2: Gamified Arena Prediction Market (Live Odds + XP Stakes) */}
              {activePoll && activePoll.options.length >= 2 && (
                <div className="gather-card-obsidian rounded-[14px] px-3.5 py-2.5 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
                    <div className="flex items-center gap-2 min-w-0">
                      <Trophy className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" strokeWidth={1.75} />
                      <span className="font-semibold text-[var(--ink)] truncate">{activePoll.question}</span>
                      <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500/14 text-amber-700 dark:text-amber-300 font-mono-num text-[10.5px] font-bold whitespace-nowrap">
                        {arenaXp.toLocaleString()} XP
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="hidden sm:inline text-[11px] text-[var(--ink-3)]">Stake:</span>
                      {[50, 100, 250, 500].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          disabled={votedPollId === activePoll.id || arenaXp < amt}
                          onClick={() => setWagerStake(amt)}
                          className={`h-6 px-2 rounded-[6px] text-[10.5px] font-mono-num font-bold cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-default ${
                            wagerStake === amt
                              ? 'gather-btn-primary text-white'
                              : 'bg-[var(--fill)] text-[var(--ink-2)] hover:text-[var(--ink)] border border-[var(--line)]'
                          }`}
                        >
                          {amt}
                        </button>
                      ))}
                      <span className="font-mono-num text-[11px] text-[var(--ink-3)] pl-1">
                        {totalPollVotes} picks
                      </span>
                    </div>
                  </div>

                  {(() => {
                    const leftOpt = activePoll.options[0];
                    const rightOpt = activePoll.options[1];
                    const leftPct =
                      totalPollVotes > 0 ? Math.round((leftOpt.votes / totalPollVotes) * 100) : 50;
                    const rightPct = 100 - leftPct;
                    const leftOdds = Number((100 / Math.max(15, leftPct)).toFixed(2));
                    const rightOdds = Number((100 / Math.max(15, rightPct)).toFixed(2));
                    const hasVoted = votedPollId === activePoll.id;

                    return (
                      <div className="space-y-1.5">
                        <div className="h-1.5 rounded-full bg-[var(--fill-active)] overflow-hidden flex">
                          <div
                            style={{ width: `${leftPct}%` }}
                            className="h-full bg-gradient-to-r from-[#3b82f6] to-[#7dd3fc] transition-all duration-500 ease-out"
                          />
                          <div
                            style={{ width: `${rightPct}%` }}
                            className="h-full bg-gradient-to-r from-[#818cf8] to-[#f43f5e] transition-all duration-500 ease-out"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {[
                            { opt: leftOpt, pct: leftPct, odds: leftOdds, tone: 'text-[var(--cyan)]' },
                            {
                              opt: rightOpt,
                              pct: rightPct,
                              odds: rightOdds,
                              tone: 'text-rose-600 dark:text-rose-300',
                            },
                          ].map(({ opt, pct, odds, tone }) => {
                            const isMyPick =
                              activePrediction?.pollId === activePoll.id &&
                              activePrediction?.optionId === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                disabled={!activePoll.isOpen || hasVoted}
                                onClick={() =>
                                  handleLockPrediction(activePoll.id, opt.id, opt.label, odds)
                                }
                                className={`h-8 px-3 rounded-[9px] flex items-center justify-between gap-2 text-[11.5px] cursor-pointer disabled:cursor-default transition-all ${
                                  isMyPick
                                    ? 'bg-[var(--accent-soft)] border border-[var(--accent-line)]'
                                    : 'gather-liquid-pill'
                                }`}
                              >
                                <span className="truncate font-semibold text-[var(--ink)]">
                                  {isMyPick ? `Picked · ${opt.label}` : opt.label}
                                </span>
                                <span className="flex items-center gap-2 font-mono-num shrink-0">
                                  <span className="text-[10.5px] text-[var(--ink-3)]">
                                    {odds}×
                                  </span>
                                  <span className={`font-bold ${tone}`}>{pct}%</span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        {activePrediction?.pollId === activePoll.id && (
                          <div className="flex items-center justify-between text-[11px] font-mono-num text-[var(--ok)] pt-0.5">
                            <span>
                              Locked {activePrediction.stake} XP on {activePrediction.optionLabel}
                            </span>
                            <span>
                              Potential win: +{Math.round(activePrediction.stake * activePrediction.odds)} XP
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {isStandardMode && viewerCaptionsOn && (
            <div className="shrink-0 gather-card-obsidian rounded-[12px] px-4 py-2 flex items-center gap-2.5 text-[12px] text-[var(--ink)]">
              <Captions className="w-3.5 h-3.5 text-[var(--cyan)] shrink-0" strokeWidth={1.65} />
              <p className="truncate leading-snug text-[var(--ink-2)]">{liveCaptionLine}</p>
            </div>
          )}
        </section>

        {/* ===================================================================== */}
        {/* RIGHT COLUMN: STACKED DUAL OBSIDIAN CARDS (SHOP) OR UNIFIED RAIL      */}
        {/* ===================================================================== */}
        {!(isGamerMode && theaterMode) && (
          <aside className="flex flex-col gap-3 min-h-[540px] lg:min-h-0 lg:h-full w-full overflow-hidden">
          {isShopMode && (
            <div className="gather-card-obsidian rounded-[18px] p-4 flex flex-col gap-2.5 shrink-0 lg:max-h-[470px] overflow-hidden">
              {/* Top Card Header: Shop the live drop + Bag Button */}
              <div className="flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  {shopPanelTab === 'bag' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShopPanelTab('drop');
                        onSetBagOpen(false);
                      }}
                      className="inline-flex items-center gap-1.5 text-[14px] font-bold text-[var(--ink)] hover:text-[var(--accent-text)] cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Express Bag</span>
                    </button>
                  ) : (
                    <h2 className="font-display text-[16px] font-bold text-[var(--ink)] truncate">
                      Shop the live drop
                    </h2>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const next = shopPanelTab === 'bag' ? 'drop' : 'bag';
                    setShopPanelTab(next);
                    onSetBagOpen(next === 'bag');
                  }}
                  className={`h-8 px-3 rounded-[9px] text-[12px] font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
                    shopPanelTab === 'bag'
                      ? 'gather-btn-primary text-white'
                      : 'gather-liquid-pill text-[var(--ink)]'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span className="font-mono-num">Bag ({bagTotalCount})</span>
                </button>
              </div>

              {/* Quiet Inline Shop View Switcher */}
              {shopPanelTab !== 'bag' && (
                <div className="flex items-center gap-4 border-b border-[var(--line)] text-[11.5px] shrink-0">
                  {(
                    [
                      { id: 'drop', label: 'Featured' },
                      { id: 'all', label: `Lookbook (${room.commerce.products.length})` },
                      { id: 'claims', label: `Claims (${room.commerce.recentOrders.length})` },
                      { id: 'qa', label: `Q&A (${sortedQuestions.length})` },
                    ] as const
                  ).map((tab) => {
                    const active = shopPanelTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setShopPanelTab(tab.id)}
                        className={`pb-2 font-medium cursor-pointer transition-colors border-b-2 whitespace-nowrap ${
                          active
                            ? 'text-[var(--ink)] border-[var(--accent)]'
                            : 'text-[var(--ink-3)] hover:text-[var(--ink)] border-transparent'
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Shop Card Body */}
              <div className="flex-1 min-h-0 overflow-y-auto gather-scroll space-y-3 pr-0.5">
                {shopPanelTab === 'drop' && activeDropProduct && (
                  <>
                    {activeFlashSale && (
                      <div className="rounded-[10px] bg-[var(--fill)] border border-[var(--line)] px-3 py-2 flex items-center justify-between gap-2 text-[11.5px]">
                        <span className="font-semibold tracking-wider uppercase text-amber-600 dark:text-amber-400">
                          Flash sale · {activeFlashSale.discountPct}% off
                        </span>
                        <span className="inline-flex items-center gap-1.5 font-mono-num font-semibold text-[var(--ink)]">
                          <Clock className="w-3.5 h-3.5 text-[var(--ink-3)]" />
                          {formatClock((activeFlashSale.endsAt - nowMs) / 1000)}
                        </span>
                      </div>
                    )}

                    {/* Featured Product Lockup */}
                    <div className="flex items-start gap-3">
                      <img
                        src={activeDropProduct.imageUrl}
                        alt={activeDropProduct.title}
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 rounded-[11px] object-cover border border-[var(--line-2)] shrink-0"
                      />
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <h3 className="text-[14.5px] font-bold text-[var(--ink)] leading-snug truncate">
                          {activeDropProduct.title}
                        </h3>
                        <p className="text-[11.5px] text-[var(--ink-3)] line-clamp-1">
                          {activeDropProduct.description || `${activeDropProduct.source} live exclusive`}
                        </p>
                        <div className="flex items-baseline gap-2 pt-0.5">
                          <span className="font-mono-num text-[16px] font-bold text-[var(--ink)]">
                            {formatMoney(getProductSalePrice(activeDropProduct))}
                          </span>
                          {getProductSalePrice(activeDropProduct) < activeDropProduct.price && (
                            <span className="font-mono-num text-[12px] line-through text-[var(--ink-3)]">
                              {formatMoney(activeDropProduct.price)}
                            </span>
                          )}
                          <span className="text-[10.5px] font-mono-num text-[var(--ink-3)]">
                            {activeDropProduct.currency || 'USD'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Variant & Fulfillment Row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[12px] font-semibold text-[var(--ink)]">
                          {selectedVariants[activeDropProduct.id] || activeDropProduct.variants[0] || 'Standard edition'}
                        </div>
                        <div className="text-[11px] text-[var(--ink-3)]">
                          Instant in-stream claim · Free US shipping
                        </div>
                      </div>
                      {activeDropProduct.variants.length > 1 && (
                        <select
                          aria-label={`Select variant for ${activeDropProduct.title}`}
                          value={selectedVariants[activeDropProduct.id] || activeDropProduct.variants[0]}
                          onChange={(e) =>
                            setSelectedVariants((prev) => ({
                              ...prev,
                              [activeDropProduct.id]: e.target.value,
                            }))
                          }
                          className="h-8 px-2 rounded-[8px] bg-[var(--fill)] border border-[var(--line-2)] text-[11px] text-[var(--ink)] max-w-[140px]"
                        >
                          {activeDropProduct.variants.map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Stock Urgency Line */}
                    <div className="text-[11.5px] font-semibold text-amber-600 dark:text-amber-400">
                      {activeDropProduct.stock} of {activeFlashSale?.totalUnits || 15} drop units left
                    </div>

                    {/* Dual CTA Row: Buy Now + Add to Bag */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={activeDropProduct.stock <= 0}
                        onClick={() => addToBag(activeDropProduct, 1, undefined, true)}
                        className="flex-1 h-10 rounded-[11px] gather-btn-primary text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>
                          {activeDropProduct.stock > 0
                            ? `Buy now · ${formatMoney(getProductSalePrice(activeDropProduct))}`
                            : 'Sold Out'}
                        </span>
                      </button>
                      <button
                        type="button"
                        disabled={activeDropProduct.stock <= 0}
                        onClick={() => addToBag(activeDropProduct, 1, undefined, false)}
                        className="h-10 px-4 rounded-[11px] gather-liquid-pill text-[13px] font-semibold text-[var(--ink)] cursor-pointer whitespace-nowrap shrink-0"
                      >
                        {addedFeedbackId === activeDropProduct.id ? 'Added ✓' : 'Add to bag'}
                      </button>
                    </div>

                    {/* Multi-item Switcher Strip */}
                    {room.commerce.products.length > 1 && (
                      <div className="flex items-center gap-2 pt-1.5 border-t border-[var(--line)]">
                        {room.commerce.products.map((prod) => {
                          const isSelected = activeDropProduct.id === prod.id;
                          return (
                            <button
                              key={prod.id}
                              type="button"
                              onClick={() => setSelectedDropProductId(prod.id)}
                              className={`flex-1 min-w-0 p-1.5 rounded-[9px] border flex items-center gap-2 text-left cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-[var(--accent-soft)] border-[var(--accent-line)]'
                                  : 'bg-[var(--fill)] border-[var(--line)] hover:border-[var(--line-2)]'
                              }`}
                            >
                              <img
                                src={prod.imageUrl}
                                alt={prod.title}
                                referrerPolicy="no-referrer"
                                className="w-7 h-7 rounded-[6px] object-cover shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="text-[10.5px] font-semibold text-[var(--ink)] truncate">
                                  {prod.title}
                                </div>
                                <div className="text-[10px] font-mono-num text-[var(--ink-3)]">
                                  {formatMoney(getProductSalePrice(prod))}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {shopPanelTab === 'all' && (
                  <div className="divide-y divide-[var(--line)]">
                    {room.commerce.products.map((prod, idx) => {
                      const displayPrice = getProductSalePrice(prod);
                      return (
                        <div key={prod.id} className="py-2.5 first:pt-0 last:pb-0 flex gap-3">
                          <img
                            src={prod.imageUrl}
                            alt={prod.title}
                            referrerPolicy="no-referrer"
                            className="w-14 h-14 rounded-[9px] object-cover shrink-0 border border-[var(--line)]"
                          />
                          <div className="min-w-0 flex-1 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between gap-2 text-[10px] font-mono-num text-[var(--ink-3)]">
                                <span>
                                  0{idx + 1} · {prod.source}
                                </span>
                                <span>{prod.stock} left</span>
                              </div>
                              <h4 className="text-[13px] font-semibold text-[var(--ink)] truncate">
                                {prod.title}
                              </h4>
                            </div>
                            <div className="flex items-center justify-between gap-2 pt-1">
                              <span className="font-mono-num text-[12.5px] font-bold text-[var(--ink)]">
                                {formatMoney(displayPrice)}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={prod.stock <= 0}
                                  onClick={() => addToBag(prod, 1, undefined, false)}
                                  className="h-7 px-2.5 rounded-[7px] gather-liquid-pill text-[11px] font-semibold text-[var(--ink)] cursor-pointer whitespace-nowrap"
                                >
                                  {addedFeedbackId === prod.id ? 'Added ✓' : '+ Bag'}
                                </button>
                                <button
                                  type="button"
                                  disabled={prod.stock <= 0}
                                  onClick={() => addToBag(prod, 1, undefined, true)}
                                  className="h-7 px-2.5 rounded-[7px] gather-btn-primary text-[11px] font-semibold cursor-pointer whitespace-nowrap"
                                >
                                  Buy
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {shopPanelTab === 'claims' && (
                  <div className="divide-y divide-[var(--line)]">
                    {room.commerce.recentOrders.length === 0 ? (
                      <p className="text-[12px] text-[var(--ink-3)] py-6 text-center">
                        Live claims appear here as shoppers reserve pieces in-stream.
                      </p>
                    ) : (
                      room.commerce.recentOrders.map((ord) => (
                        <div key={ord.id} className="py-2 first:pt-0 space-y-0.5">
                          <div className="flex items-center justify-between text-[11px] text-[var(--ok)] font-mono-num font-semibold">
                            <span>#{ord.orderNumber || 'Claimed'}</span>
                            <span>${ord.total.toFixed(2)}</span>
                          </div>
                          <div className="text-[12.5px] font-medium text-[var(--ink)] truncate">
                            {ord.buyerName} · {ord.quantity}× {ord.productTitle}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {shopPanelTab === 'qa' && (
                  <div className="space-y-2.5">
                    {canPostToChat ? (
                      <form onSubmit={handleSubmitQuestion} className="flex gap-1.5">
                        <input
                          type="text"
                          value={questionDraft}
                          onChange={(e) => setQuestionDraft(e.target.value)}
                          placeholder="Ask about sizing or materials..."
                          className="flex-1 min-w-0 h-8 px-2.5 rounded-[8px] bg-[var(--fill)] border border-[var(--line-2)] text-[12px] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:border-[var(--accent)]"
                        />
                        <button
                          type="submit"
                          className="h-8 px-3 rounded-[8px] gather-btn-primary text-[11.5px] font-semibold cursor-pointer shrink-0"
                        >
                          Ask
                        </button>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void onSignInWithGoogle?.()}
                        className="w-full h-9 px-3 rounded-[9px] gather-liquid-pill text-[var(--ink)] font-medium text-[12px] inline-flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <GoogleMarkSvg />
                        <span>Sign in with Google to Ask</span>
                      </button>
                    )}

                    <div className="divide-y divide-[var(--line)]">
                      {sortedQuestions.map((q) => {
                        const upvoted = Boolean(upvotedIds[q.id]);
                        return (
                          <div key={q.id} className="py-2 first:pt-0 space-y-1">
                            <p className="text-[12px] text-[var(--ink)] leading-snug">{q.text}</p>
                            <div className="flex items-center justify-between text-[11px] text-[var(--ink-3)]">
                              <span>{q.author}</span>
                              <button
                                type="button"
                                disabled={upvoted}
                                onClick={() => {
                                  if (upvoted) return;
                                  setUpvotedIds((prev) => ({ ...prev, [q.id]: true }));
                                  onUpvoteQuestion?.(q.id);
                                }}
                                className={`h-6 px-2 rounded-[6px] font-mono-num font-semibold inline-flex items-center gap-1 cursor-pointer ${
                                  upvoted
                                    ? 'bg-[var(--accent-soft)] text-[var(--accent-text)]'
                                    : 'bg-[var(--fill)] text-[var(--ink-2)]'
                                }`}
                              >
                                <ThumbsUp className="w-3 h-3" />
                                <span>{q.upvotes}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {shopPanelTab === 'bag' && (
                  <div className="space-y-3">
                    {lastReceipt && bag.length === 0 ? (
                      <div className="p-3 rounded-[12px] bg-[var(--fill)] border border-emerald-500/35 space-y-2.5 animate-gather-msg">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-[8px] bg-emerald-500/18 text-[var(--ok)] grid place-items-center shrink-0">
                              <PackageCheck className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-[10.5px] font-mono-num font-semibold text-[var(--ok)]">
                                #{lastReceipt.orderNumber} Confirmed
                              </div>
                              <div className="text-[13px] font-semibold text-[var(--ink)]">
                                In-Stream Claim Placed
                              </div>
                            </div>
                          </div>
                          <span className="text-[12.5px] font-mono-num font-bold text-[var(--ink)]">
                            ${lastReceipt.total.toFixed(2)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setLastReceipt(null);
                            setShopPanelTab('drop');
                            onSetBagOpen(false);
                          }}
                          className="w-full h-8 rounded-[9px] gather-btn-primary text-[12px] font-semibold cursor-pointer"
                        >
                          Back to Live Drop
                        </button>
                      </div>
                    ) : bag.length === 0 ? (
                      <div className="py-5 text-center space-y-2.5">
                        <p className="text-[12px] text-[var(--ink-3)]">
                          Your Express Bag is empty. Claim an item from the live drop with zero redirects.
                        </p>
                        {activeDropProduct && activeDropProduct.stock > 0 && (
                          <button
                            type="button"
                            onClick={() => addToBag(activeDropProduct, 1, undefined, true)}
                            className="h-8 px-3.5 rounded-[9px] gather-btn-primary text-[12px] font-semibold cursor-pointer"
                          >
                            + Add {activeDropProduct.title}
                          </button>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="divide-y divide-[var(--line)]">
                          {bagPricing.lines.map(({ item, lineTotal, discountLabel }, idx) => (
                            <div
                              key={`${item.product.id}-${item.variant}`}
                              className="py-2 first:pt-0 flex items-center gap-2.5"
                            >
                              <img
                                src={item.product.imageUrl}
                                alt={item.product.title}
                                referrerPolicy="no-referrer"
                                className="w-10 h-10 rounded-[8px] object-cover shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-[12px] font-semibold text-[var(--ink)] truncate">
                                  {item.product.title}
                                </div>
                                <div className="text-[10.5px] text-[var(--ink-3)] flex items-center gap-1.5">
                                  <span className="truncate">{item.variant}</span>
                                  {discountLabel && (
                                    <span className="text-amber-600 dark:text-amber-400 font-semibold shrink-0">
                                      {discountLabel}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  aria-label="Decrease quantity"
                                  onClick={() =>
                                    setBag((prev) =>
                                      prev
                                        .map((b, i) =>
                                          i === idx ? { ...b, quantity: b.quantity - 1 } : b
                                        )
                                        .filter((b) => b.quantity > 0)
                                    )
                                  }
                                  className="w-5 h-5 rounded bg-[var(--fill)] hover:bg-[var(--fill-hover)] grid place-items-center text-[var(--ink-2)] cursor-pointer"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-[11px] font-mono-num w-4 text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  aria-label="Increase quantity"
                                  onClick={() =>
                                    setBag((prev) =>
                                      prev.map((b, i) =>
                                        i === idx
                                          ? { ...b, quantity: Math.min(b.product.stock, b.quantity + 1) }
                                          : b
                                      )
                                    )
                                  }
                                  className="w-5 h-5 rounded bg-[var(--fill)] hover:bg-[var(--fill-hover)] grid place-items-center text-[var(--ink-2)] cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                                <span className="font-mono-num text-[12px] font-bold text-[var(--ok)] ml-1">
                                  {formatMoney(lineTotal)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        <form
                          id="gather-shop-express-form"
                          onSubmit={handleCompleteBagOrder}
                          className="space-y-2 pt-2 border-t border-[var(--line)]"
                        >
                          <div className="grid grid-cols-2 gap-1.5">
                            <input
                              type="text"
                              required
                              value={buyerFullName}
                              onChange={(e) => setBuyerFullName(e.target.value)}
                              placeholder="Full Name"
                              className="h-8 px-2.5 rounded-[8px] bg-[var(--fill)] border border-[var(--line-2)] text-[11.5px] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:border-[var(--accent)]"
                            />
                            <input
                              type="text"
                              required
                              value={buyerCity}
                              onChange={(e) => setBuyerCity(e.target.value)}
                              placeholder="City, State"
                              className="h-8 px-2.5 rounded-[8px] bg-[var(--fill)] border border-[var(--line-2)] text-[11.5px] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:border-[var(--accent)]"
                            />
                          </div>
                          <input
                            type="text"
                            required
                            value={shippingAddress}
                            onChange={(e) => setShippingAddress(e.target.value)}
                            placeholder="Street Shipping Address"
                            className="w-full h-8 px-2.5 rounded-[8px] bg-[var(--fill)] border border-[var(--line-2)] text-[11.5px] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:border-[var(--accent)]"
                          />
                          <div className="grid grid-cols-4 gap-1">
                            {(['Apple Pay', 'Google Pay', 'Card', 'PayPal'] as const).map((pm) => (
                              <button
                                key={pm}
                                type="button"
                                onClick={() => setCheckoutMethod(pm)}
                                className={`h-7 rounded-[7px] text-[10px] font-semibold cursor-pointer whitespace-nowrap ${
                                  checkoutMethod === pm
                                    ? 'gather-btn-primary text-white'
                                    : 'gather-liquid-pill text-[var(--ink-2)] hover:text-[var(--ink)]'
                                }`}
                              >
                                {pm}
                              </button>
                            ))}
                          </div>
                          {bagPricing.totalSavings > 0 && (
                            <div className="flex items-center justify-between text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                              <span>Flash &amp; bundle savings</span>
                              <span className="font-mono-num">-${bagPricing.totalSavings.toFixed(2)}</span>
                            </div>
                          )}
                          <button
                            type="submit"
                            className="w-full h-9 rounded-[10px] gather-btn-tip text-[12.5px] font-semibold cursor-pointer whitespace-nowrap"
                          >
                            Pay with {checkoutMethod} · ${bagPricing.finalTotal.toFixed(2)}
                          </button>
                        </form>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bottom Card (Shop Mode) OR Unified Rail Container (Standard / Gamer) */}
          <div className="gather-card-obsidian rounded-[18px] flex flex-col flex-1 min-h-[340px] lg:min-h-0 w-full overflow-hidden">
            {isShopMode ? (
              <div className="px-4 py-3 border-b border-[var(--line)] flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-3">
                  <h2 className="font-display text-[15px] font-bold text-[var(--ink)]">Live chat</h2>
                  <span className="text-[12px] text-[var(--ink-3)]">
                    Party ({Math.max(4, onStageSpeakers.length + 2)})
                  </span>
                </div>
                <span className="text-[12px] font-mono-num text-[var(--ink-3)]">
                  {room.viewerCount >= 1000
                    ? `${(room.viewerCount / 1000).toFixed(1).replace(/\.0$/, '')}K`
                    : room.viewerCount}
                </span>
              </div>
            ) : (
              <div className="px-3 py-2.5 border-b border-[var(--line)] shrink-0">
                <div className="gather-seg w-full" role="tablist" aria-label="Stream Companion">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={railTab === 'chat'}
                    onClick={() => {
                      setRailTab('chat');
                      onSetBagOpen(false);
                    }}
                    className={`gather-seg-btn flex-1 ${railTab === 'chat' ? 'active' : ''}`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.65} />
                    <span>{isGamerMode ? 'Chat' : 'Live Chat'}</span>
                  </button>

                  {isGamerMode && (
                    <>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={railTab === 'companion'}
                        onClick={() => setRailTab('companion')}
                        className={`gather-seg-btn flex-1 ${railTab === 'companion' ? 'active' : ''}`}
                      >
                        <Gamepad2 className="w-3.5 h-3.5" strokeWidth={1.65} />
                        <span>Arena</span>
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={railTab === 'qa'}
                        onClick={() => setRailTab('qa')}
                        className={`gather-seg-btn flex-1 ${railTab === 'qa' ? 'active' : ''}`}
                      >
                        <HelpCircle className="w-3.5 h-3.5" strokeWidth={1.65} />
                        <span>Q&amp;A ({sortedQuestions.length})</span>
                      </button>
                    </>
                  )}

                  {isStandardMode && (
                    <>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={railTab === 'qa'}
                        onClick={() => setRailTab('qa')}
                        className={`gather-seg-btn flex-1 ${railTab === 'qa' ? 'active' : ''}`}
                      >
                        <HelpCircle className="w-3.5 h-3.5" strokeWidth={1.65} />
                        <span>Q&amp;A ({sortedQuestions.length})</span>
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={railTab === 'companion'}
                        onClick={() => setRailTab('companion')}
                        className={`gather-seg-btn flex-1 ${railTab === 'companion' ? 'active' : ''}`}
                      >
                        <ListChecks className="w-3.5 h-3.5" strokeWidth={1.65} />
                        <span>Program</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

          {/* ================================================================= */}
          {/* TAB 1: LIVE CHAT (ALWAYS VISIBLE IN SHOP MODE)                    */}
          {/* ================================================================= */}
          {(isShopMode || railTab === 'chat') && (
            <>
              {activeHypeTrain && (
                <div className="px-3.5 py-2 border-b border-[var(--line)] shrink-0 space-y-1">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="flex items-center gap-1.5 font-semibold text-[var(--ink)]">
                      <Flame className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" strokeWidth={1.65} />
                      <span>Hype Train · Lv.{activeHypeTrain.level}</span>
                    </span>
                    <span className="font-mono-num text-[var(--ink-3)]">
                      {Math.round(
                        (activeHypeTrain.points / Math.max(1, activeHypeTrain.goalPoints)) * 100
                      )}
                      % · {formatClock((activeHypeTrain.endsAt - nowMs) / 1000)}
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-[var(--fill-active)] overflow-hidden">
                    <div
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(
                            (activeHypeTrain.points / Math.max(1, activeHypeTrain.goalPoints)) * 100
                          )
                        )}%`,
                      }}
                      className="h-full bg-gradient-to-r from-[#7dd3fc] via-[#3b82f6] to-[#10b981] transition-all duration-300"
                    />
                  </div>
                </div>
              )}

              {(() => {
                const pinned = room.pinnedChatId
                  ? room.chatMessages.find((m) => m.id === room.pinnedChatId)
                  : null;
                if (!pinned) return null;
                return (
                  <div className="px-3.5 py-2 border-b border-[var(--line)] bg-[var(--accent-soft)] flex items-center justify-between gap-2 text-[11.5px] shrink-0">
                    <div className="min-w-0 truncate">
                      <Pin className="w-3 h-3 text-[var(--cyan)] inline mr-1.5" strokeWidth={1.65} />
                      <span className="font-semibold text-[var(--ink)]">{pinned.author}: </span>
                      <span className="text-[var(--ink-2)]">{pinned.text}</span>
                    </div>
                    {isHost && onPinChatMessage && (
                      <button
                        type="button"
                        onClick={() => onPinChatMessage(null)}
                        className="text-[11px] text-[var(--ink-3)] hover:text-[var(--ink)] cursor-pointer shrink-0"
                      >
                        Unpin
                      </button>
                    )}
                  </div>
                );
              })()}

              <div
                ref={chatScrollRef}
                className="flex-1 overflow-y-auto px-2.5 pt-3 pb-2 space-y-1 gather-scroll min-h-0"
              >
                {isShopMode && (
                  <div className="px-2.5 pb-2.5 mb-1 border-b border-[var(--line)]">
                    <div className="text-[12px] font-semibold text-[var(--ink)]">
                      Welcome to the live chat
                    </div>
                    <p className="text-[11px] text-[var(--ink-3)] mt-0.5">
                      Be kind, curious, and keep it constructive.
                    </p>
                  </div>
                )}
                {room.chatMessages
                  .filter((msg) => {
                    if (msg.role === 'payment-card') return false;
                    if (locallyBlocked.includes(msg.author.toLowerCase())) return false;
                    return true;
                  })
                  .map((msg) => {
                    const actorKey = user?.uid || clientId || effectiveViewerName;
                    const likedByMe = Boolean(msg.likedBy?.includes(actorKey));
                    const likeCount = msg.likes ?? msg.likedBy?.length ?? 0;
                    const isPinned = room.pinnedChatId === msg.id;
                    const isOwn =
                      (user?.uid && msg.authorUid === user.uid) ||
                      msg.author.toLowerCase() === effectiveViewerName.toLowerCase();
                    const av = getWatchAvatar(msg.author);
                    const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    if (msg.role === 'superchat' && msg.superChat) {
                      const tierStyles =
                        msg.superChat.tier === 'rose'
                          ? 'border-rose-400/35 bg-gradient-to-br from-rose-500/18 via-fuchsia-500/8 to-transparent'
                          : msg.superChat.tier === 'amber'
                          ? 'border-amber-400/35 bg-gradient-to-br from-amber-500/18 via-orange-500/8 to-transparent'
                          : msg.superChat.tier === 'emerald'
                          ? 'border-emerald-400/35 bg-gradient-to-br from-emerald-500/18 via-teal-500/8 to-transparent'
                          : 'border-sky-400/35 bg-gradient-to-br from-sky-500/18 via-blue-500/8 to-transparent';
                      return (
                        <div
                          key={msg.id}
                          className={`group relative my-1.5 p-3 rounded-[14px] border gather-superchat-sheen animate-gather-msg space-y-1.5 ${tierStyles}`}
                        >
                          {onToggleChatReaction && (
                            <HoverReactionMenu
                              reactions={msg.reactions}
                              actorId={actorKey}
                              onSelect={(emoji) => onToggleChatReaction(msg.id, emoji)}
                            />
                          )}
                          <div className="flex items-start gap-2.5">
                            {msg.avatarUrl ? (
                              <img
                                src={msg.avatarUrl}
                                alt={msg.author}
                                referrerPolicy="no-referrer"
                                className="w-7 h-7 rounded-full object-cover border border-white/20 shrink-0"
                              />
                            ) : (
                              <span
                                className={`w-7 h-7 rounded-full border text-[10px] font-semibold grid place-items-center shrink-0 ${av.cls}`}
                              >
                                {av.initials}
                              </span>
                            )}
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center justify-between gap-2 text-[11px]">
                                <span className="font-semibold text-[var(--ink)] truncate">
                                  {msg.author}{' '}
                                  <span className="font-mono-num font-normal text-[var(--ink-3)]">
                                    · {timeStr}
                                  </span>
                                </span>
                                <span className="font-mono-num font-bold text-[12px] text-[var(--ink)] shrink-0">
                                  ${msg.superChat.amount}
                                </span>
                              </div>
                              <p className="text-[12.5px] font-medium text-[var(--ink)] leading-snug">
                                {msg.text}
                              </p>
                              <ReactionBadgeRow
                                reactions={msg.reactions}
                                actorId={actorKey}
                                onToggle={
                                  onToggleChatReaction
                                    ? (emoji) => onToggleChatReaction(msg.id, emoji)
                                    : undefined
                                }
                              />
                              <div className="flex items-center gap-3 pt-0.5 text-[11px] text-[var(--ink-3)]">
                                {onToggleChatLike && (
                                  <button
                                    type="button"
                                    onClick={() => onToggleChatLike(msg.id)}
                                    className={`inline-flex items-center gap-1 cursor-pointer ${
                                      likedByMe ? 'text-rose-500 dark:text-rose-400 font-semibold' : 'hover:text-[var(--ink)]'
                                    }`}
                                  >
                                    <Heart className={`w-3 h-3 ${likedByMe ? 'fill-current' : ''}`} />
                                    {likeCount > 0 && <span className="font-mono-num">{likeCount}</span>}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setReplyingTo({
                                      id: msg.id,
                                      author: msg.author,
                                      text: msg.text.slice(0, 120),
                                    })
                                  }
                                  className="inline-flex items-center gap-1 hover:text-[var(--ink)] cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                                >
                                  <CornerUpLeft className="w-3 h-3" />
                                  <span>Reply</span>
                                </button>
                                {isHost && onPinChatMessage && (
                                  <button
                                    type="button"
                                    onClick={() => onPinChatMessage(isPinned ? null : msg.id)}
                                    className={`inline-flex items-center gap-1 cursor-pointer transition-opacity ${
                                      isPinned
                                        ? 'text-[var(--cyan)] font-semibold opacity-100'
                                        : 'hover:text-[var(--ink)] opacity-0 group-hover:opacity-100'
                                    }`}
                                  >
                                    <Pin className="w-3 h-3" />
                                    <span>{isPinned ? 'Pinned' : 'Pin'}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (msg.role === 'order') {
                      if (!isShopMode) return null;
                      return (
                        <div
                          key={msg.id}
                          className="my-1 px-3 py-2 rounded-[11px] bg-[var(--ok)]/10 border border-[var(--ok)]/25 text-[12px] space-y-0.5 animate-gather-msg"
                        >
                          <span className="text-[10.5px] font-mono-num font-semibold text-[var(--ok)]">
                            In-Stream Claim
                          </span>
                          <p className="text-[var(--ink)] font-medium">{msg.text}</p>
                        </div>
                      );
                    }

                    if (msg.role === 'system') {
                      return (
                        <div key={msg.id} className="text-[11px] text-[var(--ink-3)] px-2 py-1">
                          {msg.text}
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className="group relative px-2.5 py-2 rounded-[11px] hover:bg-[var(--fill)] transition-colors text-[12.5px] animate-gather-msg"
                      >
                        {onToggleChatReaction && (
                          <HoverReactionMenu
                            reactions={msg.reactions}
                            actorId={actorKey}
                            onSelect={(emoji) => onToggleChatReaction(msg.id, emoji)}
                          />
                        )}
                        <div className="flex items-start gap-2.5">
                          {msg.avatarUrl ? (
                            <img
                              src={msg.avatarUrl}
                              alt={msg.author}
                              referrerPolicy="no-referrer"
                              className="w-7 h-7 rounded-full object-cover border border-[var(--line-2)] shrink-0 mt-0.5"
                            />
                          ) : (
                            <span
                              className={`w-7 h-7 rounded-full border text-[10px] font-semibold grid place-items-center shrink-0 mt-0.5 ${av.cls}`}
                            >
                              {av.initials}
                            </span>
                          )}

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center justify-between gap-2 text-[11px]">
                              <span className="truncate">
                                <span
                                  className={`font-semibold ${
                                    msg.role === 'host' ? 'text-[var(--accent-text)]' : 'text-[var(--ink)]'
                                  }`}
                                >
                                  {msg.author}
                                </span>
                                {msg.role === 'host' && (
                                  <span className="text-[var(--cyan)] font-medium"> · Host</span>
                                )}
                                {msg.role === 'guest' && (
                                  <span className="text-[var(--ink-3)] font-medium"> · Stage</span>
                                )}
                              </span>
                              <span className="font-mono-num text-[10.5px] text-[var(--ink-3)] shrink-0">
                                {timeStr}
                              </span>
                            </div>

                            {msg.replyTo && (
                              <div className="pl-2.5 py-0.5 rounded-r-[6px] bg-[var(--fill)] text-[11px] text-[var(--ink-3)] truncate">
                                <span className="font-semibold text-[var(--ink-2)]">
                                  @{msg.replyTo.author}:
                                </span>{' '}
                                {msg.replyTo.text}
                              </div>
                            )}

                            <p className="text-[12.5px] text-[var(--ink-2)] leading-snug break-words">
                              {msg.text}
                            </p>

                            <ReactionBadgeRow
                              reactions={msg.reactions}
                              actorId={actorKey}
                              onToggle={
                                onToggleChatReaction
                                  ? (emoji) => onToggleChatReaction(msg.id, emoji)
                                  : undefined
                              }
                            />

                            <div className="flex items-center gap-3 pt-0.5 text-[11px] text-[var(--ink-3)]">
                              {onToggleChatLike && (
                                <button
                                  type="button"
                                  onClick={() => onToggleChatLike(msg.id)}
                                  className={`inline-flex items-center gap-1 cursor-pointer transition-all ${
                                    likedByMe
                                      ? 'text-rose-500 dark:text-rose-400 font-semibold opacity-100'
                                      : likeCount > 0
                                      ? 'opacity-80 hover:opacity-100 hover:text-[var(--ink)]'
                                      : 'opacity-0 group-hover:opacity-100 hover:text-[var(--ink)]'
                                  }`}
                                >
                                  <Heart className={`w-3 h-3 ${likedByMe ? 'fill-current' : ''}`} />
                                  {likeCount > 0 && <span className="font-mono-num">{likeCount}</span>}
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  setReplyingTo({
                                    id: msg.id,
                                    author: msg.author,
                                    text: msg.text.slice(0, 120),
                                  })
                                }
                                className="inline-flex items-center gap-1 hover:text-[var(--ink)] cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                              >
                                <CornerUpLeft className="w-3 h-3" />
                                <span>Reply</span>
                              </button>

                              {isHost && onPinChatMessage && (
                                <button
                                  type="button"
                                  onClick={() => onPinChatMessage(isPinned ? null : msg.id)}
                                  className={`inline-flex items-center gap-1 cursor-pointer transition-opacity ${
                                    isPinned
                                      ? 'text-[var(--cyan)] font-semibold opacity-100'
                                      : 'hover:text-[var(--ink)] opacity-0 group-hover:opacity-100'
                                  }`}
                                >
                                  <Pin className="w-3 h-3" />
                                  <span>{isPinned ? 'Pinned' : 'Pin'}</span>
                                </button>
                              )}

                              {(isHost || isOwn) && onDeleteChatMessage && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteChatMessage(msg.id)}
                                  aria-label="Delete message"
                                  className="inline-flex items-center gap-1 hover:text-[var(--danger)] cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}

                              {msg.role !== 'host' && !isOwn && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isHost && onBlockChatUser) {
                                      onBlockChatUser(msg.author, msg.authorUid);
                                    } else {
                                      setLocallyBlocked((prev) =>
                                        prev.includes(msg.author.toLowerCase())
                                          ? prev
                                          : [...prev, msg.author.toLowerCase()]
                                      );
                                    }
                                  }}
                                  aria-label={isHost ? `Block ${msg.author}` : `Hide ${msg.author}`}
                                  title={isHost ? `Block ${msg.author} from room` : `Hide ${msg.author}`}
                                  className="inline-flex items-center gap-1 hover:text-[var(--danger)] cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  {isHost ? <Ban className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {(locallyBlocked.length > 0 || (isHost && (room.blockedUsers?.length || 0) > 0)) && (
                <div className="mx-3 mb-2 px-2.5 py-1.5 rounded-[9px] bg-[var(--fill)] border border-[var(--line)] flex flex-wrap items-center gap-1.5 text-[11px] shrink-0">
                  <span className="text-[var(--ink-3)]">Hidden:</span>
                  {locallyBlocked.map((name) => (
                    <button
                      key={`loc-${name}`}
                      type="button"
                      onClick={() => setLocallyBlocked((prev) => prev.filter((n) => n !== name))}
                      className="px-1.5 py-0.5 rounded bg-[var(--fill-hover)] text-[var(--ink-2)] hover:text-[var(--ink)] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>{name}</span>
                      <X className="w-2.5 h-2.5" />
                    </button>
                  ))}
                  {isHost &&
                    onUnblockChatUser &&
                    (room.blockedUsers || []).map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => onUnblockChatUser(b.id)}
                        className="px-1.5 py-0.5 rounded bg-[var(--fill-hover)] text-[var(--danger)] hover:text-[var(--ink)] inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>{b.author}</span>
                        <X className="w-2.5 h-2.5" />
                      </button>
                    ))}
                </div>
              )}

              {tipDrawerOpen && room.commerce.payouts.enabled && (
                <div className="px-3 pb-2 shrink-0 animate-gather-drawer">
                  <InChatPaymentWidget
                    headline="Direct Creator Tip · 0% Fee"
                    subline="100% goes to the creator — checkout inside chat"
                    initialAmount={10}
                    payouts={room.commerce.payouts}
                    viewerName={effectiveViewerName}
                    compact
                    onClose={() => setTipDrawerOpen(false)}
                    onSubmitTip={onSendSuperChat}
                  />
                </div>
              )}

              {!canPostToChat ? (
                <div className="p-3 border-t border-[var(--line)] space-y-2 shrink-0">
                  <div className="flex items-center gap-1.5 text-[11.5px] text-[var(--ink-3)] px-0.5">
                    <Lock className="w-3.5 h-3.5 text-[var(--cyan)] shrink-0" strokeWidth={1.65} />
                    <span>Sign in to chat &amp; react</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void onSignInWithGoogle?.()}
                    className="w-full h-10 px-3 rounded-[11px] gather-liquid-pill text-[var(--ink)] font-semibold text-[12.5px] inline-flex items-center justify-center gap-2.5 cursor-pointer whitespace-nowrap"
                  >
                    <GoogleMarkSvg />
                    <span>Continue with Google</span>
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmitChat}
                  className="p-3 border-t border-[var(--line)] space-y-2 shrink-0"
                >
                  <div className="flex items-center justify-between gap-2 px-0.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-[var(--ink-3)] min-w-0">
                      {user?.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={effectiveViewerName}
                          referrerPolicy="no-referrer"
                          className="w-4 h-4 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <span className="w-4 h-4 rounded-full bg-[var(--accent-soft)] text-[var(--accent-text)] text-[9px] font-bold grid place-items-center shrink-0">
                          {getWatchAvatar(effectiveViewerName).initials}
                        </span>
                      )}
                      <span className="truncate font-semibold text-[var(--ink)]">
                        {effectiveViewerName}
                      </span>
                    </div>

                    {user && onToggleSubscribe && (
                      <button
                        type="button"
                        disabled={subscribing}
                        onClick={() => void onToggleSubscribe()}
                        className={`text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 ${
                          isSubscribed ? 'text-[var(--ok)]' : 'text-[var(--accent-text)] hover:underline'
                        }`}
                      >
                        {isSubscribed ? <Check className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
                        <span>{isSubscribed ? 'Subscribed' : 'Subscribe'}</span>
                      </button>
                    )}
                  </div>

                  {replyingTo && (
                    <div className="px-2.5 py-1.5 rounded-[8px] bg-[var(--accent-soft)] flex items-center justify-between gap-2 text-[11px]">
                      <span className="truncate text-[var(--ink-2)]">
                        Replying to <strong className="text-[var(--ink)]">@{replyingTo.author}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => setReplyingTo(null)}
                        aria-label="Cancel reply"
                        className="text-[var(--ink-3)] hover:text-[var(--ink)] cursor-pointer shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <div className="gather-composer">
                    <input
                      type="text"
                      value={chatText}
                      onChange={(e) => setChatText(e.target.value)}
                      placeholder={
                        replyingTo
                          ? `Reply to @${replyingTo.author}...`
                          : isGamerMode
                          ? 'Drop hype or callouts...'
                          : 'Message live chat...'
                      }
                    />
                    {chatText.length > 0 && (
                      <button
                        type="button"
                        aria-label="Clear chat input"
                        title="Clear"
                        onClick={(e) => {
                          setChatText('');
                          (
                            e.currentTarget.parentElement?.querySelector(
                              'input'
                            ) as HTMLInputElement | null
                          )?.focus();
                        }}
                        className="h-6 w-6 shrink-0 grid place-items-center rounded-full bg-[var(--fill)] hover:bg-[var(--fill-active)] text-[var(--ink-3)] hover:text-[var(--ink)] cursor-pointer transition-colors"
                      >
                        <X className="w-3 h-3" strokeWidth={2} />
                      </button>
                    )}
                    {room.commerce.payouts.enabled && (
                      <button
                        type="button"
                        onClick={() => setTipDrawerOpen((v) => !v)}
                        aria-label="Tip creator directly in chat"
                        title="Tip creator directly in chat"
                        className={`h-8 w-8 rounded-[8px] grid place-items-center shrink-0 cursor-pointer transition-colors ${
                          tipDrawerOpen
                            ? 'gather-btn-tip'
                            : 'bg-[var(--ok)]/14 hover:bg-[var(--ok)]/24 text-[var(--ok)]'
                        }`}
                      >
                        <DollarSign className="w-3.5 h-3.5" strokeWidth={1.75} />
                      </button>
                    )}
                    <button
                      type="submit"
                      aria-label="Send message"
                      className={`gather-send-btn ${chatText.trim() ? 'ready' : ''}`}
                    >
                      <ArrowUp className="w-4 h-4" strokeWidth={2} />
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {/* ================================================================= */}
          {/* TAB 2B: UNIFIED GAMING ARENA (PICKS / SQUAD / PRO RIG / CLIPS)    */}
          {/* ================================================================= */}
          {isGamerMode && railTab === 'companion' && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Arena Status Header */}
              <div className="px-3.5 py-2 border-b border-[var(--line)] bg-[var(--fill)] flex items-center justify-between gap-2 text-[11px] shrink-0">
                <span className="font-mono-num font-bold text-amber-600 dark:text-amber-300 inline-flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>{arenaXp.toLocaleString()} XP</span>
                </span>
                <span className="font-mono-num text-[var(--ink-2)]">
                  {room.gamer.teamAName || 'GATHER'} {room.gamer.teamAScore ?? 11}–
                  {room.gamer.teamBScore ?? 9} {room.gamer.teamBName || 'APEX'}
                </span>
                <span className="font-mono-num text-[var(--cyan)] inline-flex items-center gap-1">
                  <Flame className="w-3 h-3" />
                  <span>{room.gamer.hypeCount}</span>
                </span>
              </div>

              <div className="px-3.5 py-2 border-b border-[var(--line)] flex items-center gap-3.5 text-[12px] overflow-x-auto gather-scroll shrink-0">
                {(
                  [
                    { id: 'squad', label: `Squad (${room.squadQueue.length})` },
                    { id: 'poll', label: 'Picks' },
                    { id: 'rig', label: 'Rig & !sens' },
                    { id: 'clips', label: `Clips (${room.gamer.clips.length})` },
                  ] as const
                ).map((sub) => {
                  const active = gamerSubTab === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setGamerSubTab(sub.id)}
                      className={`py-1 font-medium cursor-pointer transition-colors border-b-2 whitespace-nowrap ${
                        active
                          ? 'text-[var(--ink)] border-[var(--cyan)]'
                          : 'text-[var(--ink-3)] hover:text-[var(--ink)] border-transparent'
                      }`}
                    >
                      {sub.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3 gather-scroll min-h-0">
                {gamerSubTab === 'squad' && (
                  <>
                    {room.gamer.lobbyCode && (
                      <div className="p-2.5 rounded-[10px] bg-[var(--fill)] border border-[var(--line)] flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-3)]">
                            Custom Lobby Sync
                          </div>
                          <div className="font-mono-num text-[13px] font-bold text-[var(--ink)]">
                            {room.gamer.lobbyCode}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            void navigator.clipboard.writeText(room.gamer.lobbyCode);
                            setCopiedLobby(true);
                            window.setTimeout(() => setCopiedLobby(false), 1600);
                          }}
                          className="h-7 px-2.5 rounded-[7px] gather-liquid-pill text-[11px] font-semibold text-[var(--ink)] inline-flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          {copiedLobby ? (
                            <Check className="w-3 h-3 text-[var(--ok)]" />
                          ) : (
                            <Copy className="w-3 h-3 text-[var(--cyan)]" />
                          )}
                          <span>{copiedLobby ? 'Copied' : 'Copy Code'}</span>
                        </button>
                      </div>
                    )}

                    {squadJoined ? (
                      <div className="p-3 rounded-[10px] bg-[var(--ok)]/14 border border-[var(--ok)]/30 text-[12px] text-[var(--ok)] font-medium">
                        Queued as <span className="font-mono-num font-bold">{squadHandle}</span> ({squadRole} · {squadRank})
                      </div>
                    ) : (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!squadHandle.trim()) return;
                          onJoinSquadQueue(squadHandle.trim(), squadPlatform, undefined, squadRole, squadRank);
                          setSquadJoined(true);
                        }}
                        className="space-y-2 pb-2 border-b border-[var(--line)]"
                      >
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={squadHandle}
                            onChange={(e) => setSquadHandle(e.target.value)}
                            placeholder="Riot ID / Gamertag..."
                            className="flex-1 min-w-0 h-8 px-2.5 rounded-[8px] bg-[var(--fill)] border border-[var(--line-2)] text-[12px] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:border-[var(--cyan)]"
                          />
                          <select
                            aria-label="Gaming platform"
                            value={squadPlatform}
                            onChange={(e) => setSquadPlatform(e.target.value)}
                            className="h-8 px-2 rounded-[8px] bg-[var(--fill)] border border-[var(--line-2)] text-[11px] text-[var(--ink)]"
                          >
                            <option value="PC · Discord">PC</option>
                            <option value="PlayStation">PS5</option>
                            <option value="Xbox">Xbox</option>
                          </select>
                        </div>
                        <div className="flex gap-1.5">
                          <select
                            aria-label="In-game role"
                            value={squadRole}
                            onChange={(e) => setSquadRole(e.target.value)}
                            className="h-8 px-2 rounded-[8px] bg-[var(--fill)] border border-[var(--line-2)] text-[11px] text-[var(--ink)]"
                          >
                            <option value="Flex">Flex</option>
                            <option value="Entry">Entry</option>
                            <option value="IGL">IGL</option>
                            <option value="Sentinel">Sentinel</option>
                            <option value="Support">Support</option>
                          </select>
                          <select
                            aria-label="Competitive rank"
                            value={squadRank}
                            onChange={(e) => setSquadRank(e.target.value)}
                            className="h-8 px-2 rounded-[8px] bg-[var(--fill)] border border-[var(--line-2)] text-[11px] text-[var(--ink)]"
                          >
                            <option value="Radiant">Radiant</option>
                            <option value="Immortal">Immortal</option>
                            <option value="Ascendant">Ascendant</option>
                            <option value="Diamond">Diamond</option>
                            <option value="Platinum">Platinum</option>
                          </select>
                          <button
                            type="submit"
                            className="flex-1 h-8 px-3 rounded-[8px] gather-btn-primary text-[11.5px] font-semibold cursor-pointer whitespace-nowrap"
                          >
                            Join Queue
                          </button>
                        </div>
                      </form>
                    )}

                    <div className="divide-y divide-[var(--line)]">
                      {room.squadQueue.length === 0 ? (
                        <p className="text-[12px] text-[var(--ink-3)] py-6 text-center">
                          Drop your handle, role &amp; rank to join next lobby.
                        </p>
                      ) : (
                        room.squadQueue.map((q, i) => (
                          <div key={q.id} className="py-2.5 first:pt-0 space-y-1">
                            <div className="flex items-center justify-between text-[10.5px] font-mono-num">
                              <span className="text-[var(--cyan)] font-semibold">
                                #{i + 1} {i === 0 ? '· UP NEXT' : ''} · {q.role || 'Flex'}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-[var(--fill)] border border-[var(--line)] text-[var(--ink-2)]">
                                {q.rank || 'Ranked'}
                              </span>
                            </div>
                            <div className="text-[13px] font-semibold text-[var(--ink)] truncate">
                              {q.handle}
                            </div>
                            <div className="text-[11px] text-[var(--ink-3)] truncate">{q.platform}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}

                {gamerSubTab === 'rig' && (
                  <div className="space-y-3">
                    {/* Competitive Pro Settings & Crosshair Card */}
                    <div className="p-3 rounded-[12px] bg-[var(--fill)] border border-[var(--line-2)] space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--cyan)]">
                          Pro In-Game Settings
                        </span>
                        <span className="font-mono-num text-[10.5px] text-[var(--ink-3)]">
                          {room.gamer.resolution || '1920×1080 · 240Hz'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 rounded-[8px] bg-[var(--surface-2)] border border-[var(--line)]">
                          <div className="text-[10px] text-[var(--ink-3)]">Sens &amp; eDPI</div>
                          <div className="font-mono-num text-[12.5px] font-bold text-[var(--ink)] truncate">
                            {room.gamer.sensitivity || '0.35 (280 eDPI)'}
                          </div>
                        </div>
                        <div className="p-2 rounded-[8px] bg-[var(--surface-2)] border border-[var(--line)]">
                          <div className="text-[10px] text-[var(--ink-3)]">Mouse DPI</div>
                          <div className="font-mono-num text-[12.5px] font-bold text-[var(--ink)]">
                            {room.gamer.dpi || 800} DPI · 4000Hz
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <code className="flex-1 min-w-0 truncate px-2 py-1 rounded-[7px] bg-[var(--surface-2)] border border-[var(--line)] font-mono-num text-[10.5px] text-[var(--ink-2)]">
                          {room.gamer.crosshairCode || '0;P;c;5;o;1;0l;4;0o;2;0a;1;0f;0;1b;0'}
                        </code>
                        <button
                          type="button"
                          onClick={handleCopyCrosshair}
                          className="h-7 px-2.5 rounded-[7px] gather-btn-primary text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          {copiedCrosshair ? <Check className="w-3 h-3" /> : <Crosshair className="w-3 h-3" />}
                          <span>{copiedCrosshair ? 'Copied!' : 'Copy Code'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="divide-y divide-[var(--line)]">
                      {room.gamer.gearSpecs.map((spec) => (
                        <div key={spec.id} className="py-2.5 first:pt-0 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[10.5px] font-mono-num text-[var(--ink-3)] flex items-center gap-1">
                              <Cpu className="w-3 h-3 text-[var(--cyan)]" strokeWidth={1.65} />
                              <span>{spec.category}</span>
                            </div>
                            <div className="text-[12.5px] font-semibold text-[var(--ink)] truncate">
                              {spec.label}
                            </div>
                          </div>
                          <span className="text-[12px] font-mono-num text-[var(--ink-2)] text-right shrink-0">
                            {spec.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {gamerSubTab === 'clips' && (
                  <div className="space-y-3">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleQuickClipCapture(clipLabel);
                      }}
                      className="flex gap-1.5"
                    >
                      <input
                        type="text"
                        value={clipLabel}
                        onChange={(e) => setClipLabel(e.target.value)}
                        placeholder="Title 30s clutch clip..."
                        className="flex-1 min-w-0 h-8 px-2.5 rounded-[8px] bg-[var(--fill)] border border-[var(--line-2)] text-[12px] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:border-[var(--cyan)]"
                      />
                      <button
                        type="submit"
                        className="h-8 px-3 rounded-[8px] gather-btn-primary text-[11.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Clapperboard className="w-3.5 h-3.5" strokeWidth={1.65} />
                        <span>{clipSavedToast ? 'Saved!' : formatClock(elapsedSec)}</span>
                      </button>
                    </form>
                    <div className="divide-y divide-[var(--line)]">
                      {room.gamer.clips.map((c) => {
                        const upvoted = Boolean(clipUpvotes[c.id]);
                        const count = (c.upvotes || 12) + (upvoted ? 1 : 0);
                        return (
                          <div key={c.id} className="py-2.5 first:pt-0 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-[12.5px] font-semibold text-[var(--ink)] truncate">
                                  {c.label}
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-[var(--ink-3)]">
                                  {c.category && (
                                    <span className="font-mono-num text-[10px] font-semibold text-[var(--cyan)]">
                                      {c.category}
                                    </span>
                                  )}
                                  <span className="truncate">{c.createdBy}</span>
                                  <span className="font-mono-num">· {formatClock(c.timestampSec)}</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setClipUpvotes((prev) => ({ ...prev, [c.id]: !prev[c.id] }));
                                  if (!upvoted) setArenaXp((xp) => xp + 10);
                                }}
                                className={`h-7 px-2 rounded-[7px] text-[11px] font-mono-num font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0 transition-colors ${
                                  upvoted
                                    ? 'bg-amber-500/18 border border-amber-500/40 text-amber-600 dark:text-amber-300'
                                    : 'gather-liquid-pill text-[var(--ink-2)] hover:text-[var(--ink)]'
                                }`}
                              >
                                <Flame className="w-3 h-3 text-amber-500" />
                                <span>{count}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {gamerSubTab === 'poll' && (
                  <div className="space-y-3">
                    {activePoll ? (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-[11px] font-mono-num text-[var(--cyan)]">
                              {activePoll.isOpen ? 'Prediction Open' : 'Locked'} · {totalPollVotes} picks
                            </div>
                            <h3 className="font-editorial text-[15px] font-semibold text-[var(--ink)] mt-0.5">
                              {activePoll.question}
                            </h3>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono-num text-[11px] font-bold shrink-0">
                            {arenaXp.toLocaleString()} XP
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-[var(--ink-3)]">Wager:</span>
                          {[50, 100, 250, 500].map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              disabled={votedPollId === activePoll.id || arenaXp < amt}
                              onClick={() => setWagerStake(amt)}
                              className={`h-6 px-2 rounded-[6px] text-[10.5px] font-mono-num font-bold cursor-pointer disabled:opacity-40 ${
                                wagerStake === amt
                                  ? 'gather-btn-primary text-white'
                                  : 'bg-[var(--fill)] border border-[var(--line)] text-[var(--ink-2)]'
                              }`}
                            >
                              {amt}
                            </button>
                          ))}
                        </div>

                        <div className="space-y-2">
                          {activePoll.options.map((opt) => {
                            const pct =
                              totalPollVotes > 0 ? Math.round((opt.votes / totalPollVotes) * 100) : 50;
                            const odds = Number((100 / Math.max(15, pct)).toFixed(2));
                            const hasVoted = votedPollId === activePoll.id;
                            const isPicked =
                              activePrediction?.pollId === activePoll.id &&
                              activePrediction?.optionId === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                disabled={!activePoll.isOpen || hasVoted}
                                onClick={() =>
                                  handleLockPrediction(activePoll.id, opt.id, opt.label, odds)
                                }
                                className={`w-full relative h-10 px-3 rounded-[9px] overflow-hidden text-left cursor-pointer disabled:cursor-default border transition-colors ${
                                  isPicked
                                    ? 'bg-[var(--accent-soft)] border-[var(--accent-line)]'
                                    : 'bg-[var(--fill)] border-[var(--line)] hover:border-[var(--accent-line)]'
                                }`}
                              >
                                <div
                                  style={{ width: `${pct}%` }}
                                  className="absolute inset-y-0 left-0 bg-[var(--accent-soft)] transition-all duration-500 ease-out"
                                />
                                <div className="relative flex items-center justify-between text-[12px]">
                                  <span className="font-semibold text-[var(--ink)] truncate pr-2">
                                    {isPicked ? `✓ ${opt.label}` : opt.label}
                                  </span>
                                  <span className="flex items-center gap-2 font-mono-num shrink-0">
                                    <span className="text-[11px] text-[var(--ink-3)]">{odds}×</span>
                                    <span className="font-bold text-[var(--accent-text)]">{pct}%</span>
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <p className="text-[12px] text-[var(--ink-3)] py-6 text-center">
                        No active prediction right now.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 2C: UNIFIED BROADCAST PROGRAM (AGENDA / POLL / MOMENTS)       */}
          {/* ================================================================= */}
          {isStandardMode && railTab === 'companion' && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-3.5 py-2 border-b border-[var(--line)] flex items-center gap-4 text-[12px] shrink-0">
                {(
                  [
                    { id: 'agenda', label: `Agenda (${room.rundown.steps.length})` },
                    { id: 'poll', label: 'Poll' },
                    { id: 'clips', label: `Moments (${room.gamer.clips.length})` },
                  ] as const
                ).map((sub) => {
                  const active = programSubTab === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setProgramSubTab(sub.id)}
                      className={`py-1 font-medium cursor-pointer transition-colors border-b-2 whitespace-nowrap ${
                        active
                          ? 'text-[var(--ink)] border-[var(--cyan)]'
                          : 'text-[var(--ink-3)] hover:text-[var(--ink)] border-transparent'
                      }`}
                    >
                      {sub.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3 gather-scroll min-h-0">
                {programSubTab === 'agenda' && (
                  <div className="divide-y divide-[var(--line)]">
                    {room.rundown.steps.map((step, idx) => {
                      const isActive = room.rundown.activeStepId === step.id;
                      return (
                        <div
                          key={step.id}
                          className={`py-3 first:pt-1 space-y-1 px-2 rounded-[10px] transition-colors ${
                            isActive ? 'bg-[var(--accent-soft)]' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 text-[11px] font-mono-num text-[var(--ink-3)]">
                            <span>
                              0{idx + 1} · {step.durationMin}m
                            </span>
                            <span className={isActive ? 'text-[var(--cyan)] font-semibold' : ''}>
                              {isActive ? 'On Air' : step.completed ? 'Done' : 'Up Next'}
                            </span>
                          </div>
                          <h3 className="font-editorial text-[14.5px] font-semibold text-[var(--ink)] leading-snug">
                            {step.title}
                          </h3>
                          <p className="text-[11.5px] text-[var(--ink-2)] leading-snug">
                            {step.bannerSub || step.bannerTitle}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {programSubTab === 'poll' && (
                  <div className="space-y-3">
                    {activePoll ? (
                      <>
                        <div>
                          <div className="text-[11px] font-mono-num text-[var(--cyan)]">
                            {activePoll.isOpen ? 'Live Poll' : 'Closed'} · {totalPollVotes} votes
                          </div>
                          <h3 className="font-editorial text-[15px] font-semibold text-[var(--ink)] mt-0.5">
                            {activePoll.question}
                          </h3>
                        </div>
                        <div className="space-y-2">
                          {activePoll.options.map((opt) => {
                            const pct =
                              totalPollVotes > 0 ? Math.round((opt.votes / totalPollVotes) * 100) : 0;
                            const hasVoted = votedPollId === activePoll.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                disabled={!activePoll.isOpen || hasVoted}
                                onClick={() => {
                                  onVotePoll(opt.id);
                                  setVotedPollId(activePoll.id);
                                }}
                                className="w-full relative h-9 px-3 rounded-[9px] overflow-hidden bg-[var(--fill)] border border-[var(--line)] hover:border-[var(--accent-line)] text-left cursor-pointer disabled:cursor-default"
                              >
                                <div
                                  style={{ width: `${pct}%` }}
                                  className="absolute inset-y-0 left-0 bg-[var(--accent-soft)] transition-all duration-500 ease-out"
                                />
                                <div className="relative flex items-center justify-between text-[12px]">
                                  <span className="font-medium text-[var(--ink)] truncate pr-2">
                                    {opt.label}
                                  </span>
                                  <span className="font-mono-num font-bold text-[var(--accent-text)] shrink-0">
                                    {pct}%
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <p className="text-[12px] text-[var(--ink-3)] py-6 text-center">
                        No live poll open right now.
                      </p>
                    )}
                  </div>
                )}

                {programSubTab === 'clips' && (
                  <div className="space-y-3">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        onCreateClip(
                          clipLabel.trim() || `${effectiveViewerName}'s Highlight`,
                          elapsedSec,
                          effectiveViewerName
                        );
                        setClipLabel('');
                        setClipSavedToast(true);
                        window.setTimeout(() => setClipSavedToast(false), 2000);
                      }}
                      className="flex gap-1.5"
                    >
                      <input
                        type="text"
                        value={clipLabel}
                        onChange={(e) => setClipLabel(e.target.value)}
                        placeholder="Name this 30s moment..."
                        className="flex-1 min-w-0 h-8 px-2.5 rounded-[8px] bg-[var(--fill)] border border-[var(--line-2)] text-[12px] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none focus:border-[var(--cyan)]"
                      />
                      <button
                        type="submit"
                        className="h-8 px-3 rounded-[8px] gather-btn-primary text-[11.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Clapperboard className="w-3.5 h-3.5" strokeWidth={1.65} />
                        <span>{clipSavedToast ? 'Saved!' : formatClock(elapsedSec)}</span>
                      </button>
                    </form>
                    <div className="divide-y divide-[var(--line)]">
                      {room.gamer.clips.map((c) => (
                        <div key={c.id} className="py-2.5 first:pt-0 space-y-0.5">
                          <div className="text-[12.5px] font-semibold text-[var(--ink)] truncate">
                            {c.label}
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-[var(--ink-3)]">
                            <span className="truncate">{c.createdBy}</span>
                            <span className="font-mono-num text-[var(--cyan)]">
                              {formatClock(c.timestampSec)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 3: Q&A (STANDARD & GAMER MODES)                               */}
          {/* ================================================================= */}
          {!isShopMode && railTab === 'qa' && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto px-3.5 py-3 gather-scroll">
                {sortedQuestions.length === 0 ? (
                  <p className="text-[12px] text-[var(--ink-3)] py-8 text-center">
                    Ask the first question below — top-voted questions go to stage.
                  </p>
                ) : (
                  <div className="divide-y divide-[var(--line)]">
                    {sortedQuestions.map((q) => {
                      const upvoted = Boolean(upvotedIds[q.id]);
                      return (
                        <div key={q.id} className="py-3 first:pt-1 space-y-2">
                          <p className="text-[12.5px] font-medium text-[var(--ink)] leading-snug">
                            {q.text}
                          </p>
                          <div className="flex items-center justify-between text-[11px] text-[var(--ink-3)]">
                            <span>{q.author}</span>
                            <button
                              type="button"
                              disabled={upvoted}
                              onClick={() => {
                                if (upvoted) return;
                                setUpvotedIds((prev) => ({ ...prev, [q.id]: true }));
                                onUpvoteQuestion?.(q.id);
                              }}
                              className={`h-6 px-2.5 rounded-[6px] font-mono-num font-semibold inline-flex items-center gap-1 cursor-pointer ${
                                upvoted
                                  ? 'bg-[var(--accent-soft)] text-[var(--accent-text)]'
                                  : 'bg-[var(--fill)] text-[var(--ink-2)] hover:text-[var(--ink)]'
                              }`}
                            >
                              <ThumbsUp className="w-3 h-3" />
                              <span>{q.upvotes}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {canPostToChat ? (
                <form
                  onSubmit={handleSubmitQuestion}
                  className="p-3 border-t border-[var(--line)] shrink-0"
                >
                  <div className="gather-composer">
                    <input
                      type="text"
                      value={questionDraft}
                      onChange={(e) => setQuestionDraft(e.target.value)}
                      placeholder="Ask a question for the stage..."
                    />
                    {questionDraft.length > 0 && (
                      <button
                        type="button"
                        aria-label="Clear question input"
                        title="Clear"
                        onClick={(e) => {
                          setQuestionDraft('');
                          (
                            e.currentTarget.parentElement?.querySelector(
                              'input'
                            ) as HTMLInputElement | null
                          )?.focus();
                        }}
                        className="h-6 w-6 shrink-0 grid place-items-center rounded-full bg-[var(--fill)] hover:bg-[var(--fill-active)] text-[var(--ink-3)] hover:text-[var(--ink)] cursor-pointer transition-colors"
                      >
                        <X className="w-3 h-3" strokeWidth={2} />
                      </button>
                    )}
                    <button
                      type="submit"
                      aria-label="Submit question"
                      className={`gather-send-btn ${questionDraft.trim() ? 'ready' : ''}`}
                    >
                      <ArrowUp className="w-4 h-4" strokeWidth={2} />
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-3 border-t border-[var(--line)] shrink-0">
                  <button
                    type="button"
                    onClick={() => void onSignInWithGoogle?.()}
                    className="w-full h-10 px-3 rounded-[11px] gather-liquid-pill text-[var(--ink)] font-semibold text-[12.5px] inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                  >
                    <GoogleMarkSvg />
                    <span>Continue with Google to Ask</span>
                  </button>
                </div>
              )}
            </div>
          )}

          </div>
        </aside>
        )}
      </div>
    </div>
  );
};
