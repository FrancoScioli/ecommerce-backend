import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common'

@Injectable()
export class JsonParsePipe implements PipeTransform<string, any> {
  transform(value: string) {
    try {
      return JSON.parse(value)
    } catch {
      throw new BadRequestException('Invalid JSON')
    }
  }
}
