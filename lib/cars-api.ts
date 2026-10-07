"use client";

import { useEffect, useState } from "react";
import { cars as staticCars, type Car } from "@/data/cars";
import { apiBase } from "@/lib/api";

type ApiCar = {
  slug: string;
  name: string;
  category: string;
  price: number;
  seats: number;
  transmission: string;
  fuel: string;
  image: string;
  available: boolean;
  rental_type: "Lepas Kunci" | "Dengan Sopir";
  features: string[] | null;
  badge?: string;
};

export function fromApi(c: ApiCar): Car {
  return {
    slug: c.slug,
    name: c.name,
    category: c.category,
    price: c.price,
    seats: c.seats,
    transmission: c.transmission,
    fuel: c.fuel,
    image: c.image,
    available: c.available,
    rentalType: c.rental_type,
    badge: c.badge || undefined,
    features: c.features ?? [],
  };
}

export function toApi(c: Car) {
  return {
    slug: c.slug,
    name: c.name,
    category: c.category,
    price: c.price,
    seats: c.seats,
    transmission: c.transmission,
    fuel: c.fuel,
    image: c.image,
    available: c.available,
    rental_type: c.rentalType,
    features: c.features,
    badge: c.badge ?? "",
  };
}

// Satu permintaan dipakai bersama oleh semua komponen di halaman yang sama (cache singkat 15 detik).
let shared: { at: number; promise: Promise<Car[]> } | null = null;
function loadCars(): Promise<Car[]> {
  if (shared && Date.now() - shared.at < 15000) return shared.promise;
  const promise = fetch(`${apiBase()}/cars`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error("api"))))
    .then((body: { data: ApiCar[] }) => {
      if (!Array.isArray(body.data)) throw new Error("format");
      return body.data.map(fromApi);
    });
  shared = { at: Date.now(), promise };
  promise.catch(() => {
    if (shared?.promise === promise) shared = null;
  });
  return promise;
}

// Daftar mobil dari API. Nilai awal memakai data statis (agar HTML pertama langsung terisi
// dan tetap tampil bila API tidak terjangkau); setelah API menjawab, diganti data terbaru.
export function useCars(): { cars: Car[]; live: boolean } {
  const [state, setState] = useState<{ cars: Car[]; live: boolean }>({ cars: staticCars, live: false });
  useEffect(() => {
    let cancelled = false;
    loadCars()
      .then((list) => {
        if (!cancelled) setState({ cars: list, live: true });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}

// Panggil setelah menambah/mengubah/menghapus mobil di dashboard agar data segar.
export function invalidateCars() {
  shared = null;
}
