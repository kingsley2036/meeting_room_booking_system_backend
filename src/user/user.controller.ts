import { Body, Controller, Get, Inject, Post, Query, UnauthorizedException } from '@nestjs/common';
import { UserService } from './user.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { RedisService } from 'src/redis/redis.service';
import { EmailService } from 'src/email/email.service';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}
  @Inject(RedisService)
  private readonly redisService: RedisService;
  @Inject(EmailService)
  private readonly emailService: EmailService;
  @Inject(JwtService)
  private readonly jwtService: JwtService;
  @Inject(ConfigService)
  private readonly configService: ConfigService;

  @Post('register')
  async register(@Body() registerUser: RegisterUserDto) {
    console.log('registerUser :>> ', registerUser);
    return await this.userService.register(registerUser);
  }
  @Get('register-captcha')
  async registerCaptcha(@Query('address') address: string) {
    const code = Math.random().toString().slice(2, 8);
    this.redisService.set(`captcha_${address}`, code, 60 * 5);
    await this.emailService.sendEmail({
      to: address,
      subject: '验证码',
      html: `您的验证码是${code}`,
    });
    return '发送成功';
  }
  @Get('init-data')
  async initData() {
    await this.userService.initData();
    return 'done';
  }
  @Post('login')
  async userLogin(@Body() loginUser: LoginUserDto) {
    const vo = await this.userService.login(loginUser, false);
    vo.accessToken = this.jwtService.sign({
      id: vo.userInfo.id,
      username: vo.userInfo.username,
      roles: vo.userInfo.roles,
      permissions: vo.userInfo.permissions
    },
    {
      expiresIn: this.configService.get('jwt_access_token_expires_time') || '30m'
    }
    )
    vo.refreshToken = this.jwtService.sign({
      id: vo.userInfo.id,
    },
    {
      expiresIn: this.configService.get('jwt_refresh_token_expres_time') || '7d'
    })

    return vo ;
  }
  @Post('admin/login')
  async adminLogin(@Body() loginUser: LoginUserDto) {
    const vo = await this.userService.login(loginUser, true);
    vo.accessToken = this.jwtService.sign({
      userId: vo.userInfo.id,
      username: vo.userInfo.username,
      roles: vo.userInfo.roles,
      permissions: vo.userInfo.permissions
    },
    {
      expiresIn: this.configService.get('jwt_access_token_expires_time') || '30m'
    }
    )
    vo.refreshToken = this.jwtService.sign({
      userId: vo.userInfo.id
    },
    {
      expiresIn: this.configService.get('jwt_refresh_token_expres_time') || '7d'
    })

    return vo ;
  }

  @Get('refresh')
  async refreshToken(@Query('refreshToken') refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user= await this.userService.findUserById(payload.userId,false);
      const access_token = this.jwtService.sign({
        userId: user.id,
        username: user.username,
        roles: user.roles,
        permissions: user.permissions
      },
      {
        expiresIn: this.configService.get('jwt_access_token_expires_time') || '30m'
      }
      )
      const refresh_token = this.jwtService.sign({
        userId: user.id
      }, {
        expiresIn: this.configService.get('jwt_refresh_token_expres_time') || '7d'
      });
      return {
        access_token,
        refresh_token
      }
    } catch (error) {
      throw new UnauthorizedException('token 已失效，请重新登录');
    }

  }

  @Get('admin/refresh')
async adminRefresh(@Query('refreshToken') refreshToken: string) {
    try {
      const data = this.jwtService.verify(refreshToken);

      const user = await this.userService.findUserById(data.userId, true);

      const access_token = this.jwtService.sign({
        userId: user.id,
        username: user.username,
        roles: user.roles,
        permissions: user.permissions
      }, {
        expiresIn: this.configService.get('jwt_access_token_expires_time') || '30m'
      });

      const refresh_token = this.jwtService.sign({
        userId: user.id
      }, {
        expiresIn: this.configService.get('jwt_refresh_token_expres_time') || '7d'
      });

      return {
        access_token,
        refresh_token
      }
    } catch(e) {
      throw new UnauthorizedException('token 已失效，请重新登录');
    }
}

}
