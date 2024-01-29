import { Controller, Get, Inject, Query } from '@nestjs/common';
import { EmailService } from './email.service';
import { RedisService } from 'src/redis/redis.service';

@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) { 

  }

}
