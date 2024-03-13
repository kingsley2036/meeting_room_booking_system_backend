import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { RegisterUserDto } from './dto/register-user.dto';
import { RedisService } from 'src/redis/redis.service';
import { md5 } from 'src/util';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { LoginUserDto } from './dto/login-user.dto';
import { LoginUserVo } from './vo/login-user.vo';
import { UpdateUserPasswordDto } from './vo/update-user-password.dto';
import { UpdateUserDto } from './dto/udpate-user.dto';

@Injectable()
export class UserService {
  private logger = new Logger();
  @InjectRepository(User)
  private userRepository: Repository<User>;
  @Inject(RedisService)
  private readonly redisService: RedisService;
  @InjectRepository(Role)
  private roleRepository: Repository<Role>;
  @InjectRepository(Permission)
  private permissionRepository: Repository<Permission>;

  async register(user: RegisterUserDto) {
    this.logger.log('user :>> ', user);
    const captcha = await this.redisService.get(`captcha_${user.email}`);
    const testdata = await this.redisService.get('xxxx');
    console.log('testdata :>> ', testdata);
    console.log('captcha :>> ', captcha);
    if (!captcha) {
      throw new HttpException('验证码已过期', HttpStatus.BAD_REQUEST);
    }
    if (captcha !== user.captcha) {
      throw new HttpException('验证码不正确', HttpStatus.BAD_REQUEST);
    }
    const foundUser = await this.userRepository.findOne({
      where: { username: user.username },
    });
    if (foundUser) {
      throw new HttpException('用户名已存在', HttpStatus.BAD_REQUEST);
    }
    const newUser = new User();
    newUser.username = user.username;
    newUser.password = md5(user.password);
    newUser.nickName = user.nickName;
    newUser.email = user.email;

    try {
      await this.userRepository.save(newUser);
      return '注册成功';
    } catch (error) {
      this.logger.error(error, UserService);
      return '注册失败';
    }
  }

  async initData() {
    const user1 = new User();
    user1.username = 'zhangsan';
    user1.password = md5('111111');
    user1.email = 'xxx@xx.com';
    user1.isAdmin = true;
    user1.nickName = '张三';
    user1.phoneNumber = '13233323333';

    const user2 = new User();
    user2.username = 'lisi';
    user2.password = md5('222222');
    user2.email = 'yy@yy.com';
    user2.nickName = '李四';

    const role1 = new Role();
    role1.name = '管理员';

    const role2 = new Role();
    role2.name = '普通用户';

    const permission1 = new Permission();
    permission1.code = 'ccc';
    permission1.description = '访问 ccc 接口';

    const permission2 = new Permission();
    permission2.code = 'ddd';
    permission2.description = '访问 ddd 接口';

    user1.roles = [role1];
    user2.roles = [role2];

    role1.permissions = [permission1, permission2];
    role2.permissions = [permission1];

    await this.permissionRepository.save([permission1, permission2]);
    await this.roleRepository.save([role1, role2]);
    await this.userRepository.save([user1, user2]);
  }
  async login(loginUserDto: LoginUserDto, isAdmin: boolean) {
    const foundUser = await this.userRepository.findOne({
      where: { username: loginUserDto.username, isAdmin },
      relations: ['roles', 'roles.permissions'],
    });
    if (!foundUser) {
      throw new HttpException('用户不存在', HttpStatus.BAD_REQUEST);
    }
    if (isAdmin) {
      if (!foundUser.isAdmin) {
        throw new HttpException('用户不是管理员', HttpStatus.BAD_REQUEST);
      }
    }
    if (foundUser.password !== md5(loginUserDto.password)) {
      throw new HttpException('密码不正确', HttpStatus.BAD_REQUEST);
    }
    const vo = new LoginUserVo();
    vo.userInfo = {
      id: foundUser.id,
      username: foundUser.username,
      nickName: foundUser.nickName,
      email: foundUser.email,
      phoneNumber: foundUser.phoneNumber,
      headPic: foundUser.headPic,
      createTime: foundUser.createTime.getTime(),
      isFrozen: foundUser.isFrozen,
      isAdmin: foundUser.isAdmin,
      roles: foundUser.roles.map((item) => item.name),
      permissions: foundUser.roles.reduce((arr, item) => {
        item.permissions.forEach((permission) => {
          if (arr.indexOf(permission) === -1) {
            arr.push(permission);
          }
        });
        return arr;
      }, []),
    };

    return vo;
  }
  async findUserById(id: number, isAdmin: boolean) {
    const foundUser = await this.userRepository.findOne({
      where: { id, isAdmin },
      relations: ['roles', 'roles.permissions'],
    });
    if (!foundUser) {
      throw new HttpException('用户不存在', HttpStatus.BAD_REQUEST);
    }
    return {
      id: foundUser.id,
      username: foundUser.username,
      nickName: foundUser.nickName,
      email: foundUser.email,
      phoneNumber: foundUser.phoneNumber,
      headPic: foundUser.headPic,
      createTime: foundUser.createTime.getTime(),
      isFrozen: foundUser.isFrozen,
      isAdmin: foundUser.isAdmin,
      roles: foundUser.roles.map((item) => item.name),
      permissions: foundUser.roles.reduce((arr, item) => {
        item.permissions.forEach((permission) => {
          if (arr.indexOf(permission) === -1) {
            arr.push(permission);
          }
        });
        return arr;
      }, []),
    };
  }
  async findUserDetailById(userId: number) {
    console.log('findUserDetailById', userId);

    return await this.userRepository.findOne({
      where: { id: userId },
    });
  }
  async updatePassword(userId: number, passwordDto: UpdateUserPasswordDto) {
    const captcha = await this.redisService.get(
      `update_password_captcha_${passwordDto.email}`,
    );
    if (!captcha) {
      throw new HttpException('验证码已过期', HttpStatus.BAD_REQUEST);
    }
    if (captcha !== passwordDto.captcha) {
      throw new HttpException('验证码不正确', HttpStatus.BAD_REQUEST);
    }
    const foundUser = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!foundUser) {
      throw new HttpException('用户不存在', HttpStatus.BAD_REQUEST);
    }
    console.log('passwordDto :>> ', passwordDto);
    console.log('foundUser :>> ', foundUser);

    foundUser.password = md5(passwordDto.password);
    try {
      await this.userRepository.save(foundUser);
      return '密码修改成功';
    } catch (e) {
      this.logger.error(e, UserService);
      return '密码修改失败';
    }
  }
  async update(userId: number, updateUserDto: UpdateUserDto) {
    const captcha = await this.redisService.get(
      `update_user_captcha_${updateUserDto.email}`,
    );
    if (!captcha) {
      throw new HttpException('验证码已过期', HttpStatus.BAD_REQUEST);
    }
    if (captcha !== updateUserDto.captcha) {
      throw new HttpException('验证码不正确', HttpStatus.BAD_REQUEST);
    }
    const foundUser = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (updateUserDto.nickName) {
      foundUser.nickName = updateUserDto.nickName;
    }
    if (updateUserDto.headPic) {
      foundUser.headPic = updateUserDto.headPic;
    }

    try {
      await this.userRepository.save(foundUser);
      return '修改成功';
    } catch (e) {
      this.logger.error(e, UserService);
      return '修改失败';
    }
  }
  async freezeUserById(userId: number) {
    const foundUser = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!foundUser) {
      throw new HttpException('用户不存在', HttpStatus.BAD_REQUEST);
    }
    foundUser.isFrozen = true;
    try {
      await this.userRepository.save(foundUser);
      return '操作成功';
    } catch (e) {
      this.logger.error(e, UserService);
      return '操作失败';
    }
  }
  async findUsersByPage(pageNo: number, pageSize: number, username, nickName, email) {
    const condition: Record<string, any> = {};
    if (username) {
      condition.username = Like(`%${username}%`);
    }
    if (nickName) {
      condition.nickName = Like(`%${nickName}%`);
    }
    if (email) {
      condition.email = Like(`%${email}%`);
    }

    const [users, totalCount] = await this.userRepository.findAndCount({
      select: ['id', 'username', 'nickName', 'email', 'phoneNumber', 'isFrozen', 'headPic', 'createTime'],
      skip: (pageNo - 1) * pageSize,
      take: pageSize,
      where: condition,
    });
    return {
      users,
      totalCount,
    };
  }
}
