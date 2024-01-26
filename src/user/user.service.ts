import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { RegisterUserDto } from './dto/register-user.dto';
import { RedisService } from 'src/redis/redis.service';
import { md5 } from 'src/util';

@Injectable()
export class UserService {
  private logger = new Logger();
  @InjectRepository(User)
  private userRepository: Repository<User>;
  @Inject(RedisService)
  private readonly redisService: RedisService;

  async register(user: RegisterUserDto) {
      this.logger.log('user :>> ', user);
    const captcha = await this.redisService.get(`captcha_${user.email}`);
    const testdata = await this.redisService.get('xxxx')
    console.log('testdata :>> ', testdata);
    console.log('captcha :>> ', captcha);
    if (!captcha) {
      throw new HttpException('验证码已过期',HttpStatus.BAD_REQUEST);
    }
    if (captcha !== user.captcha) {
      throw new HttpException('验证码不正确',HttpStatus.BAD_REQUEST);
    }
    const foundUser = await this.userRepository.findOne({ where: { username: user.username } });
    if (foundUser) {
      throw new HttpException('用户名已存在',HttpStatus.BAD_REQUEST);
    }
    const newUser = new User();
    newUser.username = user.username;
    newUser.password =md5(user.password);
    newUser.nickName = user.nickName;
    newUser.email = user.email;

    
    try {
      await this.userRepository.save(newUser);
      return '注册成功';
    } catch (error) {
      this.logger.error(error,UserService);
      return '注册失败';

    }

  } 

}
