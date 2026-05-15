// frontend/src/pages/ExplorePage.jsx
// Tripzio Module 4A — Explore Page
// 100+ destinations covering ALL Indian states
// Free — no paid APIs, picsum photos with destination seeds

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import {
  Search, Mountain, Waves, Sun, Compass, MapPin,
  Clock, Star, Filter, TrendingUp,
  Sparkles, Heart, Globe, ChevronRight, Zap
} from 'lucide-react'

const ALL_DESTINATIONS = [

  // ── HILL STATIONS ─────────────────────────────────────────
  {
    name: 'Manali', region: 'Himachal Pradesh', category: 'Hill Station',
    duration: '5-7', budget: 12000, rating: 4.8,
    photo: 'https://picsum.photos/seed/manali/600/400',
    emoji: '🏔️', badge: 'Trending', badgeColor: '#f59e0b',
    accent: '#8b5cf6', lightBg: '#f5f3ff', border: '#e9d5ff',
    tags: ['Adventure', 'Snow', 'Trekking'], season: 'Mar-Jun, Sep-Nov',
    desc: 'Snow-capped peaks, river valleys and adventure activities in the Himalayas.',
  },
  {
    name: 'Shimla', region: 'Himachal Pradesh', category: 'Hill Station',
    duration: '4-6', budget: 11000, rating: 4.6,
    photo: 'https://picsum.photos/seed/shimla/600/400',
    emoji: '❄️', badge: 'Winter Special', badgeColor: '#3b82f6',
    accent: '#3b82f6', lightBg: '#eff6ff', border: '#bfdbfe',
    tags: ['Snow', 'Mall Road', 'Heritage'], season: 'Oct-Feb',
    desc: 'Former summer capital of British India with colonial charm and snow in winters.',
  },
  {
    name: 'Dharamshala', region: 'Himachal Pradesh', category: 'Hill Station',
    duration: '4-5', budget: 10000, rating: 4.6,
    photo: 'https://picsum.photos/seed/dharamshala/600/400',
    emoji: '☸️', badge: 'Spiritual', badgeColor: '#8b5cf6',
    accent: '#8b5cf6', lightBg: '#f5f3ff', border: '#ddd6fe',
    tags: ['Tibetan Culture', 'Trekking', 'Monasteries'], season: 'Mar-Jun',
    desc: 'Home of Dalai Lama with Tibetan culture, monasteries and Himalayan treks.',
  },
  {
    name: 'Kasol', region: 'Himachal Pradesh', category: 'Hill Station',
    duration: '3-5', budget: 8000, rating: 4.5,
    photo: 'https://picsum.photos/seed/kasol/600/400',
    emoji: '🌲', badge: 'Backpacker Fav', badgeColor: '#16a34a',
    accent: '#16a34a', lightBg: '#f0fdf4', border: '#86efac',
    tags: ['Backpacking', 'River', 'Trekking'], season: 'Mar-Jun, Sep-Nov',
    desc: 'Mini Israel of India — a backpacker paradise on the banks of Parvati River.',
  },
  {
    name: 'Spiti Valley', region: 'Himachal Pradesh', category: 'Hill Station',
    duration: '7-10', budget: 18000, rating: 4.9,
    photo: 'https://picsum.photos/seed/spiti/600/400',
    emoji: '🏜️', badge: 'Epic', badgeColor: '#ef4444',
    accent: '#ef4444', lightBg: '#fef2f2', border: '#fecaca',
    tags: ['Remote', 'Monasteries', 'High Altitude'], season: 'Jun-Sep',
    desc: 'Cold desert mountain valley with ancient monasteries and surreal landscapes.',
  },
  {
    name: 'Darjeeling', region: 'West Bengal', category: 'Hill Station',
    duration: '4-6', budget: 10000, rating: 4.7,
    photo: 'https://picsum.photos/seed/darjeeling/600/400',
    emoji: '🍵', badge: 'Top Rated', badgeColor: '#0d9488',
    accent: '#0d9488', lightBg: '#f0fdfa', border: '#99f6e4',
    tags: ['Tea Gardens', 'Toy Train', 'Views'], season: 'Oct-May',
    desc: 'Queen of the Hills with tea gardens, Toy Train rides and Kanchenjunga views.',
  },
  {
    name: 'Gangtok', region: 'Sikkim', category: 'Hill Station',
    duration: '4-5', budget: 12000, rating: 4.7,
    photo: 'https://picsum.photos/seed/gangtok/600/400',
    emoji: '🏔️', badge: 'Hidden Gem', badgeColor: '#6366f1',
    accent: '#6366f1', lightBg: '#f5f3ff', border: '#ddd6fe',
    tags: ['Monasteries', 'Views', 'Clean City'], season: 'Mar-May, Sep-Dec',
    desc: 'Capital of Sikkim with stunning mountain views and vibrant Buddhist monasteries.',
  },
  {
    name: 'Ooty', region: 'Tamil Nadu', category: 'Hill Station',
    duration: '3-5', budget: 8000, rating: 4.5,
    photo: 'https://picsum.photos/seed/ooty/600/400',
    emoji: '🌿', badge: 'Family Fav', badgeColor: '#16a34a',
    accent: '#16a34a', lightBg: '#f0fdf4', border: '#86efac',
    tags: ['Nilgiris', 'Lakes', 'Gardens'], season: 'Oct-Jun',
    desc: 'The Blue Mountains of South India with rolling tea estates and botanical gardens.',
  },
  {
    name: 'Kodaikanal', region: 'Tamil Nadu', category: 'Hill Station',
    duration: '3-4', budget: 9000, rating: 4.5,
    photo: 'https://picsum.photos/seed/kodaikanal/600/400',
    emoji: '🌸', badge: 'Romantic', badgeColor: '#ec4899',
    accent: '#ec4899', lightBg: '#fdf2f8', border: '#fbcfe8',
    tags: ['Lakes', 'Waterfalls', 'Trekking'], season: 'Apr-Jun',
    desc: 'Princess of Hill Stations with beautiful lakes, waterfalls and pine forests.',
  },
  {
    name: 'Munnar', region: 'Kerala', category: 'Hill Station',
    duration: '3-5', budget: 10000, rating: 4.8,
    photo: 'https://picsum.photos/seed/munnar/600/400',
    emoji: '🍃', badge: 'Top Rated', badgeColor: '#0d9488',
    accent: '#0d9488', lightBg: '#f0fdfa', border: '#99f6e4',
    tags: ['Tea Estates', 'Wildlife', 'Valleys'], season: 'Sep-Mar',
    desc: 'Breathtaking tea plantations, misty mountains and rare Neelakurinji flowers.',
  },
  {
    name: 'Coorg', region: 'Karnataka', category: 'Hill Station',
    duration: '3-4', budget: 10000, rating: 4.7,
    photo: 'https://picsum.photos/seed/coorg/600/400',
    emoji: '☕', badge: 'Trending', badgeColor: '#f59e0b',
    accent: '#f59e0b', lightBg: '#fffbeb', border: '#fcd34d',
    tags: ['Coffee', 'Waterfalls', 'Trekking'], season: 'Oct-Mar',
    desc: 'Scotland of India — lush coffee plantations, waterfalls and misty hills.',
  },
  {
    name: 'Mussoorie', region: 'Uttarakhand', category: 'Hill Station',
    duration: '3-5', budget: 10000, rating: 4.5,
    photo: 'https://picsum.photos/seed/mussoorie/600/400',
    emoji: '🌄', badge: 'Weekend Fav', badgeColor: '#3b82f6',
    accent: '#3b82f6', lightBg: '#eff6ff', border: '#bfdbfe',
    tags: ['Waterfalls', 'Mall Road', 'Views'], season: 'Mar-Jun',
    desc: 'Queen of the Hills in Uttarakhand — a perfect Delhiite weekend escape.',
  },
  {
    name: 'Nainital', region: 'Uttarakhand', category: 'Hill Station',
    duration: '3-4', budget: 9000, rating: 4.5,
    photo: 'https://picsum.photos/seed/nainital/600/400',
    emoji: '🏞️', badge: 'Family Fav', badgeColor: '#16a34a',
    accent: '#16a34a', lightBg: '#f0fdf4', border: '#86efac',
    tags: ['Lake', 'Boating', 'Snow View'], season: 'Mar-Jun',
    desc: 'City of Lakes with the beautiful Naini Lake surrounded by hills.',
  },
  {
    name: 'Shillong', region: 'Meghalaya', category: 'Hill Station',
    duration: '4-5', budget: 11000, rating: 4.6,
    photo: 'https://picsum.photos/seed/shillong/600/400',
    emoji: '🎵', badge: 'Hidden Gem', badgeColor: '#6366f1',
    accent: '#6366f1', lightBg: '#f5f3ff', border: '#ddd6fe',
    tags: ['Waterfalls', 'Music', 'Lakes'], season: 'Sep-May',
    desc: 'Scotland of the East — music capital of India with living root bridges nearby.',
  },
  {
    name: 'Wayanad', region: 'Kerala', category: 'Hill Station',
    duration: '3-4', budget: 9000, rating: 4.6,
    photo: 'https://picsum.photos/seed/wayanad/600/400',
    emoji: '🌳', badge: 'Nature Lovers', badgeColor: '#16a34a',
    accent: '#16a34a', lightBg: '#f0fdf4', border: '#86efac',
    tags: ['Wildlife', 'Tribal Culture', 'Waterfalls'], season: 'Sep-May',
    desc: 'Lush green hills, wildlife sanctuaries and ancient tribal heritage.',
  },
  {
    name: 'Lonavala', region: 'Maharashtra', category: 'Hill Station',
    duration: '2-3', budget: 7000, rating: 4.3,
    photo: 'https://picsum.photos/seed/lonavala/600/400',
    emoji: '⛰️', badge: 'Weekend Escape', badgeColor: '#3b82f6',
    accent: '#3b82f6', lightBg: '#eff6ff', border: '#bfdbfe',
    tags: ['Waterfalls', 'Forts', 'Chikki'], season: 'Jun-Sep',
    desc: 'Mumbai and Pune favourite weekend getaway with spectacular monsoon waterfalls.',
  },
  {
    name: 'Mahabaleshwar', region: 'Maharashtra', category: 'Hill Station',
    duration: '3-4', budget: 9000, rating: 4.4,
    photo: 'https://picsum.photos/seed/mahabaleshwar/600/400',
    emoji: '🍓', badge: 'Romantic', badgeColor: '#ec4899',
    accent: '#ec4899', lightBg: '#fdf2f8', border: '#fbcfe8',
    tags: ['Strawberries', 'Viewpoints', 'Lakes'], season: 'Oct-Jun',
    desc: 'Famous for strawberries, panoramic viewpoints and pleasant climate.',
  },

  // ── BEACHES ───────────────────────────────────────────────
  {
    name: 'Goa', region: 'Goa', category: 'Beach',
    duration: '4-6', budget: 15000, rating: 4.7,
    photo: 'https://picsum.photos/seed/goa/600/400',
    emoji: '🏖️', badge: 'Most Booked', badgeColor: '#0284c7',
    accent: '#0ea5e9', lightBg: '#eff6ff', border: '#bae6fd',
    tags: ['Beach', 'Nightlife', 'Water Sports'], season: 'Nov-Mar',
    desc: 'India\'s beach paradise with golden sands, Portuguese heritage and vibrant nightlife.',
  },
  {
    name: 'Andaman Islands', region: 'Andaman & Nicobar', category: 'Beach',
    duration: '5-7', budget: 25000, rating: 4.9,
    photo: 'https://picsum.photos/seed/andaman/600/400',
    emoji: '🐠', badge: 'Hidden Gem', badgeColor: '#6366f1',
    accent: '#6366f1', lightBg: '#f5f3ff', border: '#ddd6fe',
    tags: ['Scuba Diving', 'Pristine Beaches', 'Islands'], season: 'Nov-May',
    desc: 'Crystal clear waters, coral reefs and pristine beaches in the Bay of Bengal.',
  },
  {
    name: 'Pondicherry', region: 'Puducherry', category: 'Beach',
    duration: '3-4', budget: 9000, rating: 4.5,
    photo: 'https://picsum.photos/seed/pondicherry/600/400',
    emoji: '🇫🇷', badge: 'French Vibes', badgeColor: '#ec4899',
    accent: '#ec4899', lightBg: '#fdf2f8', border: '#fbcfe8',
    tags: ['French Quarter', 'Cafes', 'Auroville'], season: 'Oct-Mar',
    desc: 'A slice of France in India with colonial architecture and serene beaches.',
  },
  {
    name: 'Varkala', region: 'Kerala', category: 'Beach',
    duration: '3-4', budget: 9000, rating: 4.6,
    photo: 'https://picsum.photos/seed/varkala/600/400',
    emoji: '🌊', badge: 'Offbeat', badgeColor: '#0d9488',
    accent: '#0d9488', lightBg: '#f0fdfa', border: '#99f6e4',
    tags: ['Cliffside', 'Yoga', 'Ayurveda'], season: 'Nov-Mar',
    desc: 'Stunning cliffside beach with natural spring waterfalls and yoga retreats.',
  },
  {
    name: 'Kovalam', region: 'Kerala', category: 'Beach',
    duration: '3-4', budget: 10000, rating: 4.4,
    photo: 'https://picsum.photos/seed/kovalam/600/400',
    emoji: '🌴', badge: 'Classic', badgeColor: '#16a34a',
    accent: '#16a34a', lightBg: '#f0fdf4', border: '#86efac',
    tags: ['Lighthouse', 'Ayurveda', 'Surfing'], season: 'Nov-Mar',
    desc: 'Famous crescent-shaped beach with lighthouse, Ayurvedic resorts and fresh seafood.',
  },
  {
    name: 'Digha', region: 'West Bengal', category: 'Beach',
    duration: '2-3', budget: 6000, rating: 4.1,
    photo: 'https://picsum.photos/seed/digha/600/400',
    emoji: '🏄', badge: 'Budget Fav', badgeColor: '#f59e0b',
    accent: '#f59e0b', lightBg: '#fffbeb', border: '#fcd34d',
    tags: ['Beach', 'Seafood', 'Sunrise'], season: 'Nov-Feb',
    desc: 'Most popular beach destination for Kolkatans with gentle waves and seafood.',
  },
  {
    name: 'Puri', region: 'Odisha', category: 'Beach',
    duration: '3-4', budget: 8000, rating: 4.4,
    photo: 'https://picsum.photos/seed/puri/600/400',
    emoji: '🛕', badge: 'Spiritual', badgeColor: '#f97316',
    accent: '#f97316', lightBg: '#fff7ed', border: '#fed7aa',
    tags: ['Jagannath Temple', 'Beach', 'Rath Yatra'], season: 'Nov-Feb',
    desc: 'Sacred city with Jagannath Temple and one of India\'s most famous beaches.',
  },
  {
    name: 'Tarkarli', region: 'Maharashtra', category: 'Beach',
    duration: '3-4', budget: 8000, rating: 4.5,
    photo: 'https://picsum.photos/seed/tarkarli/600/400',
    emoji: '🤿', badge: 'Offbeat', badgeColor: '#0ea5e9',
    accent: '#0ea5e9', lightBg: '#eff6ff', border: '#bae6fd',
    tags: ['Scuba Diving', 'Snorkeling', 'Backwaters'], season: 'Nov-Mar',
    desc: 'Hidden gem of Maharashtra with crystal clear waters perfect for water sports.',
  },
  {
    name: 'Mandrem', region: 'Goa', category: 'Beach',
    duration: '3-5', budget: 12000, rating: 4.6,
    photo: 'https://picsum.photos/seed/mandrem/600/400',
    emoji: '🧘', badge: 'Peaceful', badgeColor: '#8b5cf6',
    accent: '#8b5cf6', lightBg: '#f5f3ff', border: '#ddd6fe',
    tags: ['Quiet Beach', 'Yoga', 'North Goa'], season: 'Nov-Mar',
    desc: 'North Goa\'s most peaceful beach — perfect for yoga retreats and quiet escapes.',
  },
  {
    name: 'Lakshadweep', region: 'Lakshadweep', category: 'Beach',
    duration: '5-7', budget: 30000, rating: 4.9,
    photo: 'https://picsum.photos/seed/lakshadweep/600/400',
    emoji: '🏝️', badge: 'Exclusive', badgeColor: '#0d9488',
    accent: '#0d9488', lightBg: '#f0fdfa', border: '#99f6e4',
    tags: ['Coral Reefs', 'Lagoons', 'Snorkeling'], season: 'Oct-May',
    desc: 'India\'s coral island paradise with turquoise lagoons and pristine coral reefs.',
  },

  // ── HERITAGE ──────────────────────────────────────────────
  {
    name: 'Jaipur', region: 'Rajasthan', category: 'Heritage',
    duration: '3-4', budget: 10000, rating: 4.8,
    photo: 'https://picsum.photos/seed/jaipur/600/400',
    emoji: '🏯', badge: 'Pink City', badgeColor: '#ec4899',
    accent: '#ec4899', lightBg: '#fdf2f8', border: '#fbcfe8',
    tags: ['Forts', 'Palaces', 'Shopping'], season: 'Oct-Mar',
    desc: 'Pink City of India with magnificent forts, palaces and vibrant bazaars.',
  },
  {
    name: 'Jodhpur', region: 'Rajasthan', category: 'Heritage',
    duration: '2-3', budget: 9000, rating: 4.7,
    photo: 'https://picsum.photos/seed/jodhpur/600/400',
    emoji: '💙', badge: 'Blue City', badgeColor: '#3b82f6',
    accent: '#3b82f6', lightBg: '#eff6ff', border: '#bfdbfe',
    tags: ['Mehrangarh Fort', 'Blue Houses', 'Desert'], season: 'Oct-Mar',
    desc: 'Blue City dominated by the mighty Mehrangarh Fort overlooking the old city.',
  },
  {
    name: 'Udaipur', region: 'Rajasthan', category: 'Heritage',
    duration: '3-4', budget: 12000, rating: 4.9,
    photo: 'https://picsum.photos/seed/udaipur/600/400',
    emoji: '🏰', badge: 'Most Romantic', badgeColor: '#ec4899',
    accent: '#ec4899', lightBg: '#fdf2f8', border: '#fbcfe8',
    tags: ['Lakes', 'Palaces', 'Romantic'], season: 'Oct-Mar',
    desc: 'City of Lakes — the most romantic destination in India with lake palaces.',
  },
  {
    name: 'Jaisalmer', region: 'Rajasthan', category: 'Heritage',
    duration: '3-4', budget: 10000, rating: 4.7,
    photo: 'https://picsum.photos/seed/jaisalmer/600/400',
    emoji: '🐪', badge: 'Desert Magic', badgeColor: '#f59e0b',
    accent: '#f59e0b', lightBg: '#fffbeb', border: '#fcd34d',
    tags: ['Desert', 'Camel Safari', 'Fort'], season: 'Oct-Mar',
    desc: 'Golden City rising from the Thar Desert with a living fort and sand dunes.',
  },
  {
    name: 'Agra', region: 'Uttar Pradesh', category: 'Heritage',
    duration: '2-3', budget: 7000, rating: 4.6,
    photo: 'https://picsum.photos/seed/agra/600/400',
    emoji: '🕌', badge: 'UNESCO', badgeColor: '#7c3aed',
    accent: '#7c3aed', lightBg: '#f5f3ff', border: '#ddd6fe',
    tags: ['Taj Mahal', 'Mughal History', 'Agra Fort'], season: 'Oct-Mar',
    desc: 'Home to the Taj Mahal — one of the Seven Wonders of the World.',
  },
  {
    name: 'Varanasi', region: 'Uttar Pradesh', category: 'Heritage',
    duration: '3-4', budget: 8000, rating: 4.8,
    photo: 'https://picsum.photos/seed/varanasi/600/400',
    emoji: '🪔', badge: 'Spiritual', badgeColor: '#f97316',
    accent: '#f97316', lightBg: '#fff7ed', border: '#fed7aa',
    tags: ['Ghats', 'Temples', 'Ganga Aarti'], season: 'Oct-Mar',
    desc: 'Spiritual capital of India with ancient ghats, temples and evening aartis.',
  },
  {
    name: 'Hampi', region: 'Karnataka', category: 'Heritage',
    duration: '3-4', budget: 7000, rating: 4.8,
    photo: 'https://picsum.photos/seed/hampi/600/400',
    emoji: '🗿', badge: 'UNESCO', badgeColor: '#7c3aed',
    accent: '#7c3aed', lightBg: '#f5f3ff', border: '#ddd6fe',
    tags: ['Ruins', 'Boulders', 'History'], season: 'Oct-Mar',
    desc: 'Stunning ruins of Vijayanagara Empire amidst surreal boulder landscapes.',
  },
  {
    name: 'Khajuraho', region: 'Madhya Pradesh', category: 'Heritage',
    duration: '2-3', budget: 7000, rating: 4.5,
    photo: 'https://picsum.photos/seed/khajuraho/600/400',
    emoji: '🛕', badge: 'UNESCO', badgeColor: '#7c3aed',
    accent: '#7c3aed', lightBg: '#f5f3ff', border: '#ddd6fe',
    tags: ['Temples', 'Sculptures', 'History'], season: 'Oct-Mar',
    desc: 'UNESCO World Heritage temples famous for intricate erotic sculptures.',
  },
  {
    name: 'Mysore', region: 'Karnataka', category: 'Heritage',
    duration: '2-3', budget: 8000, rating: 4.7,
    photo: 'https://picsum.photos/seed/mysore/600/400',
    emoji: '👑', badge: 'Royal', badgeColor: '#f59e0b',
    accent: '#f59e0b', lightBg: '#fffbeb', border: '#fcd34d',
    tags: ['Palace', 'Dasara', 'Silk'], season: 'Oct-Mar',
    desc: 'City of Palaces with the magnificent Mysore Palace illuminated during Dasara.',
  },
  {
    name: 'Orchha', region: 'Madhya Pradesh', category: 'Heritage',
    duration: '2-3', budget: 6000, rating: 4.6,
    photo: 'https://picsum.photos/seed/orchha/600/400',
    emoji: '🏯', badge: 'Hidden Gem', badgeColor: '#6366f1',
    accent: '#6366f1', lightBg: '#f5f3ff', border: '#ddd6fe',
    tags: ['Cenotaphs', 'Forts', 'Offbeat'], season: 'Oct-Mar',
    desc: 'Forgotten medieval city with stunning cenotaphs rising from the Betwa River.',
  },
  {
    name: 'Mahabalipuram', region: 'Tamil Nadu', category: 'Heritage',
    duration: '2-3', budget: 7000, rating: 4.5,
    photo: 'https://picsum.photos/seed/mahabalipuram/600/400',
    emoji: '🗿', badge: 'UNESCO', badgeColor: '#7c3aed',
    accent: '#7c3aed', lightBg: '#f5f3ff', border: '#ddd6fe',
    tags: ['Rock Temples', 'Shore Temple', 'Beach'], season: 'Nov-Mar',
    desc: 'Ancient Pallava port city with magnificent rock-cut temples by the sea.',
  },
  {
    name: 'Pattadakal', region: 'Karnataka', category: 'Heritage',
    duration: '1-2', budget: 5000, rating: 4.4,
    photo: 'https://picsum.photos/seed/pattadakal/600/400',
    emoji: '🛕', badge: 'UNESCO', badgeColor: '#7c3aed',
    accent: '#7c3aed', lightBg: '#f5f3ff', border: '#ddd6fe',
    tags: ['Chalukya Temples', 'History', 'Architecture'], season: 'Oct-Mar',
    desc: 'UNESCO site with finest examples of early Chalukya temple architecture.',
  },
  {
    name: 'Amritsar', region: 'Punjab', category: 'Heritage',
    duration: '2-3', budget: 7000, rating: 4.9,
    photo: 'https://picsum.photos/seed/amritsar/600/400',
    emoji: '✨', badge: 'Sacred', badgeColor: '#f59e0b',
    accent: '#f59e0b', lightBg: '#fffbeb', border: '#fcd34d',
    tags: ['Golden Temple', 'Wagah Border', 'Langar'], season: 'Oct-Mar',
    desc: 'Home of the magnificent Golden Temple — most visited place in the world.',
  },

  // ── ADVENTURE ─────────────────────────────────────────────
  {
    name: 'Leh-Ladakh', region: 'Ladakh', category: 'Adventure',
    duration: '7-10', budget: 22000, rating: 4.9,
    photo: 'https://picsum.photos/seed/ladakh/600/400',
    emoji: '🏍️', badge: 'Epic', badgeColor: '#ef4444',
    accent: '#ef4444', lightBg: '#fef2f2', border: '#fecaca',
    tags: ['Bike Trip', 'High Altitude', 'Pangong Lake'], season: 'Jun-Sep',
    desc: 'The last frontier — moonscapes, Buddhist monasteries and Pangong Lake.',
  },
  {
    name: 'Rishikesh', region: 'Uttarakhand', category: 'Adventure',
    duration: '3-5', budget: 8000, rating: 4.7,
    photo: 'https://picsum.photos/seed/rishikesh/600/400',
    emoji: '🌊', badge: 'Adrenaline', badgeColor: '#0d9488',
    accent: '#0d9488', lightBg: '#f0fdfa', border: '#99f6e4',
    tags: ['River Rafting', 'Bungee', 'Yoga'], season: 'Sep-Jun',
    desc: 'Yoga capital and adventure hub on the banks of the Ganges.',
  },
  {
    name: 'Ziro Valley', region: 'Arunachal Pradesh', category: 'Adventure',
    duration: '4-5', budget: 12000, rating: 4.7,
    photo: 'https://picsum.photos/seed/ziro/600/400',
    emoji: '🎵', badge: 'Offbeat', badgeColor: '#6366f1',
    accent: '#6366f1', lightBg: '#f5f3ff', border: '#ddd6fe',
    tags: ['Music Festival', 'Tribal Culture', 'Rice Fields'], season: 'Mar-Oct',
    desc: 'UNESCO heritage Ziro Music Festival venue with Apatani tribal culture.',
  },
  {
    name: 'Chopta', region: 'Uttarakhand', category: 'Adventure',
    duration: '3-4', budget: 8000, rating: 4.6,
    photo: 'https://picsum.photos/seed/chopta/600/400',
    emoji: '⛺', badge: 'Mini Switzerland', badgeColor: '#3b82f6',
    accent: '#3b82f6', lightBg: '#eff6ff', border: '#bfdbfe',
    tags: ['Trekking', 'Tungnath', 'Chandrashila'], season: 'Apr-Jun, Sep-Nov',
    desc: 'Mini Switzerland of India — gateway to Tungnath and Chandrashila trek.',
  },
  {
    name: 'Bir Billing', region: 'Himachal Pradesh', category: 'Adventure',
    duration: '3-4', budget: 9000, rating: 4.6,
    photo: 'https://picsum.photos/seed/birbilling/600/400',
    emoji: '🪂', badge: 'Paragliding Hub', badgeColor: '#f59e0b',
    accent: '#f59e0b', lightBg: '#fffbeb', border: '#fcd34d',
    tags: ['Paragliding', 'Camping', 'Tibetan Colony'], season: 'Mar-Jun, Sep-Nov',
    desc: 'World\'s second best paragliding site with stunning Himalayan views.',
  },
  {
    name: 'Dandeli', region: 'Karnataka', category: 'Adventure',
    duration: '2-3', budget: 7000, rating: 4.5,
    photo: 'https://picsum.photos/seed/dandeli/600/400',
    emoji: '🚣', badge: 'Wildlife + Adventure', badgeColor: '#16a34a',
    accent: '#16a34a', lightBg: '#f0fdf4', border: '#86efac',
    tags: ['White Water Rafting', 'Safari', 'Kayaking'], season: 'Oct-May',
    desc: 'Adventure capital of Karnataka with rafting, kayaking and wildlife safari.',
  },
  {
    name: 'Kedarnath', region: 'Uttarakhand', category: 'Adventure',
    duration: '3-4', budget: 10000, rating: 4.8,
    photo: 'https://picsum.photos/seed/kedarnath/600/400',
    emoji: '🛕', badge: 'Sacred Trek', badgeColor: '#f97316',
    accent: '#f97316', lightBg: '#fff7ed', border: '#fed7aa',
    tags: ['Trek', 'Shiva Temple', 'Char Dham'], season: 'May-Jun, Sep-Oct',
    desc: 'One of the Char Dhams — a challenging trek to the ancient Shiva temple.',
  },

  // ── NATURE & WILDLIFE ────────────────────────────────────
  {
    name: 'Kerala Backwaters', region: 'Kerala', category: 'Nature',
    duration: '5-7', budget: 14000, rating: 4.8,
    photo: 'https://picsum.photos/seed/kerala/600/400',
    emoji: '🌴', badge: 'God\'s Own', badgeColor: '#22c55e',
    accent: '#22c55e', lightBg: '#f0fdf4', border: '#bbf7d0',
    tags: ['Houseboat', 'Backwaters', 'Ayurveda'], season: 'Sep-Mar',
    desc: 'God\'s Own Country with serene backwaters, spice plantations and houseboats.',
  },
  {
    name: 'Jim Corbett', region: 'Uttarakhand', category: 'Nature',
    duration: '3-4', budget: 12000, rating: 4.6,
    photo: 'https://picsum.photos/seed/corbett/600/400',
    emoji: '🐯', badge: 'Tiger Reserve', badgeColor: '#f59e0b',
    accent: '#f59e0b', lightBg: '#fffbeb', border: '#fcd34d',
    tags: ['Tiger Safari', 'Wildlife', 'Bird Watching'], season: 'Nov-Jun',
    desc: 'India\'s oldest national park — home to tigers, elephants and 600+ bird species.',
  },
  {
    name: 'Ranthambore', region: 'Rajasthan', category: 'Nature',
    duration: '3-4', budget: 14000, rating: 4.7,
    photo: 'https://picsum.photos/seed/ranthambore/600/400',
    emoji: '🐅', badge: 'Best Tiger Sighting', badgeColor: '#ef4444',
    accent: '#ef4444', lightBg: '#fef2f2', border: '#fecaca',
    tags: ['Tiger Safari', 'Fort', 'Photography'], season: 'Oct-Jun',
    desc: 'Best place in India to spot tigers in the wild near ancient fort ruins.',
  },
  {
    name: 'Kaziranga', region: 'Assam', category: 'Nature',
    duration: '3-4', budget: 12000, rating: 4.8,
    photo: 'https://picsum.photos/seed/kaziranga/600/400',
    emoji: '🦏', badge: 'UNESCO', badgeColor: '#7c3aed',
    accent: '#7c3aed', lightBg: '#f5f3ff', border: '#ddd6fe',
    tags: ['One-Horned Rhino', 'Elephant Safari', 'UNESCO'], season: 'Nov-Apr',
    desc: 'UNESCO site — world\'s largest population of one-horned rhinoceroses.',
  },
  {
    name: 'Sundarbans', region: 'West Bengal', category: 'Nature',
    duration: '3-4', budget: 10000, rating: 4.6,
    photo: 'https://picsum.photos/seed/sundarbans/600/400',
    emoji: '🐅', badge: 'UNESCO', badgeColor: '#7c3aed',
    accent: '#7c3aed', lightBg: '#f5f3ff', border: '#ddd6fe',
    tags: ['Royal Bengal Tiger', 'Mangroves', 'Boat Safari'], season: 'Sep-Mar',
    desc: 'World\'s largest mangrove forest — home to Royal Bengal Tigers.',
  },
  {
    name: 'Periyar', region: 'Kerala', category: 'Nature',
    duration: '2-3', budget: 9000, rating: 4.6,
    photo: 'https://picsum.photos/seed/periyar/600/400',
    emoji: '🐘', badge: 'Wildlife', badgeColor: '#16a34a',
    accent: '#16a34a', lightBg: '#f0fdf4', border: '#86efac',
    tags: ['Elephant Safari', 'Boat Ride', 'Spices'], season: 'Sep-May',
    desc: 'Thekkady wildlife sanctuary with elephant sightings and spice plantation tours.',
  },
  {
    name: 'Valley of Flowers', region: 'Uttarakhand', category: 'Nature',
    duration: '4-5', budget: 12000, rating: 4.9,
    photo: 'https://picsum.photos/seed/valleyofflowers/600/400',
    emoji: '🌺', badge: 'UNESCO', badgeColor: '#ec4899',
    accent: '#ec4899', lightBg: '#fdf2f8', border: '#fbcfe8',
    tags: ['Alpine Flowers', 'Trek', 'UNESCO'], season: 'Jul-Sep',
    desc: 'UNESCO World Heritage site — a breathtaking valley of rare alpine flowers.',
  },
  {
    name: 'Majuli', region: 'Assam', category: 'Nature',
    duration: '2-3', budget: 8000, rating: 4.5,
    photo: 'https://picsum.photos/seed/majuli/600/400',
    emoji: '🏝️', badge: 'River Island', badgeColor: '#0d9488',
    accent: '#0d9488', lightBg: '#f0fdfa', border: '#99f6e4',
    tags: ['River Island', 'Vaishnavite Culture', 'Masks'], season: 'Oct-Mar',
    desc: 'World\'s largest river island with unique Vaishnavite monastery culture.',
  },
  {
    name: 'Coorg Wildlife', region: 'Karnataka', category: 'Nature',
    duration: '3-4', budget: 11000, rating: 4.6,
    photo: 'https://picsum.photos/seed/nagarhole/600/400',
    emoji: '🐆', badge: 'Leopard Country', badgeColor: '#f59e0b',
    accent: '#f59e0b', lightBg: '#fffbeb', border: '#fcd34d',
    tags: ['Nagarhole', 'Leopards', 'Elephants'], season: 'Oct-May',
    desc: 'Nagarhole National Park with leopards, tigers and largest elephant herds.',
  },

  // ── SPIRITUAL ─────────────────────────────────────────────
  {
    name: 'Tirupati', region: 'Andhra Pradesh', category: 'Spiritual',
    duration: '2-3', budget: 8000, rating: 4.8,
    photo: 'https://picsum.photos/seed/tirupati/600/400',
    emoji: '🙏', badge: 'Most Visited', badgeColor: '#f59e0b',
    accent: '#f59e0b', lightBg: '#fffbeb', border: '#fcd34d',
    tags: ['Balaji Temple', 'Pilgrimage', 'Tirumala'], season: 'All Year',
    desc: 'Most visited religious site in the world — sacred abode of Lord Venkateswara.',
  },
  {
    name: 'Shirdi', region: 'Maharashtra', category: 'Spiritual',
    duration: '1-2', budget: 5000, rating: 4.7,
    photo: 'https://picsum.photos/seed/shirdi/600/400',
    emoji: '✨', badge: 'Sacred', badgeColor: '#f97316',
    accent: '#f97316', lightBg: '#fff7ed', border: '#fed7aa',
    tags: ['Sai Baba', 'Pilgrimage', 'Devotion'], season: 'All Year',
    desc: 'Home of Sai Baba — one of India\'s most revered spiritual destinations.',
  },
  {
    name: 'Bodh Gaya', region: 'Bihar', category: 'Spiritual',
    duration: '2-3', budget: 6000, rating: 4.7,
    photo: 'https://picsum.photos/seed/bodhgaya/600/400',
    emoji: '☸️', badge: 'UNESCO', badgeColor: '#7c3aed',
    accent: '#7c3aed', lightBg: '#f5f3ff', border: '#ddd6fe',
    tags: ['Buddha', 'Mahabodhi Temple', 'Monasteries'], season: 'Oct-Mar',
    desc: 'Where Buddha attained enlightenment — most sacred Buddhist pilgrimage site.',
  },
  {
    name: 'Vrindavan', region: 'Uttar Pradesh', category: 'Spiritual',
    duration: '2-3', budget: 6000, rating: 4.6,
    photo: 'https://picsum.photos/seed/vrindavan/600/400',
    emoji: '🪈', badge: 'Krishna Land', badgeColor: '#8b5cf6',
    accent: '#8b5cf6', lightBg: '#f5f3ff', border: '#ddd6fe',
    tags: ['Krishna Temples', 'Holi', 'Devotion'], season: 'Oct-Mar',
    desc: 'Sacred city of Lord Krishna with 5000+ temples and world-famous Holi celebrations.',
  },
  {
    name: 'Haridwar', region: 'Uttarakhand', category: 'Spiritual',
    duration: '2-3', budget: 6000, rating: 4.6,
    photo: 'https://picsum.photos/seed/haridwar/600/400',
    emoji: '🌊', badge: 'Ganga Aarti', badgeColor: '#f97316',
    accent: '#f97316', lightBg: '#fff7ed', border: '#fed7aa',
    tags: ['Ganga Aarti', 'Kumbh Mela', 'Ghats'], season: 'Oct-Apr',
    desc: 'Gateway to the Gods — sacred city on the Ganges with spectacular evening aarti.',
  },
  {
    name: 'Madurai', region: 'Tamil Nadu', category: 'Spiritual',
    duration: '2-3', budget: 7000, rating: 4.6,
    photo: 'https://picsum.photos/seed/madurai/600/400',
    emoji: '🛕', badge: 'Temple City', badgeColor: '#f59e0b',
    accent: '#f59e0b', lightBg: '#fffbeb', border: '#fcd34d',
    tags: ['Meenakshi Temple', 'Culture', 'Food'], season: 'Oct-Mar',
    desc: 'Temple City of South India with the magnificent Meenakshi Amman Temple.',
  },
  {
    name: 'Pushkar', region: 'Rajasthan', category: 'Spiritual',
    duration: '2-3', budget: 7000, rating: 4.6,
    photo: 'https://picsum.photos/seed/pushkar/600/400',
    emoji: '🪷', badge: 'Sacred Lake', badgeColor: '#ec4899',
    accent: '#ec4899', lightBg: '#fdf2f8', border: '#fbcfe8',
    tags: ['Brahma Temple', 'Camel Fair', 'Sacred Lake'], season: 'Oct-Mar',
    desc: 'Only Brahma Temple in world on the banks of sacred Pushkar Lake.',
  },
  {
    name: 'Ayodhya', region: 'Uttar Pradesh', category: 'Spiritual',
    duration: '2-3', budget: 6000, rating: 4.7,
    photo: 'https://picsum.photos/seed/ayodhya/600/400',
    emoji: '🛕', badge: 'Ram Mandir', badgeColor: '#f97316',
    accent: '#f97316', lightBg: '#fff7ed', border: '#fed7aa',
    tags: ['Ram Mandir', 'Pilgrimage', 'Ghats'], season: 'Oct-Mar',
    desc: 'Birthplace of Lord Ram — home to the newly built Ram Mandir drawing millions.',
  },

  // ── NORTHEAST INDIA ───────────────────────────────────────
  {
    name: 'Tawang', region: 'Arunachal Pradesh', category: 'Northeast',
    duration: '5-6', budget: 15000, rating: 4.8,
    photo: 'https://picsum.photos/seed/tawang/600/400',
    emoji: '🏔️', badge: 'Hidden Gem', badgeColor: '#6366f1',
    accent: '#6366f1', lightBg: '#f5f3ff', border: '#ddd6fe',
    tags: ['Monastery', 'High Altitude', 'Snow'], season: 'Mar-Oct',
    desc: 'Home to Asia\'s second largest monastery at 10,000 feet in Arunachal Pradesh.',
  },
  {
    name: 'Cherrapunji', region: 'Meghalaya', category: 'Northeast',
    duration: '3-4', budget: 10000, rating: 4.7,
    photo: 'https://picsum.photos/seed/cherrapunji/600/400',
    emoji: '🌧️', badge: 'Wettest Place', badgeColor: '#3b82f6',
    accent: '#3b82f6', lightBg: '#eff6ff', border: '#bfdbfe',
    tags: ['Living Root Bridges', 'Waterfalls', 'Caves'], season: 'Oct-May',
    desc: 'World\'s wettest place with magical living root bridges and stunning waterfalls.',
  },
  {
    name: 'Dzukou Valley', region: 'Nagaland', category: 'Northeast',
    duration: '3-4', budget: 9000, rating: 4.7,
    photo: 'https://picsum.photos/seed/dzukou/600/400',
    emoji: '🌸', badge: 'Valley of Flowers', badgeColor: '#ec4899',
    accent: '#ec4899', lightBg: '#fdf2f8', border: '#fbcfe8',
    tags: ['Trek', 'Seasonal Flowers', 'Camping'], season: 'Jun-Sep',
    desc: 'Northeast India\'s Valley of Flowers — breathtaking seasonal blooms.',
  },
  {
    name: 'Loktak Lake', region: 'Manipur', category: 'Northeast',
    duration: '2-3', budget: 8000, rating: 4.5,
    photo: 'https://picsum.photos/seed/loktak/600/400',
    emoji: '🏞️', badge: 'Floating Islands', badgeColor: '#0d9488',
    accent: '#0d9488', lightBg: '#f0fdfa', border: '#99f6e4',
    tags: ['Floating Islands', 'Sangai Deer', 'Unique'], season: 'Oct-Mar',
    desc: 'Northeast India\'s largest freshwater lake with unique floating islands.',
  },
  {
    name: 'Dawki', region: 'Meghalaya', category: 'Northeast',
    duration: '2-3', budget: 8000, rating: 4.7,
    photo: 'https://picsum.photos/seed/dawki/600/400',
    emoji: '💎', badge: 'Crystal Clear', badgeColor: '#0ea5e9',
    accent: '#0ea5e9', lightBg: '#eff6ff', border: '#bae6fd',
    tags: ['Crystal Clear River', 'Boating', 'Bangladesh Border'], season: 'Oct-May',
    desc: 'Umngot River with waters so clear boats appear to float in air.',
  },

  // ── HONEYMOON ─────────────────────────────────────────────
  {
    name: 'Kashmir', region: 'Jammu & Kashmir', category: 'Honeymoon',
    duration: '5-7', budget: 20000, rating: 4.9,
    photo: 'https://picsum.photos/seed/kashmir/600/400',
    emoji: '🌷', badge: 'Heaven on Earth', badgeColor: '#ec4899',
    accent: '#ec4899', lightBg: '#fdf2f8', border: '#fbcfe8',
    tags: ['Shikara', 'Dal Lake', 'Snow'], season: 'Apr-Jun, Sep-Oct',
    desc: 'Heaven on Earth — Dal Lake, Gulmarg meadows and snow-capped Himalayan peaks.',
  },
  {
    name: 'Alleppey', region: 'Kerala', category: 'Honeymoon',
    duration: '2-3', budget: 10000, rating: 4.7,
    photo: 'https://picsum.photos/seed/alleppey/600/400',
    emoji: '🚢', badge: 'Houseboat Capital', badgeColor: '#0d9488',
    accent: '#0d9488', lightBg: '#f0fdfa', border: '#99f6e4',
    tags: ['Houseboat', 'Backwaters', 'Romantic'], season: 'Sep-Mar',
    desc: 'Venice of the East — romantic houseboat stays on serene Kerala backwaters.',
  },
  {
    name: 'Andaman', region: 'Andaman & Nicobar', category: 'Honeymoon',
    duration: '5-6', budget: 28000, rating: 4.9,
    photo: 'https://picsum.photos/seed/andaman2/600/400',
    emoji: '🏝️', badge: 'Beach Paradise', badgeColor: '#0ea5e9',
    accent: '#0ea5e9', lightBg: '#eff6ff', border: '#bae6fd',
    tags: ['Private Beach', 'Diving', 'Luxury'], season: 'Nov-May',
    desc: 'Pristine beaches, turquoise waters and romantic sunsets for honeymooners.',
  },

  // ── WEEKEND GETAWAYS ──────────────────────────────────────
  {
    name: 'Pondicherry', region: 'Puducherry', category: 'Weekend',
    duration: '2-3', budget: 8000, rating: 4.5,
    photo: 'https://picsum.photos/seed/pondy/600/400',
    emoji: '🥐', badge: 'French Town', badgeColor: '#ec4899',
    accent: '#ec4899', lightBg: '#fdf2f8', border: '#fbcfe8',
    tags: ['French Quarter', 'Beach', 'Cafes'], season: 'Oct-Mar',
    desc: 'Perfect weekend from Chennai — French architecture, cafes and serene beaches.',
  },
  {
    name: 'Chikmagalur', region: 'Karnataka', category: 'Weekend',
    duration: '2-3', budget: 8000, rating: 4.6,
    photo: 'https://picsum.photos/seed/chikmagalur/600/400',
    emoji: '☕', badge: 'Coffee Country', badgeColor: '#92400e',
    accent: '#92400e', lightBg: '#fef3c7', border: '#fcd34d',
    tags: ['Coffee Estates', 'Trekking', 'Waterfall'], season: 'Sep-May',
    desc: 'Birthplace of Indian coffee — lush estates, misty hills and Mullayanagiri trek.',
  },
  {
    name: 'Alibag', region: 'Maharashtra', category: 'Weekend',
    duration: '2-3', budget: 7000, rating: 4.2,
    photo: 'https://picsum.photos/seed/alibag/600/400',
    emoji: '🏖️', badge: 'Mumbai Escape', badgeColor: '#0ea5e9',
    accent: '#0ea5e9', lightBg: '#eff6ff', border: '#bae6fd',
    tags: ['Beach', 'Fort', 'Ferry'], season: 'Oct-Mar',
    desc: 'Mumbai\'s favourite coastal escape with Kolaba Fort and peaceful beaches.',
  },
  {
    name: 'Pondicherry from Chennai', region: 'Puducherry', category: 'Weekend',
    duration: '2-3', budget: 7000, rating: 4.5,
    photo: 'https://picsum.photos/seed/pondy2/600/400',
    emoji: '🌊', badge: 'Quick Escape', badgeColor: '#3b82f6',
    accent: '#3b82f6', lightBg: '#eff6ff', border: '#bfdbfe',
    tags: ['Beach', 'Yoga', 'French Food'], season: 'Oct-Mar',
    desc: 'Easy 3-hour drive from Chennai to French colonial beach town.',
  },

  // ── DESERT ───────────────────────────────────────────────
  {
    name: 'Rann of Kutch', region: 'Gujarat', category: 'Desert',
    duration: '3-4', budget: 12000, rating: 4.8,
    photo: 'https://picsum.photos/seed/rannofkutch/600/400',
    emoji: '🌕', badge: 'White Desert', badgeColor: '#f59e0b',
    accent: '#f59e0b', lightBg: '#fffbeb', border: '#fcd34d',
    tags: ['White Desert', 'Full Moon', 'Tribal Craft'], season: 'Nov-Feb',
    desc: 'Magical white salt desert that transforms into a festival ground under full moon.',
  },
  {
    name: 'Sam Sand Dunes', region: 'Rajasthan', category: 'Desert',
    duration: '1-2', budget: 6000, rating: 4.5,
    photo: 'https://picsum.photos/seed/samdunes/600/400',
    emoji: '🐫', badge: 'Desert Camp', badgeColor: '#f97316',
    accent: '#f97316', lightBg: '#fff7ed', border: '#fed7aa',
    tags: ['Camel Ride', 'Desert Camp', 'Sunset'], season: 'Oct-Mar',
    desc: 'Golden sand dunes near Jaisalmer — best place for camel safari and desert camping.',
  },

  // ── BACKPACKING ───────────────────────────────────────────
  {
    name: 'Mcleod Ganj', region: 'Himachal Pradesh', category: 'Backpacking',
    duration: '3-5', budget: 7000, rating: 4.6,
    photo: 'https://picsum.photos/seed/mcleodganj/600/400',
    emoji: '🎒', badge: 'Backpacker Hub', badgeColor: '#8b5cf6',
    accent: '#8b5cf6', lightBg: '#f5f3ff', border: '#ddd6fe',
    tags: ['Tibetan Exile HQ', 'Trekking', 'Cafes'], season: 'Mar-Jun, Sep-Nov',
    desc: 'Little Lhasa — home of Tibetan exile community with budget cafes and treks.',
  },
  {
    name: 'Vashisht', region: 'Himachal Pradesh', category: 'Backpacking',
    duration: '2-4', budget: 6000, rating: 4.4,
    photo: 'https://picsum.photos/seed/vashisht/600/400',
    emoji: '♨️', badge: 'Hot Springs', badgeColor: '#ef4444',
    accent: '#ef4444', lightBg: '#fef2f2', border: '#fecaca',
    tags: ['Hot Springs', 'Village Stay', 'Budget'], season: 'Mar-Jun',
    desc: 'Quiet village near Manali with hot springs and budget backpacker stays.',
  },
  {
    name: 'Rishikesh', region: 'Uttarakhand', category: 'Backpacking',
    duration: '3-5', budget: 6000, rating: 4.7,
    photo: 'https://picsum.photos/seed/rishikesh2/600/400',
    emoji: '🧘', badge: 'Yoga Capital', badgeColor: '#f59e0b',
    accent: '#f59e0b', lightBg: '#fffbeb', border: '#fcd34d',
    tags: ['Yoga', 'Cheap Stays', 'Rafting'], season: 'Sep-Jun',
    desc: 'Backpacker and yoga capital with ashrams, cheap guesthouses and river rafting.',
  },


  // ── MISSING STATES ────────────────────────────────────────
  {
    name: 'Jagdalpur', region: 'Chhattisgarh', category: 'Nature',
    duration: '3-4', budget: 8000, rating: 4.5,
    photo: 'https://picsum.photos/seed/jagdalpur/600/400',
    emoji: '🌊', badge: 'Waterfall Capital', badgeColor: '#0d9488',
    accent: '#0d9488', lightBg: '#f0fdfa', border: '#99f6e4',
    tags: ['Chitrakote Falls', 'Tribal Culture', 'Bastar'], season: 'Oct-Mar',
    desc: "Chhattisgarh's gem — Chitrakote Falls (India's Niagara) and rich Bastar tribal culture.",
  },
  {
    name: 'Kurukshetra', region: 'Haryana', category: 'Spiritual',
    duration: '1-2', budget: 5000, rating: 4.3,
    photo: 'https://picsum.photos/seed/kurukshetra/600/400',
    emoji: '⚔️', badge: 'Mahabharata Land', badgeColor: '#f97316',
    accent: '#f97316', lightBg: '#fff7ed', border: '#fed7aa',
    tags: ['Gita Jayanti', 'Sacred Tanks', 'History'], season: 'Oct-Mar',
    desc: 'Sacred land of the Mahabharata war — birthplace of the Bhagavad Gita.',
  },
  {
    name: 'Morni Hills', region: 'Haryana', category: 'Hill Station',
    duration: '2-3', budget: 6000, rating: 4.2,
    photo: 'https://picsum.photos/seed/mornihills/600/400',
    emoji: '🌿', badge: 'Hidden Gem', badgeColor: '#16a34a',
    accent: '#16a34a', lightBg: '#f0fdf4', border: '#86efac',
    tags: ['Lakes', 'Trekking', 'Weekend'], season: 'Sep-Jun',
    desc: "Haryana's only hill station — twin lakes, trekking trails and peaceful nature.",
  },
  {
    name: 'Deoghar', region: 'Jharkhand', category: 'Spiritual',
    duration: '2-3', budget: 6000, rating: 4.4,
    photo: 'https://picsum.photos/seed/deoghar/600/400',
    emoji: '🛕', badge: 'Baidyanath Dham', badgeColor: '#f97316',
    accent: '#f97316', lightBg: '#fff7ed', border: '#fed7aa',
    tags: ['Shiva Temple', 'Pilgrimage', 'Jyotirlinga'], season: 'Jul-Aug, Oct-Mar',
    desc: "One of 12 Jyotirlingas — Baidyanath Dham is one of India's holiest Shiva shrines.",
  },
  {
    name: 'Netarhat', region: 'Jharkhand', category: 'Hill Station',
    duration: '2-3', budget: 7000, rating: 4.4,
    photo: 'https://picsum.photos/seed/netarhat/600/400',
    emoji: '🌅', badge: 'Queen of Chotanagpur', badgeColor: '#8b5cf6',
    accent: '#8b5cf6', lightBg: '#f5f3ff', border: '#ddd6fe',
    tags: ['Sunrise', 'Dense Forest', 'Waterfalls'], season: 'Oct-Jun',
    desc: 'Queen of Chotanagpur — stunning sunrises over dense forests and waterfalls.',
  },
  {
    name: 'Aizawl', region: 'Mizoram', category: 'Northeast',
    duration: '3-4', budget: 10000, rating: 4.3,
    photo: 'https://picsum.photos/seed/aizawl/600/400',
    emoji: '🌄', badge: 'Peaceful City', badgeColor: '#6366f1',
    accent: '#6366f1', lightBg: '#f5f3ff', border: '#ddd6fe',
    tags: ['Hilltop City', 'Clean', 'Mizo Culture'], season: 'Oct-Mar',
    desc: "Mizoram's capital perched on a ridge — clean, peaceful and culturally unique.",
  },
  {
    name: 'Phawngpui', region: 'Mizoram', category: 'Northeast',
    duration: '3-4', budget: 11000, rating: 4.5,
    photo: 'https://picsum.photos/seed/phawngpui/600/400',
    emoji: '🏔️', badge: 'Blue Mountain', badgeColor: '#3b82f6',
    accent: '#3b82f6', lightBg: '#eff6ff', border: '#bfdbfe',
    tags: ['Blue Mountain', 'Trekking', 'Rhododendrons'], season: 'Mar-Jun',
    desc: "Mizoram's highest peak — Blue Mountain with rare rhododendrons and stunning views.",
  },
  {
    name: 'Agartala', region: 'Tripura', category: 'Heritage',
    duration: '3-4', budget: 9000, rating: 4.2,
    photo: 'https://picsum.photos/seed/agartala/600/400',
    emoji: '🏯', badge: 'Palace City', badgeColor: '#f59e0b',
    accent: '#f59e0b', lightBg: '#fffbeb', border: '#fcd34d',
    tags: ['Ujjayanta Palace', 'Temples', 'Bangladesh Border'], season: 'Oct-Mar',
    desc: "Tripura's capital with magnificent Ujjayanta Palace and unique temple culture.",
  },
  {
    name: 'Unakoti', region: 'Tripura', category: 'Heritage',
    duration: '2-3', budget: 7000, rating: 4.5,
    photo: 'https://picsum.photos/seed/unakoti/600/400',
    emoji: '🗿', badge: 'Rock Carvings', badgeColor: '#7c3aed',
    accent: '#7c3aed', lightBg: '#f5f3ff', border: '#ddd6fe',
    tags: ['Rock Carvings', 'Shiva', 'Forest'], season: 'Oct-Mar',
    desc: 'Mysterious hilltop Shaivite site with ancient rock carvings deep in forest.',
  },
  {
    name: 'Chandigarh', region: 'Chandigarh', category: 'City',
    duration: '2-3', budget: 8000, rating: 4.3,
    photo: 'https://picsum.photos/seed/chandigarh/600/400',
    emoji: '🌳', badge: 'Garden City', badgeColor: '#16a34a',
    accent: '#16a34a', lightBg: '#f0fdf4', border: '#86efac',
    tags: ['Rock Garden', 'Sukhna Lake', 'Planned City'], season: 'Oct-Mar',
    desc: "India's most planned city — Rock Garden, Sukhna Lake and Le Corbusier architecture.",
  },
  {
    name: 'Daman', region: 'Daman & Diu', category: 'Beach',
    duration: '2-3', budget: 7000, rating: 4.1,
    photo: 'https://picsum.photos/seed/daman/600/400',
    emoji: '🏖️', badge: 'Portuguese Vibes', badgeColor: '#0ea5e9',
    accent: '#0ea5e9', lightBg: '#eff6ff', border: '#bae6fd',
    tags: ['Beach', 'Portuguese Fort', 'Seafood'], season: 'Oct-Mar',
    desc: 'Former Portuguese territory with colonial forts, beaches and affordable getaway.',
  },
  {
    name: 'Diu', region: 'Daman & Diu', category: 'Beach',
    duration: '2-3', budget: 7000, rating: 4.3,
    photo: 'https://picsum.photos/seed/diu/600/400',
    emoji: '🏰', badge: 'Island Fort', badgeColor: '#6366f1',
    accent: '#6366f1', lightBg: '#f5f3ff', border: '#ddd6fe',
    tags: ['Fort', 'Beach', 'Portuguese Heritage'], season: 'Oct-Mar',
    desc: 'Island gem with a massive Portuguese fort, white sandy beaches and calm vibes.',
  },

  // ── CITY BREAKS ───────────────────────────────────────────
  {
    name: 'Mumbai', region: 'Maharashtra', category: 'City',
    duration: '3-4', budget: 12000, rating: 4.5,
    photo: 'https://picsum.photos/seed/mumbai/600/400',
    emoji: '🏙️', badge: 'Maximum City', badgeColor: '#f59e0b',
    accent: '#f59e0b', lightBg: '#fffbeb', border: '#fcd34d',
    tags: ['Bollywood', 'Street Food', 'Gateway of India'], season: 'Nov-Feb',
    desc: 'City of Dreams — Bollywood, street food, colonial architecture and sea face.',
  },
  {
    name: 'Delhi', region: 'Delhi', category: 'City',
    duration: '3-4', budget: 10000, rating: 4.4,
    photo: 'https://picsum.photos/seed/delhi/600/400',
    emoji: '🕌', badge: 'Capital', badgeColor: '#ef4444',
    accent: '#ef4444', lightBg: '#fef2f2', border: '#fecaca',
    tags: ['History', 'Street Food', 'Monuments'], season: 'Oct-Mar',
    desc: 'India\'s capital — layers of history from Mughal to colonial with incredible food.',
  },
  {
    name: 'Kolkata', region: 'West Bengal', category: 'City',
    duration: '3-4', budget: 8000, rating: 4.5,
    photo: 'https://picsum.photos/seed/kolkata/600/400',
    emoji: '🎨', badge: 'Cultural Capital', badgeColor: '#ec4899',
    accent: '#ec4899', lightBg: '#fdf2f8', border: '#fbcfe8',
    tags: ['Durga Puja', 'Art', 'Mishti Doi'], season: 'Oct-Feb',
    desc: 'City of Joy — cultural capital with Durga Puja, art galleries and street food.',
  },
  {
    name: 'Bangalore', region: 'Karnataka', category: 'City',
    duration: '2-3', budget: 10000, rating: 4.3,
    photo: 'https://picsum.photos/seed/bangalore/600/400',
    emoji: '🌆', badge: 'Silicon Valley', badgeColor: '#3b82f6',
    accent: '#3b82f6', lightBg: '#eff6ff', border: '#bfdbfe',
    tags: ['Pubs', 'Gardens', 'Tech City'], season: 'All Year',
    desc: 'Garden City and tech hub — pleasant weather, pub culture and green spaces.',
  },
  {
    name: 'Hyderabad', region: 'Telangana', category: 'City',
    duration: '2-3', budget: 9000, rating: 4.5,
    photo: 'https://picsum.photos/seed/hyderabad/600/400',
    emoji: '🍖', badge: 'Biryani Capital', badgeColor: '#f97316',
    accent: '#f97316', lightBg: '#fff7ed', border: '#fed7aa',
    tags: ['Biryani', 'Charminar', 'Golconda'], season: 'Oct-Mar',
    desc: 'City of Nizams with world-famous biryani, Charminar and Golconda Fort.',
  },
  {
    name: 'Chennai', region: 'Tamil Nadu', category: 'City',
    duration: '2-3', budget: 9000, rating: 4.3,
    photo: 'https://picsum.photos/seed/chennai/600/400',
    emoji: '🎭', badge: 'Cultural Hub', badgeColor: '#f59e0b',
    accent: '#f59e0b', lightBg: '#fffbeb', border: '#fcd34d',
    tags: ['Temples', 'Marina Beach', 'Classical Music'], season: 'Nov-Feb',
    desc: 'Gateway to South India with Marina Beach, classical arts and Dravidian temples.',
  },
  {
    name: 'Ahmedabad', region: 'Gujarat', category: 'City',
    duration: '2-3', budget: 8000, rating: 4.4,
    photo: 'https://picsum.photos/seed/ahmedabad/600/400',
    emoji: '🪁', badge: 'Heritage City', badgeColor: '#f59e0b',
    accent: '#f59e0b', lightBg: '#fffbeb', border: '#fcd34d',
    tags: ['Pol Houses', 'Navratri', 'Kite Festival'], season: 'Oct-Mar',
    desc: 'UNESCO World Heritage City with ancient pol houses and vibrant Navratri.',
  },
  {
    name: 'Pune', region: 'Maharashtra', category: 'City',
    duration: '2-3', budget: 9000, rating: 4.3,
    photo: 'https://picsum.photos/seed/pune/600/400',
    emoji: '🎓', badge: 'Oxford of East', badgeColor: '#8b5cf6',
    accent: '#8b5cf6', lightBg: '#f5f3ff', border: '#ddd6fe',
    tags: ['Forts', 'Cafes', 'Osho Ashram'], season: 'Oct-Mar',
    desc: 'Cultural capital of Maharashtra with Shivaji forts, cafes and Osho Ashram.',
  },
]

// ── Categories ────────────────────────────────────────────
const CATEGORIES = [
  { id: 'all',          label: 'All India',     icon: <Globe size={14} />,    color: '#0d9488' },
  { id: 'Hill Station', label: 'Hill Stations', icon: <Mountain size={14} />, color: '#8b5cf6' },
  { id: 'Beach',        label: 'Beaches',       icon: <Waves size={14} />,    color: '#0ea5e9' },
  { id: 'Heritage',     label: 'Heritage',      icon: <Sun size={14} />,      color: '#f59e0b' },
  { id: 'Adventure',    label: 'Adventure',     icon: <Compass size={14} />,  color: '#ef4444' },
  { id: 'Nature',       label: 'Nature',        icon: <Sparkles size={14} />, color: '#22c55e' },
  { id: 'Spiritual',    label: 'Spiritual',     icon: <Star size={14} />,     color: '#f97316' },
  { id: 'Northeast',    label: 'Northeast',     icon: <MapPin size={14} />,   color: '#6366f1' },
  { id: 'Honeymoon',    label: 'Honeymoon',     icon: <Heart size={14} />,    color: '#ec4899' },
  { id: 'Weekend',      label: 'Weekends',      icon: <Zap size={14} />,      color: '#3b82f6' },
  { id: 'Desert',       label: 'Desert',        icon: <Sun size={14} />,      color: '#d97706' },
  { id: 'Backpacking',  label: 'Backpacking',   icon: <TrendingUp size={14} />, color: '#16a34a' },
  { id: 'City',         label: 'City Breaks',   icon: <MapPin size={14} />,   color: '#64748b' },
]

const BUDGET_FILTERS = [
  { id: 'all',   label: 'Any Budget' },
  { id: 'low',   label: 'Under ₹8K',   min: 0,     max: 8000  },
  { id: 'mid',   label: '₹8K–₹15K',   min: 8000,  max: 15000 },
  { id: 'high',  label: '₹15K–₹25K',  min: 15000, max: 25000 },
  { id: 'ultra', label: 'Above ₹25K', min: 25000, max: 999999 },
]

const DURATION_FILTERS = [
  { id: 'all',    label: 'Any Duration' },
  { id: 'short',  label: '1–3 Days',  min: 1, max: 3  },
  { id: 'medium', label: '4–6 Days',  min: 4, max: 6  },
  { id: 'long',   label: '7+ Days',   min: 7, max: 99 },
]

export default function ExplorePage() {
  const navigate  = useNavigate()
  const [category, setCategory] = useState('all')
  const [budget,   setBudget]   = useState('all')
  const [duration, setDuration] = useState('all')
  const [search,   setSearch]   = useState('')
  const [saved,    setSaved]    = useState([])

  const filtered = ALL_DESTINATIONS.filter(d => {
    if (category !== 'all' && d.category !== category) return false
    if (search) {
      const q = search.toLowerCase()
      if (!d.name.toLowerCase().includes(q) &&
          !d.region.toLowerCase().includes(q) &&
          !d.tags.some(t => t.toLowerCase().includes(q)) &&
          !d.desc.toLowerCase().includes(q)) return false
    }
    if (budget !== 'all') {
      const bf = BUDGET_FILTERS.find(b => b.id === budget)
      if (bf && (d.budget < bf.min || d.budget > bf.max)) return false
    }
    if (duration !== 'all') {
      const df = DURATION_FILTERS.find(d2 => d2.id === duration)
      const minD = parseInt(d.duration.split('-')[0])
      if (df && (minD < df.min || minD > df.max)) return false
    }
    return true
  })

  function handlePlanThis(dest) {
    navigate('/dashboard', {
      state: { prefill: { destination: dest.name, planMode: 'detailed', destinationMode: 'specific' } }
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .dest-card:hover { transform: translateY(-6px); box-shadow: 0 20px 48px rgba(0,0,0,0.12) !important; }
        .dest-card { transition: all 0.28s cubic-bezier(0.4,0,0.2,1); }
        .plan-btn:hover { filter: brightness(1.08); }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <Navbar />

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0f172a 100%)', padding: '60px 24px 48px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(13,148,136,0.15)', border: '1px solid rgba(13,148,136,0.3)', borderRadius: '20px', padding: '5px 14px', marginBottom: '18px' }}>
          <TrendingUp size={12} color="#0d9488" />
          <span style={{ fontSize: '11px', color: '#0d9488', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Explore India</span>
        </div>
        <h1 style={{ fontSize: 'clamp(28px,5vw,48px)', fontWeight: '900', color: 'white', letterSpacing: '-1px', marginBottom: '12px', lineHeight: 1.1 }}>
          Where do you want to go?
        </h1>
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', marginBottom: '28px', maxWidth: '480px', margin: '0 auto 28px' }}>
          {ALL_DESTINATIONS.length}+ handpicked destinations across every state in India
        </p>
        {/* Search */}
        <div style={{ maxWidth: '500px', margin: '0 auto', position: 'relative' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search destinations, states, activities..."
            style={{ width: '100%', padding: '14px 16px 14px 44px', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '14px', color: 'white', fontSize: '14px', fontFamily: 'Inter, sans-serif', outline: 'none' }}
            onFocus={e => e.currentTarget.style.borderColor = '#0d9488'}
            onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}
          />
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Category pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setCategory(cat.id)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '24px', border: `1.5px solid ${category === cat.id ? cat.color : '#e2e8f0'}`, background: category === cat.id ? cat.color : 'white', color: category === cat.id ? 'white' : '#64748b', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Inter, sans-serif', boxShadow: category === cat.id ? `0 4px 14px ${cat.color}40` : 'none' }}>
              {cat.icon}{cat.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b' }}>
            <Filter size={13} />
            <span style={{ fontSize: '12px', fontWeight: '600' }}>Filter:</span>
          </div>
          <select value={budget} onChange={e => setBudget(e.target.value)}
            style={{ padding: '7px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', fontWeight: '600', color: '#374151', background: 'white', cursor: 'pointer', fontFamily: 'Inter, sans-serif', outline: 'none' }}>
            {BUDGET_FILTERS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
          <select value={duration} onChange={e => setDuration(e.target.value)}
            style={{ padding: '7px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', fontWeight: '600', color: '#374151', background: 'white', cursor: 'pointer', fontFamily: 'Inter, sans-serif', outline: 'none' }}>
            {DURATION_FILTERS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
          <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: 'auto' }}>
            {filtered.length} of {ALL_DESTINATIONS.length} destinations
          </span>
        </div>

        {/* No results */}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '64px 0', color: '#94a3b8' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🗺️</div>
            <p style={{ fontSize: '15px', fontWeight: '600' }}>No destinations found</p>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>Try adjusting your filters</p>
          </div>
        )}

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '20px' }}>
          {filtered.map((dest, i) => (
            <div key={dest.name} className="dest-card"
              style={{ background: 'white', borderRadius: '20px', overflow: 'hidden', border: '1.5px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', animation: `fadeUp ${0.1 + (i % 12) * 0.03}s ease` }}>

              {/* Photo */}
              <div style={{ position: 'relative', height: '190px', background: '#1e293b', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '64px', opacity: 0.15 }}>{dest.emoji}</span>
                </div>
                <img src={dest.photo} alt={dest.name}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.06)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  onError={e => e.currentTarget.style.opacity = '0'}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,0.5) 0%,transparent 60%)' }} />
                <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
                  <span style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', color: 'white', fontSize: '10px', fontWeight: '800', padding: '3px 9px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: dest.badgeColor, display: 'inline-block' }} />
                    {dest.badge}
                  </span>
                </div>
                <button onClick={e => { e.stopPropagation(); setSaved(p => p.includes(dest.name) ? p.filter(n => n !== dest.name) : [...p, dest.name]) }}
                  style={{ position: 'absolute', top: '8px', right: '8px', width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(255,255,255,0.9)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Heart size={13} fill={saved.includes(dest.name) ? '#ef4444' : 'none'} color={saved.includes(dest.name) ? '#ef4444' : '#64748b'} />
                </button>
                <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(255,255,255,0.95)', padding: '3px 8px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Star size={9} fill="#f59e0b" color="#f59e0b" />
                  <span style={{ fontSize: '10px', fontWeight: '800', color: '#92400e' }}>{dest.rating}</span>
                </div>
                <div style={{ position: 'absolute', bottom: '10px', left: '10px' }}>
                  <span style={{ background: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.8)', fontSize: '9px', fontWeight: '600', padding: '2px 7px', borderRadius: '10px' }}>{dest.season}</span>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: '16px 18px 18px' }}>
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: '900', color: '#0f172a', margin: 0 }}>{dest.name}</h3>
                    <span style={{ fontSize: '11px', color: '#64748b', flexShrink: 0, marginLeft: '8px', marginTop: '2px' }}>{dest.region}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0', lineHeight: 1.5 }}>{dest.desc}</p>
                </div>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  {dest.tags.map(tag => (
                    <span key={tag} style={{ padding: '2px 8px', background: dest.lightBg, border: `1px solid ${dest.border}`, borderRadius: '20px', fontSize: '10px', fontWeight: '700', color: dest.accent }}>{tag}</span>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', gap: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={10} color="#94a3b8" />
                      <span style={{ fontSize: '11px', color: '#64748b' }}>{dest.duration} days</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>from</span>
                      <span style={{ fontSize: '13px', fontWeight: '800', color: dest.accent }}>₹{dest.budget.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <button className="plan-btn" onClick={() => handlePlanThis(dest)}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 14px', borderRadius: '10px', background: dest.accent, color: 'white', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Inter, sans-serif', boxShadow: `0 3px 10px ${dest.accent}40` }}>
                    Plan This <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div style={{ textAlign: 'center', marginTop: '48px', padding: '36px', background: 'white', borderRadius: '24px', border: '1.5px solid #e2e8f0' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>✈️</div>
          <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: '0 0 8px' }}>
            Don't see your destination?
          </h3>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 20px' }}>
            Our AI plans trips to anywhere in India — just describe what you want
          </p>
          <button onClick={() => navigate('/dashboard')}
            style={{ padding: '13px 28px', background: 'linear-gradient(135deg,#0d9488,#0284c7)', color: 'white', border: 'none', borderRadius: '14px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 16px rgba(13,148,136,0.35)' }}>
            Plan a Custom Trip with AI ✨
          </button>
        </div>
      </div>
    </div>
  )
}
