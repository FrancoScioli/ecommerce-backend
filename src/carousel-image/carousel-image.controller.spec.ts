import { Test, TestingModule } from '@nestjs/testing';
import { CarouselImageController } from './carousel-image.controller';
import { CarouselImageService } from './carousel-image.service';

describe('CarouselImageController', () => {
  let controller: CarouselImageController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CarouselImageController],
      providers: [CarouselImageService],
    }).compile();

    controller = module.get<CarouselImageController>(CarouselImageController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
