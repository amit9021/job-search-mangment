import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';

import { AutomationController } from './automation.controller';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [PrismaModule],
  controllers: [TasksController, AutomationController],
  providers: [TasksService],
  exports: [TasksService]
})
export class TasksModule {}
