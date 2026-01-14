import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosInstance } from 'axios'

@Injectable()
export class ZecatHttp {
  private readonly logger = new Logger(ZecatHttp.name)
  private client: AxiosInstance
  private baseURL: string
  private token: string

  constructor(private cfg: ConfigService) {
    const baseURLRaw = this.cfg.get<string>('ZECAT_BASE_URL')
    const tokenRaw = this.cfg.get<string>('ZECAT_API_TOKEN')

    if (!baseURLRaw || baseURLRaw.trim().length === 0) {
      throw new Error('Falta la variable de entorno ZECAT_BASE_URL')
    }

    if (!tokenRaw || tokenRaw.trim().length === 0) {
      throw new Error('Falta la variable de entorno ZECAT_API_TOKEN')
    }

    // Normalizamos para evitar problemas de // en concatenación
    this.baseURL = baseURLRaw.trim().replace(/\/+$/, '')
    this.token = tokenRaw.trim()

    this.logger.log(`[init] ZECAT_BASE_URL=${this.baseURL}`)

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 20000,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    })
  }

  async listFamilies(page = 1): Promise<any> {
    const { data } = await this.client.get('family', { params: { page } })
    return data
  }

  async listProducts(page = 1): Promise<any> {
    const { data } = await this.client.get('generic_product', { params: { page } })
    return data
  }
}
