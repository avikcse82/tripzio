from fastapi import APIRouter, HTTPException
from core.config import settings
import httpx
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/hotels", tags=["Hotels"])

TIER_DESCRIPTIONS = {
    "bronze": "budget guesthouses and hostels (₹500-1,500/night)",
    "silver": "2-3 star hotels and heritage guesthouses (₹1,500-4,000/night)",
    "gold": "4-star hotels and premium resorts (₹5,000-15,000/night)",
    "diamond": "5-star hotels and luxury resorts (₹12,000-30,000/night)",
    "platinum": "ultra-luxury properties and private estates (₹25,000+/night)"
}

# Comprehensive hotel knowledge base
HOTEL_KNOWLEDGE = {
    "darjeeling": {
        "bronze": [
            {"name": "Hotel Pagoda", "area": "Laden La Road, Darjeeling", "type": "Budget Hotel", "price_range": "₹800-1,500/night", "rating": "4.0", "highlight": "Central location, clean rooms, mountain views"},
            {"name": "Dekeling Hotel", "area": "Gandhi Road, Darjeeling", "type": "Heritage Guesthouse", "price_range": "₹1,200-2,000/night", "rating": "4.1", "highlight": "Old-world charm, family run, authentic experience"},
            {"name": "Hotel Valentino", "area": "Rockville, Darjeeling", "type": "Budget Hotel", "price_range": "₹700-1,200/night", "rating": "3.9", "highlight": "Value for money, close to mall road"},
            {"name": "Zostel Darjeeling", "area": "Gandhi Road", "type": "Hostel", "price_range": "₹400-800/bed", "rating": "4.2", "highlight": "Social atmosphere, rooftop views, travel community"},
            {"name": "Hotel Chancellor", "area": "The Mall, Darjeeling", "type": "Budget Hotel", "price_range": "₹900-1,600/night", "rating": "3.8", "highlight": "Mall road access, basic amenities, good location"},
        ],
        "silver": [
            {"name": "Sinclairs Darjeeling", "area": "Gandhi Road, Darjeeling", "type": "3-Star Hotel", "price_range": "₹3,500-5,500/night", "rating": "4.2", "highlight": "City landmark, stunning Kanchenjunga views"},
            {"name": "Cedar Inn", "area": "Zakir Hussain Road, Darjeeling", "type": "Boutique Hotel", "price_range": "₹2,800-4,500/night", "rating": "4.1", "highlight": "Colonial architecture, peaceful garden"},
            {"name": "Hotel Shangrila", "area": "Nehru Road, Darjeeling", "type": "Hotel", "price_range": "₹2,000-3,500/night", "rating": "4.0", "highlight": "Walking distance to Chowrasta, good restaurant"},
            {"name": "Central Heritage Resort", "area": "Robertson Road, Darjeeling", "type": "Heritage Hotel", "price_range": "₹3,000-5,000/night", "rating": "4.1", "highlight": "Heritage building, centrally located, mountain views"},
            {"name": "Hotel Revolver", "area": "Gandhi Road, Darjeeling", "type": "Boutique Hotel", "price_range": "₹2,500-4,000/night", "rating": "4.0", "highlight": "Beatles themed, quirky decor, great location"},
        ],
        "gold": [
            {"name": "Mayfair Darjeeling", "area": "Jawahar Road West, Darjeeling", "type": "5-Star Heritage", "price_range": "₹8,000-14,000/night", "rating": "4.6", "highlight": "Iconic colonial property, magnificent mountain views"},
            {"name": "Windamere Hotel", "area": "Observatory Hill, Darjeeling", "type": "Heritage Hotel", "price_range": "₹6,000-10,000/night", "rating": "4.4", "highlight": "Victorian-era charm, Raj-era experience"},
            {"name": "Glenburn Tea Estate", "area": "Glenburn, Darjeeling", "type": "Luxury Boutique", "price_range": "₹15,000-25,000/night", "rating": "4.8", "highlight": "Working tea estate, exclusive bungalow stay"},
            {"name": "The Elgin Darjeeling", "area": "HD Lama Road, Darjeeling", "type": "Heritage Luxury", "price_range": "₹7,000-12,000/night", "rating": "4.5", "highlight": "1887 heritage property, world-class cuisine"},
            {"name": "Kunga Residency", "area": "CR Das Road, Darjeeling", "type": "Premium Boutique", "price_range": "₹5,000-8,000/night", "rating": "4.3", "highlight": "Himalayan views, cozy rooms, excellent service"},
        ],
        "diamond": [
            {"name": "Mayfair Darjeeling", "area": "Jawahar Road West", "type": "5-Star Heritage", "price_range": "₹12,000-20,000/night", "rating": "4.6", "highlight": "Best luxury in Darjeeling, impeccable service"},
            {"name": "Glenburn Tea Estate", "area": "Glenburn, Darjeeling", "type": "Luxury Estate", "price_range": "₹18,000-30,000/night", "rating": "4.8", "highlight": "Ultra exclusive, private butler, tea estate walks"},
            {"name": "The Elgin Darjeeling", "area": "HD Lama Road, Darjeeling", "type": "Heritage Luxury", "price_range": "₹10,000-18,000/night", "rating": "4.5", "highlight": "1887 heritage property, world-class cuisine"},
            {"name": "Windamere Hotel Suite", "area": "Observatory Hill", "type": "Heritage Suite", "price_range": "₹9,000-15,000/night", "rating": "4.4", "highlight": "Suite experience, Victorian charm, butler service"},
        ],
        "platinum": [
            {"name": "Glenburn Tea Estate", "area": "Glenburn, Darjeeling", "type": "Ultra Luxury Estate", "price_range": "₹25,000-45,000/night", "rating": "4.9", "highlight": "India's finest tea estate, fully exclusive"},
            {"name": "Mayfair Presidential Suite", "area": "Jawahar Road West", "type": "Presidential Suite", "price_range": "₹20,000-35,000/night", "rating": "4.7", "highlight": "Presidential suite, private dining, spa"},
        ]
    },
    "gangtok": {
        "bronze": [
            {"name": "Zostel Gangtok", "area": "Arithang, Gangtok", "type": "Hostel", "price_range": "₹400-700/bed", "rating": "4.3", "highlight": "Best budget option, social vibe, stunning valley views"},
            {"name": "Hotel Tibet", "area": "Palzor Stadium Road, Gangtok", "type": "Budget Hotel", "price_range": "₹1,200-2,000/night", "rating": "4.2", "highlight": "Tibetan hospitality, central location, clean rooms"},
            {"name": "Modern Central Lodge", "area": "MG Marg, Gangtok", "type": "Lodge", "price_range": "₹800-1,500/night", "rating": "3.9", "highlight": "Right on MG Marg, walking distance to everything"},
            {"name": "Hotel Denjong", "area": "Tibet Road, Gangtok", "type": "Budget Hotel", "price_range": "₹1,000-1,800/night", "rating": "4.0", "highlight": "Mountain views, Tibetan decor, good food"},
            {"name": "Netuk House", "area": "Tibet Road, Gangtok", "type": "Guesthouse", "price_range": "₹900-1,600/night", "rating": "4.1", "highlight": "Family run, home food, authentic Sikkimese experience"},
        ],
        "silver": [
            {"name": "Chumbi Residency", "area": "Tibet Road, Gangtok", "type": "3-Star Hotel", "price_range": "₹3,000-5,500/night", "rating": "4.3", "highlight": "Panoramic Kanchenjunga views, excellent restaurant"},
            {"name": "Hotel Tashi Delek", "area": "MG Marg, Gangtok", "type": "Heritage Hotel", "price_range": "₹2,500-4,500/night", "rating": "4.2", "highlight": "Iconic Gangtok hotel, prime MG Marg location"},
            {"name": "Mayfair Spa Resort Gangtok", "area": "Zero Point, Gangtok", "type": "Resort", "price_range": "₹4,000-7,000/night", "rating": "4.4", "highlight": "Spa, pool, mountain views, luxurious rooms"},
            {"name": "Hotel Sonam Delek", "area": "Tibet Road, Gangtok", "type": "Hotel", "price_range": "₹2,000-3,500/night", "rating": "4.0", "highlight": "Budget-friendly, clean, well-located"},
            {"name": "Lemon Tree Premier Gangtok", "area": "Sichey, Gangtok", "type": "3-Star Hotel", "price_range": "₹3,500-6,000/night", "rating": "4.2", "highlight": "Modern amenities, great service, valley views"},
        ],
        "gold": [
            {"name": "Mayfair Spa Resort & Casino", "area": "Zero Point, Gangtok", "type": "5-Star Resort", "price_range": "₹8,000-14,000/night", "rating": "4.6", "highlight": "Gangtok's finest, casino, multiple restaurants, spa"},
            {"name": "Norkhill Hotel", "area": "Paljor Stadium Road, Gangtok", "type": "Heritage Luxury", "price_range": "₹6,000-10,000/night", "rating": "4.4", "highlight": "Built for royalty, heritage property, stunning views"},
            {"name": "Taj Tashi Gangtok", "area": "BL Sinha Road, Gangtok", "type": "5-Star Luxury", "price_range": "₹10,000-18,000/night", "rating": "4.7", "highlight": "Gangtok's most luxurious, Himalayan architecture, spa"},
            {"name": "Elgin Mount Pandim", "area": "Pelling, near Gangtok", "type": "Heritage Resort", "price_range": "₹7,000-12,000/night", "rating": "4.5", "highlight": "Heritage property, mountain views, colonial charm"},
        ],
        "diamond": [
            {"name": "Taj Tashi Gangtok", "area": "BL Sinha Road, Gangtok", "type": "5-Star Luxury", "price_range": "₹15,000-28,000/night", "rating": "4.7", "highlight": "Sikkim's crown jewel hotel, butler service, helipad"},
            {"name": "Mayfair Spa Resort", "area": "Zero Point, Gangtok", "type": "Luxury Resort", "price_range": "₹12,000-22,000/night", "rating": "4.6", "highlight": "Premium suites, casino, spa, mountain views"},
            {"name": "Norkhill Hotel Suite", "area": "Paljor Stadium Road", "type": "Heritage Suite", "price_range": "₹10,000-18,000/night", "rating": "4.5", "highlight": "Royal suite, heritage experience, impeccable service"},
        ],
        "platinum": [
            {"name": "Taj Tashi Presidential Suite", "area": "Gangtok", "type": "Ultra Luxury", "price_range": "₹25,000-50,000/night", "rating": "4.9", "highlight": "Presidential suite, private butler, helicopter transfer"},
        ]
    },
    "manali": {
        "bronze": [
            {"name": "Zostel Manali", "area": "Old Manali", "type": "Hostel", "price_range": "₹400-800/bed, ₹1,500-2,500 pvt", "rating": "4.2", "highlight": "Social atmosphere, great for solo travelers"},
            {"name": "Hotel Rohtang View", "area": "Mall Road, Manali", "type": "Budget Hotel", "price_range": "₹800-1,500/night", "rating": "4.0", "highlight": "Mountain views, central location"},
            {"name": "Sunshine Guest House", "area": "Old Manali", "type": "Guesthouse", "price_range": "₹600-1,200/night", "rating": "3.9", "highlight": "Backpacker favourite, riverside location"},
            {"name": "Apple View Guesthouse", "area": "Old Manali", "type": "Guesthouse", "price_range": "₹700-1,300/night", "rating": "4.0", "highlight": "Apple orchard views, quiet location, home food"},
            {"name": "Hotel Snow Flake", "area": "Model Town, Manali", "type": "Budget Hotel", "price_range": "₹900-1,600/night", "rating": "3.8", "highlight": "Near bus stand, basic amenities, good value"},
        ],
        "silver": [
            {"name": "Snow Valley Resorts", "area": "Hadimba Road, Manali", "type": "3-Star Resort", "price_range": "₹3,000-5,000/night", "rating": "4.3", "highlight": "Forest setting, mountain views, good amenities"},
            {"name": "Hotel Piccadily", "area": "The Mall, Manali", "type": "Hotel", "price_range": "₹2,500-4,000/night", "rating": "4.0", "highlight": "Prime location, river views, well-maintained"},
            {"name": "Apple Country Resort", "area": "Aleo, Manali", "type": "Resort", "price_range": "₹2,800-4,500/night", "rating": "4.1", "highlight": "Apple orchard surroundings, peaceful setting"},
            {"name": "Hotel John Banon", "area": "The Mall, Manali", "type": "Heritage Hotel", "price_range": "₹2,200-3,800/night", "rating": "4.0", "highlight": "Colonial bungalow, character-filled, great location"},
            {"name": "Solang Valley Resort", "area": "Solang Valley", "type": "Mountain Resort", "price_range": "₹3,500-6,000/night", "rating": "4.2", "highlight": "Ski slope views, adventure activities base"},
        ],
        "gold": [
            {"name": "Span Resort & Spa", "area": "NH-21, Kullu-Manali Highway", "type": "Luxury Resort", "price_range": "₹8,000-14,000/night", "rating": "4.5", "highlight": "Riverside luxury, world-class spa, fine dining"},
            {"name": "Johnson Hotel & Restaurant", "area": "Circuit House Road, Manali", "type": "Premium Hotel", "price_range": "₹5,000-9,000/night", "rating": "4.4", "highlight": "Colonial charm, famous restaurant, great service"},
            {"name": "Manuallaya Resort", "area": "Dhalpur, Manali", "type": "Heritage Resort", "price_range": "₹6,000-11,000/night", "rating": "4.3", "highlight": "Heritage manor, Himalayan cuisine, private valley"},
            {"name": "The Himalayan Hotel", "area": "Chadiyari, Manali", "type": "Boutique Resort", "price_range": "₹5,500-9,500/night", "rating": "4.3", "highlight": "Seclusion, apple orchards, mountain serenity"},
        ],
        "diamond": [
            {"name": "Span Resort & Spa", "area": "Kullu-Manali Highway", "type": "5-Star Luxury", "price_range": "₹12,000-20,000/night", "rating": "4.6", "highlight": "Best luxury resort, riverfront suites, full spa"},
            {"name": "Manuallaya Resort Premium", "area": "Dhalpur, Manali", "type": "Heritage Luxury", "price_range": "₹10,000-18,000/night", "rating": "4.5", "highlight": "Heritage manor, private valley, butler service"},
        ],
        "platinum": [
            {"name": "Span Resort Presidential", "area": "Kullu-Manali Highway", "type": "Ultra Luxury", "price_range": "₹18,000-32,000/night", "rating": "4.7", "highlight": "Complete privacy, helicopter access available"},
        ]
    },
    "goa": {
        "bronze": [
            {"name": "Zostel Goa", "area": "Anjuna Beach, North Goa", "type": "Hostel", "price_range": "₹500-900/bed", "rating": "4.3", "highlight": "Best social hostel, beach walks, party scene"},
            {"name": "Jungle Book Hostel", "area": "Arambol, North Goa", "type": "Hostel", "price_range": "₹400-800/bed", "rating": "4.1", "highlight": "Hippie vibe, yoga, acoustic music nights"},
            {"name": "Hotel Mandovi", "area": "Panaji, Goa", "type": "Budget Hotel", "price_range": "₹1,200-2,500/night", "rating": "3.9", "highlight": "City center, Mandovi river views"},
            {"name": "Casa Palacio Siolim", "area": "Siolim, North Goa", "type": "Heritage Guesthouse", "price_range": "₹1,500-3,000/night", "rating": "4.1", "highlight": "Portuguese heritage home, quiet village setting"},
            {"name": "Sudha Guest House", "area": "Calangute, Goa", "type": "Guesthouse", "price_range": "₹800-1,800/night", "rating": "3.8", "highlight": "Beach access, budget friendly, clean"},
        ],
        "silver": [
            {"name": "Alila Diwa Goa", "area": "Majorda, South Goa", "type": "4-Star Resort", "price_range": "₹6,000-10,000/night", "rating": "4.5", "highlight": "Infinity pool, paddy field views, excellent restaurant"},
            {"name": "Acacia Hotel & Spa", "area": "Calangute, North Goa", "type": "Hotel", "price_range": "₹3,500-6,000/night", "rating": "4.2", "highlight": "Beach access, spa, water sports arranged"},
            {"name": "Park Hyatt Goa", "area": "Arossim, South Goa", "type": "5-Star Resort", "price_range": "₹8,000-14,000/night", "rating": "4.4", "highlight": "Beachfront, 3 pools, multiple restaurants"},
            {"name": "Kenilworth Beach Resort", "area": "Utorda, South Goa", "type": "4-Star Resort", "price_range": "₹5,000-8,000/night", "rating": "4.2", "highlight": "Private beach, 2 pools, excellent seafood"},
            {"name": "Country Inn Goa", "area": "Candolim, North Goa", "type": "3-Star Hotel", "price_range": "₹3,000-5,000/night", "rating": "4.0", "highlight": "Walking to beach, good pool, consistent service"},
        ],
        "gold": [
            {"name": "Taj Exotica Resort & Spa", "area": "Benaulim, South Goa", "type": "5-Star Luxury", "price_range": "₹15,000-25,000/night", "rating": "4.7", "highlight": "Best resort in Goa, private beach, world-class spa"},
            {"name": "The Leela Goa", "area": "Cavelossim, South Goa", "type": "5-Star Luxury", "price_range": "₹12,000-22,000/night", "rating": "4.6", "highlight": "18-hole golf, lagoon pool, multiple cuisines"},
            {"name": "W Goa", "area": "Vagator, North Goa", "type": "5-Star Lifestyle", "price_range": "₹10,000-18,000/night", "rating": "4.5", "highlight": "Trendy, cliffside infinity pool, party scene"},
            {"name": "Grand Hyatt Goa", "area": "Bambolim, Goa", "type": "5-Star Luxury", "price_range": "₹9,000-16,000/night", "rating": "4.4", "highlight": "Massive resort, 7 restaurants, huge pool"},
        ],
        "diamond": [
            {"name": "Taj Exotica Resort & Spa", "area": "Benaulim Beach, Goa", "type": "5-Star Ultra", "price_range": "₹20,000-40,000/night", "rating": "4.8", "highlight": "Goa's most celebrated resort"},
            {"name": "The Leela Goa", "area": "Cavelossim Beach", "type": "5-Star Luxury", "price_range": "₹18,000-35,000/night", "rating": "4.7", "highlight": "Beachfront palace, butler service"},
            {"name": "Four Seasons Goa", "area": "Fort Aguada, Goa", "type": "Ultra Luxury", "price_range": "₹25,000-50,000/night", "rating": "4.8", "highlight": "Clifftop luxury, private plunge pools, exclusive"},
        ],
        "platinum": [
            {"name": "Taj Exotica Presidential Villa", "area": "Benaulim, South Goa", "type": "Ultra Luxury", "price_range": "₹35,000-70,000/night", "rating": "4.9", "highlight": "Private villa, butler, beach butler"},
        ]
    },
    "jaipur": {
        "bronze": [
            {"name": "Moustache Jaipur", "area": "Near Hawa Mahal", "type": "Hostel", "price_range": "₹400-700/bed", "rating": "4.4", "highlight": "Rooftop café with Hawa Mahal views, social vibe"},
            {"name": "Hotel Pearl Palace", "area": "Hathroi Fort Area", "type": "Budget Hotel", "price_range": "₹800-1,800/night", "rating": "4.2", "highlight": "Award-winning budget hotel, rooftop restaurant"},
            {"name": "Zostel Jaipur", "area": "Near Pink City", "type": "Hostel", "price_range": "₹350-600/bed", "rating": "4.1", "highlight": "Heritage building, cultural events, city tours"},
            {"name": "Hotel Arya Niwas", "area": "Sansar Chandra Road, Jaipur", "type": "Heritage Hotel", "price_range": "₹1,500-3,000/night", "rating": "4.0", "highlight": "Old Jaipur charm, garden, good value"},
            {"name": "Zostel Plus Jaipur", "area": "Civil Lines, Jaipur", "type": "Upscale Hostel", "price_range": "₹600-900/bed", "rating": "4.2", "highlight": "Pool, social events, private rooms available"},
        ],
        "silver": [
            {"name": "Umaid Bhawan Heritage", "area": "Bani Park, Jaipur", "type": "Heritage Hotel", "price_range": "₹3,500-6,000/night", "rating": "4.3", "highlight": "150-year heritage haveli, rooftop dining"},
            {"name": "Hotel Diggi Palace", "area": "SMS Hospital Road", "type": "Heritage Hotel", "price_range": "₹2,500-5,000/night", "rating": "4.2", "highlight": "Royal family property, garden, authentic Rajasthani"},
            {"name": "Alsisar Haveli", "area": "Sansar Chandra Road", "type": "Heritage Haveli", "price_range": "₹4,000-7,000/night", "rating": "4.4", "highlight": "200-year-old haveli, frescoes, courtyards"},
            {"name": "Shahpura House", "area": "Devi Marg, Bani Park", "type": "Heritage Hotel", "price_range": "₹3,000-5,500/night", "rating": "4.3", "highlight": "Painted frescoes, cultural performances, rooftop"},
            {"name": "Madhuban Hotel", "area": "D-237 Behari Marg, Jaipur", "type": "Boutique Hotel", "price_range": "₹2,000-4,000/night", "rating": "4.0", "highlight": "Peaceful garden, heritage architecture, good food"},
        ],
        "gold": [
            {"name": "Taj Rambagh Palace", "area": "Bhawani Singh Road, Jaipur", "type": "5-Star Palace Hotel", "price_range": "₹25,000-45,000/night", "rating": "4.8", "highlight": "Former royal palace, Jaipur's crown jewel"},
            {"name": "Samode Palace", "area": "Samode Village", "type": "Heritage Palace", "price_range": "₹12,000-22,000/night", "rating": "4.6", "highlight": "Stunning frescoes, royal dining, village experience"},
            {"name": "ITC Rajputana", "area": "Palace Road, Jaipur", "type": "5-Star Luxury", "price_range": "₹8,000-15,000/night", "rating": "4.5", "highlight": "Rajput architecture, Bukhara restaurant, pool"},
            {"name": "Trident Jaipur", "area": "Amer Road, Jaipur", "type": "5-Star Hotel", "price_range": "₹7,000-12,000/night", "rating": "4.4", "highlight": "Near Amer Fort, lush gardens, excellent service"},
        ],
        "diamond": [
            {"name": "Taj Rambagh Palace", "area": "Bhawani Singh Road", "type": "5-Star Palace", "price_range": "₹30,000-60,000/night", "rating": "4.9", "highlight": "India's most romantic palace hotel, royal suite"},
            {"name": "Samode Palace", "area": "Samode Village, Jaipur", "type": "Heritage Palace", "price_range": "₹18,000-35,000/night", "rating": "4.7", "highlight": "Royal family property, private zenana, butler"},
            {"name": "Oberoi Rajvilas", "area": "Goner Road, Jaipur", "type": "Ultra Luxury", "price_range": "₹28,000-55,000/night", "rating": "4.8", "highlight": "Tented villas, private pools, Oberoi excellence"},
        ],
        "platinum": [
            {"name": "Taj Rambagh Palace", "area": "Jaipur", "type": "Ultra Luxury Palace", "price_range": "₹60,000-1,20,000/night", "rating": "4.9", "highlight": "Maharaja suite, private polo, exclusive dining"},
        ]
    },
    "leh": {
        "bronze": [
            {"name": "Zostel Leh", "area": "Old Leh Town", "type": "Hostel", "price_range": "₹600-900/bed", "rating": "4.3", "highlight": "Best hostel in Leh, trip planning help, social"},
            {"name": "Goba Guest House", "area": "Fort Road, Leh", "type": "Guesthouse", "price_range": "₹800-1,500/night", "rating": "4.0", "highlight": "Tibetan family run, authentic home food"},
            {"name": "Stok Palace Heritage", "area": "Stok Village", "type": "Heritage Guesthouse", "price_range": "₹1,200-2,500/night", "rating": "4.1", "highlight": "Royal family village, monastery nearby"},
            {"name": "Hotel Kang Lha Chen", "area": "Old Leh", "type": "Budget Hotel", "price_range": "₹1,000-2,000/night", "rating": "3.9", "highlight": "Mountain views, rooftop garden, home food"},
            {"name": "Leh Residency", "area": "Fort Road, Leh", "type": "Guesthouse", "price_range": "₹900-1,800/night", "rating": "4.0", "highlight": "Rooftop with Leh Palace view, oxygen available"},
        ],
        "silver": [
            {"name": "Hotel Grand Dragon", "area": "Old Leh Road", "type": "3-Star Hotel", "price_range": "₹3,500-6,000/night", "rating": "4.2", "highlight": "Best mountain views in Leh, reliable hot water"},
            {"name": "Hotel Ladakh Residency", "area": "Karzoo, Leh", "type": "Hotel", "price_range": "₹2,800-5,000/night", "rating": "4.0", "highlight": "Central location, oxygen support available"},
            {"name": "Chamba Camp Thiksey", "area": "Thiksey Village", "type": "Camp Resort", "price_range": "₹4,500-8,000/night", "rating": "4.3", "highlight": "Monastery views, luxury camp experience"},
            {"name": "Hotel Omasila", "area": "Fort Road, Leh", "type": "Boutique Hotel", "price_range": "₹3,000-5,500/night", "rating": "4.1", "highlight": "Mountain views, good restaurant, central location"},
            {"name": "The Dragon Hotel", "area": "Old Leh Road", "type": "Hotel", "price_range": "₹2,500-4,500/night", "rating": "4.0", "highlight": "Reliable, clean, good altitude acclimatization support"},
        ],
        "gold": [
            {"name": "The Grand Dragon Ladakh", "area": "Old Leh Road", "type": "Luxury Hotel", "price_range": "₹8,000-14,000/night", "rating": "4.5", "highlight": "Best luxury in Leh, panoramic Stok Kangri views"},
            {"name": "Chamba Camp Diskit", "area": "Nubra Valley", "type": "Luxury Camp", "price_range": "₹12,000-20,000/night", "rating": "4.6", "highlight": "Sand dunes, stargazing, exclusive camp experience"},
            {"name": "Nimmu House", "area": "Nimmu Village, Leh", "type": "Heritage Boutique", "price_range": "₹10,000-18,000/night", "rating": "4.4", "highlight": "400-year heritage home, Indus River views"},
            {"name": "The Indus Valley Leh", "area": "Skara, Leh", "type": "Premium Resort", "price_range": "₹7,000-12,000/night", "rating": "4.3", "highlight": "Indus river views, excellent restaurant, spa"},
        ],
        "diamond": [
            {"name": "Chamba Camp Collection", "area": "Multiple Locations", "type": "Ultra Luxury Camp", "price_range": "₹20,000-40,000/night", "rating": "4.8", "highlight": "India's finest luxury camping, exclusive locations"},
            {"name": "Nimmu House Exclusive", "area": "Nimmu, Leh", "type": "Exclusive Heritage", "price_range": "₹15,000-28,000/night", "rating": "4.6", "highlight": "Complete property buyout, private guide, chef"},
        ],
        "platinum": [
            {"name": "Chamba Camp Premium", "area": "Pangong / Nubra", "type": "Ultra Exclusive", "price_range": "₹35,000-65,000/night", "rating": "4.9", "highlight": "India's most exclusive wilderness experience"},
        ]
    },
    "kerala": {
        "bronze": [
            {"name": "Zostel Kochi", "area": "Fort Kochi", "type": "Hostel", "price_range": "₹500-900/bed", "rating": "4.3", "highlight": "Heritage fort area, walking tours, social vibe"},
            {"name": "Rainforest Retreat", "area": "Wayanad area", "type": "Homestay", "price_range": "₹1,500-3,000/night", "rating": "4.1", "highlight": "Organic farm, jungle walks, home food"},
            {"name": "Lemon Tree Hotel Kochi", "area": "Marine Drive, Kochi", "type": "Budget Hotel", "price_range": "₹2,000-4,000/night", "rating": "4.0", "highlight": "City center, backwater views, good breakfast"},
            {"name": "Fragrant Nature Backwater Resort", "area": "Kollam, Kerala", "type": "Budget Resort", "price_range": "₹1,800-3,500/night", "rating": "4.0", "highlight": "Backwater access, budget friendly, scenic"},
            {"name": "Lake Palace Hotel", "area": "Alleppey, Kerala", "type": "Budget Hotel", "price_range": "₹1,200-2,500/night", "rating": "3.9", "highlight": "Alleppey center, canal views, boat access"},
        ],
        "silver": [
            {"name": "Coconut Lagoon CGH Earth", "area": "Kumarakom, Alleppey", "type": "Heritage Resort", "price_range": "₹8,000-14,000/night", "rating": "4.5", "highlight": "Backwaters, heritage villas, Ayurveda"},
            {"name": "Fragrant Nature Kochi", "area": "Kochi", "type": "4-Star Hotel", "price_range": "₹4,000-8,000/night", "rating": "4.2", "highlight": "Rooftop pool, backwater views, spa"},
            {"name": "Spice Village CGH Earth", "area": "Thekkady, Kerala", "type": "Eco Resort", "price_range": "₹6,000-10,000/night", "rating": "4.4", "highlight": "Tribal-inspired cottages, spice plantation walks"},
            {"name": "Zuri Kumarakom", "area": "Kumarakom, Kerala", "type": "4-Star Resort", "price_range": "₹5,000-9,000/night", "rating": "4.3", "highlight": "Backwater resort, infinity pool, houseboat included"},
            {"name": "Haveli Inn Munnar", "area": "Munnar, Kerala", "type": "Boutique Hotel", "price_range": "₹3,500-6,500/night", "rating": "4.2", "highlight": "Tea estate views, quiet location, excellent food"},
        ],
        "gold": [
            {"name": "Kumarakom Lake Resort", "area": "Kumarakom, Kerala", "type": "5-Star Luxury", "price_range": "₹15,000-28,000/night", "rating": "4.7", "highlight": "Vembanad Lake villas, infinity pool, Ayurveda"},
            {"name": "Taj Bekal Resort & Spa", "area": "Bekal, Kerala", "type": "5-Star Luxury", "price_range": "₹18,000-32,000/night", "rating": "4.6", "highlight": "Private beach, fort views, lagoon pool"},
            {"name": "Somatheeram Ayurveda Resort", "area": "Kovalam, Kerala", "type": "Luxury Ayurveda", "price_range": "₹10,000-20,000/night", "rating": "4.5", "highlight": "World's first Ayurvedic resort, beachfront"},
            {"name": "The Raviz Ashtamudi", "area": "Kollam, Kerala", "type": "Luxury Resort", "price_range": "₹9,000-16,000/night", "rating": "4.4", "highlight": "Ashtamudi lake views, private pool villas"},
        ],
        "diamond": [
            {"name": "Kumarakom Lake Resort", "area": "Kumarakom, Kerala", "type": "5-Star Ultra Luxury", "price_range": "₹25,000-50,000/night", "rating": "4.8", "highlight": "Lake villa with private pool, butler, houseboat"},
            {"name": "Taj Bekal Resort & Spa", "area": "Bekal Fort, Kerala", "type": "5-Star Palace", "price_range": "₹22,000-45,000/night", "rating": "4.7", "highlight": "Overwater bungalows, private beach, spa"},
        ],
        "platinum": [
            {"name": "Kumarakom Lake Resort Premium", "area": "Kumarakom", "type": "Ultra Luxury", "price_range": "₹50,000-90,000/night", "rating": "4.9", "highlight": "Private island, houseboat, chef, complete privacy"},
        ]
    },
    "andaman": {
        "bronze": [
            {"name": "Barefoot at Havelock", "area": "Beach 5, Havelock Island", "type": "Eco Resort", "price_range": "₹2,500-5,000/night", "rating": "4.2", "highlight": "Jungle setting, snorkeling arranged, beach walks"},
            {"name": "Pristine Beach Resort", "area": "Neil Island", "type": "Budget Resort", "price_range": "₹1,500-3,000/night", "rating": "4.0", "highlight": "Quiet island, coral reef snorkeling"},
            {"name": "Summer Sands Beach Resort", "area": "Corbyn's Cove, Port Blair", "type": "Budget Resort", "price_range": "₹2,000-3,500/night", "rating": "3.9", "highlight": "Beach access, basic amenities, central location"},
            {"name": "TSG Blue Resort", "area": "Havelock Island", "type": "Budget Resort", "price_range": "₹1,800-3,200/night", "rating": "4.0", "highlight": "Beach view, affordable, good diving base"},
            {"name": "Peerless Sarovar Portico", "area": "Port Blair", "type": "Hotel", "price_range": "₹3,000-5,500/night", "rating": "4.1", "highlight": "Sea view, central Port Blair, good restaurant"},
        ],
        "silver": [
            {"name": "Symphony Palms Beach Resort", "area": "Havelock Island", "type": "4-Star Resort", "price_range": "₹6,000-10,000/night", "rating": "4.3", "highlight": "Beachfront, water sports, SCUBA diving"},
            {"name": "Munjoh Ocean Resort", "area": "Neil Island", "type": "Boutique Resort", "price_range": "₹5,000-9,000/night", "rating": "4.4", "highlight": "Coral beach, snorkeling, peaceful island vibe"},
            {"name": "The Haveli Havelock", "area": "Havelock Island", "type": "Boutique Resort", "price_range": "₹4,500-8,000/night", "rating": "4.2", "highlight": "Private beach cottages, good restaurant"},
            {"name": "Coral Reef Resort", "area": "Havelock Island", "type": "Beach Resort", "price_range": "₹4,000-7,000/night", "rating": "4.1", "highlight": "Beachfront, PADI dive centre, lush gardens"},
        ],
        "gold": [
            {"name": "Taj Exotica Andaman", "area": "Havelock Island", "type": "5-Star Luxury", "price_range": "₹18,000-32,000/night", "rating": "4.7", "highlight": "Andaman's finest, beach villa, PADI dive center"},
            {"name": "Barefoot at Havelock Premium", "area": "Beach 7, Havelock", "type": "Luxury Eco Resort", "price_range": "₹12,000-22,000/night", "rating": "4.6", "highlight": "Secluded beach, forest villa, exclusive"},
            {"name": "SeaShell Havelock", "area": "Havelock Island", "type": "Premium Resort", "price_range": "₹9,000-16,000/night", "rating": "4.4", "highlight": "Beach access, infinity pool, multiple dining"},
        ],
        "diamond": [
            {"name": "Taj Exotica Andaman", "area": "Havelock Island", "type": "Ultra Luxury", "price_range": "₹28,000-55,000/night", "rating": "4.8", "highlight": "India's most exclusive island resort"},
        ],
        "platinum": [
            {"name": "Taj Exotica Private Villa", "area": "Havelock Island", "type": "Ultra Luxury", "price_range": "₹50,000-1,00,000/night", "rating": "4.9", "highlight": "Private villa, yacht, dive instructor"},
        ]
    },
    "shimla": {
        "bronze": [
            {"name": "Zostel Shimla", "area": "Mall Road, Shimla", "type": "Hostel", "price_range": "₹400-700/bed", "rating": "4.2", "highlight": "Best views on Mall Road, social atmosphere"},
            {"name": "Hotel White", "area": "Cart Road, Shimla", "type": "Budget Hotel", "price_range": "₹800-1,500/night", "rating": "3.9", "highlight": "Budget friendly, basic amenities, valley views"},
            {"name": "Hotel Dreamland", "area": "Lakkar Bazaar, Shimla", "type": "Budget Hotel", "price_range": "₹700-1,300/night", "rating": "3.8", "highlight": "Near mall road, clean rooms, good value"},
            {"name": "HPTDC Hotel Shivalikview", "area": "Circular Road, Shimla", "type": "Government Hotel", "price_range": "₹1,500-3,000/night", "rating": "4.0", "highlight": "Government run, reliable, panoramic views"},
            {"name": "Hotel Peterhoff", "area": "Chaura Maidan, Shimla", "type": "Heritage Budget", "price_range": "₹1,200-2,500/night", "rating": "4.0", "highlight": "Heritage building, colonial era, central location"},
        ],
        "silver": [
            {"name": "Hotel Combermere", "area": "Mall Road, Shimla", "type": "Heritage Hotel", "price_range": "₹3,000-5,500/night", "rating": "4.2", "highlight": "Colonial heritage, Mall Road location, mountain views"},
            {"name": "Woodville Palace Hotel", "area": "Raj Bhawan Road, Shimla", "type": "Heritage Hotel", "price_range": "₹4,000-7,000/night", "rating": "4.3", "highlight": "Former maharaja residence, antique furniture, gardens"},
            {"name": "Radisson Hotel Shimla", "area": "Boileauganj, Shimla", "type": "4-Star Hotel", "price_range": "₹5,000-8,000/night", "rating": "4.3", "highlight": "Panoramic valley views, spa, good restaurant"},
            {"name": "Hotel Willow Banks", "area": "Chaura Maidan, Shimla", "type": "3-Star Hotel", "price_range": "₹2,500-4,500/night", "rating": "4.0", "highlight": "Central location, clean rooms, valley views"},
        ],
        "gold": [
            {"name": "Wildflower Hall Shimla", "area": "Chharabra, Shimla", "type": "Oberoi Luxury", "price_range": "₹15,000-30,000/night", "rating": "4.8", "highlight": "Oberoi property, cedar forest, infinity pool, spa"},
            {"name": "Oberoi Cecil Shimla", "area": "Chaura Maidan, Shimla", "type": "5-Star Heritage", "price_range": "₹12,000-22,000/night", "rating": "4.7", "highlight": "Iconic heritage hotel, magnificent views, fine dining"},
            {"name": "Taj Theog Resort & Spa", "area": "Theog, Shimla", "type": "5-Star Resort", "price_range": "₹9,000-16,000/night", "rating": "4.5", "highlight": "Apple orchard setting, spa, mountain serenity"},
        ],
        "diamond": [
            {"name": "Wildflower Hall Shimla", "area": "Chharabra, Shimla", "type": "Oberoi Ultra Luxury", "price_range": "₹20,000-40,000/night", "rating": "4.9", "highlight": "India's finest mountain resort, complete luxury"},
            {"name": "Oberoi Cecil Suite", "area": "Chaura Maidan, Shimla", "type": "Heritage Suite", "price_range": "₹18,000-35,000/night", "rating": "4.7", "highlight": "Heritage suite, butler, private dining"},
        ],
        "platinum": [
            {"name": "Wildflower Hall Presidential", "area": "Chharabra, Shimla", "type": "Ultra Luxury", "price_range": "₹40,000-80,000/night", "rating": "4.9", "highlight": "Presidential suite, private helipad access"},
        ]
    },
}


def find_destination_hotels(destination: str, tier: str) -> list:
    dest_lower = destination.lower().strip()
    # Exact match
    for key in HOTEL_KNOWLEDGE:
        if key == dest_lower:
            hotels = HOTEL_KNOWLEDGE[key].get(tier) or HOTEL_KNOWLEDGE[key].get("silver", [])
            return hotels
    # Partial match
    for key in HOTEL_KNOWLEDGE:
        if key in dest_lower or dest_lower in key:
            hotels = HOTEL_KNOWLEDGE[key].get(tier) or HOTEL_KNOWLEDGE[key].get("silver", [])
            return hotels
    return []


async def search_google_places(destination: str, tier: str) -> list:
    if not settings.GOOGLE_PLACES_API_KEY:
        return []

    keywords = {
        "bronze": "budget hotel guesthouse",
        "silver": "hotel",
        "gold": "luxury hotel resort",
        "diamond": "5 star luxury hotel resort",
        "platinum": "luxury resort spa"
    }
    query = f"{keywords.get(tier, 'hotel')} {destination} India"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://maps.googleapis.com/maps/api/place/textsearch/json",
                params={
                    "query": query,
                    "type": "lodging",
                    "key": settings.GOOGLE_PLACES_API_KEY,
                }
            )
            if resp.status_code != 200:
                return []

            results = resp.json().get("results", [])
            hotels = []

            for place in results[:10]:  # Check top 10
                rating = place.get("rating", 0)
                if rating < 3.5:  # Relaxed from 3.8
                    continue

                photo_url = None
                photos = place.get("photos", [])
                if photos:
                    ref = photos[0].get("photo_reference")
                    if ref:
                        photo_url = (
                            f"https://maps.googleapis.com/maps/api/place/photo"
                            f"?maxwidth=600&photo_reference={ref}"
                            f"&key={settings.GOOGLE_PLACES_API_KEY}"
                        )

                price_level = place.get("price_level", 2)
                price_display = {
                    1: "₹ Budget",
                    2: "₹₹ Mid-range",
                    3: "₹₹₹ Premium",
                    4: "₹₹₹₹ Luxury"
                }.get(price_level, "₹₹ Mid-range")

                hotels.append({
                    "name": place.get("name"),
                    "rating": rating,
                    "total_ratings": place.get("user_ratings_total", 0),
                    "address": place.get("formatted_address", ""),
                    "price_level": price_level,
                    "price_display": price_display,
                    "photo_url": photo_url,
                    "maps_url": f"https://www.google.com/maps/place/?q=place_id:{place.get('place_id')}",
                    "source": "google"
                })

                if len(hotels) >= 6:  # Increased from 5
                    break

            return hotels

    except Exception as e:
        logger.error(f"Google Places error: {e}")
        return []


@router.get("/search/{destination}")
async def search_hotels(destination: str, tier: str = "silver"):
    # Step 1 — Google Places for real photos
    google_hotels = await search_google_places(destination, tier)

    # Step 2 — AI knowledge base
    knowledge_hotels = find_destination_hotels(destination, tier)

    # Step 3 — Merge: if Google has data, enrich with knowledge
    if google_hotels:
        for g in google_hotels:
            for k in knowledge_hotels:
                if any(
                    word.lower() in g["name"].lower()
                    for word in k["name"].split()
                    if len(word) > 4
                ):
                    g.setdefault("why", k.get("highlight", ""))
                    g.setdefault("price_range", k.get("price_range", ""))
                    break

        return {
            "destination": destination,
            "tier": tier,
            "hotels": google_hotels,
            "source": "google_places",
            "powered_by": "Google",
            "attribution": "Powered by Google"
        }

    # Step 4 — Fall back to knowledge base
    if knowledge_hotels:
        enriched = []
        for h in knowledge_hotels:
            enriched.append({
                "name": h["name"],
                "rating": float(h.get("rating", "4.0")),
                "total_ratings": None,
                "address": h.get("area", ""),
                "price_display": h.get("price_range", ""),
                "price_range": h.get("price_range", ""),
                "photo_url": None,
                "why": h.get("highlight", ""),
                "type": h.get("type", "Hotel"),
                "maps_url": f"https://www.google.com/maps/search/{h['name'].replace(' ', '+')}+{destination.replace(' ', '+')}",
                "source": "ai_knowledge"
            })
        return {
            "destination": destination,
            "tier": tier,
            "hotels": enriched,
            "source": "ai_knowledge",
            "powered_by": "Tripzio AI",
            "attribution": None
        }

    return {
        "destination": destination,
        "tier": tier,
        "hotels": [],
        "source": "none",
        "message": f"Search for hotels in {destination} on Google Maps"
    }
