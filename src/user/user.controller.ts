import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { RedisService } from 'src/redis/redis.service';
import { EmailService } from 'src/email/email.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }
  @Inject(RedisService)
  private readonly redisService: RedisService
  @Inject(EmailService)
  private readonly emailService: EmailService

  @Post('register')
 async register(@Body() registerUser: RegisterUserDto) {
    console.log('registerUser :>> ', registerUser);
     return await  this.userService.register(registerUser);
  }
  @Get('register-captcha')
  async registerCaptcha(@Query('address') address: string) {
    const code = Math.random().toString().slice(2, 8);
    this.redisService.set(`captcha_${address}`, code, 60 * 5);
    await this.emailService.sendEmail({ to: address, subject: '验证码', html: `您的验证码是${code}` })
    return '发送成功'
  }
}
