import { Body, Controller, Get, Post } from '@nestjs/common';

import { CreateReviewBodyDto } from './dto/create-review.dto';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  async list() {
    return this.reviewsService.list();
  }

  @Post()
  async create(@Body() body: CreateReviewBodyDto) {
    return this.reviewsService.create(body);
  }
}
