import { Module, Global } from '@nestjs/common';
import { ConfigService } from './config.service';

@Global()
@Module({
  providers: [
    {
      provide: ConfigService,
      useValue: ConfigService.getInstance(),
    },
  ],
  exports: [ConfigService],
})
export class ConfigModule {}
