import { Injectable, Logger } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'

@Injectable()
export class ImpromService {
  private readonly logger = new Logger(ImpromService.name)

  constructor(private readonly http: HttpService) {}

  async getCatalog(): Promise<any[]> {
    const { data } = await firstValueFrom(this.http.get('/api/product-catalog'))
    const products = data?.catalog_products
    if (!Array.isArray(products)) {
      this.logger.error('[getCatalog] Respuesta inesperada', { data })
      return []
    }
    return products
  }
}
