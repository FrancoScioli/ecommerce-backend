import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'

@Injectable()
export class ZecatService {
    constructor(private readonly http: HttpService) { }

    async listCategories(page = 1, pageSize = 100): Promise<any> {
        const params = { page, per_page: pageSize }
        const { data } = await firstValueFrom(this.http.get('/family', { params }))
        return data
    }

    async listFamilies(page = 1, pageSize = 100): Promise<any> {
        return this.listCategories(page, pageSize)
    }

    async listProducts(page = 1, pageSize = 100): Promise<{
        data?: any[]
        items?: any[]
        total?: number
        count?: number
        [k: string]: any
    }> {
        const params = { page, per_page: pageSize }
        const { data } = await firstValueFrom(
            this.http.get('/generic_product', { params })
        )
        return data
    }
}
