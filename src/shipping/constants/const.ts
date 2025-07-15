// Multiplicadores y tablas de distancia para el cálculo de envíos

// Bandas por distancia (km) y factor incremental
export const distanceBands: { maxKm: number; factor: number }[] = [
  { maxKm: 10,  factor: 1.00 },
  { maxKm: 20,  factor: 1.05 },
  { maxKm: 30,  factor: 1.10 },
  { maxKm: 40,  factor: 1.15 },
  { maxKm: 60,  factor: 1.25 },
  { maxKm: 80,  factor: 1.35 },
  { maxKm: 100, factor: 1.45 },
  { maxKm: 150, factor: 1.60 },
  { maxKm: 300, factor: 1.80 },
  { maxKm: Infinity, factor: 2.00 }, // fallback para > 300 km
]

// Componentes fijos 
export const weightKg = 2
export const basePrice = 7000             // mínimo por envío
export const pricePerKg = 1000             // recargo por kg
export const pricePerKm = 50                // AR$ por km (después de los 10 km)

export const originAddress =
  'Junín 1500-1400, C1113AAN Cdad. Autónoma de Buenos Aires'
