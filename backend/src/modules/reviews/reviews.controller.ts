import { Body, Controller, Get, Post } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewBodyDto } from './dto/create-review.dto';

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
