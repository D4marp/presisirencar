export type Car = {
  slug: string;
  name: string;
  category: string;
  price: number;
  seats: number;
  transmission: string;
  fuel: string;
  image: string;
  available: boolean;
  rentalType: "Lepas Kunci" | "Dengan Sopir";
  badge?: string;
  features: string[];
};

export const cars: Car[] = [
  { slug: "agya", name: "Toyota Agya", category: "City Car", price: 350000, seats: 5, transmission: "MT / AT", fuel: "Bensin", image: "/fleet-suv.jpg", available: true, rentalType: "Lepas Kunci", badge: "Hemat", features: ["Irit BBM", "Audio Bluetooth", "Compact", "USB charger"] },
  { slug: "brio-satya", name: "Honda Brio", category: "City Car", price: 400000, seats: 5, transmission: "Automatic", fuel: "Bensin", image: "/fleet-suv.jpg", available: true, rentalType: "Lepas Kunci", badge: "Paling diminati", features: ["Irit BBM", "Audio Bluetooth", "Kamera parkir", "Compact"] },
  { slug: "avanza-xenia", name: "Avanza / Xenia", category: "Family MPV", price: 450000, seats: 7, transmission: "Automatic", fuel: "Bensin", image: "/fleet-mpv.jpg", available: true, rentalType: "Lepas Kunci", badge: "Paling diminati", features: ["AC dingin", "Audio Bluetooth", "Bagasi luas", "USB charger"] },
  { slug: "mobilio", name: "Honda Mobilio", category: "Family MPV", price: 450000, seats: 7, transmission: "Automatic", fuel: "Bensin", image: "/fleet-mpv.jpg", available: true, rentalType: "Lepas Kunci", features: ["AC double blower", "Kabin lega", "Audio Bluetooth", "Bagasi fleksibel"] },
  { slug: "xpander", name: "Mitsubishi Xpander", category: "Family MPV", price: 550000, seats: 7, transmission: "Automatic", fuel: "Bensin", image: "/fleet-mpv.jpg", available: true, rentalType: "Lepas Kunci", badge: "Favorit keluarga", features: ["AC double blower", "Kabin lega", "Kamera parkir", "USB charger"] },
  { slug: "innova-reborn", name: "Innova Reborn", category: "Business MPV", price: 750000, seats: 7, transmission: "Automatic", fuel: "Diesel", image: "/hero-presisi.jpg", available: true, rentalType: "Lepas Kunci", badge: "Best value", features: ["Captain seat", "AC double blower", "Audio Bluetooth", "Kabin premium"] },
  { slug: "innova-zenix", name: "Innova Zenix", category: "Business MPV", price: 950000, seats: 7, transmission: "Automatic", fuel: "Hybrid", image: "/hero-presisi.jpg", available: true, rentalType: "Lepas Kunci", badge: "Hybrid", features: ["Hybrid", "Captain seat", "Toyota Safety Sense", "Kabin premium"] },
  { slug: "fortuner-pajero", name: "Fortuner / Pajero", category: "Premium SUV", price: 1250000, seats: 7, transmission: "Automatic", fuel: "Diesel", image: "/fleet-suv.jpg", available: true, rentalType: "Lepas Kunci", badge: "Premium", features: ["Leather seat", "Cruise control", "Kamera parkir", "Kabin premium"] },
  { slug: "air-ev", name: "Wuling Air EV", category: "Mobil Listrik", price: 500000, seats: 4, transmission: "Automatic", fuel: "Listrik", image: "/fleet-suv.jpg", available: true, rentalType: "Lepas Kunci", badge: "Electric", features: ["Kendaraan listrik", "Voice command", "Compact", "Biaya energi hemat"] },
  { slug: "ioniq-5", name: "Hyundai Ioniq 5", category: "Mobil Listrik", price: 1400000, seats: 5, transmission: "Automatic", fuel: "Listrik", image: "/fleet-suv.jpg", available: true, rentalType: "Lepas Kunci", features: ["Full electric", "Fast charging", "ADAS", "Kabin futuristik"] },
  { slug: "hiace-commuter", name: "Hiace Commuter", category: "Minibus", price: 1250000, seats: 16, transmission: "Manual", fuel: "Diesel", image: "/hero-presisi.jpg", available: true, rentalType: "Dengan Sopir", badge: "Rombongan", features: ["16 kursi", "AC setiap baris", "Bagasi luas", "Termasuk driver"] },
  { slug: "hiace-premio", name: "Hiace Premio", category: "Minibus", price: 1450000, seats: 14, transmission: "Manual", fuel: "Diesel", image: "/hero-presisi.jpg", available: false, rentalType: "Dengan Sopir", features: ["14 kursi", "AC setiap baris", "Bagasi luas", "Termasuk driver"] },
  { slug: "alphard", name: "Toyota Alphard", category: "Executive", price: 2800000, seats: 6, transmission: "Automatic", fuel: "Bensin", image: "/hero-presisi.jpg", available: true, rentalType: "Dengan Sopir", badge: "Executive", features: ["Captain seat", "Power door", "Entertainment", "Kabin VIP"] },
];

export const rupiah = (value: number) => new Intl.NumberFormat("id-ID").format(value);
