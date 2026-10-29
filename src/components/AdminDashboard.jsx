'use client';

import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Plus,
  Trash2,
  Edit2,
  Power,
  Users,
  Calendar,
  Clock,
  Mail,
  Settings,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Save,
  Coffee,
  Utensils,
  Image as ImageIcon,
  Upload,
  Tag,
  IndianRupee,
  Lock,
  LogOut,
  KeyRound,
} from 'lucide-react';
import { useCafe, formatTime12h, timeToMinutes } from '../context/CafeContext';
import { getTodayString, getTomorrowString, DEFAULT_MENU_CATEGORIES } from '../constants/defaultData';
import { supabase } from '../supabase';

const SIGNATURE_DISH_PRESETS = [
  { name: 'Pistachio Cortado', image: '/images/menu/cortado.jpg' },
  { name: 'Kyoto Cold Brew', image: '/images/menu/kyoto_cold_brew.jpg' },
  { name: 'Salmon Eggs Royale', image: '/images/menu/salmon_royale.jpg' },
  { name: 'Avocado Tartine', image: '/images/menu/avocado_tartine.jpg' },
  { name: 'Butter Croissant', image: '/images/menu/croissant.jpg' },
  { name: 'Chocolate Fondant', image: '/images/menu/chocolate_fondant.jpg' },
];

export default function AdminDashboard({ isStandalone = false }) {
  const {
    isAdminOpen,
    setIsAdminOpen,
    cafeSettings,
    updateCafeSettings,
    tables,
    updateTableCapacity,
    toggleTableMaintenance,
    updateTable,
    addTable,
    deleteTable,
    bookings,
    updateBookingStatus,
    emailLogs,
    resetToDefaultData,
    isSupabaseConfigured,
    menuItems,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    toggleMenuItemAvailability,
    createBooking,
    getTableCurrentOccupant,
    fetchAdminBookings,
    clearAdminBookings,
  } = useCafe();

  const handleFreeTableEarly = async (bookingId, tableName) => {
    await updateBookingStatus(bookingId, 'completed');
    triggerToast(`Table ${tableName || ''} freed early! Marked as completed.`);
  };

  const handleCreateSampleBooking = async () => {
    try {
      const today = getTodayString();
      await createBooking({
        table_id: tables[0]?.id || 'T01',
        customer_name: 'Aarav Sengupta',
        customer_email: 'aarav.sengupta@example.com',
        customer_phone: '+91 98301 23456',
        booking_date: today,
        start_time: '19:00',
        duration_minutes: 90,
        guest_count: 2,
        special_notes: 'Corner window seat preferred, evening coffee tasting.',
      });
      setActiveTab('bookings');
    } catch (err) {
      console.warn('Sample booking creation error:', err);
    }
  };

  const handleClose = () => {
    if (isStandalone) {
      if (typeof window !== 'undefined') window.location.href = '/';
    } else {
      setIsAdminOpen(false);
    }
  };

  // Supabase Auth Admin Session & State (auto-permit in standalone manager portal)
  const [mounted, setMounted] = useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);
  const [isAuthenticated, setIsAuthenticated] = useState(!isSupabaseConfigured);
  const [isAuthChecking, setIsAuthChecking] = useState(isSupabaseConfigured);
  const [authUser, setAuthUser] = useState(null);
  const [authError, setAuthError] = useState('');
  const [authSuccessMsg, setAuthSuccessMsg] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Reset Layout Confirmation Modal State
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [isResetAcknowledged, setIsResetAcknowledged] = useState(false);

  // Active Tab: 'tables', 'bookings', 'menu', 'emails', 'settings'
  const [activeTab, setActiveTab] = useState('tables');

  // Bookings filter
  const [bookingFilterDate, setBookingFilterDate] = useState('all');

  // New Table Form Modal / Inline State
  const [newTableName, setNewTableName] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState(4);
  const [isAddingTable, setIsAddingTable] = useState(false);

  // Editing Table Modal State
  const [editingTable, setEditingTable] = useState(null);
  const [editTableForm, setEditTableForm] = useState({
    name: '',
    capacity: 4,
    shape: 'square',
    description: '',
  });
  const [isUpdatingTable, setIsUpdatingTable] = useState(false);

  // Editing Dish Modal State
  const [editingDish, setEditingDish] = useState(null);
  const [editDishForm, setEditDishForm] = useState({
    name: '',
    category: 'coffee',
    price: '',
    image: '',
    badge: '',
    description: '',
    is_available: true,
  });
  const [isUpdatingDish, setIsUpdatingDish] = useState(false);
  const [editDishImagePreviewError, setEditDishImagePreviewError] = useState(false);
  const [adminToast, setAdminToast] = useState('');

  const triggerToast = (msg) => {
    setAdminToast(msg);
    setTimeout(() => setAdminToast(''), 3500);
  };

  // Trusted server-controlled admin verification helper
  const verifyAdminStatus = React.useCallback(async (user) => {
    if (!user) return false;
    // 1. Server-controlled role in app_metadata (cannot be altered by client)
    if (user.app_metadata?.role === 'admin') return true;

    // 2. Query trusted admin_users allowlist table
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('admin_users')
          .select('email')
          .or(`user_id.eq.${user.id},email.eq.${user.email}`)
          .limit(1);
        if (!error && data && data.length > 0) return true;
      } catch (err) {
        console.warn('Admin allowlist check error:', err);
      }
    }
    return false;
  }, []);

  // Check existing Supabase Auth session on mount and subscribe to changes
  React.useEffect(() => {
    setMounted(true);
    if (!supabase) return;

    let isMounted = true;

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && isMounted) {
          const isAdmin = await verifyAdminStatus(session.user);
          if (isAdmin && isMounted) {
            setIsAuthenticated(true);
            setAuthUser(session.user);
            try {
              const { data: adminSettings } = await supabase.from('cafe_settings').select('*').single();
              if (adminSettings && isMounted) {
                setSettingsForm((prev) => ({
                  ...prev,
                  ...adminSettings,
                  owner_email: adminSettings.owner_email ?? '',
                  name: adminSettings.name ?? '',
                  phone: adminSettings.phone ?? '',
                  address: adminSettings.address ?? '',
                  opening_time: adminSettings.opening_time ?? '08:00',
                  closing_time: adminSettings.closing_time ?? '23:00',
                  currency: adminSettings.currency ?? '₹',
                  cleaning_buffer: adminSettings.cleaning_buffer ?? 15,
                }));
              }
            } catch {
              // Graceful fallback
            }
            if (fetchAdminBookings) {
              await fetchAdminBookings();
            }
          } else if (isMounted) {
            setIsAuthenticated(!isSupabaseConfigured);
            setAuthUser(null);
          }
        } else if (isMounted) {
          setIsAuthenticated(!isSupabaseConfigured);
          setAuthUser(null);
        }
      } catch (err) {
        console.warn('Session check failed:', err);
        if (isMounted) setIsAuthenticated(!isSupabaseConfigured);
      } finally {
        if (isMounted) setIsAuthChecking(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user && isMounted) {
        const isAdmin = await verifyAdminStatus(session.user);
        if (isAdmin && isMounted) {
          setIsAuthenticated(true);
          setAuthUser(session.user);
          setAuthError('');
          if (fetchAdminBookings) {
            await fetchAdminBookings();
          }
        } else if (isMounted) {
          setIsAuthenticated(!isSupabaseConfigured);
          setAuthUser(null);
        }
      } else if (isMounted) {
        setIsAuthenticated(!isSupabaseConfigured);
        setAuthUser(null);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [verifyAdminStatus, isSupabaseConfigured]);

  const handleSupabaseLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccessMsg('');

    if (!supabase || !isSupabaseConfigured) {
      setAuthError('Supabase is not configured yet. Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
      return;
    }

    if (!authEmail.trim()) {
      setAuthError('Please enter your administrator email.');
      return;
    }

    if (!authPassword) {
      setAuthError('Please enter your administrator password.');
      return;
    }

    setIsSubmittingAuth(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: authEmail.trim(),
        password: authPassword,
      });

      if (error) {
        setAuthError(error.message || 'Authentication failed. Please check your credentials.');
      } else if (data?.user) {
        const isAdmin = await verifyAdminStatus(data.user);

        if (!isAdmin) {
          await supabase.auth.signOut();
          setAuthError('Access Denied: Your account does not possess verified administrator privileges.');
        } else {
          setIsAuthenticated(true);
          setAuthUser(data.user);
          setAuthError('');
          if (fetchAdminBookings) {
            await fetchAdminBookings();
          }
          try {
            const { data: adminSettings } = await supabase.from('cafe_settings').select('*').single();
            if (adminSettings) {
              setSettingsForm((prev) => ({
                ...prev,
                ...adminSettings,
                owner_email: adminSettings.owner_email ?? '',
                name: adminSettings.name ?? '',
                phone: adminSettings.phone ?? '',
                address: adminSettings.address ?? '',
                opening_time: adminSettings.opening_time ?? '08:00',
                closing_time: adminSettings.closing_time ?? '23:00',
                currency: adminSettings.currency ?? '₹',
                cleaning_buffer: adminSettings.cleaning_buffer ?? 15,
              }));
            }
          } catch {
            // Graceful fallback
          }
        }
      }
    } catch (err) {
      setAuthError(err.message || 'An unexpected authentication error occurred.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleSignOut = async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Sign out error:', err);
      }
    }
    setAuthUser(null);
    setIsAuthenticated(false);
    setAuthEmail('');
    setAuthPassword('');
    setAuthError('');
    setAuthSuccessMsg('');
    if (clearAdminBookings) {
      clearAdminBookings();
    }
    triggerToast('Logged out of admin panel.');
  };

  // Menu Dish Management State
  const [menuFilterCategory, setMenuFilterCategory] = useState('all');
  const [isAddingDish, setIsAddingDish] = useState(false);
  const [dishSavedSuccess, setDishSavedSuccess] = useState(false);
  const [dishForm, setDishForm] = useState({
    name: '',
    category: 'coffee',
    price: '',
    image: '',
    badge: '',
    description: '',
  });
  const [imagePreviewError, setImagePreviewError] = useState(false);

  // Helper to normalize cafe settings and guard against null values in form inputs
  const normalizeSettings = React.useCallback((settings) => ({
    name: settings?.name ?? '',
    owner_email: settings?.owner_email ?? '',
    opening_time: settings?.opening_time ?? '08:00',
    closing_time: settings?.closing_time ?? '23:00',
    seating_mode: settings?.seating_mode ?? 'exclusive_table',
    cleaning_buffer: settings?.cleaning_buffer ?? 15,
    phone: settings?.phone ?? '',
    currency: settings?.currency ?? '₹',
    address: settings?.address ?? '',
    ...(settings || {}),
    name: settings?.name ?? '',
    owner_email: settings?.owner_email ?? '',
    phone: settings?.phone ?? '',
    address: settings?.address ?? '',
    currency: settings?.currency ?? '₹',
  }), []);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState(() => normalizeSettings(cafeSettings));
  const [settingsSavedMessage, setSettingsSavedMessage] = useState(false);
  const [settingsErrorMessage, setSettingsErrorMessage] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Synchronize settingsForm whenever authoritative cafeSettings updates
  React.useEffect(() => {
    if (cafeSettings) {
      setSettingsForm((prev) => ({
        ...prev,
        ...normalizeSettings(cafeSettings),
      }));
    }
  }, [cafeSettings, normalizeSettings]);

  const handleAddTableSubmit = async (e) => {
    e.preventDefault();
    const tableId = `T${String(tables.length + 1).padStart(2, '0')}`;
    const res = await addTable({
      id: tableId,
      name: newTableName.trim() || `Table ${tableId}`,
      capacity: Number(newTableCapacity) || 4,
      status: 'active',
      shape: 'square',
      description: `Table ${tableId} (${newTableCapacity} Chairs)`,
    });
    if (res?.success) {
      triggerToast(`Table ${tableId} added to floor inventory.`);
      setNewTableName('');
      setNewTableCapacity(4);
      setIsAddingTable(false);
    } else {
      alert(res?.error || 'Failed to add table.');
    }
  };

  const handleQuickCapacityChange = async (tableId, newCap) => {
    const res = await updateTableCapacity(tableId, newCap);
    if (res?.success) {
      triggerToast(`Table ${tableId} capacity updated to ${newCap} chairs.`);
    }
  };

  const handleOpenEditTable = (table) => {
    setEditingTable(table);
    setEditTableForm({
      name: table.name || '',
      capacity: table.capacity || 4,
      shape: table.shape || 'square',
      description: table.description || '',
    });
  };

  const handleSaveEditTable = async (e) => {
    e.preventDefault();
    if (!editingTable) return;
    setIsUpdatingTable(true);
    const res = await updateTable(editingTable.id, editTableForm);
    setIsUpdatingTable(false);
    if (res?.success) {
      triggerToast(`Table ${editingTable.id} updated in database.`);
      setEditingTable(null);
    } else {
      alert(res?.error || 'Failed to update table in database.');
    }
  };

  const handleDeleteTable = async (tableId) => {
    if (window.confirm(`Are you sure you want to remove Table ${tableId}? This action cannot be undone.`)) {
      const res = await deleteTable(tableId);
      if (res?.success) {
        triggerToast(`Table ${tableId} removed.`);
        if (editingTable?.id === tableId) setEditingTable(null);
      } else {
        alert(res?.error || 'Failed to delete table.');
      }
    }
  };

  const handleOpenEditDish = (dish) => {
    setEditingDish(dish);
    setEditDishForm({
      name: dish.name || '',
      category: dish.category || 'coffee',
      price: dish.price !== undefined ? String(dish.price) : '',
      image: dish.image || '/images/menu/cortado.jpg',
      badge: dish.badge || '',
      description: dish.description || '',
      is_available: dish.is_available !== false,
    });
    setEditDishImagePreviewError(false);
  };

  const handleSaveEditDish = async (e) => {
    e.preventDefault();
    if (!editingDish) return;
    if (!editDishForm.name.trim()) {
      alert('Dish name is required.');
      return;
    }
    if (!editDishForm.price || Number(editDishForm.price) <= 0) {
      alert('Please enter a valid price in Indian Rupee (₹).');
      return;
    }
    setIsUpdatingDish(true);
    const res = await updateMenuItem(editingDish.id, {
      ...editDishForm,
      price: Number(editDishForm.price),
    });
    setIsUpdatingDish(false);
    if (res?.success) {
      triggerToast(`Dish "${editDishForm.name}" updated in database.`);
      setEditingDish(null);
    } else {
      alert(res?.error || 'Failed to update dish in database.');
    }
  };

  const handleEditDishImageFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert('Image file is too large. Please select an image under 4MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setEditDishForm((prev) => ({ ...prev, image: reader.result }));
      setEditDishImagePreviewError(false);
    };
    reader.readAsDataURL(file);
  };

  const handleImageFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert('Image file is too large. Please select an image under 4MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setDishForm((prev) => ({ ...prev, image: reader.result }));
      setImagePreviewError(false);
    };
    reader.readAsDataURL(file);
  };

  const handleAddDishSubmit = async (e) => {
    e.preventDefault();
    if (!dishForm.name.trim()) {
      alert('Please enter a dish name.');
      return;
    }
    if (!dishForm.price || Number(dishForm.price) <= 0) {
      alert('Please enter a valid price in Indian Rupee (₹).');
      return;
    }

    await addMenuItem({
      name: dishForm.name,
      category: dishForm.category,
      price: Number(dishForm.price),
      image: dishForm.image || '/images/menu/cortado.jpg',
      badge: dishForm.badge,
      description: dishForm.description,
    });

    setDishForm({
      name: '',
      category: 'coffee',
      price: '',
      image: '',
      badge: '',
      description: '',
    });
    setIsAddingDish(false);
    triggerToast(`Dish "${dishForm.name}" added to menu.`);
    setDishSavedSuccess(true);
    setTimeout(() => setDishSavedSuccess(false), 3500);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsSavedMessage(false);
    setSettingsErrorMessage('');
    setIsSavingSettings(true);

    try {
      const result = await updateCafeSettings(settingsForm);
      if (result && result.success) {
        setSettingsSavedMessage(true);
        setTimeout(() => setSettingsSavedMessage(false), 3500);
      } else {
        // Database update failed: show error and revert form to authoritative settings
        setSettingsErrorMessage(result?.error || 'Failed to save cafe settings to database.');
        setSettingsForm(cafeSettings);
        setTimeout(() => setSettingsErrorMessage(''), 5000);
      }
    } catch (err) {
      setSettingsErrorMessage(err?.message || 'Unexpected error while saving settings.');
      setSettingsForm(cafeSettings);
      setTimeout(() => setSettingsErrorMessage(''), 5000);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const todayStr = getTodayString();
  const tomorrowStr = getTomorrowString();

  const filteredBookings = bookings.filter((b) => {
    if (bookingFilterDate === 'all') return true;
    if (bookingFilterDate === 'today') return b.booking_date === todayStr;
    if (bookingFilterDate === 'tomorrow') return b.booking_date === tomorrowStr;
    return b.booking_date === bookingFilterDate;
  });

  // Automated Overlap & Collision Inspector
  const detectedConflicts = React.useMemo(() => {
    const conflicts = [];
    const confirmed = filteredBookings.filter((b) => b.status === 'confirmed');
    for (let i = 0; i < confirmed.length; i++) {
      for (let j = i + 1; j < confirmed.length; j++) {
        const b1 = confirmed[i];
        const b2 = confirmed[j];
        if (b1.table_id === b2.table_id && b1.booking_date === b2.booking_date) {
          const s1 = timeToMinutes(b1.start_time);
          const e1 = timeToMinutes(b1.end_time) || (s1 + (b1.duration_minutes || 90));
          const s2 = timeToMinutes(b2.start_time);
          const e2 = timeToMinutes(b2.end_time) || (s2 + (b2.duration_minutes || 90));
          if (s1 < e2 && s2 < e1) {
            conflicts.push({ b1, b2 });
          }
        }
      }
    }
    return conflicts;
  }, [filteredBookings]);

  // If accessed as inline modal on public website and modal is not opened, don't render
  if (!isStandalone && !isAdminOpen) return null;

  // Mount guard for standalone portal to guarantee 100% zero hydration mismatch
  if (!mounted && isStandalone) {
    return (
      <div className="w-full neu-raised rounded-3xl p-12 my-6 flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 rounded-full border-2 border-gold-accent border-t-transparent animate-spin"></div>
        <p className="text-xs text-cafe-300 font-mono tracking-wide">
          Loading Staff Management Portal...
        </p>
      </div>
    );
  }

  // If verifying authentication status on mount
  if (isAuthChecking && isSupabaseConfigured) {
    return (
      <div className={isStandalone ? "w-full max-w-md mx-auto my-12 p-8 neu-raised rounded-3xl border border-gold-accent/30 flex flex-col items-center justify-center space-y-4 shadow-neu-raised" : "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85"}>
        <div className="w-8 h-8 rounded-full border-2 border-gold-accent border-t-transparent animate-spin"></div>
        <p className="text-xs text-cafe-300 font-mono tracking-wide">
          Verifying administrator credentials...
        </p>
      </div>
    );
  }

  // If not authenticated, render login security gate (both in modal and standalone portal)
  if (!isAuthenticated && isSupabaseConfigured) {
    return (
      <div className={isStandalone ? "w-full max-w-md mx-auto my-8 p-4 sm:p-0" : "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85"}>
        <div className="neu-raised w-full max-w-md rounded-3xl border border-gold-accent/30 shadow-neu-raised overflow-hidden p-6 sm:p-8 animate-scale-up">
          <div className="flex items-center justify-between pb-4 border-b border-cafe-800">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gold-accent/20 border border-gold-accent/40 flex items-center justify-center text-gold-accent">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-[#faf6f0]">Management Portal</h3>
                <p className="text-[11px] text-cafe-300">Supabase Auth Verified Administrator Access</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              title={isStandalone ? "Return to Public Website" : "Close Management Portal"}
              className="p-1.5 rounded-lg text-cafe-400 hover:text-white hover:bg-cafe-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {!isSupabaseConfigured ? (
            <div className="my-6 p-4 rounded-2xl bg-orange-950/40 border border-orange-500/30 text-orange-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-gold-accent">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>Supabase Not Configured</span>
              </div>
              <p className="leading-relaxed text-cafe-300">
                To access the management portal, configure your Supabase project credentials in <code className="text-gold-accent font-mono text-[11px]">.env.local</code>:
              </p>
              <pre className="p-2.5 rounded-lg bg-cafe-950 border border-cafe-800 font-mono text-[10px] text-cafe-200 overflow-x-auto">
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
              </pre>
            </div>
          ) : (
            <div className="my-5">
              {authError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              {authSuccessMsg && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{authSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleSupabaseLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-cafe-300 mb-1">
                    Administrator Email
                  </label>
                  <input
                    type="email"
                    placeholder="admin@lauracafe.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full neu-inset rounded-xl px-3.5 py-2 text-xs text-cafe-100"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-cafe-300 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full neu-inset rounded-xl px-3.5 py-2 text-xs text-cafe-100"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 rounded-xl text-xs text-cafe-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAuth}
                    className="px-5 py-2 rounded-xl neu-gold-btn text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingAuth ? 'Authenticating...' : 'Sign In via Supabase'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={isStandalone ? "w-full flex flex-col" : "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 overflow-y-auto"}>
      <div className={isStandalone ? "w-full neu-raised rounded-3xl overflow-hidden flex flex-col" : "neu-raised w-full max-w-5xl rounded-3xl overflow-hidden my-6 flex flex-col max-h-[92vh] animate-scale-up"}>
        {/* Admin Header */}
        <div className="px-3.5 sm:px-6 py-3 sm:py-4 border-b border-cafe-800 bg-[#241a13] flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5 sm:space-x-3.5 min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-orange-500/15 border border-orange-500/40 flex items-center justify-center text-gold-accent flex-shrink-0">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="font-display text-sm xs:text-base sm:text-xl font-bold text-white tracking-tight truncate">
                  Cafe Operations & Floor Management
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 truncate max-w-[140px] xs:max-w-none">
                  {authUser ? `Admin: ${authUser.email}` : isSupabaseConfigured ? 'Live Database Sync' : 'Manager Portal'}
                </span>
              </div>
              <p className="text-[11px] text-cafe-300 hidden sm:block mt-0.5">
                Manage table inventory, live seating turnover, reservations, artisanal menu & settings
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {!authUser && (
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-gold-accent/30 bg-gold-accent/10 text-gold-accent hover:text-white hover:bg-gold-accent/20 transition-all flex items-center gap-1 text-xs font-semibold cursor-pointer"
                title="Authenticate with Cloud Supabase Account"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cloud Auth</span>
              </button>
            )}
            {authUser && (
              <button
                type="button"
                onClick={handleSignOut}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-950/30 text-rose-300 hover:bg-rose-900/50 hover:text-white transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
                title="Sign Out of Cloud Supabase Account"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}
            {!isStandalone && (
              <button
                type="button"
                onClick={handleClose}
                title="Close Dashboard"
                className="p-1.5 sm:p-2 rounded-xl border border-cafe-700 bg-cafe-800 text-cafe-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Responsive Tab Navigation Bar */}
        <div className="px-3 sm:px-6 py-2 border-b border-cafe-800 bg-[#241a13] flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto max-w-full pb-1 sm:pb-0 scrollbar-none py-1">
            <button
              onClick={() => setActiveTab('tables')}
              className={`px-3 sm:px-4 py-2 rounded-xl font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap flex-shrink-0 text-xs ${
                activeTab === 'tables'
                  ? 'neu-gold-btn text-white font-bold shadow-md'
                  : 'bg-cafe-900/80 text-cafe-300 hover:text-white hover:bg-cafe-800 border border-cafe-700/60'
              }`}
            >
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="sm:hidden">Tables ({tables.length})</span>
              <span className="hidden sm:inline">Tables & Chairs ({tables.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('bookings')}
              className={`px-3 sm:px-4 py-2 rounded-xl font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap flex-shrink-0 text-xs ${
                activeTab === 'bookings'
                  ? 'neu-gold-btn text-white font-bold shadow-md'
                  : 'bg-cafe-900/80 text-cafe-300 hover:text-white hover:bg-cafe-800 border border-cafe-700/60'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="sm:hidden">Bookings ({bookings.length})</span>
              <span className="hidden sm:inline">Reservations ({bookings.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('menu')}
              className={`px-3 sm:px-4 py-2 rounded-xl font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap flex-shrink-0 text-xs ${
                activeTab === 'menu'
                  ? 'neu-gold-btn text-white font-bold shadow-md'
                  : 'bg-cafe-900/80 text-cafe-300 hover:text-white hover:bg-cafe-800 border border-cafe-700/60'
              }`}
            >
              <Utensils className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="sm:hidden">Menu ({menuItems?.length || 0})</span>
              <span className="hidden sm:inline">Menu Dishes ({menuItems?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('emails')}
              className={`px-3 sm:px-4 py-2 rounded-xl font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap flex-shrink-0 text-xs ${
                activeTab === 'emails'
                  ? 'neu-gold-btn text-white font-bold shadow-md'
                  : 'bg-cafe-900/80 text-cafe-300 hover:text-white hover:bg-cafe-800 border border-cafe-700/60'
              }`}
            >
              <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="sm:hidden">Logs ({emailLogs.length})</span>
              <span className="hidden sm:inline">Notification Logs ({emailLogs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 sm:px-4 py-2 rounded-xl font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap flex-shrink-0 text-xs ${
                activeTab === 'settings'
                  ? 'neu-gold-btn text-white font-bold shadow-md'
                  : 'bg-cafe-900/80 text-cafe-300 hover:text-white hover:bg-cafe-800 border border-cafe-700/60'
              }`}
            >
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Settings</span>
            </button>
          </div>

          <button
            onClick={() => {
              setIsResetAcknowledged(false);
              setShowResetConfirmModal(true);
            }}
            title="Restore default tables and clear local cache"
            className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-cafe-700 bg-cafe-900/80 text-cafe-300 hover:text-gold-accent hover:border-gold-accent/40 flex items-center justify-center gap-1.5 transition-all text-xs cursor-pointer flex-shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Layout</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6">
          {/* ================= TAB 1: TABLES & CHAIRS MANAGER ================= */}
          {activeTab === 'tables' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-display text-lg font-bold text-[#faf6f0]">
                    Table Inventory & Seating Capacities
                  </h4>
                  <p className="text-xs text-cafe-300">
                    Adjust seating capacity per table or toggle temporary maintenance status.
                  </p>
                </div>
                <button
                  onClick={() => setIsAddingTable(!isAddingTable)}
                  className="neu-gold-btn px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Table</span>
                </button>
              </div>

              {/* Add Table Modal / Inline Box */}
              {isAddingTable && (
                <form
                  onSubmit={handleAddTableSubmit}
                  className="p-4 rounded-2xl bg-cafe-900/90 border border-gold-accent/40 space-y-4"
                >
                  <div className="font-semibold text-xs text-gold-accent uppercase tracking-wider">
                    Add New Table to Floor Inventory
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-cafe-300 font-semibold mb-1 block">Table Identifier / Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Table T09"
                        value={newTableName}
                        onChange={(e) => setNewTableName(e.target.value)}
                        className="w-full glass-input rounded-xl px-3 py-2 text-xs text-cafe-100"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-cafe-300 font-semibold mb-1 block">Total Chair Capacity</label>
                      <input
                        type="number"
                        min={1}
                        max={16}
                        value={newTableCapacity}
                        onChange={(e) => setNewTableCapacity(Number(e.target.value))}
                        className="w-full glass-input rounded-xl px-3 py-2 text-xs text-cafe-100"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingTable(false)}
                      className="px-3 py-1.5 rounded-lg text-xs text-cafe-400 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg neu-gold-btn text-xs font-bold cursor-pointer"
                    >
                      Save Table
                    </button>
                  </div>
                </form>
              )}

              {/* Table List Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {tables.map((table) => {
                  const isMaintenance = table.status === 'maintenance';
                  const currentOccupant = getTableCurrentOccupant ? getTableCurrentOccupant(table.id) : null;
                  const isOccupied = Boolean(currentOccupant);

                  return (
                    <div
                      key={table.id}
                      className={`p-4 rounded-2xl transition-all border flex flex-col justify-between ${
                        isMaintenance
                          ? 'bg-cafe-900/60 border-cafe-800 opacity-75'
                          : isOccupied
                          ? 'bg-[#241710] border-gold-accent/50 shadow-[0_0_15px_rgba(196,136,77,0.15)]'
                          : 'bg-[#1e140e] border-cafe-800 hover:border-cafe-700'
                      }`}
                    >
                      <div>
                        {/* Top row: Table name, ID, and Status pill */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="font-bold text-base text-white flex items-center gap-2">
                              <span>{table.name}</span>
                              {isOccupied && (
                                <span className="w-2 h-2 rounded-full bg-gold-accent animate-ping" />
                              )}
                            </div>
                            <div className="text-[11px] text-cafe-300 font-mono">ID: {table.id}</div>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                              isMaintenance
                                ? 'bg-cafe-800 text-cafe-300 border border-cafe-700'
                                : isOccupied
                                ? 'bg-orange-500/20 text-gold-accent border border-orange-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            }`}
                          >
                            {isMaintenance ? 'Maintenance' : isOccupied ? 'Occupied' : 'Available'}
                          </span>
                        </div>

                        {/* If table is occupied right now, display occupant & Early Checkout button */}
                        {isOccupied && currentOccupant && (
                          <div className="my-2.5 p-3 rounded-xl bg-orange-950/40 border border-orange-500/40 text-xs space-y-1.5">
                            <div className="flex items-center justify-between text-white font-semibold">
                              <span className="truncate">{currentOccupant.customer_name}</span>
                              <span className="text-[10px] text-gold-accent font-mono">
                                Until {formatTime12h(currentOccupant.end_time)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-cafe-200">
                              <span>{currentOccupant.guest_count} Guests</span>
                              {currentOccupant.customer_phone && (
                                <a
                                  href={`tel:${currentOccupant.customer_phone}`}
                                  className="text-gold-accent hover:underline font-mono"
                                >
                                  {currentOccupant.customer_phone}
                                </a>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleFreeTableEarly(currentOccupant.id, table.name)}
                              className="mt-1.5 w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                              title="Customer left before end time? Click to free this table immediately for new guests."
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Customer Left (Free Table)</span>
                            </button>
                          </div>
                        )}

                        {/* Capacity / Chair Stepper */}
                        <div className="my-3 p-2.5 rounded-xl bg-cafe-900/90 border border-cafe-800 flex items-center justify-between">
                          <span className="text-xs text-cafe-200 font-medium">Chairs:</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleQuickCapacityChange(table.id, table.capacity - 1)}
                              disabled={table.capacity <= 1}
                              className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-cafe-800 hover:bg-cafe-700 active:bg-orange-600 text-base font-bold text-white border border-cafe-700 transition-all disabled:opacity-30 flex items-center justify-center cursor-pointer"
                              title="Decrease chair capacity"
                            >
                              -
                            </button>
                            <span className="font-mono font-bold text-gold-accent px-2 text-base">
                              {table.capacity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQuickCapacityChange(table.id, table.capacity + 1)}
                              disabled={table.capacity >= 16}
                              className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-cafe-800 hover:bg-cafe-700 active:bg-orange-600 text-base font-bold text-white border border-cafe-700 transition-all flex items-center justify-center cursor-pointer"
                              title="Increase chair capacity"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {!isOccupied && !isMaintenance && (
                          <div className="text-[11px] text-emerald-400 py-1">
                            ✓ Auto-ready for new customer bookings
                          </div>
                        )}
                        {isMaintenance && (
                          <div className="text-[11px] text-gold-accent/90 py-1 font-medium">
                            Blocked from customer booking map
                          </div>
                        )}
                      </div>

                      {/* Card Footer Actions */}
                      <div className="flex items-center justify-between pt-3 mt-2 border-t border-cafe-800/80 gap-2">
                        <button
                          type="button"
                          onClick={() => toggleTableMaintenance(table.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                            isMaintenance
                              ? 'bg-orange-500/20 text-gold-accent border border-orange-500/40 hover:bg-orange-500/30'
                              : 'bg-cafe-800/90 text-cafe-200 hover:text-white hover:bg-cafe-700 border border-cafe-700'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{isMaintenance ? 'Re-activate' : 'Maint.'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditTable(table)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gold-accent hover:text-white hover:bg-gold-accent/20 bg-gold-accent/10 border border-gold-accent/30 flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit Table</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Edit Table Modal */}
              {editingTable && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85">
                  <div className="neu-raised w-full max-w-md rounded-3xl border border-gold-accent/40 p-6 space-y-4 shadow-2xl">
                    <div className="flex items-center justify-between pb-3 border-b border-cafe-800">
                      <div className="flex items-center gap-2">
                        <Edit2 className="w-4 h-4 text-gold-accent" />
                        <h5 className="font-display text-base font-bold text-[#faf6f0]">
                          Edit Table {editingTable.id}
                        </h5>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingTable(null)}
                        className="p-1 rounded-lg text-cafe-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveEditTable} className="space-y-4">
                      <div>
                        <label className="text-xs text-cafe-300 font-semibold mb-1 block">
                          Table Name / Display Label *
                        </label>
                        <input
                          type="text"
                          required
                          value={editTableForm.name}
                          onChange={(e) => setEditTableForm({ ...editTableForm, name: e.target.value })}
                          className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-cafe-300 font-semibold mb-1 block">
                            Chair Capacity *
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="16"
                            required
                            value={editTableForm.capacity}
                            onChange={(e) => setEditTableForm({ ...editTableForm, capacity: Number(e.target.value) })}
                            className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-cafe-300 font-semibold mb-1 block">
                            Table Shape
                          </label>
                          <select
                            value={editTableForm.shape}
                            onChange={(e) => setEditTableForm({ ...editTableForm, shape: e.target.value })}
                            className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white cursor-pointer bg-espresso"
                          >
                            <option value="square" className="bg-espresso text-white">Square</option>
                            <option value="round" className="bg-espresso text-white">Round</option>
                            <option value="rectangle" className="bg-espresso text-white">Rectangle</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-cafe-300 font-semibold mb-1 block">
                          Description / Atmosphere
                        </label>
                        <textarea
                          rows={2}
                          value={editTableForm.description}
                          onChange={(e) => setEditTableForm({ ...editTableForm, description: e.target.value })}
                          placeholder="e.g. Sunny window seat with soft ambient morning glow."
                          className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white resize-none"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-cafe-800">
                        <button
                          type="button"
                          onClick={() => handleDeleteTable(editingTable.id)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-500/20 border border-rose-500/30 flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Table</span>
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingTable(null)}
                            className="px-3 py-1.5 rounded-xl text-xs text-cafe-400 hover:text-white transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isUpdatingTable}
                            className="px-4 py-1.5 rounded-xl neu-gold-btn text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                          >
                            {isUpdatingTable ? 'Saving...' : 'Save Table Changes'}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 2: BOOKINGS DASHBOARD ================= */}
          {activeTab === 'bookings' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-display text-lg font-bold text-[#faf6f0]">
                    Reservations Master Log
                  </h4>
                  <p className="text-xs text-cafe-300">
                    Filter by date, inspect customer contacts & manage attendance status.
                  </p>
                </div>

                {/* Filter buttons */}
                <div className="flex items-center gap-1.5 text-xs overflow-x-auto max-w-full pb-1 sm:pb-0 scrollbar-none">
                  <button
                    onClick={() => setBookingFilterDate('all')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all flex-shrink-0 ${
                      bookingFilterDate === 'all'
                        ? 'neu-gold-btn text-white font-bold shadow-md'
                        : 'bg-cafe-900/90 border border-cafe-700 text-cafe-300 hover:text-white hover:bg-cafe-800'
                    }`}
                  >
                    All ({bookings.length})
                  </button>
                  <button
                    onClick={() => setBookingFilterDate('today')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all flex-shrink-0 ${
                      bookingFilterDate === 'today'
                        ? 'neu-gold-btn text-white font-bold shadow-md'
                        : 'bg-cafe-900/90 border border-cafe-700 text-cafe-300 hover:text-white hover:bg-cafe-800'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setBookingFilterDate('tomorrow')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all flex-shrink-0 ${
                      bookingFilterDate === 'tomorrow'
                        ? 'neu-gold-btn text-white font-bold shadow-md'
                        : 'bg-cafe-900/90 border border-cafe-700 text-cafe-300 hover:text-white hover:bg-cafe-800'
                    }`}
                  >
                    Tomorrow
                  </button>
                </div>
              </div>

              {/* Automated Conflict / Overlap Banner */}
              {detectedConflicts.length > 0 && (
                <div className="p-4 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-rose-300">
                    <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span>Table Overlap Alert: Double-Booking Found</span>
                  </div>
                  <p className="leading-relaxed text-cafe-200">
                    The following reservations overlap on the same table. Complete or cancel one reservation to free the table:
                  </p>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    {detectedConflicts.map(({ b1, b2 }, idx) => (
                      <div key={idx} className="bg-black/50 p-2.5 rounded-xl border border-rose-500/20 flex items-center justify-between gap-2 flex-wrap">
                        <span>
                          <strong className="text-white">{b1.table_name || b1.table_id}</strong>: #{b1.id} ({b1.customer_name}, {formatTime12h(b1.start_time)}) overlaps #{b2.id} ({b2.customer_name}, {formatTime12h(b2.start_time)}) on {b1.booking_date}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bookings Table / Empty State View */}
              {filteredBookings.length === 0 ? (
                <div className="py-12 px-6 text-center neu-card rounded-2xl flex flex-col items-center justify-center my-4">
                  <div className="w-14 h-14 rounded-2xl neu-inset flex items-center justify-center text-gold-accent mb-3 shadow-neu-card">
                    <Calendar className="w-7 h-7" />
                  </div>
                  <h5 className="font-display text-base font-bold text-white mb-1">
                    No Reservations Recorded for {bookingFilterDate === 'all' ? 'Any Date' : bookingFilterDate === 'today' ? 'Today' : 'Tomorrow'}
                  </h5>
                  <p className="text-xs text-cafe-300 max-w-md mb-4 leading-relaxed">
                    Customer reservations submitted through the live website appear here instantly in real-time. You can also generate an interactive demonstration reservation.
                  </p>
                  <button
                    type="button"
                    onClick={handleCreateSampleBooking}
                    className="neu-gold-btn px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-neu-gold"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Generate Sample Reservation</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Mobile-Friendly Cards View (screens < sm) */}
                  <div className="block sm:hidden space-y-3">
                    {filteredBookings.map((b) => (
                      <div key={b.id} className="p-4 rounded-2xl neu-card border border-cafe-700/60 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-bold text-gold-accent text-xs">#{b.id}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              b.status === 'confirmed'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : b.status === 'completed'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                : b.status === 'cancelled'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            {b.status}
                          </span>
                        </div>

                        <div>
                          <div className="font-bold text-white text-sm">{b.customer_name}</div>
                          <div className="text-[11px] text-cafe-400 flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                            <a href={`mailto:${b.customer_email}`} className="text-cafe-300 hover:text-gold-accent hover:underline">
                              {b.customer_email}
                            </a>
                            {b.customer_phone && (
                              <a href={`tel:${b.customer_phone}`} className="text-cafe-300 hover:text-gold-accent hover:underline">
                                • {b.customer_phone}
                              </a>
                            )}
                          </div>
                          {b.special_notes && (
                            <div className="text-[10px] text-orange-300/90 italic mt-1 bg-orange-950/20 p-1.5 rounded-lg border border-orange-500/20">
                              "{b.special_notes}"
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl neu-tray text-xs">
                          <div>
                            <span className="text-cafe-400 text-[10px] block">Table & Guests</span>
                            <span className="font-semibold text-white">{b.table_name || b.table_id} ({b.guest_count} Guests)</span>
                          </div>
                          <div>
                            <span className="text-cafe-400 text-[10px] block">Date & Time</span>
                            <span className="font-mono text-cafe-200 text-[11px] flex items-center gap-1.5 flex-wrap">
                              <span>{b.booking_date}</span>
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-cafe-800/80 text-cafe-200 border border-cafe-700/60">
                                {formatTime12h(b.start_time)}
                              </span>
                            </span>
                          </div>
                        </div>

                        {b.status === 'confirmed' && (
                          <div className="flex items-center gap-2 pt-1 border-t border-cafe-800">
                            <button
                              type="button"
                              onClick={() => {
                                updateBookingStatus(b.id, 'completed');
                                triggerToast(`Booking #${b.id} completed! Table freed.`);
                              }}
                              className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-all text-center flex items-center justify-center gap-1 shadow-md"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Complete (Free Table)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                updateBookingStatus(b.id, 'cancelled');
                                triggerToast(`Booking #${b.id} cancelled. Table freed.`);
                              }}
                              className="px-3 py-2 rounded-xl border border-rose-500/30 bg-rose-950/30 text-rose-300 hover:bg-rose-900/50 hover:text-white text-xs font-semibold cursor-pointer transition-all text-center"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Tablet & Desktop Table View (screens >= sm) */}
                  <div className="hidden sm:block overflow-x-auto rounded-2xl border border-cafe-700/60 neu-tray scrollbar-none">
                    <table className="w-full text-left text-xs text-cafe-200" style={{ minWidth: '700px' }}>
                      <thead className="bg-[#241a13] text-[11px] font-semibold uppercase tracking-wider text-cafe-400 border-b border-cafe-700/60">
                        <tr>
                          <th className="py-3 px-4">Ref #</th>
                          <th className="py-3 px-4">Customer</th>
                          <th className="py-3 px-4">Table</th>
                          <th className="py-3 px-4">Date & Time</th>
                          <th className="py-3 px-4">Guests</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-cafe-800/60">
                        {filteredBookings.map((b) => (
                          <tr key={b.id} className="hover:bg-cafe-900/40 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-gold-accent">
                              #{b.id}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-white">{b.customer_name}</div>
                              <div className="text-[11px] text-cafe-400 flex items-center gap-1.5 flex-wrap">
                                <a href={`mailto:${b.customer_email}`} className="hover:text-gold-accent hover:underline">
                                  {b.customer_email}
                                </a>
                                {b.customer_phone && (
                                  <a href={`tel:${b.customer_phone}`} className="hover:text-gold-accent hover:underline">
                                    • {b.customer_phone}
                                  </a>
                                )}
                              </div>
                              {b.special_notes && (
                                <div className="text-[10px] text-orange-300/90 italic mt-0.5">"{b.special_notes}"</div>
                              )}
                            </td>
                            <td className="py-3 px-4 font-medium text-cafe-100">
                              {b.table_name || b.table_id}
                            </td>
                            <td className="py-3 px-4 font-mono">
                              <div className="font-semibold text-white">{b.booking_date}</div>
                              <div className="mt-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-cafe-800/80 text-cafe-200 border border-cafe-700/60 font-mono">
                                  {formatTime12h(b.start_time)} – {formatTime12h(b.end_time)}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-semibold text-white">
                              {b.guest_count} P
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  b.status === 'confirmed'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : b.status === 'completed'
                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                    : b.status === 'cancelled'
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                    : 'bg-neutral-800 text-neutral-400'
                                }`}
                              >
                                {b.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right space-x-1.5">
                              {b.status === 'confirmed' && (
                                <>
                                  <button
                                    onClick={() => {
                                      updateBookingStatus(b.id, 'completed');
                                      triggerToast(`Booking #${b.id} completed! Table freed.`);
                                    }}
                                    title="Mark Completed / Free Table"
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600 hover:text-white active:bg-emerald-800 text-[10px] font-bold cursor-pointer transition-all inline-flex items-center gap-1"
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Complete (Free Table)</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      updateBookingStatus(b.id, 'cancelled');
                                      triggerToast(`Booking #${b.id} cancelled. Table freed.`);
                                    }}
                                    title="Cancel Reservation"
                                    className="px-2.5 py-1 rounded-lg border border-rose-500/30 bg-rose-950/30 text-rose-300 hover:bg-rose-900/50 hover:text-white active:bg-rose-800 text-[10px] font-semibold cursor-pointer transition-all"
                                  >
                                    Cancel
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ================= TAB 3: MENU DISHES & CATALOG MANAGER ================= */}
          {activeTab === 'menu' && (
            <div className="space-y-6">
              {/* Header bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-display text-lg font-bold text-[#faf6f0] flex items-center gap-2">
                    <span>Artisanal Menu & Dish Management</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gold-accent/20 text-gold-accent border border-gold-accent/30 flex items-center gap-1">
                      <IndianRupee className="w-3 h-3" />
                      <span>INR (₹) Standard</span>
                    </span>
                  </h4>
                  <p className="text-xs text-cafe-300">
                    Add new culinary dishes, set prices in Indian Rupees (₹), upload dish photos, and assign menu categories.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingDish(!isAddingDish)}
                  className="neu-gold-btn px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAddingDish ? 'Close Form' : 'Add New Dish'}</span>
                </button>
              </div>

              {/* Success Alert */}
              {dishSavedSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 animate-scale-up">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>New dish successfully added to menu catalog in Indian Rupees (₹) and synchronized!</span>
                </div>
              )}

              {/* Add Dish Form */}
              {isAddingDish && (
                <form
                  onSubmit={handleAddDishSubmit}
                  className="p-5 rounded-2xl bg-cafe-900/95 border border-gold-accent/40 shadow-xl space-y-4 animate-scale-up"
                >
                  <div className="flex items-center justify-between border-b border-cafe-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Utensils className="w-4 h-4 text-gold-accent" />
                      <span className="font-semibold text-xs text-gold-accent uppercase tracking-wider">
                        Add New Dish to Menu
                      </span>
                    </div>
                    <span className="text-[11px] text-cafe-400">All fields with * are required</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Dish Name */}
                    <div className="lg:col-span-1">
                      <label className="text-xs text-cafe-300 font-semibold mb-1 block">
                        Dish Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Saffron Cardamom Latte"
                        value={dishForm.name}
                        onChange={(e) => setDishForm({ ...dishForm, name: e.target.value })}
                        className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white placeholder-cafe-500 focus:border-gold-accent"
                      />
                    </div>

                    {/* Category Dropdown */}
                    <div>
                      <label className="text-xs text-cafe-300 font-semibold mb-1 block">
                        Category *
                      </label>
                      <select
                        value={dishForm.category}
                        onChange={(e) => setDishForm({ ...dishForm, category: e.target.value })}
                        className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white cursor-pointer bg-espresso focus:border-gold-accent"
                      >
                        {DEFAULT_MENU_CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                          <option key={cat.id} value={cat.id} className="bg-espresso text-white">
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Price in INR */}
                    <div>
                      <label className="text-xs text-cafe-300 font-semibold mb-1 flex items-center justify-between">
                        <span>Price (Indian Rupee - ₹) *</span>
                        <span className="text-[10px] text-gold-accent font-mono font-bold">INR (₹)</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gold-accent font-bold text-sm">
                          ₹
                        </span>
                        <input
                          type="number"
                          required
                          min="1"
                          step="1"
                          placeholder="280"
                          value={dishForm.price}
                          onChange={(e) => setDishForm({ ...dishForm, price: e.target.value })}
                          className="w-full glass-input rounded-xl pl-8 pr-3 py-2 text-xs text-white font-mono placeholder-cafe-500 focus:border-gold-accent"
                        />
                      </div>
                    </div>

                    {/* Highlight Badge */}
                    <div>
                      <label className="text-xs text-cafe-300 font-semibold mb-1 flex items-center gap-1">
                        <Tag className="w-3 h-3 text-gold-accent" />
                        <span>Special Badge / Highlight (Optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Chef's Special, Bestseller, Freshly Baked"
                        value={dishForm.badge}
                        onChange={(e) => setDishForm({ ...dishForm, badge: e.target.value })}
                        className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white placeholder-cafe-500 focus:border-gold-accent"
                      />
                    </div>

                    {/* Description */}
                    <div className="sm:col-span-2">
                      <label className="text-xs text-cafe-300 font-semibold mb-1 block">
                        Dish Description & Ingredients
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Artisanal double shot roast infused with cardamom, steamed whole milk, topped with crushed pistachio."
                        value={dishForm.description}
                        onChange={(e) => setDishForm({ ...dishForm, description: e.target.value })}
                        className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white placeholder-cafe-500 focus:border-gold-accent"
                      />
                    </div>
                  </div>

                  {/* Dish Picture Upload Section */}
                  <div className="p-4 rounded-xl bg-cafe-950/70 border border-cafe-800 space-y-3">
                    <label className="text-xs text-cafe-200 font-semibold flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-gold-accent" />
                      <span>Dish Photo / Image *</span>
                    </label>

                    {/* Quick Signature Presets */}
                    <div className="space-y-1.5 pb-2 border-b border-cafe-800/60">
                      <span className="text-[11px] text-cafe-300 font-semibold block">
                        Quick Select Signature Dish Photo:
                      </span>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {SIGNATURE_DISH_PRESETS.map((preset) => (
                          <button
                            key={preset.image}
                            type="button"
                            onClick={() => {
                              setDishForm((prev) => ({ ...prev, image: preset.image }));
                              setImagePreviewError(false);
                            }}
                            className={`group rounded-xl overflow-hidden border p-1 text-left transition-all cursor-pointer ${
                              dishForm.image === preset.image
                                ? 'border-gold-accent bg-gold-accent/15 ring-2 ring-gold-accent/40 shadow-glow'
                                : 'border-cafe-700/80 bg-cafe-900/60 hover:border-gold-accent/50 text-cafe-200'
                            }`}
                          >
                            <img src={preset.image} alt={preset.name} className="w-full h-12 object-cover rounded-lg" />
                            <span className="block text-[9px] text-cafe-200 truncate mt-1 text-center font-medium">
                              {preset.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                      {/* Upload File Input & URL */}
                      <div className="md:col-span-2 space-y-2">
                        <div className="flex items-center gap-3">
                          <label className="px-4 py-2.5 rounded-xl bg-cafe-800 hover:bg-cafe-700 border border-gold-accent/40 text-gold-accent text-xs font-semibold cursor-pointer flex items-center gap-2 transition-colors">
                            <Upload className="w-4 h-4" />
                            <span>Choose Photo from Device</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageFileUpload}
                              className="hidden"
                            />
                          </label>
                          <span className="text-[11px] text-cafe-400">or enter image URL below</span>
                        </div>

                        <input
                          type="text"
                          placeholder="/images/menu/cortado.jpg or image URL"
                          value={dishForm.image}
                          onChange={(e) => {
                            setDishForm({ ...dishForm, image: e.target.value });
                            setImagePreviewError(false);
                          }}
                          className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white placeholder-cafe-500 font-mono"
                        />
                      </div>

                      {/* Live Image Preview */}
                      <div className="flex items-center justify-center">
                        <div className="relative w-32 h-24 rounded-xl overflow-hidden border border-gold-accent/40 bg-black/40 flex items-center justify-center">
                          {dishForm.image && !imagePreviewError ? (
                            <>
                              <img
                                src={dishForm.image}
                                alt="Dish preview"
                                onError={() => setImagePreviewError(true)}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => setDishForm({ ...dishForm, image: '' })}
                                title="Remove image"
                                className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-red-400 hover:text-red-300"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <div className="text-center p-2 text-cafe-500 flex flex-col items-center">
                              <ImageIcon className="w-6 h-6 mb-1 text-cafe-600" />
                              <span className="text-[10px]">Photo Preview</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submit / Cancel Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingDish(false)}
                      className="px-4 py-2 rounded-xl text-cafe-400 hover:text-white hover:bg-cafe-800 text-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl neu-gold-btn text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Dish to Menu (₹)</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Category Filter Chips */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {DEFAULT_MENU_CATEGORIES.map((cat) => {
                  const count =
                    cat.id === 'all'
                      ? (menuItems || []).length
                      : (menuItems || []).filter((item) => item.category === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setMenuFilterCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        menuFilterCategory === cat.id
                          ? 'neu-gold-btn text-white font-bold shadow-md'
                          : 'bg-cafe-900/90 border border-cafe-700 text-cafe-300 hover:text-white hover:bg-cafe-800'
                      }`}
                    >
                      <span>{cat.name}</span>
                      <span className="ml-1.5 text-[10px] opacity-75">({count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Dishes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(menuItems || [])
                  .filter((item) => menuFilterCategory === 'all' || item.category === menuFilterCategory)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl p-4 bg-[#1e140e] border border-cafe-800 flex flex-col justify-between space-y-3 hover:border-gold-accent/40 transition-colors"
                    >
                      <div className="flex gap-3">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 border border-cafe-700 bg-cafe-900 relative">
                          <img
                            src={item.image || '/images/hero.jpg'}
                            alt={item.name}
                            className="w-full h-full object-cover hover:scale-105 transition-transform"
                          />
                          {item.badge && (
                            <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[8px] font-bold text-gold-accent uppercase">
                              {item.badge}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <h5 className="font-display text-sm font-bold text-white truncate" title={item.name}>
                              {item.name}
                            </h5>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cafe-800 text-cafe-300 capitalize">
                              {item.category}
                            </span>
                            <span
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                item.is_available !== false
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {item.is_available !== false ? 'Available' : 'Sold Out'}
                            </span>
                          </div>
                          <div className="text-gold-accent font-mono font-bold text-base mt-1.5">
                            ₹ {item.price}
                          </div>
                        </div>
                      </div>

                      {item.description && (
                        <p className="text-[11px] text-cafe-300 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}

                      <div className="pt-2 border-t border-cafe-800 flex items-center justify-between text-xs gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            toggleMenuItemAvailability(item.id);
                            triggerToast(`"${item.name}" availability updated.`);
                          }}
                          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer border ${
                            item.is_available !== false
                              ? 'bg-cafe-800 text-cafe-200 hover:text-white hover:bg-cafe-700 border-cafe-700'
                              : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                          }`}
                        >
                          {item.is_available !== false ? 'Mark Sold Out' : 'Mark Available'}
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditDish(item)}
                            title="Edit dish details & photo"
                            className="px-2.5 py-1.5 rounded-xl text-gold-accent hover:text-white hover:bg-gold-accent/20 bg-gold-accent/10 border border-gold-accent/30 active:scale-95 transition-all cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit Dish</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete "${item.name}" from the menu?`)) {
                                deleteMenuItem(item.id);
                                triggerToast(`"${item.name}" deleted.`);
                              }
                            }}
                            title="Delete dish"
                            className="p-1.5 rounded-xl text-cafe-400 hover:text-rose-400 hover:bg-rose-500/15 border border-cafe-700 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Edit Dish Modal */}
              {editingDish && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 overflow-y-auto">
                  <div className="neu-raised w-full max-w-2xl rounded-3xl border border-gold-accent/40 p-5 sm:p-6 space-y-4 shadow-2xl my-8">
                    <div className="flex items-center justify-between pb-3 border-b border-cafe-800">
                      <div className="flex items-center gap-2">
                        <Edit2 className="w-4 h-4 text-gold-accent" />
                        <h5 className="font-display text-base font-bold text-[#faf6f0]">
                          Edit Dish: {editingDish.name}
                        </h5>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingDish(null)}
                        className="p-1 rounded-lg text-cafe-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveEditDish} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {/* Dish Name */}
                        <div>
                          <label className="text-xs text-cafe-300 font-semibold mb-1 block">
                            Dish Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={editDishForm.name}
                            onChange={(e) => setEditDishForm({ ...editDishForm, name: e.target.value })}
                            className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white"
                          />
                        </div>

                        {/* Category Dropdown */}
                        <div>
                          <label className="text-xs text-cafe-300 font-semibold mb-1 block">
                            Category *
                          </label>
                          <select
                            value={editDishForm.category}
                            onChange={(e) => setEditDishForm({ ...editDishForm, category: e.target.value })}
                            className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white cursor-pointer bg-espresso"
                          >
                            {DEFAULT_MENU_CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                              <option key={cat.id} value={cat.id} className="bg-espresso text-white">
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Price (INR ₹) */}
                        <div>
                          <label className="text-xs text-cafe-300 font-semibold mb-1 flex items-center justify-between">
                            <span>Price (₹) *</span>
                            <span className="text-[10px] text-gold-accent font-mono font-bold">INR</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gold-accent font-bold text-xs">
                              ₹
                            </span>
                            <input
                              type="number"
                              required
                              min="1"
                              step="1"
                              value={editDishForm.price}
                              onChange={(e) => setEditDishForm({ ...editDishForm, price: e.target.value })}
                              className="w-full glass-input rounded-xl pl-7 pr-3 py-2 text-xs text-white font-mono"
                            />
                          </div>
                        </div>

                        {/* Badge */}
                        <div>
                          <label className="text-xs text-cafe-300 font-semibold mb-1 flex items-center gap-1">
                            <Tag className="w-3 h-3 text-gold-accent" />
                            <span>Badge (Optional)</span>
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Signature Dish"
                            value={editDishForm.badge}
                            onChange={(e) => setEditDishForm({ ...editDishForm, badge: e.target.value })}
                            className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white"
                          />
                        </div>

                        {/* Description */}
                        <div className="sm:col-span-2">
                          <label className="text-xs text-cafe-300 font-semibold mb-1 block">
                            Description & Ingredients
                          </label>
                          <input
                            type="text"
                            value={editDishForm.description}
                            onChange={(e) => setEditDishForm({ ...editDishForm, description: e.target.value })}
                            className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white"
                          />
                        </div>
                      </div>

                      {/* Photo Section with Presets */}
                      <div className="p-4 rounded-xl bg-cafe-950/70 border border-cafe-800 space-y-3">
                        <label className="text-xs text-cafe-200 font-semibold flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-gold-accent" />
                          <span>Dish Photo Selection *</span>
                        </label>

                        {/* Quick Signature Presets */}
                        <div className="space-y-1.5 pb-2 border-b border-cafe-800/60">
                          <span className="text-[11px] text-cafe-300 font-semibold block">
                            Quick Select Signature Dish Photo:
                          </span>
                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            {SIGNATURE_DISH_PRESETS.map((preset) => (
                              <button
                                key={preset.image}
                                type="button"
                                onClick={() => {
                                  setEditDishForm((prev) => ({ ...prev, image: preset.image }));
                                  setEditDishImagePreviewError(false);
                                }}
                                className={`group rounded-xl overflow-hidden border p-1 text-left transition-all cursor-pointer ${
                                  editDishForm.image === preset.image
                                    ? 'border-gold-accent bg-gold-accent/15 ring-2 ring-gold-accent/40 shadow-glow'
                                    : 'border-cafe-700/80 bg-cafe-900/60 hover:border-gold-accent/50 text-cafe-200'
                                }`}
                              >
                                <img src={preset.image} alt={preset.name} className="w-full h-12 object-cover rounded-lg" />
                                <span className="block text-[9px] text-cafe-200 truncate mt-1 text-center font-medium">
                                  {preset.name}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                          <div className="md:col-span-2 space-y-2">
                            <div className="flex items-center gap-3">
                              <label className="px-4 py-2 rounded-xl bg-cafe-800 hover:bg-cafe-700 border border-gold-accent/40 text-gold-accent text-xs font-semibold cursor-pointer flex items-center gap-2 transition-colors">
                                <Upload className="w-4 h-4" />
                                <span>Choose New Photo</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleEditDishImageFileUpload}
                                  className="hidden"
                                />
                              </label>
                              <span className="text-[11px] text-cafe-400">or enter image URL below</span>
                            </div>

                            <input
                              type="text"
                              placeholder="/images/menu/cortado.jpg or image URL"
                              value={editDishForm.image}
                              onChange={(e) => {
                                setEditDishForm({ ...editDishForm, image: e.target.value });
                                setEditDishImagePreviewError(false);
                              }}
                              className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white placeholder-cafe-500 font-mono"
                            />
                          </div>

                          <div className="flex items-center justify-center">
                            <div className="relative w-32 h-24 rounded-xl overflow-hidden border border-gold-accent/40 bg-black/40 flex items-center justify-center">
                              {editDishForm.image && !editDishImagePreviewError ? (
                                <img
                                  src={editDishForm.image}
                                  alt="Dish preview"
                                  onError={() => setEditDishImagePreviewError(true)}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="text-center p-2 text-cafe-500 flex flex-col items-center">
                                  <ImageIcon className="w-6 h-6 mb-1 text-cafe-600" />
                                  <span className="text-[10px]">Photo Preview</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Availability toggle */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-cafe-900 border border-cafe-800">
                        <div>
                          <span className="text-xs font-semibold text-white block">Availability Status</span>
                          <span className="text-[11px] text-cafe-400">Choose whether customers can view and order this dish</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditDishForm({ ...editDishForm, is_available: !editDishForm.is_available })}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                            editDishForm.is_available
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          }`}
                        >
                          {editDishForm.is_available ? 'Available' : 'Sold Out'}
                        </button>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-cafe-800">
                        <button
                          type="button"
                          onClick={() => setEditingDish(null)}
                          className="px-4 py-2 rounded-xl text-xs text-cafe-400 hover:text-white transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isUpdatingDish}
                          className="px-5 py-2 rounded-xl neu-gold-btn text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {isUpdatingDish ? 'Updating...' : 'Save Dish Changes'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 4: EMAIL NOTIFICATION LOGS ================= */}
          {activeTab === 'emails' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-display text-lg font-bold text-[#faf6f0]">
                    2-Way Email Notification Dispatch Logs
                  </h4>
                  <p className="text-xs text-cafe-300">
                    Every reservation automatically triggers both customer confirmation and cafe owner alerts.
                  </p>
                </div>
              </div>

              {emailLogs.length === 0 ? (
                <div className="py-12 px-6 text-center neu-card rounded-2xl flex flex-col items-center justify-center my-4">
                  <div className="w-14 h-14 rounded-2xl neu-inset flex items-center justify-center text-gold-accent mb-3 shadow-neu-card">
                    <Mail className="w-7 h-7" />
                  </div>
                  <h5 className="font-display text-base font-bold text-white mb-1">
                    No Transactional Email Logs Yet
                  </h5>
                  <p className="text-xs text-cafe-300 max-w-md leading-relaxed">
                    Whenever reservations are booked or confirmed, 2-way email dispatch records (Customer Confirmation and Cafe Owner Notification) are queued and recorded here with delivery timestamps.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {emailLogs.map((log, idx) => (
                    <div
                      key={`${log.id || 'email-log'}-${idx}`}
                      className="p-3.5 rounded-xl neu-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl neu-inset text-gold-accent">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              log.recipient_type === 'customer'
                                ? 'bg-blue-900/40 text-blue-300 border border-blue-700/40'
                                : 'bg-orange-950/50 text-orange-300 border border-orange-700/40'
                            }`}>
                              {log.recipient_type}
                            </span>
                            <span className="font-semibold text-white">{log.subject}</span>
                          </div>
                          <div className="text-[11px] text-cafe-400 mt-0.5">
                            Recipient: <a href={`mailto:${log.recipient_email}`} className="font-mono text-cafe-200 hover:text-gold-accent hover:underline">{log.recipient_email}</a> • Ref #{log.booking_id}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-cafe-400 font-mono">
                          {log.submitted_at
                            ? new Date(log.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : log.status === 'queued'
                            ? 'Queued'
                            : log.status === 'unconfigured'
                            ? 'Local Stored'
                            : 'Just now'}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${
                            log.status === 'failed'
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                              : log.status === 'queued'
                              ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                              : log.status === 'unconfigured'
                              ? 'bg-cafe-800 text-cafe-300 border-cafe-700'
                              : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {log.status === 'submitted'
                            ? 'Submitted'
                            : log.status === 'queued'
                            ? 'Queued'
                            : log.status === 'unconfigured'
                            ? 'Unconfigured'
                            : log.status === 'failed'
                            ? 'Failed'
                            : 'Recorded'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 4: CAFE SETTINGS ================= */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettings} className="space-y-5 max-w-2xl">
              <div>
                <h4 className="font-display text-lg font-bold text-[#faf6f0]">
                  Global Cafe & Reservation Settings
                </h4>
                <p className="text-xs text-cafe-300">
                  Update cafe identity, operating hours, and cleaning buffer parameters.
                </p>
              </div>

              {settingsSavedMessage && (
                <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>Cafe settings successfully updated and broadcasted!</span>
                </div>
              )}

              {settingsErrorMessage && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{settingsErrorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-cafe-300 font-semibold mb-1 block">Cafe Name</label>
                  <input
                    type="text"
                    value={settingsForm.name ?? ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-cafe-300 font-semibold mb-1 block">Owner Notification Email</label>
                  <input
                    type="email"
                    value={settingsForm.owner_email ?? ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, owner_email: e.target.value })}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-cafe-300 font-semibold mb-1 block">Opening Time</label>
                  <input
                    type="time"
                    value={settingsForm.opening_time ?? ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, opening_time: e.target.value })}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-cafe-300 font-semibold mb-1 block">Closing Time</label>
                  <input
                    type="time"
                    value={settingsForm.closing_time ?? ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, closing_time: e.target.value })}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-cafe-300 font-semibold mb-1 block">Table Seating Policy</label>
                  <div className="w-full glass-input rounded-xl px-3 py-2 text-xs text-amber-200/90 bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                    <span className="font-medium">Dedicated Table Reservation</span>
                    <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">100% Private</span>
                  </div>
                  <p className="text-[11px] text-cafe-400 mt-1">Each booking reserves the complete table privately for the customer party. Shared seating between strangers is disabled.</p>
                </div>

                <div>
                  <label className="text-xs text-cafe-300 font-semibold mb-1 block">Cleaning / Turnover Buffer (Mins)</label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={settingsForm.cleaning_buffer ?? 15}
                    onChange={(e) => setSettingsForm({ ...settingsForm, cleaning_buffer: Number(e.target.value) })}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-cafe-300 font-semibold mb-1 block">Contact Phone</label>
                  <input
                    type="text"
                    value={settingsForm.phone ?? ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-cafe-300 font-semibold mb-1 block">Currency Symbol</label>
                  <input
                    type="text"
                    value={settingsForm.currency ?? '₹'}
                    onChange={(e) => setSettingsForm({ ...settingsForm, currency: e.target.value })}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white font-mono"
                    placeholder="₹"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-cafe-300 font-semibold mb-1 block">Physical Address & Landmark</label>
                <input
                  type="text"
                  value={settingsForm.address ?? ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingSettings}
                className="neu-gold-btn px-6 py-2.5 rounded-xl text-xs font-bold shadow-neu-gold disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingSettings ? 'Saving Settings...' : 'Save Cafe Parameters'}</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Optional Cloud Supabase Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85">
          <div className="neu-raised w-full max-w-md rounded-3xl p-6 sm:p-8 animate-scale-up border border-gold-accent/30 shadow-neu-raised">
            <div className="flex items-center justify-between pb-4 border-b border-cafe-700/60 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gold-accent/20 border border-gold-accent/40 flex items-center justify-center text-gold-accent">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-white">Cloud Admin Login</h3>
                  <p className="text-[11px] text-cafe-300">Authenticate with Supabase account</p>
                </div>
              </div>
              <button
                onClick={() => setShowAuthModal(false)}
                className="p-1.5 rounded-lg neu-btn-secondary text-cafe-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {authError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {authSuccessMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{authSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSupabaseLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-cafe-300 mb-1">
                  Administrator Email
                </label>
                <input
                  type="email"
                  placeholder="admin@lauracafe.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full neu-inset rounded-xl px-3.5 py-2 text-xs text-cafe-100"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-cafe-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full neu-inset rounded-xl px-3.5 py-2 text-xs text-cafe-100"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="neu-btn-secondary px-4 py-2 rounded-xl text-xs text-cafe-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAuth}
                  className="neu-gold-btn px-5 py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingAuth ? 'Signing in...' : 'Sign In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Layout Confirmation Modal with Mandatory Acknowledgment Checkbox */}
      {showResetConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-scale-up"
          onClick={() => setShowResetConfirmModal(false)}
        >
          <div
            className="neu-raised w-full max-w-lg rounded-3xl border border-rose-500/40 bg-[#241a13] p-5 sm:p-7 shadow-2xl space-y-5 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-cafe-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-400 flex-shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-display text-base sm:text-lg font-bold text-white">
                    Confirm Factory Layout Reset
                  </h4>
                  <p className="text-[11px] text-cafe-300">
                    Review the changes that will be applied to your cafe workspace
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="text-cafe-400 hover:text-white p-1.5 rounded-lg hover:bg-cafe-800 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List of exact changes */}
            <div className="space-y-3 bg-cafe-950/70 p-4 rounded-2xl border border-cafe-800 text-xs text-cafe-200">
              <p className="font-semibold text-rose-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>Resetting the layout will apply the following changes:</span>
              </p>
              <ul className="space-y-2 text-cafe-300 pl-1">
                <li className="flex items-start gap-2">
                  <span className="text-gold-accent font-bold">•</span>
                  <span><strong>Tables & Chairs:</strong> Restores all 8 original tables (T01–T08) to factory default names, shapes, and seating capacities (2, 4, 6, 8 chairs).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gold-accent font-bold">•</span>
                  <span><strong>Maintenance Status:</strong> Clears any active maintenance locks, setting all tables to active.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gold-accent font-bold">•</span>
                  <span><strong>Operating Parameters:</strong> Restores standard operating hours (8:00 AM – 11:00 PM), 90-min duration, and 15-min cleaning buffer.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gold-accent font-bold">•</span>
                  <span><strong>Artisanal Menu:</strong> Resets all 6 signature dishes to default descriptions, pricing, and high-res photos.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong>Customer Bookings:</strong> Cloud reservations remain safely stored in your database; only the floor layout configuration is refreshed.</span>
                </li>
              </ul>
            </div>

            {/* Confirmation Checkbox */}
            <label className="flex items-start gap-3 p-3 rounded-xl bg-cafe-900/60 border border-cafe-700/60 cursor-pointer hover:border-gold-accent/50 transition-colors select-none">
              <input
                type="checkbox"
                checked={isResetAcknowledged}
                onChange={(e) => setIsResetAcknowledged(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-gold-accent bg-cafe-950 border-cafe-700 focus:ring-gold-accent focus:ring-offset-0 cursor-pointer accent-amber-500"
              />
              <span className="text-xs text-cafe-200 leading-snug">
                I understand and acknowledge that resetting the layout will overwrite any custom table names, capacities, and settings.
              </span>
            </label>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-cafe-300 hover:text-white hover:bg-cafe-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!isResetAcknowledged}
                onClick={() => {
                  if (!isResetAcknowledged) return;
                  resetToDefaultData();
                  setShowResetConfirmModal(false);
                  triggerToast('Floor plan and default layout restored successfully!');
                }}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md ${
                  isResetAcknowledged
                    ? 'bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white cursor-pointer shadow-rose-950/50'
                    : 'bg-cafe-800 text-cafe-500 border border-cafe-700/50 cursor-not-allowed opacity-60'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Confirm Reset Layout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Admin Toast Feedback */}
      {adminToast && (
        <div className="fixed bottom-5 sm:bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 z-[9999] flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#241a13] border border-gold-accent text-white shadow-2xl animate-scale-up text-xs font-semibold whitespace-nowrap">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{adminToast}</span>
        </div>
      )}
    </div>
  );
}
