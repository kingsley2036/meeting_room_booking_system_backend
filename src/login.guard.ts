import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';
import { Permission } from './user/entities/permission.entity';
import { UnLoginException } from './unlogin.filter';

interface JwtUserData{
  userId: number
  username: string
  email: string
  roles: string[]
  permissions: Permission[]
}
declare module 'express' {
   interface Request {
    user: JwtUserData
  }
}


@Injectable()
export class LoginGuard implements CanActivate {
  @Inject()
  private reflector: Reflector;
  @Inject(JwtService)
  private jwtService: JwtService;

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const requireLogin = this.reflector.getAllAndOverride('require-login', [
      context.getClass(),
      context.getHandler(),
    ])
    if (!requireLogin) {
      return true;
    }
    const authorization = request.headers['authorization']
    if (!authorization) {
      throw new UnLoginException('用户未登录');
    }
    try {
      const token = authorization.split(' ')[1];
      const data = this.jwtService.verify<JwtUserData>(token);      
      request.user = {
        userId: data.userId,
        username: data.username,
        email:data.email,
        roles: data.roles,
        permissions: data.permissions
      }
      // 不理解为什么把用户信息放到request中
      return true;

    } catch (error) {
      throw new UnLoginException('用户未登录');
    }
  

  }
}
