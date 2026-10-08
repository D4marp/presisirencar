// Alamat produksi. Dipakai sebagai nilai bawaan saat build produksi, sehingga sitemap, robots,
// metadata, dan alamat API tidak pernah berisi "localhost" walaupun variabel lingkungan lupa diisi.
// NEXT_PUBLIC_SITE_URL / NEXT_PUBLIC_API_URL tetap bisa menimpanya.
export const PROD_SITE_URL = "https://www.presisirencar.com";
export const PROD_API_URL = "https://api.presisirencar.com/api";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || (process.env.NODE_ENV === "production" ? PROD_SITE_URL : "http://localhost:3000");
