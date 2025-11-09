import { Global, Module } from '@nestjs/common';

import { RequestContextModule } from '../common/context/request-context.module';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  imports: [RequestContextModule],
  providers: [PrismaService],
  exports: [PrismaService]
})
export class PrismaModule {}
