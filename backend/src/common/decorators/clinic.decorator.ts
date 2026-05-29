import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Extracts clinicId from the authenticated request
export const ClinicId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): number => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.clinicId;
  },
);

// Extracts the full user from request
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    return ctx.switchToHttp().getRequest().user;
  },
);
