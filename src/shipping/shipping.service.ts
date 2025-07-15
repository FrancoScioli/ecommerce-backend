import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common'
import axios from 'axios'
import {
  distanceBands,
  weightKg,
  basePrice,
  pricePerKg,
  pricePerKm,
  originAddress,
} from './constants/const'

@Injectable()
export class ShippingService {
  private readonly mpToken = process.env.MP_ACCESS_TOKEN!
  private readonly geoKey = process.env.GOOGLE_GEOCODE_API_KEY!

  async getShippingMethods() {
    const { data } = await axios.get(
      'https://api.mercadolibre.com/sites/MLA/shipping_methods',
      { headers: { Authorization: `Bearer ${this.mpToken}` } },
    )
    return data
  }

  /** Devuelve el CP vía Geocoding si no lo recibimos desde el front */
  private async geocodeCP(address: string): Promise<string | null> {
    const { data } = await axios.get(
      'https://maps.googleapis.com/maps/api/geocode/json',
      { params: { address, key: this.geoKey } },
    )

    const cpComp = data.results?.[0]?.address_components?.find((c: any) =>
      c.types.includes('postal_code'),
    )
    return cpComp?.long_name ?? null
  }

  /** Calcula distancia en km entre la tienda y el destino */
  private async getDistanceInKm(destination: string): Promise<number> {
    const { data } = await axios.get(
      'https://maps.googleapis.com/maps/api/distancematrix/json',
      {
        params: {
          origins: originAddress,
          destinations: destination,
          key: this.geoKey,
        },
      },
    )
    const meters = data.rows[0]?.elements[0]?.distance?.value ?? 0
    return meters / 1000
  }

  /** — Estimación con bandas de distancia —**/
  async estimateCost(address: string, postalCode?: string) {
    try {
      const cp = postalCode ?? (await this.geocodeCP(address))

      const distanceKm = await this.getDistanceInKm(address)

      // Factor por bandas
      const { factor } =
        distanceBands.find(b => distanceKm <= b.maxKm) ??
        distanceBands[distanceBands.length - 1]

      // Costos base
      const pesoExtra = Math.max(weightKg - 1, 0) 
      const costBase = basePrice + pesoExtra * pricePerKg

      // Crago variable por distancia
      const extraDistanceKm = Math.max(distanceKm - 10, 0)
      const distanceCost = extraDistanceKm * pricePerKm

      const total = Math.round((costBase + distanceCost) * factor)

      return {
        cost: total,
        breakdown: {
          cp,
          distanceKm: Math.round(distanceKm),
          factor,
          costBase,
          distanceCost,
        },
      }
    } catch (e) {
      if (e instanceof BadRequestException) throw e
      throw new InternalServerErrorException('Error al estimar el costo de envío')
    }
  }
}
