export const navItems = [
  { label: 'About', href: '/about' },
  { label: 'Community School', href: '/community-school' },
  { label: 'Farmers Market', href: '/farmers-market' },
  { label: 'Mission', href: '/mission' },
  { label: 'Contact', href: '/about#contact' },
] as const

export const weeklySchedule = [
  {
    day: 'Sunday',
    name: 'Sunday worship',
    time: '11:00 am',
    description: 'Start your week grounded with a message that speaks to real life.',
    tone: 'blue',
  },
  {
    day: 'Saturday',
    name: 'Farmers market',
    time: '9:00 am – 2:00 pm',
    description:
      'Fresh finds, local vendors, and a relaxed way to connect with the community.',
    tone: 'green',
  },
  {
    day: 'Wednesday',
    name: 'Future leaders',
    time: '5:30 pm',
    description: 'Helping young adults grow into who they’re meant to be.',
    tone: 'gold',
  },
  {
    day: 'Tuesday',
    name: 'Youth ministry',
    time: '7:00 am',
    description:
      'A space where students 8+ build friendships, confidence, and faith.',
    tone: 'sky',
  },
] as const

export const homeEvents = [
  {
    day: '08',
    month: 'Jul',
    category: 'Worship',
    title: 'Choir Sunday Concert',
    description: 'An evening of sacred song open to all. 6:00 PM in the sanctuary.',
    tone: 'blue',
  },
  {
    day: '19',
    month: 'Jul',
    category: 'Market',
    title: 'Summer Harvest Market',
    description: 'Mango season, extra stalls, and live steel drums from 9 AM–1 PM.',
    tone: 'green',
  },
  {
    day: '21',
    month: 'Jul',
    category: 'Outreach',
    title: 'Back-to-School Drive',
    description: 'Help us fill backpacks for island families. Donations welcome all week.',
    tone: 'gold',
  },
] as const

export const calendarEvents = {
  4: {
    category: 'Market',
    title: 'Independence Weekend Market',
    time: '9:00 am',
    description: 'Local vendors and a relaxed holiday market on the church plaza.',
    tone: 'green',
  },
  8: {
    category: 'Worship',
    title: 'Choir Sunday Concert',
    time: '6:00 pm',
    description: 'An evening of sacred song open to everyone in the sanctuary.',
    tone: 'blue',
  },
  19: {
    category: 'Market',
    title: 'Summer Harvest Market',
    time: '9:00 am',
    description: 'Mango season, extra stalls, and live steel drums on the plaza.',
    tone: 'green',
  },
  21: {
    category: 'Young Adult',
    title: 'Youth ministry',
    time: '7:00 pm',
    description:
      'A space where students 8+ build friendships, confidence, and faith. Bring any donations for the back-to-school drive.',
    tone: 'sky',
  },
  26: {
    category: 'Worship',
    title: 'Sunday Worship',
    time: '11:00 am',
    description: 'Gather for worship, music, and a message grounded in everyday life.',
    tone: 'blue',
  },
} as const

export const vendors = [
  { name: 'Island Honey Co.', category: 'Produce', image: '/images/vendor-island-honey.png' },
  { name: 'Bayview Bakery', category: 'Baked Goods', image: '/images/vendor-bayview-bakery.png' },
  { name: 'Salt & Sun Coffee', category: 'Coffee & Beverages', image: '/images/vendor-salt-sun.png' },
  { name: 'Cayo Flowers', category: 'Flowers & Plants', image: '/images/vendor-cayo-flowers.png' },
  { name: 'Mango Grove Farm', category: 'Produce', image: '/images/vendor-mango-grove.png' },
  { name: 'Ceviche Cart', category: 'Prepared Goods', image: '/images/vendor-ceviche-cart.png' },
] as const
