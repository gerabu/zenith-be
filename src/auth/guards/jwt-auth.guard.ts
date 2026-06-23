import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GOOGLE_JWT_STRATEGY } from '../strategies/google-jwt.strategy';

@Injectable()
export class JwtAuthGuard extends AuthGuard(GOOGLE_JWT_STRATEGY) {}
