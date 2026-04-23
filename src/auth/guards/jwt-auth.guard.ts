import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const session = request.session;

    if (!session || !session.user) {
      throw new UnauthorizedException('You must be logged in to access this resource');
    }

    // Attach user to request for easy access
    request.user = session.user;
    return true;
  }
}
