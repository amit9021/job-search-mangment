import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AutomationController } from './automation.controller';

@Module({
  imports: [PrismaModule],
  controllers: [TasksController, AutomationController],
  providers: [TasksService],
  exports: [TasksService]
})
export class TasksModule {}
