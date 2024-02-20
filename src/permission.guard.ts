import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

@Injectable()
export class PermissionGuard implements CanActivate {
  @Inject(Reflector)
  private reflector: Reflector;
  async   canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const requirePermission = this.reflector.getAllAndOverride('require-permission', [
      context.getClass(),
      context.getHandler(),
    ])
    if (!requirePermission) {
      return true;
    }
    // 用户拥有的权限
    const permissions = request.user.permissions;
    requirePermission.every(curPermission => {
      const found = permissions.find(item => item.code === curPermission);
      if(!found) {
        throw new UnauthorizedException('您没有访问该接口的权限');
      }
    })
    return true;
  }
}
