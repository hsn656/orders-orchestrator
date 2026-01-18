import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '../../shared/config/config.module';
import { config } from 'src/shared/config/config.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [],
      useFactory: () => {
        return {
          type: config.getString('DB_CONNECTION') as never,
          host: config.getString('DB_HOST'),
          port: config.getNumber('DB_PORT'),
          username: config.getString('DB_USERNAME'),
          password: config.getString('DB_PASSWORD'),
          database: config.getString('DB_DATABASE'),
          ...(config.getString('DB_SSL_CA')
            ? {
                ssl: {
                  ca: config.getString('DB_SSL_CA'),
                  rejectUnauthorized: true,
                },
              }
            : {}),
          synchronize: config.getBoolean('DB_SYNCHRONIZE'),
          logging: config.getBoolean('DB_LOGGING'),
          entities: ['dist/**/*.entity.js'],
        };
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
