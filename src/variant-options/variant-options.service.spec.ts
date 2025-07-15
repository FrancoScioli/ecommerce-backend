import { Test, TestingModule } from '@nestjs/testing';
import { VariantOptionsService } from './variant-options.service';

describe('VariantOptionsService', () => {
  let service: VariantOptionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VariantOptionsService],
    }).compile();

    service = module.get<VariantOptionsService>(VariantOptionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
