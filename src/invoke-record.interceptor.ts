import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class InvokeRecordInterceptor implements NestInterceptor {

  private readonly   logger=new Logger(InvokeRecordInterceptor.name)

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response=context.switchToHttp().getResponse();
    const path = request.path;
    const method = request.method;
    const ip = request.ip;
    const ua = request.get('user-agent') || '';
    this.logger.debug(`${method} ${path} ${ip} ${ua}: ${context.getClass().name} ${context.getHandler().name}  invoked...`);
    this.logger.debug(`user: ${request.user?.userId}, ${request.user?.username}`);
    const now = Date.now();

    return next.handle().pipe(
      tap((res) => {
        const responseTime = Date.now() - now;
        this.logger.debug(`${method} ${path} ${ip} ${ua}: ${response.statusCode}  response time: ${responseTime}ms`);
        this.logger.debug(`Response: ${JSON.stringify(res)}`);
      })
    );

  }
}
