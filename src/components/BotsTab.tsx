import React, { useState, useRef } from 'react';
import { PersonBot, Pin, CoinLogEntry, BotStatus } from '../types';
import { formatPHTime } from '../utils/storage';
import {
  UserPlus,
  Coins,
  History,
  Edit2,
  Trash2,
  Plus,
  Trophy,
  Flame,
  Bot,
  MapPin,
  X,
  Check,
  ArrowRightLeft,
  Calendar,
  AlertCircle,
  Ban,
  CheckCircle2,
  ShieldAlert,
  ImagePlus,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

interface BotsTabProps {
  persons: PersonBot[];
  pins: Pin[];
  onAddPerson: (
    name: string,
    assignedPinId?: string,
    status?: BotStatus,
    banLiftDate?: string,
    botNumber?: string
  ) => void;
  onUpdatePerson: (
    personId: string,
    name: string,
    newPinId?: string,
    status?: BotStatus,
    banLiftDate?: string,
    botNumber?: string
  ) => void;
  onDeletePerson: (personId: string) => void;
  onLogCoins: (personId: string, amount: number) => void;
  onDeleteLogEntry: (personId: string, logId: string) => void;
}

export const BotsTab: React.FC<BotsTabProps> = ({
  persons,
  pins,
  onAddPerson,
  onUpdatePerson,
  onDeletePerson,
  onLogCoins,
  onDeleteLogEntry,
}) => {
  // Input state for coin accumulation inputs per person
  const [coinInputs, setCoinInputs] = useState<Record<string, string>>({});

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBotNumber, setNewBotNumber] = useState('');
  const [newPinId, setNewPinId] = useState('');
  const [newStatus, setNewStatus] = useState<BotStatus>('working');
  const [newBanLiftDate, setNewBanLiftDate] = useState('');

  const [editingPerson, setEditingPerson] = useState<PersonBot | null>(null);
  const [editName, setEditName] = useState('');
  const [editBotNumber, setEditBotNumber] = useState('');
  const [editPinId, setEditPinId] = useState('');
  const [editStatus, setEditStatus] = useState<BotStatus>('working');
  const [editBanLiftDate, setEditBanLiftDate] = useState('');

  const [statusFilter, setStatusFilter] = useState<'all' | 'working' | 'banned'>('all');
  const [historyPerson, setHistoryPerson] = useState<PersonBot | null>(null);

  // Confirmation prompts state
  const [personToDelete, setPersonToDelete] = useState<PersonBot | null>(null);
  const [logToDelete, setLogToDelete] = useState<{ person: PersonBot; log: CoinLogEntry } | null>(null);

  // OCR state for extracting gold numbers from pasted images
  const [ocrLoading, setOcrLoading] = useState<Record<string, boolean>>({});
  const [ocrMessage, setOcrMessage] = useState<Record<string, string>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleProcessImageForOCR = async (personId: string, file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    setOcrLoading((prev) => ({ ...prev, [personId]: true }));
    setOcrMessage((prev) => ({ ...prev, [personId]: 'Scanning image for gold...' }));

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      try {
        const res = await fetch('/api/ocr-gold', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: dataUrl }),
        });
        const data = await res.json();
        if (data.success && typeof data.number === 'number' && data.number > 0) {
          setCoinInputs((prev) => ({ ...prev, [personId]: String(data.number) }));
          setOcrMessage((prev) => ({ ...prev, [personId]: `Extracted: ${data.number.toLocaleString()} gold` }));
          setTimeout(() => {
            setOcrMessage((prev) => {
              const copy = { ...prev };
              delete copy[personId];
              return copy;
            });
          }, 3500);
        } else {
          setOcrMessage((prev) => ({ ...prev, [personId]: 'Could not detect number' }));
          setTimeout(() => {
            setOcrMessage((prev) => {
              const copy = { ...prev };
              delete copy[personId];
              return copy;
            });
          }, 3500);
        }
      } catch (err) {
        console.error('OCR Error:', err);
        setOcrMessage((prev) => ({ ...prev, [personId]: 'OCR request failed' }));
        setTimeout(() => {
          setOcrMessage((prev) => {
            const copy = { ...prev };
            delete copy[personId];
            return copy;
          });
        }, 3000);
      } finally {
        setOcrLoading((prev) => ({ ...prev, [personId]: false }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCoinInputPaste = (personId: string, e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleProcessImageForOCR(personId, file);
          return;
        }
      }
    }
  };

  // --- KPI & Analytics Calculations ---
  // 1. Top Performing Person
  const topPerson =
    persons.length > 0
      ? [...persons].sort((a, b) => b.totalCoins - a.totalCoins)[0]
      : null;

  // 2. Top Performing Pin (Total coins accumulated while using each pin)
  const pinCoinsMap = new Map<string, { pinId: string; pinName: string; coins: number }>();
  persons.forEach((person) => {
    person.logs.forEach((log) => {
      if (log.type === 'coins' && log.amount && log.amount > 0) {
        const pId = log.pinId || person.assignedPinId || 'unassigned';
        const pName = log.pinName || person.assignedPinName || 'Unassigned';
        const current = pinCoinsMap.get(pId) || { pinId: pId, pinName: pName, coins: 0 };
        current.coins += log.amount;
        pinCoinsMap.set(pId, current);
      }
    });
  });

  const pinRankings = Array.from(pinCoinsMap.values()).sort((a, b) => b.coins - a.coins);
  const topPin = pinRankings.length > 0 && pinRankings[0].coins > 0 ? pinRankings[0] : null;

  // 3. Total Farmed Coins across all persons
  const totalCoinsAll = persons.reduce((sum, p) => sum + (p.totalCoins || 0), 0);

  // 4. Unique Assigned Pins in Use & Status Breakdown
  const assignedPinsSet = new Set(persons.map((p) => p.assignedPinId).filter(Boolean));
  const workingCount = persons.filter((p) => (p.status || 'working') === 'working').length;
  const bannedCount = persons.filter((p) => p.status === 'banned').length;

  // Filtered persons list
  const filteredPersons = persons.filter((p) => {
    if (statusFilter === 'working') return (p.status || 'working') === 'working';
    if (statusFilter === 'banned') return p.status === 'banned';
    return true;
  });

  // --- Handlers ---
  const handleCoinInputChange = (personId: string, val: string) => {
    setCoinInputs((prev) => ({ ...prev, [personId]: val }));
  };

  const handleCoinSubmit = (personId: string) => {
    const rawVal = coinInputs[personId];
    if (!rawVal) return;
    const amount = parseInt(rawVal, 10);
    if (isNaN(amount) || amount <= 0) return;

    onLogCoins(personId, amount);
    setCoinInputs((prev) => ({ ...prev, [personId]: '' }));
  };

  const handleOpenAdd = () => {
    setNewName('');
    setNewBotNumber('');
    setNewPinId('');
    setNewStatus('working');
    setNewBanLiftDate('');
    setIsAddModalOpen(true);
  };

  const handleSaveNewPerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAddPerson(
      newName.trim(),
      newPinId || undefined,
      newStatus,
      newStatus === 'banned' ? newBanLiftDate || undefined : undefined,
      newBotNumber.trim() || undefined
    );
    setIsAddModalOpen(false);
  };

  const handleOpenEdit = (person: PersonBot) => {
    setEditingPerson(person);
    setEditName(person.name);
    setEditBotNumber(person.botNumber || '');
    setEditPinId(person.assignedPinId || '');
    setEditStatus(person.status || 'working');
    setEditBanLiftDate(person.banLiftDate || '');
  };

  const handleSaveEditPerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPerson || !editName.trim()) return;
    onUpdatePerson(
      editingPerson.id,
      editName.trim(),
      editPinId || undefined,
      editStatus,
      editStatus === 'banned' ? editBanLiftDate || undefined : undefined,
      editBotNumber.trim() || undefined
    );
    setEditingPerson(null);
  };

  const handleQuickToggleStatus = (person: PersonBot) => {
    const isCurrentlyBanned = person.status === 'banned';
    if (isCurrentlyBanned) {
      // Direct lift of ban
      onUpdatePerson(
        person.id,
        person.name,
        person.assignedPinId,
        'working',
        undefined,
        person.botNumber
      );
    } else {
      // Open edit modal with banned selected so user can enter ban lift date
      handleOpenEdit(person);
      setEditStatus('banned');
    }
  };

  // Keep historyPerson synchronized if parent state updates
  const activeHistoryPerson = historyPerson
    ? persons.find((p) => p.id === historyPerson.id) || historyPerson
    : null;

  return (
    <div className="space-y-6">
      {/* 1. KPIs & Analytics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Top Person */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Top Person</span>
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="mt-2">
            <span className="text-base sm:text-lg font-bold text-slate-900 truncate block">
              {topPerson && topPerson.totalCoins > 0 ? topPerson.name : '—'}
            </span>
            <span className="text-xs text-amber-600 font-mono font-semibold">
              {topPerson && topPerson.totalCoins > 0
                ? `${topPerson.totalCoins.toLocaleString()} coins`
                : 'No coins logged'}
            </span>
          </div>
        </div>

        {/* Top Performing Pin */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Top Pin</span>
            <Flame className="w-3.5 h-3.5 text-orange-500" />
          </div>
          <div className="mt-2">
            <span className="text-base sm:text-lg font-bold text-slate-900 truncate block">
              {topPin ? topPin.pinName : '—'}
            </span>
            <span className="text-xs text-orange-600 font-mono font-semibold">
              {topPin ? `${topPin.coins.toLocaleString()} coins` : 'No pin records'}
            </span>
          </div>
        </div>

        {/* Total Farmed Coins */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Total Farmed</span>
            <Coins className="w-3.5 h-3.5 text-yellow-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {totalCoinsAll.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Across {persons.length} worker{persons.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {/* Active Workers & Status */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Workers & Status</span>
            <Bot className="w-3.5 h-3.5 text-sky-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {persons.length}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              <strong className="text-emerald-600 font-medium">{workingCount} Working</strong> ·{' '}
              <strong className="text-rose-600 font-medium">{bannedCount} Banned</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Action Header: Title + Status Filter + Add Person button (icon only) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Bot className="w-4 h-4 text-sky-600" />
            <span>Persons & Bot Workers</span>
            <span className="text-xs font-mono font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {persons.length}
            </span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Log accumulated coins, track bot status (Working/Banned), and monitor pin reassignments.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {/* Status Filter Tabs */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All ({persons.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('working')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                statusFilter === 'working'
                  ? 'bg-emerald-600 text-white shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-emerald-700'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Working ({workingCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('banned')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                statusFilter === 'banned'
                  ? 'bg-rose-600 text-white shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-rose-700'
              }`}
            >
              <Ban className="w-3 h-3" />
              <span>Banned ({bannedCount})</span>
            </button>
          </div>

          {/* Add Person Button (Icon Only per user instruction) */}
          <button
            onClick={handleOpenAdd}
            title="Add Person / Bot"
            aria-label="Add Person / Bot"
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-xs transition-colors cursor-pointer flex items-center justify-center shrink-0"
          >
            <UserPlus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. Persons List Format */}
      {persons.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-3">
            <Bot className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">No persons or bot workers yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            Add a person or bot worker to track their coin accumulation and active pin assignment.
          </p>
          <button
            onClick={handleOpenAdd}
            title="Add Person"
            aria-label="Add Person"
            className="p-2.5 text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition-colors cursor-pointer inline-flex items-center justify-center"
          >
            <UserPlus className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
          {/* Unified Column Headers for aligned table layout */}
          <div className="hidden sm:flex items-center justify-between px-4 py-2.5 bg-slate-50/90 text-[11px] font-semibold text-slate-500 uppercase tracking-wider select-none border-b border-slate-100">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 shrink-0 text-center">Bot</div>
              <div className="w-36 sm:w-44 md:w-52 shrink-0">Name / Pin</div>
              <div className="w-28 sm:w-32 shrink-0">Status</div>
              <div className="w-28 sm:w-36 shrink-0">Coins</div>
            </div>
            <div className="shrink-0 text-right text-[11px] text-slate-400 font-medium normal-case tracking-normal pr-1">
              Log & Actions
            </div>
          </div>
          {filteredPersons.map((person) => {
            const hasAssignedPin = Boolean(person.assignedPinId);
            const assignedPinObj = pins.find((p) => p.id === person.assignedPinId);
            const isBanned = person.status === 'banned';

            return (
              <div
                key={person.id}
                className={`p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${
                  isBanned ? 'bg-rose-50/20 hover:bg-rose-50/40' : 'hover:bg-slate-50/70'
                }`}
              >
                {/* Person Information & Aligned Status & Coins */}
                <div className="flex items-center gap-3 min-w-0 flex-1 flex-wrap sm:flex-nowrap">
                  {/* Bot Avatar */}
                  <div
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-xs shrink-0 ${
                      isBanned
                        ? 'bg-rose-50 border-rose-200 text-rose-700'
                        : 'bg-sky-50 border-sky-100 text-sky-700'
                    }`}
                  >
                    {person.botNumber ? person.botNumber : person.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Column 1: Bot Name + Pin (fixed width for unified alignment) */}
                  <div className="w-36 sm:w-44 md:w-52 shrink-0 min-w-0">
                    <div className="flex items-center min-w-0">
                      <span className="font-semibold text-sm text-slate-900 truncate" title={person.name}>
                        {person.name}
                      </span>
                    </div>

                    {/* Assigned Pin */}
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-1 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {hasAssignedPin ? (
                        <span className="truncate">
                          pin: <strong className="text-slate-800 font-medium">
                            {assignedPinObj?.name || person.assignedPinName || 'Assigned Pin'}
                          </strong>
                        </span>
                      ) : (
                        <span className="italic text-slate-400">No pin assigned</span>
                      )}
                    </div>
                  </div>

                  {/* Column 2: Status Badge (fixed width for unified horizontal alignment) */}
                  <div className="w-28 sm:w-32 shrink-0 flex flex-col justify-center">
                    {isBanned ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 w-fit">
                        <Ban className="w-3 h-3 text-rose-500 shrink-0" />
                        Banned
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 w-fit">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                        Working
                      </span>
                    )}
                    {isBanned && person.banLiftDate && (
                      <span className="text-[10px] text-rose-600 font-mono mt-0.5 truncate flex items-center gap-0.5">
                        <Calendar className="w-2.5 h-2.5 shrink-0" />
                        Lifts: {person.banLiftDate}
                      </span>
                    )}
                  </div>

                  {/* Column 3: Total Coins Pill (fixed width for unified horizontal alignment) */}
                  <div className="w-28 sm:w-36 shrink-0 flex items-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                      <Coins className="w-3 h-3 text-amber-500 shrink-0" />
                      {person.totalCoins.toLocaleString()} coins
                    </span>
                  </div>
                </div>

                {/* Exact Sequence of Action Controls:
                    1. Field that logs amount of coins (supports pasting image OCR!)
                    2. Quick Status toggle (Working / Banned)
                    3. History button right next to field
                    4. Edit button
                    5. Delete button with confirmation prompt
                    (with icon only instead of button labels) */}
                <div className="flex items-center gap-1.5 shrink-0 self-end md:self-auto">
                  {/* 1. Field to log coins accumulated with OCR image paste/select support */}
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1">
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min="1"
                          placeholder="+ Coins / paste image..."
                          value={coinInputs[person.id] || ''}
                          onChange={(e) => handleCoinInputChange(person.id, e.target.value)}
                          onPaste={(e) => handleCoinInputPaste(person.id, e)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleCoinSubmit(person.id);
                            }
                          }}
                          className="w-28 sm:w-36 px-2.5 py-1.5 pr-7 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                        />
                        {/* Hidden file input for OCR image picker */}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          ref={(el) => {
                            fileInputRefs.current[person.id] = el;
                          }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleProcessImageForOCR(person.id, file);
                            e.target.value = '';
                          }}
                        />
                        {/* OCR Image Button (icon only) */}
                        <button
                          type="button"
                          onClick={() => fileInputRefs.current[person.id]?.click()}
                          title="Paste or select image of gold to extract number (OCR)"
                          aria-label="Paste or select image of gold to extract number"
                          className="absolute right-1.5 p-0.5 text-slate-400 hover:text-amber-600 transition-colors cursor-pointer"
                        >
                          {ocrLoading[person.id] ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                          ) : (
                            <ImagePlus className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCoinSubmit(person.id)}
                        title="Log Coins"
                        aria-label="Log Coins"
                        className="p-1.5 sm:p-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-xs transition-colors cursor-pointer flex items-center justify-center shrink-0"
                      >
                        <Plus className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </div>
                    {ocrMessage[person.id] && (
                      <span className="text-[10px] text-amber-700 font-medium font-mono">
                        {ocrMessage[person.id]}
                      </span>
                    )}
                  </div>

                  {/* 2. Quick Status toggle button (Icon only) */}
                  <button
                    type="button"
                    onClick={() => handleQuickToggleStatus(person)}
                    title={isBanned ? 'Lift Ban (Set as Working)' : 'Set as Banned'}
                    aria-label={isBanned ? 'Lift Ban (Set as Working)' : 'Set as Banned'}
                    className={`p-1.5 sm:p-2 rounded-lg border transition-colors cursor-pointer flex items-center justify-center shrink-0 ${
                      isBanned
                        ? 'bg-rose-50 hover:bg-emerald-50 text-rose-600 hover:text-emerald-700 border-rose-200 hover:border-emerald-200'
                        : 'bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border-slate-200/80 hover:border-rose-200'
                    }`}
                  >
                    {isBanned ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Ban className="w-4 h-4 text-slate-500" />
                    )}
                  </button>

                  {/* 3. History button (Icon only) */}
                  <button
                    type="button"
                    onClick={() => setHistoryPerson(person)}
                    title="Coin, Pin & Status History"
                    aria-label="Coin, Pin & Status History"
                    className="p-1.5 sm:p-2 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"
                  >
                    <History className="w-4 h-4" />
                  </button>

                  {/* 4. Edit button (Icon only) */}
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(person)}
                    title="Edit Person, Status & Pin"
                    aria-label="Edit Person, Status & Pin"
                    className="p-1.5 sm:p-2 text-slate-700 hover:text-sky-600 bg-slate-100 hover:bg-sky-50 border border-slate-200/80 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {/* 5. Delete button (Icon only with confirmation prompt) */}
                  <button
                    type="button"
                    onClick={() => setPersonToDelete(person)}
                    title="Delete Person"
                    aria-label="Delete Person"
                    className="p-1.5 sm:p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200/80 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- MODAL 1: Add Person --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-sky-600" />
                <h3 className="text-sm font-bold text-slate-900">Add Person / Bot</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                title="Close"
                aria-label="Close"
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewPerson} className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bot #
                  </label>
                  <input
                    type="text"
                    value={newBotNumber}
                    onChange={(e) => setNewBotNumber(e.target.value)}
                    placeholder="e.g. 1"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Person Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Worker 1 or Juan"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assign to Pin (Optional)
                </label>
                <select
                  value={newPinId}
                  onChange={(e) => setNewPinId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white cursor-pointer"
                >
                  <option value="">No Pin Assigned</option>
                  {pins.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.categoryName ? `(${p.categoryName})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  You can change or reassign their pin at any time.
                </p>
              </div>

              {/* Bot Status: Working or Banned */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Bot Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewStatus('working')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                      newStatus === 'working'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500 font-semibold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Working</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewStatus('banned')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                      newStatus === 'banned'
                        ? 'bg-rose-50 border-rose-500 text-rose-800 ring-1 ring-rose-500 font-semibold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Ban className="w-3.5 h-3.5 text-rose-500" />
                    <span>Banned</span>
                  </button>
                </div>
              </div>

              {/* Conditionally shown when Banned is chosen: Field to enter date of when ban will be lifted */}
              {newStatus === 'banned' && (
                <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-200 animate-in fade-in duration-150 space-y-2">
                  <label className="block text-xs font-semibold text-rose-900 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-rose-600" />
                    <span>Date When Ban Will Be Lifted</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={newBanLiftDate}
                    onChange={(e) => setNewBanLiftDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    className="w-full px-3 py-2 text-xs bg-white border border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900"
                  />
                  <p className="text-[10px] text-rose-600 leading-tight">
                    Specify the date when this bot's ban is scheduled to end.
                  </p>
                </div>
              )}

              {/* Action buttons (Icon Only per user instruction) */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  title="Cancel"
                  aria-label="Cancel"
                  className="p-2 text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  type="submit"
                  title="Save Person"
                  aria-label="Save Person"
                  className="p-2 text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: Edit Person, Status & Pin Reassignment --- */}
      {editingPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-sky-600" />
                <h3 className="text-sm font-bold text-slate-900">Edit Person & Status</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPerson(null)}
                title="Close"
                aria-label="Close"
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditPerson} className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bot #
                  </label>
                  <input
                    type="text"
                    value={editBotNumber}
                    onChange={(e) => setEditBotNumber(e.target.value)}
                    placeholder="e.g. 1"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Person Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Bot Status: Working or Banned */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Bot Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditStatus('working')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                      editStatus === 'working'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500 font-semibold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Working</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditStatus('banned')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                      editStatus === 'banned'
                        ? 'bg-rose-50 border-rose-500 text-rose-800 ring-1 ring-rose-500 font-semibold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Ban className="w-3.5 h-3.5 text-rose-500" />
                    <span>Banned</span>
                  </button>
                </div>
              </div>

              {/* Conditionally shown when Banned is chosen: Field to enter date of when ban will be lifted */}
              {editStatus === 'banned' && (
                <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-200 animate-in fade-in duration-150 space-y-2">
                  <label className="block text-xs font-semibold text-rose-900 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-rose-600" />
                    <span>Date When Ban Will Be Lifted</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editBanLiftDate}
                    onChange={(e) => setEditBanLiftDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    className="w-full px-3 py-2 text-xs bg-white border border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900"
                  />
                  <p className="text-[10px] text-rose-600 leading-tight">
                    Specify the date when this bot's ban is scheduled to end.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Pin
                </label>
                <select
                  value={editPinId}
                  onChange={(e) => setEditPinId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white cursor-pointer"
                >
                  <option value="">No Pin Assigned</option>
                  {pins.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.categoryName ? `(${p.categoryName})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-sky-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>Changes are automatically logged in history with 12-hr PH time.</span>
                </p>
              </div>

              {/* Action buttons (Icon Only per user instruction) */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPerson(null)}
                  title="Cancel"
                  aria-label="Cancel"
                  className="p-2 text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  type="submit"
                  title="Save Changes"
                  aria-label="Save Changes"
                  className="p-2 text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- PANEL / MODAL 3: Coin & Pin Change History --- */}
      {activeHistoryPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {activeHistoryPerson.name} — History
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Total: <strong className="text-amber-600 font-mono">{activeHistoryPerson.totalCoins.toLocaleString()} coins</strong> · {activeHistoryPerson.logs.length} logged events
                  </p>
                </div>
              </div>

              {/* Close Button (Icon Only) */}
              <button
                type="button"
                onClick={() => setHistoryPerson(null)}
                title="Close"
                aria-label="Close"
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Logs List */}
            <div className="p-5 overflow-y-auto space-y-2.5 flex-1">
              {activeHistoryPerson.logs.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs italic">
                  No coins accumulated or pin changes logged for this person yet.
                </div>
              ) : (
                activeHistoryPerson.logs.map((log: CoinLogEntry) => {
                  const isPinChange = log.type === 'pin_change';
                  const isStatusChange = log.type === 'status_change';
                  const isBannedChange = log.newStatus === 'banned';

                  return (
                    <div
                      key={log.id}
                      className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-3 ${
                        isStatusChange
                          ? isBannedChange
                            ? 'bg-rose-50/70 border-rose-200/80 text-rose-950'
                            : 'bg-emerald-50/70 border-emerald-200/80 text-emerald-950'
                          : isPinChange
                          ? 'bg-sky-50/60 border-sky-200/80 text-sky-950'
                          : 'bg-white border-slate-200 shadow-2xs text-slate-900'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        {isStatusChange ? (
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                              isBannedChange
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {isBannedChange ? (
                              <Ban className="w-3.5 h-3.5" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                          </div>
                        ) : isPinChange ? (
                          <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 mt-0.5">
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                            <Coins className="w-3.5 h-3.5" />
                          </div>
                        )}

                        <div className="min-w-0">
                          {isStatusChange ? (
                            <div>
                              <div className="font-semibold flex items-center gap-1.5 flex-wrap">
                                <span>Status:</span>
                                <span
                                  className={
                                    isBannedChange
                                      ? 'text-rose-700 font-bold'
                                      : 'text-emerald-700 font-bold'
                                  }
                                >
                                  {isBannedChange ? 'Banned' : 'Working'}
                                </span>
                                {log.banLiftDate && (
                                  <span className="text-[11px] font-mono text-rose-600 bg-rose-100/70 px-1.5 py-0.2 rounded">
                                    Ban lifts: {log.banLiftDate}
                                  </span>
                                )}
                              </div>
                              {log.note && (
                                <p className="text-[11px] text-slate-600 mt-0.5">{log.note}</p>
                              )}
                            </div>
                          ) : isPinChange ? (
                            <div className="font-semibold text-sky-900">
                              Pin Changed:{' '}
                              <span className="line-through text-slate-400 font-normal">
                                {log.oldPinName || 'None'}
                              </span>{' '}
                              →{' '}
                              <span className="text-sky-700">
                                {log.newPinName || 'None'}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-amber-600 font-mono text-sm">
                                +{(log.amount || 0).toLocaleString()} coins
                              </span>
                              {log.pinName && (
                                <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  {log.pinName}
                                </span>
                              )}
                            </div>
                          )}

                          {/* 12-hour format Philippine Time timestamp */}
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span className="font-mono text-slate-500">{log.phTime}</span>
                          </div>
                        </div>
                      </div>

                      {/* Delete Log Entry Button (Icon Only with confirmation) */}
                      <button
                        type="button"
                        onClick={() => setLogToDelete({ person: activeHistoryPerson, log })}
                        title="Delete log record"
                        aria-label="Delete log record"
                        className="p-1 text-slate-300 hover:text-red-500 rounded hover:bg-red-50 transition-colors cursor-pointer shrink-0 mt-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                type="button"
                onClick={() => setHistoryPerson(null)}
                title="Close"
                aria-label="Close"
                className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CONFIRMATION MODAL: Delete Person / Bot --- */}
      {personToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden p-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Delete Person / Bot</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
              Are you sure you want to delete <strong>{personToDelete.name}</strong>
              {personToDelete.botNumber ? ` (Bot ${personToDelete.botNumber})` : ''}? This will permanently remove all their recorded coin logs.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPersonToDelete(null)}
                title="Cancel"
                aria-label="Cancel"
                className="p-2 text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeletePerson(personToDelete.id);
                  setPersonToDelete(null);
                }}
                title="Confirm Delete"
                aria-label="Confirm Delete"
                className="p-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CONFIRMATION MODAL: Delete Log Entry --- */}
      {logToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xs p-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <AlertTriangle className="w-4 h-4" />
              <h4 className="text-xs font-bold text-slate-900">Delete Log Record?</h4>
            </div>
            <p className="text-[11px] text-slate-600 mb-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              Are you sure you want to delete this log entry
              {logToDelete.log.amount ? ` (+${logToDelete.log.amount.toLocaleString()} coins)` : ''}?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setLogToDelete(null)}
                title="Cancel"
                aria-label="Cancel"
                className="p-1.5 text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteLogEntry(logToDelete.person.id, logToDelete.log.id);
                  setLogToDelete(null);
                }}
                title="Confirm Delete"
                aria-label="Confirm Delete"
                className="p-1.5 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
