import { Module } from '@nestjs/common';
import { MocksController } from './mocks.controller';

@Module({
  controllers: [MocksController],
})
export class MocksModule {}
