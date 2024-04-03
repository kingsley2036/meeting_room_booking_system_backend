import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpStatus,
  Inject,
  ParseIntPipe,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { RedisService } from 'src/redis/redis.service';
import { EmailService } from 'src/email/email.service';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RequireLogin, UserInfo } from 'src/custom.decorator';
import { UserDetailVo } from './vo/user-info.vo';
import { UpdateUserPasswordDto } from './vo/update-user-password.dto';
import { UpdateUserDto } from './dto/udpate-user.dto';
import { UnLoginException } from 'src/unlogin.filter';
import { query } from 'express';
import { ApiTags } from '@nestjs/swagger';
@ApiTags('用户管理模块')
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
  @Get('update_password/captcha')
  async updatePasswordCaptcha(@Query('address') address: string) {
    const code = Math.random().toString().slice(2, 8);
    this.redisService.set(`update_password_captcha_${address}`, code, 10 * 60);
    await this.emailService.sendEmail({
      to: address,
      subject: '更改密码验证码',
      html: `<p>你的更改密码验证码是 ${code}</p>`,
    });
    return '发送成功';
  }
  @Get('update/captcha')
  async updateCaptcha(@Query('address') address: string) {
    const code = Math.random().toString().slice(2, 8);

    await this.redisService.set(
      `update_user_captcha_${address}`,
      code,
      10 * 60,
    );

    await this.emailService.sendEmail({
      to: address,
      subject: '更改用户信息验证码',
      html: `<p>你的验证码是 ${code}</p>`,
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
    vo.accessToken = this.jwtService.sign(
      {
        userId: vo.userInfo.id,
        username: vo.userInfo.username,
        email: vo.userInfo.email,
        roles: vo.userInfo.roles,
        permissions: vo.userInfo.permissions,
      },
      {
        expiresIn:
          this.configService.get('jwt_access_token_expires_time') || '30m',
      },
    );
    vo.refreshToken = this.jwtService.sign(
      {
        userId: vo.userInfo.id,
      },
      {
        expiresIn:
          this.configService.get('jwt_refresh_token_expres_time') || '7d',
      },
    );

    return vo;
  }
  @Post('admin/login')
  async adminLogin(@Body() loginUser: LoginUserDto) {
    const vo = await this.userService.login(loginUser, true);
    vo.accessToken = this.jwtService.sign(
      {
        userId: vo.userInfo.id,
        username: vo.userInfo.username,
        email: vo.userInfo.email,
        roles: vo.userInfo.roles,
        permissions: vo.userInfo.permissions,
      },
      {
        expiresIn:
          this.configService.get('jwt_access_token_expires_time') || '30m',
      },
    );
    vo.refreshToken = this.jwtService.sign(
      {
        userId: vo.userInfo.id,
      },
      {
        expiresIn:
          this.configService.get('jwt_refresh_token_expres_time') || '7d',
      },
    );

    return vo;
  }

  @Get('refresh')
  async refreshToken(@Query('refreshToken') refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.userService.findUserById(payload.userId, false);
      const access_token = this.jwtService.sign(
        {
          userId: user.id,
          username: user.username,
          email: user.email,
          roles: user.roles,
          permissions: user.permissions,
        },
        {
          expiresIn:
            this.configService.get('jwt_access_token_expires_time') || '30m',
        },
      );
      const refresh_token = this.jwtService.sign(
        {
          userId: user.id,
        },
        {
          expiresIn:
            this.configService.get('jwt_refresh_token_expres_time') || '7d',
        },
      );
      return {
        access_token,
        refresh_token,
      };
    } catch (error) {
      throw new UnLoginException('token 已失效，请重新登录');
    }
  }

  @Get('admin/refresh')
  async adminRefresh(@Query('refreshToken') refreshToken: string) {
    try {
      const data = this.jwtService.verify(refreshToken);

      const user = await this.userService.findUserById(data.userId, true);

      const access_token = this.jwtService.sign(
        {
          userId: user.id,
          username: user.username,
          email: user.email,
          roles: user.roles,
          permissions: user.permissions,
        },
        {
          expiresIn:
            this.configService.get('jwt_access_token_expires_time') || '30m',
        },
      );

      const refresh_token = this.jwtService.sign(
        {
          userId: user.id,
        },
        {
          expiresIn:
            this.configService.get('jwt_refresh_token_expres_time') || '7d',
        },
      );

      return {
        access_token,
        refresh_token,
      };
    } catch (e) {
      throw new UnLoginException('token 已失效，请重新登录');
    }
  }
  @Get('info')
  @RequireLogin()
  async info(@UserInfo('userId') userId: number) {
    console.log('userId', userId);
    const user = await this.userService.findUserDetailById(userId);
    console.log('user :>> ', user);
    const vo = new UserDetailVo();
    vo.id = user.id;
    vo.username = user.username;
    vo.nickName = user.nickName;
    vo.email = user.email;
    vo.headPic = user.headPic;
    vo.phoneNumber = user.phoneNumber;
    vo.isFrozen = user.isFrozen;
    vo.createTime = user.createTime;

    return vo;
  }
  @Post(['update_password', 'admin/update_password'])
  async updatePassword(
    @Body() passwordDto: UpdateUserPasswordDto,
  ) {
    return await this.userService.updatePassword( passwordDto);
  }
  @Post(['update', 'admin/update'])
  @RequireLogin()
  async update(
    @UserInfo('userId') userId: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return await this.userService.update(userId, updateUserDto);
  }
  @Get('freeze')
  @RequireLogin()
  async freeze(@Query('id') userId: number) {
    await this.userService.freezeUserById(userId);
    return '操作成功';
  }

  @Get('list')
  async list(
    @Query(
      'pageNo',
      new DefaultValuePipe(1),
      new ParseIntPipe({
        exceptionFactory: () => {
          throw new BadRequestException('pageNo 应该传数字');
        },
      }),
    )
    pageNo: number,
    @Query(
      'pageSize',
      new DefaultValuePipe(2),
      new ParseIntPipe({
        exceptionFactory: () => {
          throw new BadRequestException('pageSize 应该传数字');
        },
      }),
    )
    pageSize: number,
    @Query('username') username: string,
    @Query('nickName') nickName: string,
    @Query('email') email: string
  ) {
    return await this.userService.findUsersByPage(pageNo, pageSize,username,nickName,email);
  }
}
