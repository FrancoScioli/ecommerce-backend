import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
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
  constructor(private readonly http: HttpService) {}

  private readonly mpToken = process.env.MP_ACCESS_TOKEN!
  private readonly geoKey = process.env.GOOGLE_GEOCODE_API_KEY!

  async getShippingMethods() {
    const { data } = await firstValueFrom(
      this.http.get('https://api.mercadolibre.com/sites/MLA/shipping_methods', {
        headers: { Authorization: `Bearer ${this.mpToken}` },
      }),
    )
    return data
  }

  private async geocodeCP(address: string): Promise<string | null> {
    const { data } = await firstValueFrom(
      this.http.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: { address, key: this.geoKey },
      }),
    )
    const cpComp = data.results?.[0]?.address_components?.find((c: any) =>
      c.types.includes('postal_code'),
    )
    return cpComp?.long_name ?? null
  }

  private async getDistanceInKm(destination: string): Promise<number> {
    const { data } = await firstValueFrom(
      this.http.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
        params: {
          origins: originAddress,
          destinations: destination,
          key: this.geoKey,
        },
      }),
    )
    const meters = data.rows[0]?.elements[0]?.distance?.value ?? 0
    return meters / 1000
  }

  async estimateCost(address: string, postalCode?: string) {
    try {
      const cp = postalCode ?? (await this.geocodeCP(address))
      const distanceKm = await this.getDistanceInKm(address)

      const { factor } =
        distanceBands.find((b) => distanceKm <= b.maxKm) ??
        distanceBands[distanceBands.length - 1]

      const pesoExtra = Math.max(weightKg - 1, 0)
      const costBase = basePrice + pesoExtra * pricePerKg

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
