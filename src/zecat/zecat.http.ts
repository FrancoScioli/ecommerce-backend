import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosInstance } from 'axios'

@Injectable()
export class ZecatHttp {
  private client: AxiosInstance
  private baseURL: string
  private token: string

  constructor(private cfg: ConfigService) {
    this.baseURL = this.cfg.get<string>('ZECAT_BASE_URL')!
    this.token = this.cfg.get<string>('ZECAT_API_TOKEN')!

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
    // Ajustar query según doc (paginación/cantidad)
    const { data } = await this.client.get('/family', { params: { page } })
    return data
  }

  async listProducts(page = 1): Promise<any> {
    // Ajustar path y params según doc (/generic_product, etc.)
    const { data } = await this.client.get('/generic_product', { params: { page } })
    return data
  }
}