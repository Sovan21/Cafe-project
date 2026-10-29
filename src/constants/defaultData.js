// Default mock & seed data for L'Aura Cafe & Artisanal Roastery

export const DEFAULT_CAFE_SETTINGS = {
  name: "L'Aura Cafe & Roastery",
  tagline: "Artisan Coffee, Culinary Brunch & Ambient Living",
  address: "Plot 14, Park Street Heritage Area, Kolkata 700016",
  landmark: "Near Camac Street Crossing, Level 1",
  phone: "+91 33 2229 1840",
  owner_email: "",
  owner_email_configured: false,
  opening_time: "08:00",
  closing_time: "23:00",
  default_duration: 90, // minutes
  cleaning_buffer: 15, // minutes
  seating_mode: "exclusive_table", // 100% Dedicated Table Reservation Policy
  timezone: "Asia/Kolkata",
  currency: "₹",
  instagram: "@laura.roastery",
  facebook: "fb.com/lauracaferoastery"
};

export const DEFAULT_TABLES = [
  { id: 'T01', name: 'The Sunlit Alcove', capacity: 2, status: 'active', shape: 'round', description: 'Cozy window-side table bathed in soft natural morning light.' },
  { id: 'T02', name: 'The Pendant Hearth', capacity: 4, status: 'active', shape: 'square', description: 'Central dining table beneath an artisan hand-blown brass pendant.' },
  { id: 'T03', name: 'The Barista Quarter', capacity: 4, status: 'active', shape: 'square', description: 'Front-row table adjacent to our custom espresso brew bar.' },
  { id: 'T04', name: 'The Garden Conservatory', capacity: 6, status: 'active', shape: 'rectangle', description: 'Spacious solid oak dining table bordered by lush living botanicals.' },
  { id: 'T05', name: 'The Library Nook', capacity: 2, status: 'active', shape: 'round', description: 'Intimate quiet table with warm ambient reading spotlight.' },
  { id: 'T06', name: 'The Gallery Quad', capacity: 4, status: 'active', shape: 'square', description: 'Contemporary dining table set beneath curated heritage artwork.' },
  { id: 'T07', name: 'The Grand Oak Banquet', capacity: 8, status: 'active', shape: 'rectangle', description: 'Executive party table crafted for celebratory brunch and tasting feasts.' },
  { id: 'T08', name: 'The Terrace High-Top', capacity: 2, status: 'active', shape: 'round', description: 'Elevated bistro high-top capturing natural breeze.' }
];

export const DEFAULT_MENU_CATEGORIES = [
  { id: 'all', name: 'All Specialties' },
  { id: 'coffee', name: 'Artisan Roastery' },
  { id: 'brunch', name: 'Signature Brunch' },
  { id: 'bakery', name: 'French Bakery' },
  { id: 'desserts', name: 'Decadent Desserts' }
];

export const DEFAULT_MENU_ITEMS = [
  {
    id: 'm1',
    category: 'coffee',
    name: 'Spanish Pistachio Cortado',
    description: 'Double shot Ethiopian Yirgacheffe, pistachio paste, textured whole milk, crushed roasted nuts.',
    price: 280,
    badge: "Barista's Choice",
    image: '/images/menu/cortado.jpg'
  },
  {
    id: 'm2',
    category: 'coffee',
    name: 'Slow Drip Kyoto Cold Brew',
    description: '18-hour Dutch cold drip extraction over ice ball, floral notes with chocolate undertones.',
    price: 320,
    badge: 'Limited Batch',
    image: '/images/menu/kyoto_cold_brew.jpg'
  },
  {
    id: 'm3',
    category: 'brunch',
    name: 'Smoked Salmon & Truffle Eggs Royale',
    description: 'Toasted brioche, soft poached organic eggs, Norwegian salmon, truffle hollandaise, caper berries.',
    price: 590,
    badge: 'Signature Dish',
    image: '/images/menu/salmon_royale.jpg'
  },
  {
    id: 'm4',
    category: 'brunch',
    name: 'Avocado Tartine with Za’atar & Feta',
    description: 'Rustic sourdough, smashed Hass avocado, Persian feta, toasted seeds, microgreens, extra virgin olive oil.',
    price: 420,
    badge: 'Vegetarian',
    image: '/images/menu/avocado_tartine.jpg'
  },
  {
    id: 'm5',
    category: 'bakery',
    name: 'Artisan Butter Croissant',
    description: '72-layer laminated French butter dough, flaky crisp crust, honeycomb airy crumb.',
    price: 240,
    badge: 'Baked Fresh Hourly',
    image: '/images/menu/croissant.jpg'
  },
  {
    id: 'm6',
    category: 'desserts',
    name: 'Valrhona Dark Chocolate Fondant',
    description: 'Warm molten 70% dark chocolate core, Madagascan bourbon vanilla bean gelato, raspberry coulis.',
    price: 360,
    badge: 'Decadent',
    image: '/images/menu/chocolate_fondant.jpg'
  }
];

// Helper to get formatted date string for today and tomorrow YYYY-MM-DD (local timezone)
export const getTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const getTomorrowString = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Helper to get smart default start time for upcoming slot today
export const getDefaultStartTime = () => {
  const d = new Date();
  const nextHour = d.getHours() + 1;
  if (nextHour >= 9 && nextHour <= 21) {
    return `${String(nextHour).padStart(2, '0')}:00`;
  }
  if (nextHour > 21) {
    return '21:00';
  }
  return '10:00';
};

// Production Bookings Store: Starts clean with 0 dummy bookings
export const INITIAL_SAMPLE_BOOKINGS = [];

