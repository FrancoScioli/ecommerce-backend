import { Test, TestingModule } from '@nestjs/testing';
import { CarouselImageService } from './carousel-image.service';

describe('CarouselImageService', () => {
  let service: CarouselImageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CarouselImageService],
    }).compile();

    service = module.get<CarouselImageService>(CarouselImageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
